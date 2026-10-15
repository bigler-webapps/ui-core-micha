import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolveSource = (base) => {
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.cjs`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
};

function crawl(entry) {
  const visited = new Set();
  const bareSpecifiers = new Set();
  const pending = [path.resolve(root, entry)];

  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const source = fs.readFileSync(file, 'utf8');
    const specifierPattern = /(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g;
    for (const [, specifier] of source.matchAll(specifierPattern)) {
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        bareSpecifiers.add(specifier);
        continue;
      }
      const resolved = resolveSource(path.resolve(path.dirname(file), specifier));
      if (resolved) pending.push(resolved);
    }
  }

  return { visited, bareSpecifiers };
}

const optionalPeers = ['@mui/x-charts', 'react-markdown', 'remark-gfm'];

describe('package sub-path entries', () => {
  it('keeps optional peers out of the main entry and theme graph', () => {
    const main = crawl('src/index.js');
    expect(main.visited.size).toBeGreaterThan(90);
    for (const peer of optionalPeers) {
      expect([...main.bareSpecifiers].filter((specifier) => specifier === peer || specifier.startsWith(`${peer}/`))).toEqual([]);
    }

    const theme = crawl('src/theme/index.js');
    for (const peer of optionalPeers) {
      expect([...theme.bareSpecifiers].filter((specifier) => specifier === peer || specifier.startsWith(`${peer}/`))).toEqual([]);
    }
    const themeFiles = [...theme.visited].map((file) => path.relative(root, file).replaceAll('\\', '/'));
    expect(themeFiles.some((file) => file.startsWith('src/chat/'))).toBe(false);
    expect(themeFiles.filter((file) => /markdown/i.test(file))).toEqual([]);
    for (const module of ['ChartFrame', 'BarChart', 'LineChart', 'ScatterChart', 'TimeSeriesChart', 'chartDefaults', 'exportChart']) {
      expect(themeFiles.some((file) => file === `src/components/charts/${module}.js` || file === `src/components/charts/${module}.jsx`)).toBe(false);
    }

    expect([...crawl('src/entries/charts.js').bareSpecifiers].some((specifier) => specifier.startsWith('@mui/x-charts/'))).toBe(true);
    expect([...crawl('src/entries/markdown.js').bareSpecifiers]).toEqual(expect.arrayContaining(['react-markdown', 'remark-gfm']));
    expect(crawl('src/entries/chat.js').bareSpecifiers).toContain('react-markdown');
  });

  it('imports the main entry when optional peers are unavailable', async () => {
    const unavailable = () => { throw new Error('not installed'); };
    vi.resetModules();
    vi.doMock('@mui/x-charts/BarChart', unavailable);
    vi.doMock('@mui/x-charts/LineChart', unavailable);
    vi.doMock('@mui/x-charts/ScatterChart', unavailable);
    vi.doMock('react-markdown', unavailable);
    vi.doMock('remark-gfm', unavailable);

    try {
      await expect(import('../src/index')).resolves.toBeDefined();
    } finally {
      vi.doUnmock('@mui/x-charts/BarChart');
      vi.doUnmock('@mui/x-charts/LineChart');
      vi.doUnmock('@mui/x-charts/ScatterChart');
      vi.doUnmock('react-markdown');
      vi.doUnmock('remark-gfm');
      vi.resetModules();
    }
  }, 30000);

  it('exports the exact public names from each sub-path entry', async () => {
    const entries = [
      ['../src/entries/charts', ['BarChart', 'CHARTS_KIT_SX_REGISTRY', 'ChartFrame', 'LineChart', 'ScatterChart', 'ScatterReferenceCurve', 'ScatterReferenceLine', 'TimeSeriesChart', 'scaleBubbleRadius']],
      ['../src/entries/chat', ['CHAT_KIT_SX_REGISTRY', 'ChatComposer', 'ChatList', 'ChatThread', 'ChatWorkspace', 'createChatApi', 'defaultChatApi', 'ModelPicker', 'useChatSocket']],
      ['../src/entries/markdown', ['MarkdownReply']],
    ];

    for (const [modulePath, expectedNames] of entries) {
      const namespace = await import(modulePath);
      expect(Object.keys(namespace).sort()).toEqual([...expectedNames].sort());
      for (const name of expectedNames) expect(namespace[name]).toBeDefined();
    }
  });
  it('maps every sub-path in package.json to an emitted entry and declares the peers accordingly', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const { exports: exportsMap } = manifest;
    expect(Object.keys(exportsMap).sort()).toEqual(['.', './charts', './chat', './markdown']);
    expect(exportsMap['.']).toBe('./dist/index.js');
    for (const name of ['charts', 'chat', 'markdown']) {
      expect(exportsMap[`./${name}`]).toBe(`./dist/entries/${name}.js`);
      // The build emits dist/<path>.js from src/<path>.js (tsconfig.build.json rootDir src).
      expect(fs.existsSync(path.join(root, 'src', 'entries', `${name}.js`))).toBe(true);
    }
    expect(manifest.files).toEqual(['dist', 'README.md', 'CHANGELOG.md']);

    expect(Object.keys(manifest.dependencies)).not.toEqual(expect.arrayContaining(['react-markdown']));
    expect(manifest.dependencies['remark-gfm']).toBeUndefined();
    expect(manifest.peerDependencies['react-helmet']).toBeUndefined();
    expect(manifest.peerDependencies['@mui/icons-material']).toBe(manifest.peerDependencies['@mui/material']);
    expect(Object.keys(manifest.peerDependenciesMeta).sort()).toEqual([...optionalPeers].sort());
    for (const peer of optionalPeers) {
      expect(manifest.peerDependenciesMeta[peer]).toEqual({ optional: true });
      expect(manifest.peerDependencies[peer]).toBeTruthy();
    }
    // qrcode.react stays required: AccountPage in the main entry renders QrSignupManager.
    expect(manifest.peerDependencies['qrcode.react']).toBeTruthy();
    expect(manifest.peerDependenciesMeta['qrcode.react']).toBeUndefined();
  });
});
