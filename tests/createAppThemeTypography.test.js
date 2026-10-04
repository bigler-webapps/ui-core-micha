import { describe, expect, it } from 'vitest';

import { assertThemeComplete, createAppTheme } from '../src/theme';
import { breakpointDownQuery } from '../src/theme/tokens';

const themes = [
  ['light', createAppTheme({ palette: { primary: { main: '#0F62FE' } } })],
  ['dark', createAppTheme({ palette: { mode: 'dark', primary: { main: '#468AB2' } } })],
];

const decidedSizes = {
  h1: '36px',
  h2: '32px',
  h3: '28px',
  h4: '24px',
  h5: '20px',
  subtitle1: '13px',
};

describe('createAppTheme frozen typography scale', () => {
  it.each(themes)('uses the decided type sizes in %s mode', (_mode, theme) => {
    for (const [variant, fontSize] of Object.entries(decidedSizes)) {
      expect(theme.typography[variant].fontSize).toBe(fontSize);
    }
  });

  it.each(themes)('steps h4 down below the theme sm breakpoint in %s mode', (_mode, theme) => {
    const query = breakpointDownQuery(theme.breakpoints.values.sm);

    expect(Object.keys(theme.typography.h4)).toContain(query);
    expect(theme.typography.h4[query]).toEqual({ fontSize: '23px' });
  });

  it('reports no typography finding for the baseline theme', () => {
    const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

    expect(Object.keys(theme.typography.h4)).toContain(breakpointDownQuery(theme.breakpoints.values.sm));
    expect(assertThemeComplete(theme).findings.filter(({ surface }) =>
      surface.startsWith('typography.'),
    )).toEqual([]);
  });

  it('moves the h4 step with an app-overridden sm breakpoint', () => {
    const theme = createAppTheme({
      palette: { primary: { main: '#0F62FE' } },
      breakpoints: { values: { sm: 480 } },
    });
    const keys = Object.keys(theme.typography.h4).filter((key) => key.startsWith('@media'));

    expect(keys).toEqual([breakpointDownQuery(480)]);
    expect(theme.typography.h4[keys[0]]).toEqual({ fontSize: '23px' });
  });
});
