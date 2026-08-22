import React, { useState } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ChartFrame } from './ChartFrame';
import { BarChart } from './BarChart';
import { useNeutralChartPalette } from './palette';

// Fixed platform-wide range -> granularity mapping (operator decision, CHART-2 /
// dcm ACT-1) — the resolution follows the window and is never an independent
// caller-supplied control. Every preset lands between a dozen and fifty points.
// Preset default height (CHART-4): MUI X-Charts' responsive container
// measures its actual parent height via ResizeObserver and draws nothing
// if that parent has none — ChartFrame's flex-centered content Box does
// NOT stretch its child to fill available height (alignItems: 'center'),
// so BarChart needs its own explicit size, not just ChartFrame's.
// `height` forwards straight to MuiBarChart's own native height prop
// (bypassing ResizeObserver-based measurement entirely), matching the
// confirmed-working dev/entries.jsx BarChartEntry reference.
// Deliberate, known exception to DESIGN.md #14 ("responsive = container-
// sized, not fixed px"): width stays responsive (unset, still auto-
// measured), only height is fixed, and only because MUI X-Charts' own
// ResizeObserver-based height measurement is what silently produced a
// zero-height chart in the first place (CHART-4). Do not "fix" this back
// to a responsive/aspect-ratio height without re-verifying the underlying
// MUI measurement bug is actually resolved.
//
// UCM-CHART-12: `CHART_HEIGHT` (320) is the number `"standard"` (BarChart's new `size` token) was
// deliberately pinned to, specifically so this preset's own default did not silently move under
// this migration -- still used here as ChartFrame's own `minHeight` floor (a card concern,
// unaffected by CHART-12), and the inner BarChart now takes `size="standard"` instead of `height`.
const CHART_HEIGHT = 320;

// Dynamic sx factories are outside the registry's documented top-level-object
// lower bound; the series colour is data-dependent at render time.
const seriesToggleSx = (colour) => ({
  color: colour,
  '&.Mui-checked': { color: colour },
});

// CHART-5: how many x-axis tick labels to show, evenly spread across
// data.xLabels, regardless of container width or label length. Replaces
// MUI's own collision-based tick filtering (which, given enough densely
// packed categories, can end up hiding every single label — confirmed live
// with 24 hourly buckets) with a deterministic guarantee that some labels
// always render. See makeTickLabelInterval below.
const MAX_X_TICKS = 8;

function makeTickLabelInterval(labelCount) {
  const step = Math.max(1, Math.ceil(labelCount / MAX_X_TICKS));
  const lastIndex = labelCount - 1;
  // `index % step === 0` alone systematically drops the final bucket unless
  // it happens to land exactly on a step boundary (e.g. 24 labels / step 3
  // covers indices 0..21, never 23) -- the most recent time bucket is
  // usually the one that matters most, so it is always force-included.
  return (_value, index) => index % step === 0 || index === lastIndex;
}

// CHART-5: a y-axis is "integer" when every value across its currently
// visible series is a whole number — re-evaluated on every toggle (an axis
// can flip from fractional to integer, or vice versa, as series are shown/
// hidden). Empty (no visible series on this axis) is deliberately NOT
// integer: there's nothing to format, and treating an empty list as
// vacuously "all integer" would apply the formatter to an axis with no data.
function isIntegerAxis(seriesList) {
  return seriesList.length > 0 && seriesList.every(
    (series) => (series.data || []).every((value) => Number.isInteger(value)),
  );
}

// Blanks the tick label for a non-integer value on an axis whose visible
// series are otherwise all whole numbers -- a deterministic backstop since
// d3's own "nice tick" choice for a small integer domain can still land on
// a fractional position (e.g. domain [0,3] ticking at 0, 1.5, 3). Tooltip/
// legend formatting (a different `location`) is left untouched -- only the
// on-axis tick text is ever blanked.
function integerTickFormatter(value, context) {
  if (context?.location !== 'tick') return String(value);
  return Number.isInteger(value) ? String(value) : '';
}

