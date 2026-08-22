import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { ScatterChart as MuiScatterChart } from '@mui/x-charts/ScatterChart';
import { useXScale, useYScale } from '@mui/x-charts/hooks';
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

// Small enough that hram's largest cloud (~300 points, the tested magnitude -- state it, don't
// imply it scales past that) doesn't fuse into a solid mass at the default (non-bubble) size.
const DEFAULT_MARKER_RADIUS = 5;
const BUBBLE_MIN_RADIUS = 3;
const BUBBLE_RADIUS_SCALE = 10;

/**
 * value -> radius, `max(3, 10 * sqrt(value / maxValue))` -- the formula the access-gap panel
 * already hand-rolls (THEME-10 scope 5). Exported so a consumer can size a legend swatch or a
 * standalone marker the same way the chart does.
 */
export function scaleBubbleRadius(value, maxValue, { minRadius = BUBBLE_MIN_RADIUS, scale = BUBBLE_RADIUS_SCALE } = {}) {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) return minRadius;
  return Math.max(minRadius, scale * Math.sqrt(Math.max(0, value) / maxValue));
}

// A custom MUI marker slot -- the only way to vary radius/colour/shape PER POINT: MUI's own
// Scatter passes a single `markerSize` per whole series (confirmed against
// @mui/x-charts/ScatterChart/Scatter.js -- `size: series.markerSize`, never derived from a
// point's own `z`), so bubble sizing and per-point overrides (a hollow status-quo marker, a
// continuous-scale colour) can only be expressed by replacing the marker itself.
function makeMarkerSlot(seriesById, { sizeAccessor, chartMax, getPointStyle }) {
  return function PresetScatterMarker({
    seriesId, dataIndex, color, x, y, isHighlighted, isFaded, size, onClick, ...rest
  }) {
    const point = seriesById[seriesId]?.data?.[dataIndex];
    const style = point && getPointStyle ? (getPointStyle(point, { seriesId, dataIndex }) || {}) : {};
    const radius = style.radius
      ?? (sizeAccessor && point ? scaleBubbleRadius(sizeAccessor(point), chartMax) : size);
    const r = (isHighlighted ? 1.15 : 1) * radius;
    const fill = style.hollow ? 'none' : (style.color ?? color);
    const stroke = style.color ?? color;
    const shared = {
      onClick,
      opacity: isFaded ? 0.3 : 1,
      stroke,
      strokeWidth: style.hollow ? 2 : (style.strokeWidth ?? 1),
      style: { cursor: onClick ? 'pointer' : 'unset' },
      ...rest,
    };
    if (style.shape === 'square') {
      return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} fill={fill} {...shared} />;
    }
    if (style.shape === 'diamond') {
      return <polygon points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`} fill={fill} {...shared} />;
    }
    return <circle cx={x} cy={y} r={r} fill={fill} {...shared} />;
  };
}

/**
 * A computed curve (allocation's Pareto envelope) drawn inside the chart's own live coordinate
 * space. Render as a `ScatterChart` child -- `useXScale`/`useYScale` only resolve inside the
 * chart's own context, so this can never drift into a second, hand-rolled pixel mapping the way
 * the hand-drawn panels this preset replaces each built their own.
 */
export function ScatterReferenceCurve({ points, color, dashed, strokeWidth = 2 }) {
  const xScale = useXScale();
  const yScale = useYScale();
  if (!points || points.length < 2) return null;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.x)},${yScale(p.y)}`).join(' ');
  return <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dashed ? '6 3' : undefined} />;
}

/**
 * A straight reference line with an optional inline label -- the access panel's labelled y=x
 * "no gap" diagonal, or optimization's dashed threshold line. Same live-scale rule as
 * `ScatterReferenceCurve`.
 */
