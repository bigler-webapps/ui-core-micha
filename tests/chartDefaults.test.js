// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';

const barSpy = vi.hoisted(() => vi.fn(() => null));
const lineSpy = vi.hoisted(() => vi.fn(() => null));
vi.mock('@mui/x-charts/BarChart', () => ({ BarChart: barSpy }));
vi.mock('@mui/x-charts/LineChart', () => ({ LineChart: lineSpy, MarkElement: 'path' }));

import { BarChart } from '../src/components/charts/BarChart';
import { LineChart } from '../src/components/charts/LineChart';
import { TimeSeriesChart } from '../src/components/charts/TimeSeriesChart';
import { createAppTheme } from '../src/theme/createAppTheme';

const theme = createAppTheme({ palette: { primary: { main: '#3D5A99' } } });
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

function withProviders(children) {
  return React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(I18nextProvider, { i18n }, children),
  );
}

function renderBar(props = {}) {
  return render(withProviders(
    React.createElement(BarChart, {
      xAxisLabel: 'Month',
      yAxisLabel: 'Cases',
      series: [{ label: 'Cases', data: [1, 2] }],
      ...props,
    }),
  ));
}

function renderLine(props = {}) {
  return render(withProviders(
    React.createElement(LineChart, {
      xAxisLabel: 'Month',
      yAxisLabel: 'Cases',
      series: [{ label: 'Cases', data: [1, 2] }],
      ...props,
    }),
  ));
}

