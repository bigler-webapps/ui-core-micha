import { darken, lighten } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import {
  assertThemeComplete,
  calculateContrastRatio,
  createAppTheme,
} from '../src/theme';
import {
  BASELINE_PALETTE_DARK,
  SERIES_COLOURS,
  DARK_OVERLAY_SHADOW,
  DARK_OVERLAY_SURFACE,
  DARK_SCRIM,
} from '../src/theme/tokens';

const dark = (primary = '#468AB2', extra = {}) => createAppTheme({
  palette: { mode: 'dark', primary: { main: primary }, ...extra },
});

describe('createAppTheme dark baseline', () => {
  it('is complete, including a primary that must be lightened', () => {
    expect(assertThemeComplete(dark()).findings).toEqual([]);
    expect(assertThemeComplete(dark('#2F4F96')).findings).toEqual([]);
  });

  it('derives focus contrast against page and paper in both modes', () => {
    for (const theme of [
      createAppTheme({ palette: { primary: { main: '#0F62FE' } } }),
      dark(),
    ]) {
      expect(calculateContrastRatio(theme.palette.controlBorder.focus, theme.palette.background.default)).toBeGreaterThanOrEqual(3);
      expect(calculateContrastRatio(theme.palette.controlBorder.focus, theme.palette.background.paper)).toBeGreaterThanOrEqual(3);
    }
  });

  it('derives dark control borders and focus from the rules', () => {
    const theme = dark();
    expect(theme.palette.controlBorder.main).toBe('rgba(230,235,239,0.38)');
    expect(theme.palette.controlBorder.hover).toBe('rgba(230,235,239,0.53)');
    expect(theme.palette.controlBorder.error).toBe('#E58B80');
    expect(theme.palette.controlBorder.focus).toBe('#468AB2');
    expect(dark('#2F4F96').palette.controlBorder.focus).toBe('#6D84B6');
    const rgbInk = dark('#468AB2', { ink: { primary: 'rgb(230, 235, 239)' } });
    expect(rgbInk.palette.controlBorder.main).toBe('rgba(230,235,239,0.38)');
    const ownFocus = dark('#468AB2', { controlBorder: { focus: '#FFFFFF' } });
    expect(ownFocus.palette.controlBorder.focus).toBe('#FFFFFF');
  });

  it('recomputes primary shades for a lightened primary', () => {
    const theme = dark('#2F4F96');
    expect(theme.palette.primary.light).toBe(lighten('#6D84B6', 0.2));
    expect(theme.palette.primary.dark).toBe(darken('#6D84B6', 0.3));
  });

  it('uses the complete dark status family', () => {
    for (const status of ['success', 'warning', 'error', 'info']) {
      expect(dark().palette[status]).toMatchObject(BASELINE_PALETTE_DARK[status]);
    }
    expect(dark().palette.stale).toMatchObject(BASELINE_PALETTE_DARK.stale);
  });

  it.each([
    ['#468AB2', '#468AB2'],
    ['#2F4F96', '#6D84B6'],
    ['#432CA1', '#8576C2'],
    ['#D49040', '#D49040'],
  ])('applies the dark primary rule to %s', (input, expected) => {
    const theme = dark(input);
    expect(theme.palette.primary.main).toBe(expected);
    expect(theme.palette.primary.contrastText).toBe('#14181B');
  });

  it('keeps baseline statuses on webshop-guenter page and protects failing baseline values', () => {
    const webshop = dark('#D49040', { background: { default: '#0E0B08', paper: '#171209' } });
    for (const status of ['success', 'warning', 'error', 'info']) {
      expect(webshop.palette[status].main).toBe(BASELINE_PALETTE_DARK[status].main);
    }
    const failing = dark('#468AB2', { background: { default: '#707070', paper: '#787878' } });
    expect(failing.palette.success.main).not.toBe(BASELINE_PALETTE_DARK.success.main);
    expect(calculateContrastRatio(failing.palette.success.main, failing.palette.background.default)).toBeGreaterThanOrEqual(4.5);
    for (const status of ['success', 'warning', 'error', 'info']) {
      const net = dark('#468AB2', { background: { default: '#707070', paper: '#787878' } }).palette[status];
      expect(calculateContrastRatio(net.main, '#707070')).toBeGreaterThanOrEqual(4.5);
      expect(calculateContrastRatio(net.main, net.bg)).toBeGreaterThanOrEqual(4.5);
    }
    const supplied = dark('#468AB2', {
      background: { default: '#707070' },
      success: { main: '#123456' },
    });
    expect(supplied.palette.success.main).toBe('#123456');
  });

  it('uses the dark overlay surface, shadow, scrim, and shadow token', () => {
    const theme = dark();
    for (const component of ['MuiDialog', 'MuiMenu', 'MuiPopover', 'MuiDrawer']) {
      expect(theme.components[component].styleOverrides.paper).toMatchObject({
        backgroundColor: DARK_OVERLAY_SURFACE,
        boxShadow: DARK_OVERLAY_SHADOW,
      });
    }
    expect(theme.components.MuiBackdrop.styleOverrides.root.backgroundColor).toBe(DARK_SCRIM);
    expect(theme.shadow.overlay).toBe(DARK_OVERLAY_SHADOW);
  });

  it('lightens baseline series for baseline paper and adapts to app paper', () => {
    const baseline = dark().palette.dataSeries.categorical;
    expect(baseline).toEqual(['#506BA3', '#3E80B8', '#2E8F8A', '#7A5FA8', '#A1588C', '#8A7355']);
    const adapted = dark('#D49040', { background: { paper: '#171209' } }).palette.dataSeries.categorical;
    expect(adapted).toHaveLength(SERIES_COLOURS.length);
    adapted.forEach((colour) => {
      expect(calculateContrastRatio(colour, '#171209')).toBeGreaterThanOrEqual(3);
    });
  });

  it('leaves app-supplied series untouched', () => {
    const series = ['#111111', '#222222', '#333333'];
    expect(dark('#468AB2', { dataSeries: { categorical: series } }).palette.dataSeries.categorical).toEqual(series);
  });

  it('resolves dark autofill from paper and primary ink', () => {
    const input = dark().components.MuiOutlinedInput.styleOverrides.input['&:-webkit-autofill'];
    expect(input.WebkitBoxShadow).toBe('0 0 0 100px #1B2126 inset');
    expect(input.WebkitTextFillColor).toBe('#E6EBEF');
    expect(input.caretColor).toBe('#E6EBEF');
  });
});