export function ScatterReferenceLine({
  from, to, color, dashed, strokeWidth = 1.5, label, labelAt, labelAngle = 0,
}) {
  const xScale = useXScale();
  const yScale = useYScale();
  const labelX = labelAt ? xScale(labelAt.x) : null;
  const labelY = labelAt ? yScale(labelAt.y) : null;
  return (
    <g>
      <line
        x1={xScale(from.x)}
        y1={yScale(from.y)}
        x2={xScale(to.x)}
        y2={yScale(to.y)}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? '5 3' : undefined}
      />
      {label && labelAt && (
        <text
          x={labelX}
          y={labelY}
          fontSize={10}
          fill={color}
          textAnchor="start"
          transform={labelAngle ? `rotate(${labelAngle}, ${labelX}, ${labelY})` : undefined}
        >
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * Responsive MUI X-Charts scatter preset, drawn from three real consumers (THEME-10): a
 * continuously-coloured cost/outcome cloud with an envelope curve and marked points
 * (allocation performance), a bubble cloud with a labelled y=x reference diagonal and
 * categorical per-point colouring (access gap), and a cloud with a dashed reference line and a
 * hollow status-quo marker (optimization results). Reuses BarChart/LineChart's own axis
 * machinery (THEME-9) rather than sizing its own -- a scatter axis is a numeric axis like any
 * other, and a preset that re-derives axis sizing would re-open exactly what THEME-9 closed.
 *
 * `series` follows MUI's own scatter shape (`{id, label, data: [{x,y,z?,id?}], color?}`).
 * Multiple series render as a categorical cloud with a discrete legend, one colour per series
 * -- draw those colours from the app's own family/role register via `palette`; this package
 * does not invent one. A single series with no explicit `color` renders as one neutral mass:
 * undifferentiated data encodes no dimension, so it gets the role register's neutral tone
 * (`palette.js`'s `neutral`), never a series/KPI identity hue.
 *
 * `sizeAccessor(point) => number` turns on bubble mode: marker radius follows
 * `scaleBubbleRadius`, and every series' points are drawn largest-first so a small bubble is
 * never hidden under a large one -- the z-order is the whole correctness of a bubble chart, not
 * a decoration.
 *
 * `getPointStyle(point, {seriesId, dataIndex}) => {hollow?, color?, shape?, radius?,
 * strokeWidth?}` marks individual points -- a status-quo point drawn hollow against filled
 * candidates (allocation, optimization), a `'square'` shape for a source category the data
 * itself marks (allocation's "targeted" points), or a per-point colour from a continuous scale
 * the caller computed (this package does not ship a continuous colour-scale/legend component;
 * the caller already owns that logic and only needs a way to apply the resolved colour per
 * point, which this is it). Read the `point` object itself, not `dataIndex`, to correlate a
 * style back to your own data -- in bubble mode (`sizeAccessor` set) `dataIndex` indexes the
 * chart's internal z-ordered copy of your series, not your original array's order.
 *
 * Reference geometry (a computed curve, a straight line, either with an optional label) is
 * composed as `children` using `ScatterReferenceCurve`/`ScatterReferenceLine` above.
 *
 * `size` (UCM-CHART-12): `"compact" | "standard" | "tall"`, resolved through the theme's
 * spacing scale by `resolveChartLayout`. `height` (px) is the documented escape for a justified
 * special case -- prefer `size`. `minHeight`/`aspect`/`margin` are gone (see docs/CHART-LAYOUT.md).
 *
 * Tested magnitude: a few hundred marks (hram's largest cloud is ~300 points). Not verified,
 * and not implied to hold, at thousands+.
 *
 * THEME-10 was commissioned before its requirement set closed -- a forthcoming "paired point"
 * shape (optimization's MILP-vs-simulated pair, two marks joined by a connector) is named but
 * explicitly NOT built here. Nothing below assumes a datum produces exactly one mark: a point
 * object may carry arbitrary extra fields beyond `{x,y,z,id}` (as `getPointStyle`'s own status-
 * quo/bubble-radius usage already does), `getPointStyle`/`sizeAccessor` key off that datum, not
 * off a fixed mark count, and reference geometry is composed via `children`, not baked into the
 * per-point contract. A pair variant can therefore layer on later -- extra series entries plus a
 * connector drawn through `children` -- without reshaping `series` or either callback's contract.
 */
export function ScatterChart({
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
  sizeAccessor,
  getPointStyle,
  markerSize = DEFAULT_MARKER_RADIUS,
  slotProps,
  children,
  ...chartProps
}) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const neutralPalette = useNeutralChartPalette();

  assertRemovedChartProp('ScatterChart', 'minHeight', minHeight, 'Use size="compact" | "standard" | "tall", or height for the documented escape.');
  assertRemovedChartProp('ScatterChart', 'aspect', aspect, 'Removed with no replacement -- pick a size token; the chart no longer tracks width.');
  assertRemovedChartProp('ScatterChart', 'margin', margin, 'Removed -- the layout model owns margins completely.');

  const labelledXAxis = withAxisDefaults(
    xAxis,
    xAxisLabel,
    { scaleType: 'linear', valueFormatter: defaultNumericTickFormatter(i18n.language) },
    theme.typography.caption.fontSize,
  );
  const labelledYAxis = withAxisDefaults(
    yAxis,
    yAxisLabel,
    { scaleType: 'linear', valueFormatter: defaultNumericTickFormatter(i18n.language) },
    theme.typography.caption.fontSize,
  );
  // `resolveChartLayout`'s own y-axis sizing (via `sizeYAxisForContent`) expects `series[i].data`
  // to be a plain array of numbers -- true for BarChart/LineChart, but a scatter's data is
  // `{x,y,z,id}` points. Adapt AT THIS CALL SITE, not inside the shared resolver -- BarChart/
  // LineChart's own contract must not change for this (reviewer finding, live-caught under
  // THEME-10: the untested case silently found zero candidates and fell back to MUI's flat
  // default at a magnitude that didn't visibly overlap).
  const yValueSeries = useMemo(
    () => series.map((item) => ({ ...item, data: (item.data || []).map((point) => point?.y) })),
    [series],
  );
  const layout = resolveChartLayout({
    size,
    height,
    xAxis: labelledXAxis,
    yAxis: labelledYAxis,
    series: yValueSeries,
    xLabels,
    hideLegend,
    legendPosition,
    tickFontSize: theme.typography.caption.fontSize,
    spacing: theme.spacing,
    defaultLineHeight: theme.typography.caption.lineHeight,
  });

  const isNeutral = series.length <= 1 && !series[0]?.color;
  const resolvedPalette = palette || (isNeutral ? [neutralPalette.neutral] : neutralPalette.categorical);

  // A single chart-wide max, NOT one per series: population (or whatever sizeAccessor reads) is
  // one comparable scale across the whole cloud (matches the access-gap panel's own
  // `maxPop = Math.max(1, ...points.map(p => p.population))`, computed over every point
  // regardless of division/settlement) -- a per-series max would let each series' own largest
  // point always render at full radius, making cross-series bubble size meaningless.
  const chartMax = useMemo(() => {
    if (!sizeAccessor) return 1;
    return Math.max(
      1,
      ...series.flatMap((item) => (item.data || []).map((point) => sizeAccessor(point))).filter(Number.isFinite),
    );
  }, [series, sizeAccessor]);

  // THEME-10 scope 5: explicit z-order -- largest bubbles drawn first so smaller ones are never
  // hidden underneath (SVG paints later elements on top). A no-op outside bubble mode.
  const orderedSeries = useMemo(() => (
    sizeAccessor
      ? series.map((item) => ({
        ...item,
        data: [...(item.data || [])].sort((a, b) => sizeAccessor(b) - sizeAccessor(a)),
      }))
      : series
  ), [series, sizeAccessor]);

  // The marker's `dataIndex` refers to a position in whatever was actually handed to MUI --
  // `orderedSeries` (post z-order sort), not the caller's original `series` -- so the lookup
  // table the marker closes over must be built from that SAME array, or a sorted bubble series
  // would resolve every point's style/radius against the wrong (pre-sort) index.
  const orderedSeriesById = useMemo(
    () => Object.fromEntries(orderedSeries.map((item) => [item.id, item])),
    [orderedSeries],
  );
  const markerSlot = useMemo(
    () => makeMarkerSlot(orderedSeriesById, { sizeAccessor, chartMax, getPointStyle }),
    [orderedSeriesById, sizeAccessor, chartMax, getPointStyle],
  );

  return (
    <Box data-testid="scatter-chart-container" sx={layout.sx}>
      <MuiScatterChart
        {...chartProps}
        height={layout.chartHeight}
        series={orderedSeries.map((item) => ({ markerSize, ...item }))}
        xAxis={layout.xAxis}
        yAxis={layout.yAxis}
        colors={resolvedPalette}
        grid={withGridDefaults(grid)}
        hideLegend={hideLegend}
        margin={layout.margin}
        slots={{ marker: markerSlot }}
        slotProps={withChartSlotDefaults(slotProps, legendPosition)}
      >
        {children}
      </MuiScatterChart>
    </Box>
  );
}
