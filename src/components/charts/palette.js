import { useTheme } from '@mui/material/styles';

/**
 * Returns neutral chart colours derived only from the active MUI theme.
 * Consumers may replace either array with their own domain palette.
 */
export function getNeutralChartPalette(theme) {
  const palette = theme.palette;
  const isDark = palette.mode === 'dark';

  return {
    categorical: isDark
      ? [palette.primary.light, palette.secondary.light, palette.info.light, palette.success.light, palette.warning.light]
      : [palette.primary.main, palette.secondary.main, palette.info.main, palette.success.main, palette.warning.main],
    sequential: isDark
      ? [palette.action.disabled, palette.text.secondary, palette.primary.light, palette.primary.main, palette.primary.dark]
      : [palette.action.disabled, palette.divider, palette.text.secondary, palette.primary.light, palette.primary.main],
  };
}

/** Resolves the kit's neutral palette from the nearest MUI ThemeProvider. */
export function useNeutralChartPalette() {
  return getNeutralChartPalette(useTheme());
}
