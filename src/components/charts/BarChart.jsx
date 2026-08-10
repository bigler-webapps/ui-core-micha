import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';
import { useNeutralChartPalette } from './palette';
import {
  DEFAULT_LEGEND_POSITION,
  spaceForRotatedTicks,
  withAxisDefaults,
  withChartSlotDefaults,
} from './chartDefaults';

/**
 * Responsive MUI X-Charts bar preset. xAxisLabel and yAxisLabel (including units) are required.
 * It supplies labelled axes, tooltips, and an automatic multi-series legend.
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
  grid = { horizontal: true },
  hideLegend = series.length <= 1,
  legendPosition = DEFAULT_LEGEND_POSITION,
  margin,
  slotProps,
  ...chartProps
}) {
  const theme = useTheme();
  const neutralPalette = useNeutralChartPalette();
  if (!xAxisLabel || !yAxisLabel) {
    throw new Error('BarChart requires xAxisLabel and yAxisLabel.');
  }

  const labelledXAxis = withAxisDefaults(
    xAxis,
    xAxisLabel,
    { scaleType: 'band', data: [] },
    theme.typography.caption.fontSize,
  );
  const labelledYAxis = withAxisDefaults(
    yAxis,
    yAxisLabel,
    { scaleType: 'linear' },
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
        yAxis={labelledYAxis}
        colors={palette || neutralPalette.categorical}
        grid={grid}
        hideLegend={hideLegend}
        margin={rotatedTickSpace.margin}
        slotProps={withChartSlotDefaults(slotProps, legendPosition)}
      />
    </Box>
  );
}
