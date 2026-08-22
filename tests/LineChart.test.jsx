// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const chartSpy = vi.hoisted(() => vi.fn(() => <div data-testid="mui-line-chart" />));
vi.mock('@mui/x-charts/LineChart', () => ({ LineChart: chartSpy, MarkElement: 'path' }));

import { LineChart } from '../src/components/charts/LineChart';

describe('LineChart preset', () => {
  afterEach(cleanup);

  it('renders multi-series time data with labelled axes, legend, and tooltip', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <LineChart
          xAxisLabel="Date"
          yAxisLabel="Rate (%)"
          xAxis={[{ scaleType: 'point', data: ['2026-01', '2026-02'] }]}
          series={[{ data: [1, 2] }, { data: [2, 3] }]}
        />
      </ThemeProvider>,
    );

    const props = chartSpy.mock.calls[0][0];
    expect(props.xAxis[0].label).toBe('Date');
    expect(props.yAxis[0].label).toBe('Rate (%)');
    expect(props.hideLegend).toBe(false);
    expect(props.slotProps).toEqual({
      tooltip: { trigger: 'axis' },
      legend: { position: { vertical: 'bottom', horizontal: 'start' } },
    });
  });

  // UCM-CHART-12: `size`/`height` resolution, wired through the actual component. Replaces the
  // deleted `minHeight`/`aspect` CHART-8 trio.
  describe('size/height resolution (UCM-CHART-12)', () => {
    function renderLine(props) {
      return render(
        <ThemeProvider theme={createTheme()}>
          <LineChart series={[{ data: [1, 2] }]} {...props} />
        </ThemeProvider>,
      );
    }

    afterEach(cleanup);

    it.each([
      ['compact', 240],
      ['standard', 320],
      ['tall', 400],
    ])('resolves size="%s" to %ipx, on both the chart height and the wrapper', (size, px) => {
      renderLine({ size });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBe(px);
      expect(window.getComputedStyle(screen.getByTestId('line-chart-container')).height).toBe(`${px}px`);
    });

    it('lets height override size entirely, as the documented escape', () => {
      renderLine({ size: 'compact', height: 280 });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBe(280);
      expect(window.getComputedStyle(screen.getByTestId('line-chart-container')).height).toBe('280px');
    });

    it('throws in dev when a caller still passes minHeight, naming the replacement', () => {
      expect(() => renderLine({ minHeight: 300 })).toThrow(/size=.*standard.*tall/);
    });

    it('throws in dev when a caller still passes aspect, naming the removal', () => {
      expect(() => renderLine({ aspect: 1.8 })).toThrow(/aspect/);
    });

    it('throws in dev when a caller still passes margin, naming the removal', () => {
      expect(() => renderLine({ margin: { top: 1 } })).toThrow(/margin/);
    });
  });
});
