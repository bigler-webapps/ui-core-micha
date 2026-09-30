import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_DIRECTORY = path.resolve('src');
const OLD_DISPLAY_PATTERN = /(setErrorKey|setError|setAgentErrorKey|alert)\(.*\.code|t\(\w+\??\.code/;

function jsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsxFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.jsx') ? [entryPath] : [];
  });
}

describe('auth error display call-site guard', () => {
  it('has no old raw-code display pattern in JSX source', () => {
    const matches = [];
    for (const file of jsxFiles(SOURCE_DIRECTORY)) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        if (OLD_DISPLAY_PATTERN.test(line)) matches.push(`${file}:${index + 1}: ${line}`);
      });
    }
    expect(matches).toEqual([]);
  });

  it('would catch a restored old-style call site', () => {
    expect(OLD_DISPLAY_PATTERN.test("setErrorKey(err.code || 'Auth.X');")).toBe(true);
    expect(OLD_DISPLAY_PATTERN.test("alert(t(err?.code || 'Auth.X'));" )).toBe(true);
  });
});
