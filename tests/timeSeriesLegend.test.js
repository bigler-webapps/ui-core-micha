// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const chartSpy = vi.hoisted(() => vi.fn(() => null));
vi.mock('@mui/x-charts/BarChart', () => ({ BarChart: chartSpy }));

import { TimeSeriesChart } from '../src/components/charts/TimeSeriesChart';

chartSpy.mockImplementation((props) => React.createElement(
  'div',
  { 'data-testid': 'mui-bar-chart' },
  !props.hideLegend
    ? React.createElement('div', { 'data-testid': 'mui-legend' }, 'MUI legend')
    : null,
));

const i18n = i18next.createInstance();
i18n.init({
  lng: 'en',
  resources: {
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
  },
  interpolation: { escapeValue: false },
});

const MULTI_SERIES = {
  xLabels: ['Mon', 'Tue'],
  series: [
    { key: 'users', label: 'Users', data: [1, 2] },
    { key: 'hours', label: 'Presence hours', data: [3, 4] },
  ],
};

function renderChart(data = MULTI_SERIES) {
  return render(React.createElement(
    ThemeProvider,
    { theme: createTheme() },
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(TimeSeriesChart, {
        title: 'Activity',
        xAxisLabel: 'Day',
        yAxisLabel: 'Count',
        data,
      }),
    ),
  ),
  );
}

describe('TimeSeriesChart toolbar legend', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('removes the MUI legend when the toolbar names and toggles multiple series', () => {
    renderChart();

    expect(chartSpy.mock.calls.at(-1)[0].hideLegend).toBe(true);
    expect(screen.queryByTestId('mui-legend')).toBeNull();
  });

  it('keeps an accessible name on every toolbar series toggle', () => {
    renderChart();

    expect(screen.getByRole('checkbox', { name: 'Users' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Presence hours' })).toBeTruthy();
    expect(screen.getAllByTestId('series-colour-dot')).toHaveLength(2);
  });

  it('still hides the redundant MUI legend for a single series', () => {
    renderChart({
      xLabels: ['Mon', 'Tue'],
      series: [{ key: 'users', label: 'Users', data: [1, 2] }],
    });

    expect(chartSpy.mock.calls.at(-1)[0].hideLegend).toBe(true);
    expect(screen.queryByTestId('mui-legend')).toBeNull();
  });
});
