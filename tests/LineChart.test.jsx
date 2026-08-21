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

  // CHART-8: minHeight/height/aspect resolution, wired through the actual component.
  describe('minHeight/height resolution (CHART-8)', () => {
    function renderLine(props) {
      return render(
        <ThemeProvider theme={createTheme()}>
          <LineChart series={[{ data: [1, 2] }]} {...props} />
        </ThemeProvider>,
      );
    }

    afterEach(cleanup);

    it('sizes the chart from minHeight alone when neither height nor aspect is set', () => {
      renderLine({ minHeight: 300 });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBe(300);
      expect(window.getComputedStyle(screen.getByTestId('line-chart-container')).minHeight).toBe('300px');
    });

    it('leaves minHeight as a floor and gives the chart no fixed height when aspect is set (no height)', () => {
      renderLine({ minHeight: 320, aspect: 1.8 });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBeUndefined();
      const style = window.getComputedStyle(screen.getByTestId('line-chart-container'));
      expect(style.minHeight).toBe('320px');
      expect(style.aspectRatio).toBe('1.8 / 1');
    });

    it('caps the wrapper at height when minHeight is larger, closing the dead-space gap', () => {
      renderLine({ minHeight: 420, height: 380 });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBe(380);
      expect(window.getComputedStyle(screen.getByTestId('line-chart-container')).minHeight).toBe('380px');
    });

    it('is byte-identical when minHeight equals height', () => {
      renderLine({ minHeight: 320, height: 320 });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBe(320);
      expect(window.getComputedStyle(screen.getByTestId('line-chart-container')).minHeight).toBe('320px');
    });

    it('is unchanged when height is passed alone', () => {
      renderLine({ height: 280 });
      expect(chartSpy.mock.calls.at(-1)[0].height).toBe(280);
      expect(window.getComputedStyle(screen.getByTestId('line-chart-container')).minHeight).toBe('auto');
    });
  });
});
