import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  LineChart as MuiLineChart,
  MarkElement as MuiMarkElement,
} from '@mui/x-charts/LineChart';
import { useNeutralChartPalette } from './palette';
import {
  DEFAULT_LEGEND_POSITION,
  spaceForRotatedTicks,
  withAxisDefaults,
  withChartSlotDefaults,
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
  grid = { horizontal: true },
  hideLegend = series.length <= 1,
  legendPosition = DEFAULT_LEGEND_POSITION,
  margin,
  slots,
  slotProps,
  ...chartProps
}) {
  const theme = useTheme();
  const neutralPalette = useNeutralChartPalette();
  if (!xAxisLabel || !yAxisLabel) {
    throw new Error('LineChart requires xAxisLabel and yAxisLabel.');
  }

  const labelledXAxis = withAxisDefaults(
    xAxis,
    xAxisLabel,
    { scaleType: 'point', data: [] },
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
  const defaultedSeries = series.map((item) => ({
    showMark: false,
    labelMarkType: 'square',
    ...item,
  }));

  return (
    <Box data-testid="line-chart-container" sx={{ width: '100%', minHeight, aspectRatio: aspect }}>
      <MuiLineChart
        {...chartProps}
        series={defaultedSeries}
        xAxis={rotatedTickSpace.xAxis}
        yAxis={labelledYAxis}
        colors={palette || neutralPalette.categorical}
        grid={grid}
        hideLegend={hideLegend}
        margin={rotatedTickSpace.margin}
        slots={{ mark: FilledMarkElement, ...slots }}
        slotProps={withChartSlotDefaults(slotProps, legendPosition)}
      />
    </Box>
  );
}
