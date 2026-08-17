import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { build } from 'vite';
import { afterAll, expect, test } from 'vitest';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageManifest = JSON.parse(
  await readFile(path.join(packageRoot, 'package.json'), 'utf8'),
);
const packageName = packageManifest.name;
let temporaryRoot;

async function bundlePackageExport({ caseName, exportName, manifestField }) {
  temporaryRoot ||= await mkdtemp(path.join(tmpdir(), 'ui-core-tree-shaking-'));
  const consumerRoot = path.join(temporaryRoot, caseName);
  const installedPackageRoot = path.join(
    consumerRoot,
    'node_modules',
    ...packageName.split('/'),
  );

  await mkdir(installedPackageRoot, { recursive: true });
  await cp(
    path.join(packageRoot, 'dist'),
    path.join(installedPackageRoot, 'dist'),
    { recursive: true },
  );
  const installedFontRoot = path.join(
    consumerRoot,
    'node_modules',
    '@fontsource',
    'dm-sans',
  );
  await mkdir(path.dirname(installedFontRoot), { recursive: true });
  await cp(
    path.join(packageRoot, 'node_modules', '@fontsource', 'dm-sans'),
    installedFontRoot,
    { recursive: true },
  );
  await writeFile(
    path.join(installedPackageRoot, 'package.json'),
    JSON.stringify({
      name: packageName,
      version: packageManifest.version,
      [manifestField]: packageManifest[manifestField],
      sideEffects: packageManifest.sideEffects,
    }),
  );

  const entryPath = path.join(consumerRoot, 'entry.js');
  await writeFile(entryPath, `export { ${exportName} } from '${packageName}';\n`);

  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root: consumerRoot,
    build: {
      minify: true,
      rollupOptions: {
        input: entryPath,
        preserveEntrySignatures: 'strict',
        external: (id) => (
          id !== packageName
          && !id.startsWith('@fontsource/dm-sans')
          && !id.startsWith('.')
          && !path.isAbsolute(id)
        ),
        output: {
          format: 'es',
        },
      },
      write: false,
    },
  });
  const outputs = Array.isArray(result)
    ? result.flatMap((buildResult) => buildResult.output)
    : result.output;
  const entryChunk = outputs.find((output) => output.type === 'chunk' && output.isEntry);

  expect(entryChunk, `${manifestField} entry should produce a bundle`).toBeDefined();
  return {
    code: entryChunk.code,
    css: outputs
      .filter((output) => output.type === 'asset' && output.fileName.endsWith('.css'))
      .map((output) => output.source.toString())
      .join('\n'),
    rawBytes: Buffer.byteLength(entryChunk.code),
    gzipBytes: gzipSync(entryChunk.code).byteLength,
  };
}

afterAll(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
});

test('built package entries resolve and unused translation bundles tree-shake', async () => {
  const authOnly = await bundlePackageExport({
    caseName: 'auth-main',
    exportName: 'authTranslations',
    manifestField: 'main',
  });
  const aggregate = await bundlePackageExport({
    caseName: 'aggregate-module',
    exportName: 'uiCoreTranslations',
    manifestField: 'module',
  });

  expect(authOnly.code).toContain('Auth.LOGIN');
  expect(authOnly.code).not.toContain('ChartFrame.LOADING');
  expect(authOnly.css).toContain('DM Sans');
  expect(aggregate.code).toContain('ChartFrame.LOADING');
  expect(aggregate.rawBytes).toBeGreaterThan(authOnly.rawBytes);
  expect(aggregate.gzipBytes).toBeGreaterThan(authOnly.gzipBytes);

  const rawDelta = aggregate.rawBytes - authOnly.rawBytes;
  const gzipDelta = aggregate.gzipBytes - authOnly.gzipBytes;
  console.info(
    `tree-shaking measurement: auth=${authOnly.rawBytes} B raw/${authOnly.gzipBytes} B gzip; `
      + `aggregate=${aggregate.rawBytes} B raw/${aggregate.gzipBytes} B gzip; `
      + `delta=+${rawDelta} B raw/+${gzipDelta} B gzip`,
  );
}, 15_000);
