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
});
