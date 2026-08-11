import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { assertThemeComplete, createAppTheme } from '../src/index';
import { BASELINE_STATIC } from '../src/theme/tokens';

describe('createAppTheme', () => {
  it('builds a complete baseline from only an app primary colour', () => {
    const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

    expect(assertThemeComplete(theme).findings).toEqual([]);
    expect(theme.typography.body1.fontSize).toBe('14px');
    expect(theme.shape.borderRadius).toBe(3);
    expect(theme.components.MuiPaper.defaultProps).toMatchObject({ elevation: 0, variant: 'outlined' });
    expect(theme.components.MuiBottomNavigationAction.styleOverrides.label).toMatchObject({
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: 1.2,
      maxWidth: '100%',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      '&.Mui-selected': { fontSize: '12px' },
    });
    expect(theme.components.MuiBottomNavigationAction.styleOverrides.root).toMatchObject({
      minWidth: 0,
      maxWidth: 'none',
      padding: '0 2px',
      gap: '2px',
      '& .MuiSvgIcon-root': { width: '22px', height: '22px' },
    });
    expect(theme.palette.dataSeries.categorical).toHaveLength(6);
    expect(theme.palette.primary.light).not.toBe(createTheme().palette.primary.light);
    // MUI's createTheme(options, ...args) only augments the FIRST argument's
    // palette; every later arg is deep-merged raw, so a status entry missing
    // `main`/`contrastText` silently keeps MUI's stock hue for color="success"
    // etc. -- main/contrastText must be explicitly set and clear AA as a
    // foreground (THEME-2: `warning` deliberately breaks the main===fill
    // pattern success/error/info follow -- amber cannot serve both a legible
    // fill AND a legible foreground with one hex, so `warning.main` is the
    // darker `text` tone instead, `warning.fill` stays the lighter amber for
    // deliberate fill use).
    for (const status of ['success', 'error', 'info']) {
      expect(theme.palette[status].main).toBe(theme.palette[status].fill);
      expect(theme.palette[status].contrastText).toBe(theme.palette[status].fillText);
    }
    expect(theme.palette.warning.main).toBe(theme.palette.warning.text);
    expect(theme.palette.warning.contrastText).toBe('#FFFFFF');
  });

  it('throws when palette.primary is missing', () => {
    expect(() => createAppTheme()).toThrow(/palette\.primary.*required/i);
  });

  it('throws on a function in an app styleOverrides slot', () => {
    expect(() => createAppTheme({
      palette: { primary: { main: '#0F62FE' } },
      components: { MuiButton: { styleOverrides: { root: () => ({ color: 'red' }) } } },
    })).toThrow(/components\.MuiButton\.styleOverrides\.root.*object.*variants/i);
  });

  it('computes component values from the final app status palette', () => {
    const theme = createAppTheme({
      palette: {
        primary: { main: '#0F62FE' },
        success: { main: '#14532D', text: '#14532D', bg: '#DCFCE7' },
      },
    });

    expect(theme.components.MuiAlert.styleOverrides.standardSuccess).toEqual({
      color: '#14532D',
      backgroundColor: '#DCFCE7',
      '& .MuiAlert-icon': { color: '#14532D' },
    });
  });

  it('deep-merges app object overrides without dropping baseline properties', () => {
    const theme = createAppTheme({
      palette: { primary: { main: '#0F62FE' } },
      typography: { fontFamily: "'App Sans', sans-serif" },
      components: { MuiButton: { styleOverrides: { root: { fontSize: '15px' } } } },
    });

    expect(theme.components.MuiButton.styleOverrides.root).toMatchObject({
      minHeight: 40,
      borderRadius: 3,
      fontSize: '15px',
    });
    expect(theme.typography.body1.fontFamily).toBe("'App Sans', sans-serif");
    expect(theme.components.MuiOutlinedInput.styleOverrides.root.height).toBeUndefined();
    // variants is a sibling of styleOverrides (MUI matches it independently by
    // props), not nested inside it -- see src/theme/tokens.js for why.
    expect(theme.components.MuiOutlinedInput.variants).toContainEqual({
      props: { multiline: false },
      style: { height: 40 },
    });
  });

  it('returns independent themes for runtime palettes in one process', () => {
    const blue = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });
    const purple = createAppTheme({ palette: { primary: { main: '#432CA1' } } });

    expect(blue).not.toBe(purple);
    expect(blue.palette).not.toBe(purple.palette);
    expect(blue.palette.dataSeries.categorical).not.toBe(purple.palette.dataSeries.categorical);
    expect(blue.palette.primary.main).toBe('#0F62FE');
    expect(purple.palette.primary.main).toBe('#432CA1');
    expect(blue.palette.controlBorder.focus).not.toBe(purple.palette.controlBorder.focus);
  });

  it('contains no function anywhere in the baseline components tree', () => {
    const functionPaths = [];
    const visit = (value, path) => {
      if (typeof value === 'function') functionPaths.push(path);
      else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, child]) => visit(child, `${path}.${key}`));
      }
    };

    visit(BASELINE_STATIC.components, 'baseline.components');
    visit(
      createAppTheme({ palette: { primary: { main: '#0F62FE' } } }).components,
      'theme.components',
    );
    expect(functionPaths).toEqual([]);
  });
});