const RANGE_OPTIONS = [
  { key: '1d', granularity: 'hour', labelKey: 'TimeSeriesChart.RANGE_1_DAY' },
  { key: '1w', granularity: '4hour', labelKey: 'TimeSeriesChart.RANGE_1_WEEK' },
  { key: '1m', granularity: 'day', labelKey: 'TimeSeriesChart.RANGE_1_MONTH' },
  { key: '1y', granularity: 'month', labelKey: 'TimeSeriesChart.RANGE_1_YEAR' },
];

function SeriesToggleDot({ color, active }) {
  return (
    <Box
      component="span"
      data-testid="series-colour-dot"
      sx={{
        width: (theme) => theme.spacing(1.5),
        height: (theme) => theme.spacing(1.5),
        borderRadius: '50%',
        bgcolor: color,
        opacity: active ? 1 : 0.35,
      }}
    />
  );
}

/**
 * A time-series preset on ChartFrame + BarChart: a range picker (emits the
 * selected range AND its mapped granularity to the host) and series toggle
 * checkboxes, in the frame's toolbar slot.
 *
 * Presentational only — takes `data` and callbacks, never fetches. The host
 * owns fetching; this component owns which range is selected and which
 * series are visible, telling the host what changed via `onRangeChange`.
 *
 * Second y-axis is opt-in per series (CHART-5, reversing CHART-2's original
 * "toggles only" choice on operator instruction): a series with
 * `axis: 'secondary'` plots against a second, independently-scaled y-axis
 * (requires `secondaryYAxisLabel`). Omit `axis` (or set it to `'primary'`)
 * on every series for today's single-shared-axis behaviour, unchanged.
 */
