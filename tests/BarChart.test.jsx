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

  it('passes both axis labels, tooltip, the default "standard" height, and hides a single-series legend', () => {
    renderChart({ series: [{ data: [1, 2] }] });
    const props = chartSpy.mock.calls[0][0];

    expect(props.xAxis[0].label).toBe('Year');
    expect(props.yAxis[0].label).toBe('Value (kg)');
    expect(props.slotProps).toEqual({
      tooltip: { trigger: 'axis' },
      legend: { position: { vertical: 'bottom', horizontal: 'start' } },
    });
    expect(props.hideLegend).toBe(true);
    // UCM-CHART-12: size defaults to "standard" (320px, the historical default) -- the wrapper
    // always carries an explicit height now, width stays responsive.
    expect(props.height).toBe(320);
    expect(window.getComputedStyle(screen.getByTestId('bar-chart-container')).height).toBe('320px');
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

  // UCM-CHART-12: `size`/`height` resolution, wired through the actual component. Replaces the
  // deleted `minHeight`/`aspect` CHART-8 trio -- see the removed-prop assertions below for the
  // migration side of this.
  describe('size/height resolution (UCM-CHART-12)', () => {
    it.each([
      ['compact', 240],
      ['standard', 320],
      ['tall', 400],
    ])('resolves size="%s" to %ipx, on both the chart height and the wrapper', (size, px) => {
      renderChart({ series: [{ data: [1] }], size });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBe(px);
      expect(window.getComputedStyle(screen.getByTestId('bar-chart-container')).height).toBe(`${px}px`);
    });

    it('lets height override size entirely, as the documented escape', () => {
      renderChart({ series: [{ data: [1] }], size: 'tall', height: 280 });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBe(280);
      expect(window.getComputedStyle(screen.getByTestId('bar-chart-container')).height).toBe('280px');
    });

    it('throws in dev when a caller still passes minHeight, naming the replacement', () => {
      expect(() => renderChart({ series: [{ data: [1] }], minHeight: 300 })).toThrow(/size=.*standard.*tall/);
    });

    it('throws in dev when a caller still passes aspect, naming the removal', () => {
      expect(() => renderChart({ series: [{ data: [1] }], aspect: 1.8 })).toThrow(/aspect/);
    });

    it('throws in dev when a caller still passes margin, naming the removal', () => {
      expect(() => renderChart({ series: [{ data: [1] }], margin: { top: 1 } })).toThrow(/margin/);
    });
  });
});
