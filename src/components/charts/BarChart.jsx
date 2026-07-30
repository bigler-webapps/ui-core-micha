import React from 'react';
import { Box } from '@mui/material';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';
import { useNeutralChartPalette } from './palette';

function labelledAxis(axes, label, defaults) {
  const values = axes?.length ? axes : [defaults];
  return values.map((axis) => ({ ...axis, label: axis.label || label }));
}

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
  ...chartProps
}) {
  const neutralPalette = useNeutralChartPalette();
  if (!xAxisLabel || !yAxisLabel) {
    throw new Error('BarChart requires xAxisLabel and yAxisLabel.');
  }

  return (
    <Box data-testid="bar-chart-container" sx={{ width: '100%', minHeight, aspectRatio: aspect }}>
      <MuiBarChart
        {...chartProps}
        series={series}
        xAxis={labelledAxis(xAxis, xAxisLabel, { scaleType: 'band', data: [] })}
        yAxis={labelledAxis(yAxis, yAxisLabel, { scaleType: 'linear' })}
        colors={palette || neutralPalette.categorical}
        hideLegend={series.length <= 1}
        slotProps={{ tooltip: { trigger: 'axis' } }}
      />
    </Box>
  );
}
