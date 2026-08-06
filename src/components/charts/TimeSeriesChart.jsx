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
const RANGE_OPTIONS = [
  { key: '1d', granularity: 'hour', labelKey: 'TimeSeriesChart.RANGE_1_DAY' },
  { key: '1w', granularity: '4hour', labelKey: 'TimeSeriesChart.RANGE_1_WEEK' },
  { key: '1m', granularity: 'day', labelKey: 'TimeSeriesChart.RANGE_1_MONTH' },
  { key: '1y', granularity: 'month', labelKey: 'TimeSeriesChart.RANGE_1_YEAR' },
];

/**
 * A time-series preset on ChartFrame + BarChart: a range picker (emits the
 * selected range AND its mapped granularity to the host) and series toggle
 * checkboxes, in the frame's toolbar slot.
 *
 * Presentational only — takes `data` and callbacks, never fetches. The host
 * owns fetching; this component owns which range is selected and which
 * series are visible, telling the host what changed via `onRangeChange`.
 *
 * No second y-axis: the series toggles (not a second axis) are the chosen
 * fix for two series sharing one y-axis at very different scales — toggling
 * one off rescales the axis and makes the other readable. This was a
 * deliberate choice, not an oversight (CHART-2 scope B).
 */
export function TimeSeriesChart({
  title,
  subtitle,
  xAxisLabel,
  yAxisLabel,
  data,
  loading = false,
  error = false,
  onRangeChange,
  defaultRange = '1w',
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
                  sx={{
                    color: palette[index % palette.length],
                    '&.Mui-checked': { color: palette[index % palette.length] },
                  }}
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
    >
      {!isDataEmpty && (
        <BarChart
          xAxisLabel={xAxisLabel}
          yAxisLabel={yAxisLabel}
          xAxis={[{ data: data?.xLabels || [] }]}
          series={visibleSeries.map((series) => ({ data: series.data, label: series.label }))}
          palette={visiblePalette}
        />
      )}
    </ChartFrame>
  );
}

export default TimeSeriesChart;
