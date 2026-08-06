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
});
