import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createAppTheme } from '../src/theme';

const sortValue = (value) => {
  if (typeof value === 'function') return String(value);
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
};

const fixture = JSON.parse(readFileSync(new URL('./fixtures/light-theme-baseline.json', import.meta.url)));

function snapshot(baselinePalette = {}) {
  return sortValue({
    baseline: createAppTheme({ palette: { primary: { main: '#0F62FE' }, ...baselinePalette } }),
    override: createAppTheme({
      palette: {
        primary: { main: '#0F62FE' },
        background: { default: '#F0F2F4' },
        success: { main: '#126B36' },
      },
      typography: { fontFamily: 'Fixture Sans' },
    }),
  });
}

describe('createAppTheme light regression guard', () => {
  it('matches the pre-change serialized light themes exactly', () => {
    expect(snapshot()).toEqual(fixture);
  });

  it('detects a changed light value', () => {
    // Produced by the real factory: one different light value must differ from the fixture.
    expect(snapshot({ background: { default: '#FAFBFC' } })).not.toEqual(fixture);
  });
});
