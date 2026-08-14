// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const chartSpy = vi.hoisted(() => vi.fn((props) => <div data-testid="mui-bar-chart" data-props={JSON.stringify(props)} />));
vi.mock('@mui/x-charts/BarChart', () => ({ BarChart: chartSpy }));

import { TimeSeriesChart } from '../src/components/charts/TimeSeriesChart';

const resources = {
  en: {
    translation: {
      'TimeSeriesChart.RANGE_LABEL': 'Range',
      'TimeSeriesChart.RANGE_1_DAY': '1 day',
      'TimeSeriesChart.RANGE_1_WEEK': '1 week',
      'TimeSeriesChart.RANGE_1_MONTH': '1 month',
      'TimeSeriesChart.RANGE_1_YEAR': '1 year',
      'TimeSeriesChart.SERIES_LABEL': 'Series',
      'ChartFrame.EMPTY_DEFAULT': 'No data available.',
      'ChartFrame.LOADING': 'Loading chart.',
      'ChartFrame.ERROR_DEFAULT': 'The chart could not be loaded.',
    },
  },
};

const SAMPLE_DATA = {
  xLabels: ['Mon', 'Tue', 'Wed'],
  series: [
    { key: 'users', label: 'Users', data: [1, 2, 3] },
    { key: 'presence', label: 'Presence hours', data: [4, 5, 6] },
  ],
};

function renderChart(props = {}) {
  const i18n = i18next.createInstance();
  i18n.init({ lng: 'en', resources, interpolation: { escapeValue: false } });
  const wrap = (chartProps) => (
    <ThemeProvider theme={createTheme()}>
      <I18nextProvider i18n={i18n}>
        <TimeSeriesChart title="Activity" xAxisLabel="Day" yAxisLabel="Count" data={SAMPLE_DATA} {...chartProps} />
      </I18nextProvider>
    </ThemeProvider>
  );
  const view = render(wrap(props));
  return { ...view, rerenderWith: (nextProps) => view.rerender(wrap(nextProps)) };
}

