import React from 'react';
import { Box } from '@mui/material';
import { LineChart as MuiLineChart } from '@mui/x-charts/LineChart';
import { useNeutralChartPalette } from './palette';

function labelledAxis(axes, label, defaults) {
  const values = axes?.length ? axes : [defaults];
  return values.map((axis) => ({ ...axis, label: axis.label || label }));
}

/**
 * Responsive MUI X-Charts line preset. xAxisLabel and yAxisLabel (including units) are required.
 * It supplies labelled axes, tooltips, and an automatic multi-series legend.
 */
export function LineChart({
  series = [],
  xAxisLabel,
  yAxisLabel,
  xAxis,
  yAxis,
  palette,
  minHeight,
  aspect,
  ...chartProps
}) {
  const neutralPalette = useNeutralChartPalette();
  if (!xAxisLabel || !yAxisLabel) {
    throw new Error('LineChart requires xAxisLabel and yAxisLabel.');
  }

  return (
    <Box data-testid="line-chart-container" sx={{ width: '100%', minHeight, aspectRatio: aspect }}>
      <MuiLineChart
        {...chartProps}
        series={series}
        xAxis={labelledAxis(xAxis, xAxisLabel, { scaleType: 'point', data: [] })}
        yAxis={labelledAxis(yAxis, yAxisLabel, { scaleType: 'linear' })}
        colors={palette || neutralPalette.categorical}
        hideLegend={series.length <= 1}
        slotProps={{ tooltip: { trigger: 'axis' } }}
      />
    </Box>
  );
}
