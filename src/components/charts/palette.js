import { useTheme } from '@mui/material/styles';

/**
 * Returns neutral chart colours derived only from the active MUI theme.
 * Consumers may replace either array with their own domain palette.
 */
export function getNeutralChartPalette(theme) {
  const palette = theme.palette;
  const isDark = palette.mode === 'dark';
  const dataSeries = palette.dataSeries?.categorical;

  return {
    categorical: Array.isArray(dataSeries) && dataSeries.length > 0
      ? [...dataSeries]
      : isDark
        ? [palette.primary.light, palette.secondary.light, palette.info.light, palette.success.light, palette.warning.light]
        : [palette.primary.main, palette.secondary.main, palette.info.main, palette.success.main, palette.warning.main],
    sequential: isDark
      ? [palette.action.disabled, palette.text.secondary, palette.primary.light, palette.primary.main, palette.primary.dark]
      : [palette.action.disabled, palette.divider, palette.text.secondary, palette.primary.light, palette.primary.main],
    // THEME-10: an undifferentiated mass (e.g. a scatter cloud with no colour
    // dimension encoded) is ink-neutral, not a series hue -- a KPI identity
    // colour there implies a meaning the cloud does not carry. `text.secondary`
    // reads as neutral ink in both palette modes without competing with an
    // actual categorical/sequential encoding drawn on top of it.
    neutral: palette.text.secondary,
  };
}

/** Resolves the kit's neutral palette from the nearest MUI ThemeProvider. */
export function useNeutralChartPalette() {
  return getNeutralChartPalette(useTheme());
}
