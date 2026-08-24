import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  LineChart as MuiLineChart,
  MarkElement as MuiMarkElement,
} from '@mui/x-charts/LineChart';
import { useNeutralChartPalette } from './palette';
import {
  DEFAULT_LEGEND_POSITION,
  assertRemovedChartProp,
  defaultNumericTickFormatter,
  resolveChartLayout,
  withAxisDefaults,
  withChartSlotDefaults,
  withGridDefaults,
} from './chartDefaults';

// Fixes MUI's hollow `background.paper`-filled marker (MarkElement.js's own
// `styled()` default). CHART-6's WO named a `MuiMarkElement` theme-token
// override in src/theme/tokens.js as the preferred mechanism, with a
// per-wrapper slots/sx override as the documented fallback. This uses the
// fallback deliberately, not because the theme route was infeasible: a
// wrapper-level fix applies to every consumer immediately on this version
// bump, including the 14 apps that haven't adopted `createAppTheme` yet
// (THEME-1 is a separate, optional pin bump) -- a theme-token override would
// only take effect for apps on the new baseline theme. Composes correctly
// with a caller's own `slots.mark` (spread after this default, so it wins).
function FilledMarkElement({ color, style, ...props }) {
  return <MuiMarkElement {...props} color={color} style={{ fill: color, ...style }} />;
}

/**
 * Responsive MUI X-Charts line preset. It supplies labelled axes, tooltips,
 * and an automatic multi-series legend. `xAxisLabel`/`yAxisLabel` are
 * optional, per DESIGN.md #8a: a categorical axis needs no title by default
 * -- its ticks are names -- and a numeric axis needs one only unless its
 * unit is already visible in the ticks and the panel heading already names
 * the quantity. Omitting one never suppresses a label the caller DID set
 * (`withAxisDefaults` only ever falls back onto an axis without its own
 * `label`).
 *
 * `size` (UCM-CHART-12, UCM-CHART-15): `"compact" | "standard" | "tall" | "extra_tall" |
 * "super_tall"`, resolved through the theme's spacing scale by `resolveChartLayout`. `height`
 * (px) is the documented escape for a justified special case -- prefer `size`.
 * `minHeight`/`aspect`/`margin` are gone (see docs/CHART-LAYOUT.md).
 */
export function LineChart({
  series = [],
  xAxisLabel,
  yAxisLabel,
  xAxis,
  yAxis,
  palette,
  size = 'standard',
  height,
  minHeight,
  aspect,
  margin,
  xLabels = 'auto',
  grid,
  hideLegend = series.length <= 1,
  legendPosition = DEFAULT_LEGEND_POSITION,
  slots,
  slotProps,
  ...chartProps
}) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const neutralPalette = useNeutralChartPalette();

  assertRemovedChartProp('LineChart', 'minHeight', minHeight, 'Use size="compact" | "standard" | "tall" | "extra_tall" | "super_tall", or height for the documented escape.');
  assertRemovedChartProp('LineChart', 'aspect', aspect, 'Removed with no replacement -- pick a size token; the chart no longer tracks width.');
  assertRemovedChartProp('LineChart', 'margin', margin, 'Removed -- the layout model owns margins completely.');

  const labelledXAxis = withAxisDefaults(
    xAxis,
    xAxisLabel,
    { scaleType: 'point', data: [] },
    theme.typography.caption.fontSize,
  );
  const labelledYAxis = withAxisDefaults(
    yAxis,
    yAxisLabel,
    { scaleType: 'linear', valueFormatter: defaultNumericTickFormatter(i18n.language) },
    theme.typography.caption.fontSize,
  );
  const defaultedSeries = series.map((item) => ({
    showMark: false,
    labelMarkType: 'square',
    ...item,
  }));
  const layout = resolveChartLayout({
    size,
    height,
    xAxis: labelledXAxis,
    yAxis: labelledYAxis,
    series: defaultedSeries,
    xLabels,
    hideLegend,
    legendPosition,
    slotProps,
    tickFontSize: theme.typography.caption.fontSize,
    spacing: theme.spacing,
    defaultLineHeight: theme.typography.caption.lineHeight,
  });

  return (
    <Box data-testid="line-chart-container" sx={layout.sx}>
      <MuiLineChart
        {...chartProps}
        height={layout.chartHeight}
        series={defaultedSeries}
        xAxis={layout.xAxis}
        yAxis={layout.yAxis}
        colors={palette || neutralPalette.categorical}
        grid={withGridDefaults(grid)}
        hideLegend={hideLegend}
        margin={layout.margin}
        slots={{ mark: FilledMarkElement, ...slots }}
        slotProps={withChartSlotDefaults(slotProps, legendPosition)}
      />
    </Box>
  );
}
