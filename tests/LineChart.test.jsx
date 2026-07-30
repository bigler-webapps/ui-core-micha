// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const chartSpy = vi.hoisted(() => vi.fn(() => <div data-testid="mui-line-chart" />));
vi.mock('@mui/x-charts/LineChart', () => ({ LineChart: chartSpy }));

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
    expect(props.slotProps).toEqual({ tooltip: { trigger: 'axis' } });
  });
});
