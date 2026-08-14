import { describe, expect, it } from 'vitest';
import {
  createChartFormatters,
  formatCompact,
  formatPercentage,
  getNeutralChartPalette,
} from '../src/index';

describe('chart palette and formatters', () => {
  it('resolves different neutral palettes from light and dark MUI themes without literal API colours', () => {
    const tokenTheme = (mode) => ({
      palette: {
        mode,
        primary: { main: `${mode}-primary-main`, light: `${mode}-primary-light`, dark: `${mode}-primary-dark` },
        secondary: { main: `${mode}-secondary-main`, light: `${mode}-secondary-light` },
        info: { main: `${mode}-info-main`, light: `${mode}-info-light` },
        success: { main: `${mode}-success-main`, light: `${mode}-success-light` },
        warning: { main: `${mode}-warning-main`, light: `${mode}-warning-light` },
        action: { disabled: `${mode}-action-disabled` },
        text: { secondary: `${mode}-text-secondary` },
        divider: `${mode}-divider`,
      },
    });
    const light = getNeutralChartPalette(tokenTheme('light'));
    const dark = getNeutralChartPalette(tokenTheme('dark'));

    expect(light.categorical).not.toEqual(dark.categorical);
    expect(light.categorical).toHaveLength(5);
    expect(light.categorical).toContain('light-primary-main');
    expect(light.categorical.every((colour) => !colour.includes('#'))).toBe(true);
  });

  it('formats percentage and compact numbers according to the requested locale', () => {
    expect(formatPercentage(0.25, 'en-US')).toBe('25%');
    expect(formatPercentage(0.25, 'de-DE')).toContain('25');
    expect(formatCompact(12500, 'en-US')).toMatch(/12.5K|13K/);
    expect(createChartFormatters('fr-FR').ratio(1.5)).toContain('1');
  });

  // THEME-10: an undifferentiated scatter cloud (no colour dimension encoded) needs a single
  // neutral tone, distinct from the categorical/sequential arrays above.
  it('resolves a single neutral tone from theme.palette.text.secondary', () => {
    const theme = {
      palette: {
        mode: 'light',
        primary: { main: 'primary-main' },
        secondary: { main: 'secondary-main' },
        info: { main: 'info-main' },
        success: { main: 'success-main' },
        warning: { main: 'warning-main' },
        action: { disabled: 'action-disabled' },
        text: { secondary: 'text-secondary' },
        divider: 'divider',
      },
    };

    expect(getNeutralChartPalette(theme).neutral).toBe('text-secondary');
  });

  it('uses the theme categorical ramp when one is present', () => {
    const ramp = ['series-1', 'series-2', 'series-3'];
    const theme = {
      palette: {
        dataSeries: { categorical: ramp },
        mode: 'light',
        primary: { main: 'primary-main', light: 'primary-light' },
        action: { disabled: 'action-disabled' },
        text: { secondary: 'text-secondary' },
        divider: 'divider',
      },
    };

    expect(getNeutralChartPalette(theme).categorical).toEqual(ramp);
  });

  it('keeps the existing palette derivation when no ramp is present', () => {
    const theme = {
      palette: {
        mode: 'light',
        primary: { main: 'primary-main', light: 'primary-light' },
        secondary: { main: 'secondary-main' },
        info: { main: 'info-main' },
        success: { main: 'success-main' },
        warning: { main: 'warning-main' },
        action: { disabled: 'action-disabled' },
        text: { secondary: 'text-secondary' },
        divider: 'divider',
      },
    };

    expect(getNeutralChartPalette(theme).categorical).toEqual([
      'primary-main',
      'secondary-main',
      'info-main',
      'success-main',
      'warning-main',
    ]);
  });
});
