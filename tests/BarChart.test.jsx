// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const chartSpy = vi.hoisted(() => vi.fn((props) => <div data-testid="mui-bar-chart" data-props={JSON.stringify(props)} />));
vi.mock('@mui/x-charts/BarChart', () => ({ BarChart: chartSpy }));

import { BarChart } from '../src/components/charts/BarChart';

function renderChart(props) {
  return render(
    <ThemeProvider theme={createTheme({ palette: { primary: { main: 'rgb(1, 2, 3)' } } })}>
      <BarChart xAxisLabel="Year" yAxisLabel="Value (kg)" {...props} />
    </ThemeProvider>,
  );
}

describe('BarChart preset', () => {
  afterEach(cleanup);

  it('passes both axis labels, tooltip, responsive sizing, and hides a single-series legend', () => {
    renderChart({ series: [{ data: [1, 2] }] });
    const props = chartSpy.mock.calls[0][0];

    expect(props.xAxis[0].label).toBe('Year');
    expect(props.yAxis[0].label).toBe('Value (kg)');
    expect(props.slotProps).toEqual({
      tooltip: { trigger: 'axis' },
      legend: { position: { vertical: 'bottom', horizontal: 'start' } },
    });
    expect(props.hideLegend).toBe(true);
    expect(screen.getByTestId('bar-chart-container').getAttribute('style') || '').not.toContain('px');
  });

  it.each([
    ['grouped', [{ data: [1] }, { data: [2] }], undefined],
    ['stacked', [{ data: [1], stack: 'total' }, { data: [2], stack: 'total' }], undefined],
    ['dual axis', [{ data: [1], yAxisId: 'secondary' }, { data: [2] }], [{ id: 'primary' }, { id: 'secondary' }]],
  ])('renders the %s variant with a legend for multiple series', (_name, series, yAxis) => {
    renderChart({ series, yAxis });
    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.hideLegend).toBe(false);
    expect(props.series).toEqual(series);
  });

  it('passes a caller palette through without substituting a hardcoded colour', () => {
    renderChart({ series: [{ data: [1] }], palette: ['var(--application-chart-colour)'] });
    expect(chartSpy.mock.calls.at(-1)[0].colors).toEqual(['var(--application-chart-colour)']);
  });

  // THEME-9: DESIGN.md #8a makes an axis title the caller's per-axis
  // decision (categorical axes default to none) -- a hard "both required"
  // throw made that default unachievable through this preset. Omitting a
  // label now renders no title for that axis rather than crashing.
  it('renders without a title on an axis whose label was omitted', () => {
    render(
      <ThemeProvider theme={createTheme()}><BarChart series={[{ data: [1] }]} xAxisLabel="Year" /></ThemeProvider>,
    );
    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.xAxis[0].label).toBe('Year');
    expect(props.yAxis[0].label).toBeUndefined();
  });

  it('renders with no title on either axis when both labels are omitted', () => {
    render(
      <ThemeProvider theme={createTheme()}><BarChart series={[{ data: [1] }]} /></ThemeProvider>,
    );
    const props = chartSpy.mock.calls.at(-1)[0];
    expect(props.xAxis[0].label).toBeUndefined();
    expect(props.yAxis[0].label).toBeUndefined();
  });
});