describe('TimeSeriesChart', () => {
  afterEach(cleanup);

  // Required test 1: selecting a range emits both the range AND the mapped
  // granularity — asserts the emitted payload, not merely that the callback fired.
  it('emits both the range and its mapped granularity when a preset is selected', () => {
    const onRangeChange = vi.fn();
    renderChart({ onRangeChange });

    fireEvent.click(screen.getByRole('radio', { name: '1 day' }));

    expect(onRangeChange).toHaveBeenCalledWith('1d', 'hour');
  });

  it.each([
    ['1 week', '1w', '4hour'],
    ['1 month', '1m', 'day'],
    ['1 year', '1y', 'month'],
  ])('maps %s to range=%s granularity=%s', (label, rangeKey, granularity) => {
    const onRangeChange = vi.fn();
    // defaultRange is '1w' — start from a different preset so every clicked
    // option (including '1 week' itself) represents a real selection change.
    renderChart({ onRangeChange, defaultRange: '1d' });

    fireEvent.click(screen.getByRole('radio', { name: label }));

    expect(onRangeChange).toHaveBeenCalledWith(rangeKey, granularity);
  });

  // Required test 2: toggling a series off removes it, leaves the others.
  it('toggling a series off removes it from the rendered chart and leaves the other', () => {
    renderChart();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Users' }));

    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.series).toHaveLength(1);
    expect(props.series[0].label).toBe('Presence hours');
  });

  it('preserves the remaining series color when the other is toggled off', () => {
    renderChart();
    const initialProps = chartSpy.mock.calls.at(-1)[0];
    const presenceColorBefore = initialProps.colors[1];

    fireEvent.click(screen.getByRole('checkbox', { name: 'Users' }));

    const afterProps = chartSpy.mock.calls.at(-1)[0];
    expect(afterProps.colors[0]).toBe(presenceColorBefore);
  });

  // Required test 3: toggling all series off renders a stable empty chart.
  it('toggling all series off renders a stable empty chart, no crash, no spinner', () => {
    renderChart();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Users' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Presence hours' }));

    expect(screen.getByText('No data available.')).toBeTruthy();
    expect(screen.queryByLabelText('Loading chart.')).toBeNull();
    expect(screen.queryByTestId('mui-bar-chart')).toBeNull();
  });

  // Required test 4: renders ChartFrame's empty state for empty data, exactly once.
  it("renders ChartFrame's empty state for empty data, exactly once", () => {
    renderChart({ data: { xLabels: [], series: [] } });

    expect(screen.getAllByText('No data available.')).toHaveLength(1);
    expect(screen.queryByTestId('mui-bar-chart')).toBeNull();
  });

  it('range picker and series toggles pass through loading and error to ChartFrame', () => {
    renderChart({ loading: true });
    expect(screen.getByLabelText('Loading chart.')).toBeTruthy();
  });

  // CHART-4 regression: neither ChartFrame nor BarChart ever received a
  // height, so MUI X-Charts' responsive container measured a zero-height
  // parent and drew no bars/axes (only the legend, sized by its own content,
  // showed) -- confirmed live in production. A structural/rendered-size
  // assertion in jsdom is NOT reliable here (verified: it stays green even
  // without the fix, since jsdom's ResizeObserver handling doesn't reflect
  // the real zero-height-parent browser behaviour) -- this asserts directly
  // on the wiring instead: BarChart must receive a real, non-zero `height`,
  // matching the confirmed-working dev/entries.jsx BarChartEntry reference
  // (MUI's own native height prop, forwarded via BarChart's ...chartProps).
  it('CHART-4: passes a real, non-zero height through to the underlying MUI BarChart', () => {
    renderChart();

    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.height).toBeGreaterThan(0);
  });

  // CHART-3 regression: visibleKeys must not be captured only at first mount.
  // Reproduces the live bug — host mounts with empty data, fetches
  // asynchronously, then rerenders with real data. Before the fix this stayed
  // on ChartFrame's empty state forever even with real series present.
  it('CHART-3: renders the chart once data arrives after an empty-data mount', () => {
    const { rerenderWith } = renderChart({ data: { xLabels: [], series: [] } });
    expect(screen.getByText('No data available.')).toBeTruthy();
    expect(screen.queryByTestId('mui-bar-chart')).toBeNull();

    rerenderWith({ data: SAMPLE_DATA });

    expect(screen.queryByText('No data available.')).toBeNull();
    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.series).toHaveLength(2);
  });

  it('CHART-3: preserves a manual toggle-off across a data update that keeps the same key', () => {
    const { rerenderWith } = renderChart({ data: SAMPLE_DATA });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Users' }));
    let props = chartSpy.mock.calls.at(-1)[0];
    expect(props.series.map((series) => series.label)).toEqual(['Presence hours']);

    rerenderWith({
      data: {
        xLabels: ['Mon', 'Tue', 'Wed', 'Thu'],
        series: [
          { key: 'users', label: 'Users', data: [1, 2, 3, 4] },
          { key: 'presence', label: 'Presence hours', data: [4, 5, 6, 7] },
        ],
      },
    });

    props = chartSpy.mock.calls.at(-1)[0];
    expect(props.series.map((series) => series.label)).toEqual(['Presence hours']);
  });

  it('CHART-3: a series key appearing later defaults to visible while an earlier toggle-off survives', () => {
    const { rerenderWith } = renderChart({
      data: { xLabels: ['Mon'], series: [{ key: 'users', label: 'Users', data: [1] }] },
    });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Users' }));
    expect(screen.getByText('No data available.')).toBeTruthy();

    rerenderWith({
      data: {
        xLabels: ['Mon'],
        series: [
          { key: 'users', label: 'Users', data: [1] },
          { key: 'presence', label: 'Presence hours', data: [2] },
        ],
      },
    });

    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.series.map((series) => series.label)).toEqual(['Presence hours']);
  });

  // CHART-5: second y-axis (opt-in per series via `axis: 'secondary'`),
  // auto-detected integer-only tick formatting per axis, and a deterministic
  // x-axis tickLabelInterval. Learned from CHART-4's own history in this
  // file: assertions here are on the captured functions/props passed to the
  // mocked MuiBarChart, never on real jsdom-rendered tick visibility/position
  // (proven vacuous for that in CHART-4 -- jsdom's layout/ResizeObserver
  // handling doesn't reproduce real-browser collision behaviour).
  const MIXED_DATA = {
    xLabels: ['Mon', 'Tue', 'Wed'],
    series: [
      { key: 'users', label: 'Users', data: [1, 2, 3] },
      { key: 'presence', label: 'Presence hours', data: [4.5, 5.2, 6.1] },
    ],
  };

  it('CHART-5: no custom (integer-blanking) yAxis formatter when the shared single axis is not all-integer (today\'s real case)', () => {
    renderChart({ data: MIXED_DATA });

    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.yAxis).toHaveLength(1);
    // THEME-9: BarChart now always supplies a default (locale-grouped, non-
    // blanking) tick formatter, so this is no longer undefined -- but it
    // must still be BarChart's generic default, not CHART-5's own
    // integer-blanking one (which would wrongly blank the 4.5/5.2/6.1 ticks).
    expect(typeof props.yAxis[0].valueFormatter).toBe('function');
    expect(props.yAxis[0].valueFormatter(4.5, { location: 'tick' })).not.toBe('');
    expect(props.yAxis[0].label).toBe('Count');
  });

  it('CHART-5: auto-applies an integer tick formatter to a single shared axis that is all-integer', () => {
    renderChart(); // SAMPLE_DATA: both series are whole numbers

    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.yAxis).toHaveLength(1);
    expect(typeof props.yAxis[0].valueFormatter).toBe('function');
  });

  it('CHART-5: dual axis activates with two labelled yAxis entries and correct yAxisId wiring', () => {
    const data = {
      xLabels: ['Mon', 'Tue', 'Wed'],
      series: [
        { key: 'users', label: 'Users', data: [1, 2, 3] },
        { key: 'presence', label: 'Presence hours', data: [4.5, 5.2, 6.1], axis: 'secondary' },
      ],
    };
    renderChart({ data, secondaryYAxisLabel: 'Hours' });

    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.yAxis).toEqual([
      expect.objectContaining({ id: 'primary', label: 'Count' }),
      expect.objectContaining({ id: 'secondary', label: 'Hours' }),
    ]);
    const usersSeries = props.series.find((series) => series.label === 'Users');
    const presenceSeries = props.series.find((series) => series.label === 'Presence hours');
    expect(usersSeries.yAxisId).toBeUndefined();
    expect(presenceSeries.yAxisId).toBe('secondary');
  });

  // CHART-5 (found live via the ui-core-micha dev harness -- MUI defaultizes
  // every yAxis entry after the first to `position: 'none'` unless told
  // otherwise, per node_modules/@mui/x-charts/internals/.../defaultizeAxis.js
  // (`defaultPosition = index === 0 ? 'left' : 'none'`), so the secondary
  // axis never actually rendered in a real browser despite chartSpy's mocked
  // props looking correct -- a class of bug no mocked-BarChart test in this
  // file can catch by construction (the mock doesn't run MUI's own
  // defaulting logic). Left here as the one explicit prop-shape assertion
  // that would have caught it, plus the note above for future readers.
  it('CHART-5: dual axis entries explicitly set position (left/right), not just id/label', () => {
    const data = {
      xLabels: ['Mon', 'Tue', 'Wed'],
      series: [
        { key: 'users', label: 'Users', data: [1, 2, 3] },
        { key: 'presence', label: 'Presence hours', data: [4.5, 5.2, 6.1], axis: 'secondary' },
      ],
    };
    renderChart({ data, secondaryYAxisLabel: 'Hours' });

    const props = chartSpy.mock.calls.at(-1)[0];
    const primaryAxis = props.yAxis.find((axis) => axis.id === 'primary');
    const secondaryAxis = props.yAxis.find((axis) => axis.id === 'secondary');
    expect(primaryAxis.position).toBe('left');
    expect(secondaryAxis.position).toBe('right');
  });

  it('CHART-5: dual axis applies the integer formatter only to the axis that is actually all-integer', () => {
    const data = {
      xLabels: ['Mon', 'Tue', 'Wed'],
      series: [
        { key: 'users', label: 'Users', data: [1, 2, 3], axis: 'primary' },
        { key: 'presence', label: 'Presence hours', data: [4.5, 5.2, 6.1], axis: 'secondary' },
      ],
    };
    renderChart({ data, secondaryYAxisLabel: 'Hours' });

    const props = chartSpy.mock.calls.at(-1)[0];
    const primaryAxis = props.yAxis.find((axis) => axis.id === 'primary');
    const secondaryAxis = props.yAxis.find((axis) => axis.id === 'secondary');
    expect(primaryAxis.valueFormatter(2, { location: 'tick' })).toBe('2');
    expect(primaryAxis.valueFormatter(2.5, { location: 'tick' })).toBe('');
    // THEME-9: BarChart's own default formatter now covers the secondary
    // axis too (a function, not undefined) -- distinguished from the
    // integer-blanking one above by NOT blanking a non-integer tick.
    expect(typeof secondaryAxis.valueFormatter).toBe('function');
    expect(secondaryAxis.valueFormatter(4.5, { location: 'tick' })).not.toBe('');
  });

  it('CHART-5: throws when a series declares axis "secondary" without secondaryYAxisLabel', () => {
    const data = {
      xLabels: ['Mon'],
      series: [{ key: 'presence', label: 'Presence hours', data: [4.5], axis: 'secondary' }],
    };
    expect(() => renderChart({ data })).toThrow(
      'TimeSeriesChart requires secondaryYAxisLabel when a series uses axis: "secondary".',
    );
  });

  it('CHART-5: the integer tick formatter blanks non-integer tick labels but not tooltip/legend values', () => {
    renderChart(); // SAMPLE_DATA, single all-integer axis

    const { valueFormatter } = chartSpy.mock.calls.at(-1)[0].yAxis[0];
    expect(valueFormatter(2, { location: 'tick' })).toBe('2');
    expect(valueFormatter(2.5, { location: 'tick' })).toBe('');
    expect(valueFormatter(2.5, { location: 'tooltip' })).toBe('2.5');
  });

  it('CHART-5: toggling the non-integer series off switches the shared axis to integer-formatted', () => {
    renderChart({ data: MIXED_DATA });
    // THEME-9: BarChart's default formatter is present from the start now,
    // so the CHART-5-specific signal is that a non-integer tick is NOT
    // blanked yet -- the integer-blanking formatter isn't active.
    expect(chartSpy.mock.calls.at(-1)[0].yAxis[0].valueFormatter(4.5, { location: 'tick' })).not.toBe('');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Presence hours' }));

    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.yAxis[0].valueFormatter(4.5, { location: 'tick' })).toBe('');
  });

  it('CHART-5: x-axis tickLabelInterval guarantees some labels always show, evenly spread', () => {
    const manyLabels = Array.from({ length: 24 }, (_, i) => `Bucket ${i}`);
    const data = { ...SAMPLE_DATA, xLabels: manyLabels, series: [SAMPLE_DATA.series[0]] };
    renderChart({ data });

    const { tickLabelInterval } = chartSpy.mock.calls.at(-1)[0].xAxis[0];
    expect(typeof tickLabelInterval).toBe('function');

    const visibleIndices = manyLabels.map((_, index) => index).filter((index) => tickLabelInterval(manyLabels[index], index));
    expect(visibleIndices.length).toBeGreaterThanOrEqual(3);
    expect(visibleIndices).toContain(0);
  });

  // CHART-5 (found by ui_reviewer): `index % step === 0` alone systematically
  // drops the FINAL bucket unless it happens to land on a step boundary --
  // e.g. 24 labels / step 3 covers 0..21, never 23. The most recent time
  // bucket is usually the one that matters most on a time-series chart.
  it.each([24, 12, 7, 1])('CHART-5: tickLabelInterval always includes the last bucket (labelCount=%i)', (labelCount) => {
    const manyLabels = Array.from({ length: labelCount }, (_, i) => `Bucket ${i}`);
    const data = { ...SAMPLE_DATA, xLabels: manyLabels, series: [SAMPLE_DATA.series[0]] };
    renderChart({ data });

    const { tickLabelInterval } = chartSpy.mock.calls.at(-1)[0].xAxis[0];
    expect(tickLabelInterval(manyLabels.at(-1), labelCount - 1)).toBe(true);
  });
});
