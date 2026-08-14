import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';
import { useNeutralChartPalette } from './palette';
import {
  DEFAULT_LEGEND_POSITION,
  defaultNumericTickFormatter,
  sizeYAxisForContent,
  spaceForRotatedTicks,
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
 */
export function BarChart({
  series = [],
  xAxisLabel,
  yAxisLabel,
  xAxis,
  yAxis,
  palette,
  minHeight,
  aspect,
  grid,
  hideLegend = series.length <= 1,
  legendPosition = DEFAULT_LEGEND_POSITION,
  margin,
  slotProps,
  ...chartProps
}) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const neutralPalette = useNeutralChartPalette();

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
  const sizedYAxis = sizeYAxisForContent(
    labelledYAxis,
    series,
    theme.typography.caption.fontSize,
  );
  const rotatedTickSpace = spaceForRotatedTicks(
    labelledXAxis,
    margin,
    theme.typography.caption.lineHeight,
  );

  return (
    <Box data-testid="bar-chart-container" sx={{ width: '100%', minHeight, aspectRatio: aspect }}>
      <MuiBarChart
        {...chartProps}
        series={series}
        xAxis={rotatedTickSpace.xAxis}
        yAxis={sizedYAxis}
        colors={palette || neutralPalette.categorical}
        grid={withGridDefaults(grid)}
        hideLegend={hideLegend}
        margin={rotatedTickSpace.margin}
        slotProps={withChartSlotDefaults(slotProps, legendPosition)}
      />
    </Box>
  );
}