describe('chart chrome defaults', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('gives minimal BarChart, LineChart, and TimeSeriesChart calls the baseline ticks and horizontal grid, with line marks off', () => {
    renderBar();
    const barProps = barSpy.mock.calls.at(-1)[0];
    expect(barProps.xAxis[0].tickLabelStyle.fontSize).toBe(theme.typography.caption.fontSize);
    expect(barProps.yAxis[0].tickLabelStyle.fontSize).toBe(theme.typography.caption.fontSize);
    expect(barProps.grid).toEqual({ horizontal: true });

    renderLine();
    const lineProps = lineSpy.mock.calls.at(-1)[0];
    expect(lineProps.xAxis[0].tickLabelStyle.fontSize).toBe(theme.typography.caption.fontSize);
    expect(lineProps.yAxis[0].tickLabelStyle.fontSize).toBe(theme.typography.caption.fontSize);
    expect(lineProps.grid).toEqual({ horizontal: true });
    expect(lineProps.series[0].showMark).toBe(false);

    render(withProviders(React.createElement(TimeSeriesChart, {
      title: 'Activity',
      xAxisLabel: 'Day',
      yAxisLabel: 'Cases',
      data: {
          xLabels: ['Mon', 'Tue'],
          series: [{ key: 'cases', label: 'Cases', data: [1, 2] }],
      },
      skipAnimation: true,
    })));
    const timeSeriesProps = barSpy.mock.calls.at(-1)[0];
    expect(timeSeriesProps.xAxis[0].tickLabelStyle.fontSize).toBe(theme.typography.caption.fontSize);
    expect(timeSeriesProps.yAxis[0].tickLabelStyle.fontSize).toBe(theme.typography.caption.fontSize);
    expect(timeSeriesProps.grid).toEqual({ horizontal: true });
    expect(timeSeriesProps.skipAnimation).toBe(true);
  });

  it('keeps caller tick font, grid, showMark, and legendPosition values instead of the defaults', () => {
    const legendPosition = { vertical: 'top', horizontal: 'end' };
    renderLine({
      xAxis: [{ data: ['Jan', 'Feb'], tickLabelStyle: { fontSize: 17 } }],
      grid: { horizontal: false, vertical: true },
      series: [{ label: 'Cases', data: [1, 2], showMark: true }],
      legendPosition,
    });

    const props = lineSpy.mock.calls.at(-1)[0];
    expect(props.xAxis[0].tickLabelStyle.fontSize).toBe(17);
    expect(props.grid).toEqual({ horizontal: false, vertical: true });
    expect(props.series[0].showMark).toBe(true);
    expect(props.slotProps.legend.position).toEqual(legendPosition);
  });

  it('adds a caller-requested vertical grid to the default horizontal grid', () => {
    renderLine({ grid: { vertical: true } });

    expect(lineSpy.mock.calls.at(-1)[0].grid).toEqual({
      horizontal: true,
      vertical: true,
    });
  });

  it('lets a caller switch off both grid directions explicitly', () => {
    renderBar({ grid: { horizontal: false, vertical: false } });

    expect(barSpy.mock.calls.at(-1)[0].grid).toEqual({
      horizontal: false,
      vertical: false,
    });
  });

  // Found live in the dev harness (not by this mocked test, which cannot
  // reproduce a real MUI scale computation): a caller-supplied xAxis with
  // `data` but no `scaleType` lost the wrapper's default scaleType entirely,
  // leaving MUI's point/band scale undefined and every rendered path NaN.
  // This asserts the prop-level contract; the harness's "Chart defaults" /
  // "Caller overrides" LineChart specimens are the real-render proof.
  it('keeps the default scaleType on a caller-supplied axis that does not set one', () => {
    renderLine({ xAxis: [{ data: ['Jan', 'Feb'] }] });
    expect(lineSpy.mock.calls.at(-1)[0].xAxis[0].scaleType).toBe('point');

    renderBar({ xAxis: [{ data: ['Jan', 'Feb'] }] });
    expect(barSpy.mock.calls.at(-1)[0].xAxis[0].scaleType).toBe('band');
  });

  it('adds a font-and-angle-derived bottom margin only for rotated tick labels', () => {
    renderBar({ xAxis: [{ data: ['Jan', 'Feb'], tickLabelStyle: { angle: -45 } }] });
    const rotatedProps = barSpy.mock.calls.at(-1)[0];
    expect(rotatedProps.margin.bottom).toBeGreaterThan(20);
    expect(rotatedProps.xAxis[0].height).toBeGreaterThan(45);

    cleanup();
    renderBar({ xAxis: [{ data: ['Jan', 'Feb'], tickLabelStyle: { angle: 0 } }] });
    expect(barSpy.mock.calls.at(-1)[0].margin).toBeUndefined();
  });

  it('uses the series colour as the fill when a caller opts line markers back in', () => {
    renderLine({ series: [{ label: 'Cases', data: [1, 2], showMark: true }] });
    const props = lineSpy.mock.calls.at(-1)[0];
    const mark = props.slots.mark({
      color: '#3D5A99',
      id: 'cases',
      dataIndex: 0,
      shape: 'circle',
      x: 10,
      y: 10,
    });

    expect(mark.props.style.fill).toBe('#3D5A99');
    expect(mark.props.style.fill).not.toBe(theme.palette.background.paper);
  });

  it('defaults legendPosition to bottom-start and lets a caller choose another MUI position', () => {
    renderBar({ series: [{ data: [1] }, { data: [2] }] });
    expect(barSpy.mock.calls.at(-1)[0].slotProps.legend.position).toEqual({
      vertical: 'bottom',
      horizontal: 'start',
    });

    cleanup();
    const requested = { vertical: 'middle' };
    renderBar({ series: [{ data: [1] }, { data: [2] }], legendPosition: requested });
    expect(barSpy.mock.calls.at(-1)[0].slotProps.legend.position).toEqual({
      vertical: 'middle',
      horizontal: 'start',
    });

    cleanup();
    renderBar({
      series: [{ data: [1] }, { data: [2] }],
      slotProps: { legend: { position: { horizontal: 'end' } } },
    });
    expect(barSpy.mock.calls.at(-1)[0].slotProps.legend.position).toEqual({
      vertical: 'bottom',
      horizontal: 'end',
    });
  });
});