export function TimeSeriesChart({
  title,
  subtitle,
  xAxisLabel,
  yAxisLabel,
  secondaryYAxisLabel,
  data,
  loading = false,
  error = false,
  onRangeChange,
  defaultRange = '1w',
  skipAnimation,
}) {
  const { t } = useTranslation();
  const palette = useNeutralChartPalette().categorical;
  const seriesConfig = data?.series || [];

  const [range, setRange] = useState(defaultRange);
  // Series identity (keys) is NOT assumed stable at mount: the host commonly
  // mounts with empty data and fills it asynchronously (fetch-after-mount),
  // so visibleKeys must sync as new keys appear rather than being captured
  // once. seenKeys tracks every key ever observed so that a key present in
  // seriesConfig but absent from visibleKeys is recognized as a deliberate
  // user toggle-off (stays off) rather than treated as new (defaulted
  // visible) on the next data update. Both are plain state (not a ref) and
  // updated together in the render body — React's documented pattern for
  // syncing derived state from props — so an interrupted/discarded render
  // (concurrent features) rolls both back together instead of leaving
  // seenKeys mutated while the paired visibleKeys update is dropped.
  const [seenKeys, setSeenKeys] = useState(() => new Set());
  const [visibleKeys, setVisibleKeys] = useState(() => new Set());

  const currentKeys = seriesConfig.map((series) => series.key);
  const newKeys = currentKeys.filter((key) => !seenKeys.has(key));
  if (newKeys.length > 0) {
    setSeenKeys((previous) => {
      const next = new Set(previous);
      newKeys.forEach((key) => next.add(key));
      return next;
    });
    setVisibleKeys((previous) => {
      const next = new Set(previous);
      newKeys.forEach((key) => next.add(key));
      return next;
    });
  }

  const handleRangeChange = (event) => {
    const nextRange = event.target.value;
    setRange(nextRange);
    const option = RANGE_OPTIONS.find((candidate) => candidate.key === nextRange);
    onRangeChange?.(nextRange, option?.granularity);
  };

  const toggleSeries = (key) => {
    setVisibleKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleSeries = seriesConfig.filter((series) => visibleKeys.has(series.key));
  // Preserve each series' color by its ORIGINAL index, not the filtered
  // position — otherwise toggling one series off shifts every remaining
  // series' color, breaking the swatch-to-series identity the toggles rely on.
  const visiblePalette = visibleSeries.map(
    (series) => palette[seriesConfig.indexOf(series) % palette.length],
  );
  const isDataEmpty = seriesConfig.length === 0 || visibleSeries.length === 0;

  const hasSecondaryAxis = seriesConfig.some((series) => series.axis === 'secondary');
  if (hasSecondaryAxis && !secondaryYAxisLabel) {
    throw new Error('TimeSeriesChart requires secondaryYAxisLabel when a series uses axis: "secondary".');
  }
  const primaryVisibleSeries = visibleSeries.filter((series) => series.axis !== 'secondary');
  const secondaryVisibleSeries = visibleSeries.filter((series) => series.axis === 'secondary');
  const yAxis = hasSecondaryAxis
    ? [
      {
        id: 'primary',
        label: yAxisLabel,
        // MUI defaultizes an axis with no explicit `position` to 'left' ONLY
        // for the first entry in the array -- every subsequent entry
        // defaults to 'none' (never drawn) unless given one explicitly.
        // Both are set here, not just 'secondary', so this stays correct
        // even if the array order ever changes.
        position: 'left',
        ...(isIntegerAxis(primaryVisibleSeries) ? { valueFormatter: integerTickFormatter } : {}),
      },
      {
        id: 'secondary',
        label: secondaryYAxisLabel,
        position: 'right',
        ...(isIntegerAxis(secondaryVisibleSeries) ? { valueFormatter: integerTickFormatter } : {}),
      },
    ]
    : (isIntegerAxis(primaryVisibleSeries) ? [{ valueFormatter: integerTickFormatter }] : undefined);

  const toolbar = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
      <RadioGroup
        row
        value={range}
        onChange={handleRangeChange}
        aria-label={t('TimeSeriesChart.RANGE_LABEL')}
      >
        {RANGE_OPTIONS.map((option) => (
          <FormControlLabel
            key={option.key}
            value={option.key}
            control={<Radio size="small" />}
            label={t(option.labelKey)}
          />
        ))}
      </RadioGroup>
      {seriesConfig.length > 0 && (
        <FormGroup row aria-label={t('TimeSeriesChart.SERIES_LABEL')}>
          {seriesConfig.map((series, index) => (
            <FormControlLabel
              key={series.key}
              control={(
                <Checkbox
                  size="small"
                  checked={visibleKeys.has(series.key)}
                  onChange={() => toggleSeries(series.key)}
                  icon={<SeriesToggleDot color={palette[index % palette.length]} active={false} />}
                  checkedIcon={<SeriesToggleDot color={palette[index % palette.length]} active />}
                  sx={seriesToggleSx(palette[index % palette.length])}
                />
              )}
              label={series.label}
            />
          ))}
        </FormGroup>
      )}
    </Box>
  );

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      toolbar={toolbar}
      loading={loading}
      error={error}
      isEmpty={isDataEmpty}
      minHeight={CHART_HEIGHT}
    >
      {!isDataEmpty && (
        <BarChart
          xAxisLabel={xAxisLabel}
          yAxisLabel={yAxisLabel}
          xAxis={[{
            data: data?.xLabels || [],
            tickLabelInterval: makeTickLabelInterval((data?.xLabels || []).length),
          }]}
          yAxis={yAxis}
          series={visibleSeries.map((series) => ({
            data: series.data,
            label: series.label,
            ...(hasSecondaryAxis && series.axis === 'secondary' ? { yAxisId: 'secondary' } : {}),
          }))}
          palette={visiblePalette}
          size="standard"
          hideLegend={seriesConfig.length > 0}
          skipAnimation={skipAnimation}
        />
      )}
    </ChartFrame>
  );
}

export default TimeSeriesChart;
