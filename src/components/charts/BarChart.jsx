import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';
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

/**
 * Responsive MUI X-Charts bar preset. It supplies labelled axes, tooltips,
 * and an automatic multi-series legend. `xAxisLabel`/`yAxisLabel` are
 * optional, per DESIGN.md #8a: a categorical axis (BarChart's default x-axis
 * shape) needs no title by default -- its ticks are names -- and a numeric
 * axis needs one only unless its unit is already visible in the ticks and
 * the panel heading already names the quantity. Omitting one never suppresses
 * a label the caller DID set (`withAxisDefaults` only ever falls back onto
 * an axis without its own `label`).
 *
 * `size` (UCM-CHART-12, UCM-CHART-15): `"compact" | "standard" | "tall" | "extra_tall" |
 * "super_tall"`, resolved through the theme's spacing scale by `resolveChartLayout`. `height`
 * (px) is the documented escape for a justified special case -- prefer `size`.
 * `minHeight`/`aspect`/`margin` are gone (see docs/CHART-LAYOUT.md).
 */
export function BarChart({
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
  slotProps,
  ...chartProps
}) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const neutralPalette = useNeutralChartPalette();

  assertRemovedChartProp('BarChart', 'minHeight', minHeight, 'Use size="compact" | "standard" | "tall" | "extra_tall" | "super_tall", or height for the documented escape.');
  assertRemovedChartProp('BarChart', 'aspect', aspect, 'Removed with no replacement -- pick a size token; the chart no longer tracks width.');
  assertRemovedChartProp('BarChart', 'margin', margin, 'Removed -- the layout model owns margins completely.');

  const labelledXAxis = withAxisDefaults(
    xAxis,
    xAxisLabel,
    { scaleType: 'band', data: [] },
    theme.typography.caption.fontSize,
  );
  const labelledYAxis = withAxisDefaults(
    yAxis,
    yAxisLabel,
    { scaleType: 'linear', valueFormatter: defaultNumericTickFormatter(i18n.language) },
    theme.typography.caption.fontSize,
  );
  const layout = resolveChartLayout({
    size,
    height,
    xAxis: labelledXAxis,
    yAxis: labelledYAxis,
    series,
    xLabels,
    hideLegend,
    legendPosition,
    slotProps,
    tickFontSize: theme.typography.caption.fontSize,
    spacing: theme.spacing,
    defaultLineHeight: theme.typography.caption.lineHeight,
  });

  return (
    <Box data-testid="bar-chart-container" sx={layout.sx}>
      <MuiBarChart
        {...chartProps}
        height={layout.chartHeight}
        series={series}
        xAxis={layout.xAxis}
        yAxis={layout.yAxis}
        colors={palette || neutralPalette.categorical}
        grid={withGridDefaults(grid)}
        hideLegend={hideLegend}
        margin={layout.margin}
        slotProps={withChartSlotDefaults(slotProps, legendPosition)}
      />
    </Box>
  );
}
