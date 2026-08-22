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
import {
  CHART_SIZE_SPACING_UNITS,
  PACKAGE_DEFAULT_MARGIN,
  assertRemovedChartProp,
  defaultNumericTickFormatter,
  resolveChartLayout,
  resolveLegendPosition,
  sizeYAxisForContent,
  withAxisDefaults,
  withChartSlotDefaults,
} from '../src/components/charts/chartDefaults';
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
    // UCM-CHART-12: TimeSeriesChart's inner BarChart now takes size="standard" instead of a
    // fixed height prop -- the resolved height must still land on the historical 320px default.
    expect(timeSeriesProps.height).toBe(320);
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

  // UCM-CHART-12: rotation is now an explicit xLabels="angled" request, not an implicit
  // consequence of a caller-supplied tickLabelStyle.angle -- replaces the old CHART-10 regression
  // test (grows only xAxis.height, never margin.bottom on top of it) against the new API.
  it('grows only xAxis.height for xLabels="angled", never margin.bottom on top of it', () => {
    renderBar({
      xAxis: [{ data: ['A label long enough to need real rotation room'] }],
      xLabels: 'angled',
    });
    const rotatedProps = barSpy.mock.calls.at(-1)[0];
    expect(rotatedProps.margin.bottom).toBe(PACKAGE_DEFAULT_MARGIN.bottom);
    expect(rotatedProps.xAxis[0].height).toBeGreaterThan(45);

    cleanup();
    renderBar({ xAxis: [{ data: ['Jan', 'Feb'] }], xLabels: 'horizontal' });
    expect(barSpy.mock.calls.at(-1)[0].margin.bottom).toBe(PACKAGE_DEFAULT_MARGIN.bottom);
  });

  // THEME-11 -- the package forms its own opinion on chart margins (was: MUI's own flat 20px on
  // every side). UCM-CHART-12: there is no caller-facing `margin` prop any more (the model owns
  // spacing completely), so these assert the rendered default directly rather than through
  // `withMarginDefaults`, which UCM-CHART-12 removed as dead code once its only caller (the
  // deleted `margin` prop) was gone.
  describe('package margin default (THEME-11 / UCM-CHART-12)', () => {
    it('applies the package default on every side when there is no legend to make room for', () => {
      renderBar({ hideLegend: true });
      expect(barSpy.mock.calls.at(-1)[0].margin).toEqual(PACKAGE_DEFAULT_MARGIN);
    });

    it('gives a rotated-tick chart the same flat package bottom margin as an unrotated one', () => {
      renderBar({
        xAxis: [{ data: ['January', 'February'] }],
        xLabels: 'angled',
        hideLegend: true,
      });
      const props = barSpy.mock.calls.at(-1)[0];
      expect(props.margin.bottom).toBe(PACKAGE_DEFAULT_MARGIN.bottom);
      expect(props.xAxis[0].height).toBeGreaterThan(45);
    });

    it('keeps a wider default right margin than left/bottom, for a linear x-axis\'s edge-sitting last tick', () => {
      expect(PACKAGE_DEFAULT_MARGIN.right).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.left);
      expect(PACKAGE_DEFAULT_MARGIN.right).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.bottom);
    });

    it('applies the SAME package default to LineChart as BarChart', () => {
      renderLine({ hideLegend: true });
      expect(lineSpy.mock.calls.at(-1)[0].margin).toEqual(PACKAGE_DEFAULT_MARGIN);
    });

    it('grows margin.bottom by the legend band when a legend renders at the bottom (the default)', () => {
      renderBar({ series: [{ data: [1] }, { data: [2] }] }); // 2 series -> legend shown
      const props = barSpy.mock.calls.at(-1)[0];
      expect(props.margin.bottom).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.bottom);
      expect(props.margin.top).toBe(PACKAGE_DEFAULT_MARGIN.top);
    });

    it('grows margin.top instead when legendPosition.vertical is "top"', () => {
      renderBar({
        series: [{ data: [1] }, { data: [2] }],
        legendPosition: { vertical: 'top' },
      });
      const props = barSpy.mock.calls.at(-1)[0];
      expect(props.margin.top).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.top);
      expect(props.margin.bottom).toBe(PACKAGE_DEFAULT_MARGIN.bottom);
    });
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

// UCM-CHART-12: removed props (`minHeight`, `aspect`, `margin`) throw a dev-mode error naming
// their replacement instead of being silently ignored -- 38 existing call sites across the estate
// hit this. Gated on NODE_ENV so a shared package cannot crash a consumer's production page.
describe('removed chart props throw in dev, naming their replacement (UCM-CHART-12)', () => {
  afterEach(cleanup);

  it('assertRemovedChartProp is a no-op when the value is unset', () => {
    expect(() => assertRemovedChartProp('BarChart', 'minHeight', undefined, 'x')).not.toThrow();
  });

  it('assertRemovedChartProp throws in development, naming the component, prop, and replacement', () => {
    expect(() => assertRemovedChartProp('BarChart', 'minHeight', 320, 'Use size instead.'))
      .toThrow(/BarChart.*minHeight.*Use size instead\./s);
  });

  // UCM-CHART-13 (codex review finding): a shared helper hardcoding one WO/version string would
  // misattribute the removal for a different call site's own, different removal.
  it('defaults removedIn to UCM-CHART-12/v3.0.0 (the four presets\' own call sites), but a caller can override it', () => {
    expect(() => assertRemovedChartProp('BarChart', 'minHeight', 320, 'Use size instead.'))
      .toThrow(/UCM-CHART-12, v3\.0\.0/);
    expect(() => assertRemovedChartProp('ChartFrame', 'aspect', 1.8, 'Use size instead.', 'UCM-CHART-13, v3.1.0'))
      .toThrow(/UCM-CHART-13, v3\.1\.0/);
  });

  it('assertRemovedChartProp stays inert in production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => assertRemovedChartProp('BarChart', 'minHeight', 320, 'Use size instead.')).not.toThrow();
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it.each([
    ['BarChart', BarChart, 'minHeight', 320],
    ['BarChart', BarChart, 'aspect', 1.8],
    ['BarChart', BarChart, 'margin', { top: 1 }],
    ['LineChart', LineChart, 'minHeight', 320],
    ['LineChart', LineChart, 'aspect', 1.8],
    ['LineChart', LineChart, 'margin', { top: 1 }],
  ])('%s throws when a caller still passes %s', (_name, Component, prop, value) => {
    expect(() => render(withProviders(React.createElement(Component, {
      series: [{ label: 'Cases', data: [1, 2] }],
      [prop]: value,
    })))).toThrow();
  });
});

// UCM-CHART-12 -- the composition invariant, the actual deliverable of this WO. Two things are
// asserted per case, and they are NOT the same guarantee (reviewer finding R1):
// (1) the SUM `plotHeight + xAxisBand + xTitleBand + legendBand === chartHeight` -- true by
//     construction (`plotHeight` is defined as the residual of the other three), so on its own
//     this proves only that `resolveChartLayout`'s return shape is internally consistent, NOT the
//     absence of a double-counted term.
// (2) the PER-TERM MAPPING -- `xAxis[0].height` carries EXACTLY `xAxisBand + xTitleBand` and
//     nothing else, `margin`'s growth over the package baseline carries EXACTLY `legendBand` and
//     nothing else. THIS is what would have caught a `UCM-CHART-10`-shaped bug (the same
//     allowance reserved twice, once in axis height and again in margin) -- assertion (1) alone
//     would not have, since a term double-counted in both places still sums correctly.
describe('resolveChartLayout composition invariant (UCM-CHART-12)', () => {
  const bandAxis = (data) => [{ scaleType: 'band', data, label: undefined }];

  it.each([
    ['none', []],
    ['short', ['Jan', 'Feb']],
    ['long', ['A much longer ward name than the others']],
    ['long-and-many', Array.from({ length: 12 }, (_, i) => `Ward number ${i} with a longish name`)],
    ['empty-strings', ['', '', '']],
  ])('holds the height invariant for the "%s" label load, with no term double-counted', (_label, data) => {
    const layout = resolveChartLayout({
      size: 'standard',
      xAxis: bandAxis(data),
      yAxis: [{ scaleType: 'linear', min: 0, max: 100 }],
      spacing: theme.spacing,
      measureTextWidth: () => null, // force the deterministic estimate fallback
    });
    const { bands } = layout;
    expect(bands.plotHeight + bands.xAxisBand + bands.xTitleBand + bands.legendBand)
      .toBe(layout.chartHeight);
    // The per-term mapping -- the actual double-count guard (see the describe-level comment).
    expect(layout.xAxis[0].height).toBe(bands.xAxisBand + bands.xTitleBand);
    expect(layout.margin.top + layout.margin.bottom - PACKAGE_DEFAULT_MARGIN.top - PACKAGE_DEFAULT_MARGIN.bottom)
      .toBe(bands.legendBand);
  });

  it('collapses the x-axis band to zero when every tick label is blank (the Access-scatter case)', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['', '', ''] }],
      yAxis: [{ scaleType: 'linear' }],
      spacing: theme.spacing,
    });
    expect(layout.bands.xAxisBand).toBe(0);
    expect(layout.xAxis[0].height).toBe(0);
  });

  it('collapses the x-axis band to zero when there is no tick data at all', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: [] }],
      yAxis: [{ scaleType: 'linear' }],
      spacing: theme.spacing,
    });
    expect(layout.bands.xAxisBand).toBe(0);
  });

  it('assumes non-empty content when the axis has no data array at all (a numeric scale)', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'linear' }],
      yAxis: [{ scaleType: 'linear' }],
      spacing: theme.spacing,
    });
    expect(layout.bands.xAxisBand).toBeGreaterThan(0);
  });

  it('reserves the x-title band only when the x-axis carries a label', () => {
    const withoutTitle = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'] }],
      yAxis: [{ scaleType: 'linear' }],
      spacing: theme.spacing,
    });
    expect(withoutTitle.bands.xTitleBand).toBe(0);

    const withTitle = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'], label: 'Month' }],
      yAxis: [{ scaleType: 'linear' }],
      spacing: theme.spacing,
    });
    expect(withTitle.bands.xTitleBand).toBeGreaterThan(0);
  });

  it('reserves the legend band only when the legend is not hidden', () => {
    const hidden = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'] }],
      yAxis: [{ scaleType: 'linear' }],
      hideLegend: true,
      spacing: theme.spacing,
    });
    expect(hidden.bands.legendBand).toBe(0);

    const shown = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'] }],
      yAxis: [{ scaleType: 'linear' }],
      hideLegend: false,
      spacing: theme.spacing,
    });
    expect(shown.bands.legendBand).toBeGreaterThan(0);
  });

  // Reviewer finding R2: a `vertical: 'middle'` legend renders on the SIDE (consuming width, not
  // height) -- it must not reserve a height band or grow margin.top/bottom, or the height
  // invariant would over-reserve height for space the legend never occupies there.
  it('reserves no height band for a side-placed ("middle") legend', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'] }],
      yAxis: [{ scaleType: 'linear' }],
      hideLegend: false,
      legendPosition: { vertical: 'middle' },
      spacing: theme.spacing,
    });
    expect(layout.bands.legendBand).toBe(0);
    expect(layout.margin.top).toBe(PACKAGE_DEFAULT_MARGIN.top);
    expect(layout.margin.bottom).toBe(PACKAGE_DEFAULT_MARGIN.bottom);
  });

  it('holds the width invariant when a containerWidth is supplied (test-only -- presets never pass this)', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan', 'Feb'] }],
      yAxis: [{ scaleType: 'linear', min: 0, max: 250000 }],
      tickFontSize: 12,
      spacing: theme.spacing,
      containerWidth: 600,
    });
    const { bands } = layout;
    expect(bands.yAxisBand + bands.plotWidth + bands.rightPad).toBe(600);
    expect(bands.yAxisBand).toBeGreaterThan(0);
  });

  // Codex second-pass review finding: a dual-axis chart (TimeSeriesChart's axis: 'secondary'
  // feature) has a SECOND y-axis on the right, which the resolver previously ignored entirely --
  // `sizedYAxis[0]` was the only width ever accounted for. The width invariant must include it.
  it('accounts for a secondary (right-positioned) y-axis in both margin.right and the width invariant', () => {
    const single = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan', 'Feb'] }],
      yAxis: [{ scaleType: 'linear', id: 'primary', min: 0, max: 100 }],
      tickFontSize: 12,
      spacing: theme.spacing,
      containerWidth: 600,
    });
    const dual = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan', 'Feb'] }],
      yAxis: [
        { scaleType: 'linear', id: 'primary', position: 'left', min: 0, max: 100 },
        { scaleType: 'linear', id: 'secondary', position: 'right', min: 0, max: 500000 },
      ],
      tickFontSize: 12,
      spacing: theme.spacing,
      containerWidth: 600,
    });

    expect(dual.bands.secondaryYAxisBand).toBeGreaterThan(0);
    // The wider secondary axis (500000 vs 100) must reserve MORE than the primary alone.
    expect(dual.margin.right).toBeGreaterThan(single.margin.right);
    expect(dual.margin.right).toBe(PACKAGE_DEFAULT_MARGIN.right + dual.bands.secondaryYAxisBand);
    // Width invariant, now with the secondary band as a fourth term.
    expect(dual.bands.yAxisBand + dual.bands.plotWidth + dual.bands.secondaryYAxisBand + dual.bands.rightPad)
      .toBe(600);
  });

  it('an unmarked (no explicit position) second y-axis defaults to the LEFT, matching MUI, and reserves no secondary band', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'] }],
      yAxis: [
        { scaleType: 'linear', id: 'a', min: 0, max: 1 },
        { scaleType: 'linear', id: 'b', min: 0, max: 1 },
      ],
      tickFontSize: 12,
      spacing: theme.spacing,
    });
    expect(layout.bands.secondaryYAxisBand).toBe(0);
  });

  // Codex second-pass review finding: a caller-supplied `valueFormatter` that blanks every tick
  // must collapse the y-axis band to zero too (Rule 2's general principle), not just the x-axis
  // case the WO's Definition of Done names explicitly.
  it('collapses the y-axis band to zero when every tick formats to a blank string', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'] }],
      yAxis: [{ scaleType: 'linear', min: 0, max: 1, valueFormatter: () => '' }],
      tickFontSize: 12,
      spacing: theme.spacing,
    });
    expect(layout.bands.yAxisBand).toBe(0);
    expect(layout.yAxis[0].width).toBe(0);
  });

  // Codex second-pass review finding: `slotProps.legend.position` can override `legendPosition` at
  // render time (`withChartSlotDefaults`) -- the resolver must reserve space for wherever the
  // legend ACTUALLY renders, not just what `legendPosition` alone says.
  it('reserves space for the slotProps.legend.position override, not just legendPosition', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'] }],
      yAxis: [{ scaleType: 'linear' }],
      legendPosition: { vertical: 'bottom' },
      slotProps: { legend: { position: { vertical: 'top' } } },
      spacing: theme.spacing,
    });
    expect(layout.margin.top).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.top);
    expect(layout.margin.bottom).toBe(PACKAGE_DEFAULT_MARGIN.bottom);
  });

  it('resolveLegendPosition matches withChartSlotDefaults\' own merge precedence exactly', () => {
    const legendPosition = { vertical: 'bottom', horizontal: 'start' };
    const slotProps = { legend: { position: { horizontal: 'end' } } };
    const resolved = resolveLegendPosition(legendPosition, slotProps);
    const fromSlotDefaults = withChartSlotDefaults(slotProps, legendPosition).legend.position;
    expect(resolved).toEqual(fromSlotDefaults);
    expect(resolved).toEqual({ vertical: 'bottom', horizontal: 'end' });
  });

  // Codex second-pass review finding: a caller-set `xAxis[0].height` bypasses the model's SIZE,
  // but rotation must still be governed entirely by `xLabels` -- a stale caller-set angle must not
  // survive under a mode that says "no rotation".
  it('still governs rotation via xLabels even when the caller sets an explicit axis height', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'], height: 60, tickLabelStyle: { angle: -60 } }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'horizontal',
      spacing: theme.spacing,
    });
    expect(layout.xAxis[0].height).toBe(60); // the caller's own height escape still wins
    expect(layout.xAxis[0].tickLabelStyle.angle).toBeFalsy(); // but the stale rotation does not survive
  });
});

describe('resolveChartLayout size tokens and height escape (UCM-CHART-12)', () => {
  it.each(Object.entries(CHART_SIZE_SPACING_UNITS))('resolves size="%s" through the theme spacing scale', (size, units) => {
    const layout = resolveChartLayout({ size, spacing: theme.spacing });
    expect(layout.chartHeight).toBe(units * 8);
  });

  it('pins "standard" to the historical 320px default', () => {
    const layout = resolveChartLayout({ size: 'standard', spacing: theme.spacing });
    expect(layout.chartHeight).toBe(320);
  });

  it('lets height override the size token entirely', () => {
    const layout = resolveChartLayout({ size: 'tall', height: 111, spacing: theme.spacing });
    expect(layout.chartHeight).toBe(111);
  });

  it('throws on an unknown size token', () => {
    expect(() => resolveChartLayout({ size: 'huge', spacing: theme.spacing })).toThrow(/Unknown chart size/);
  });

  it('falls back to a numeric 8px unit when no spacing function is given', () => {
    const layout = resolveChartLayout({ size: 'standard' });
    expect(layout.chartHeight).toBe(320);
  });
});

describe('resolveChartLayout xLabels rotation (UCM-CHART-12)', () => {
  it('"horizontal" never rotates, regardless of tick count or label length', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: Array.from({ length: 20 }, (_, i) => `A rather long label ${i}`) }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'horizontal',
      spacing: theme.spacing,
    });
    expect(layout.xAxis[0].tickLabelStyle?.angle).toBeFalsy();
  });

  it('"angled" always rotates, even for a single short label', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan'] }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'angled',
      spacing: theme.spacing,
    });
    expect(layout.xAxis[0].tickLabelStyle.angle).toBe(-45);
  });

  it('"auto" stays horizontal for a few short labels, rotates for many long ones (measured width, not char count)', () => {
    // codex second-pass review finding: "auto" must decide from the label's MEASURED width, not a
    // raw character count -- these inject a deterministic measurer instead of relying on the
    // per-glyph estimate, and a `tickFontSize` fallback so the resolver can actually measure.
    const few = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['Jan', 'Feb', 'Mar'] }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'auto',
      tickFontSize: 12,
      spacing: theme.spacing,
      measureTextWidth: () => 20, // narrow -- well under the rotation threshold
    });
    expect(few.xAxis[0].tickLabelStyle?.angle).toBeFalsy();

    const many = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: Array.from({ length: 12 }, (_, i) => `Ward name ${i}`) }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'auto',
      tickFontSize: 12,
      spacing: theme.spacing,
      measureTextWidth: () => 90, // wide -- over the rotation threshold
    });
    expect(many.xAxis[0].tickLabelStyle.angle).toBe(-45);
  });

  it('"auto" does not rotate a few WIDE labels -- tick count and measured width must both cross the threshold', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['A very wide single label'] }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'auto',
      tickFontSize: 12,
      spacing: theme.spacing,
      measureTextWidth: () => 200, // wide, but only one category
    });
    expect(layout.xAxis[0].tickLabelStyle?.angle).toBeFalsy();
  });

  it('"auto" does not rotate many labels that are individually narrow', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: Array.from({ length: 12 }, (_, i) => `${i}`) }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'auto',
      tickFontSize: 12,
      spacing: theme.spacing,
      measureTextWidth: () => 8, // many categories, but each label is tiny
    });
    expect(layout.xAxis[0].tickLabelStyle?.angle).toBeFalsy();
  });

  it('drives the rotated tick band from a measured width, not a flat constant', () => {
    const short = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['A'], tickLabelStyle: { fontSize: 12 } }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'angled',
      spacing: theme.spacing,
      measureTextWidth: () => 10,
    });
    const long = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['A much longer label'], tickLabelStyle: { fontSize: 12 } }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'angled',
      spacing: theme.spacing,
      measureTextWidth: () => 140,
    });
    expect(long.bands.xAxisBand).toBeGreaterThan(short.bands.xAxisBand);
  });

  it('does not override an axis that already sets its own height', () => {
    const layout = resolveChartLayout({
      xAxis: [{ scaleType: 'band', data: ['January'], height: 200 }],
      yAxis: [{ scaleType: 'linear' }],
      xLabels: 'angled',
      spacing: theme.spacing,
    });
    expect(layout.xAxis[0].height).toBe(200);
  });
});

// THEME-9 #2 -- `withAxisDefaults` broadcast the caller's single xAxisLabel/
// yAxisLabel string onto EVERY entry of a multi-axis array via `.map()`.
// Measured live: hram's dual-axis chart carried the identical 43-character
// label on both y-axes. This is the defect that actually shipped, pinned
// directly against the exported function rather than only through a
// rendered BarChart (which never happens to build a multi-axis array).
describe('withAxisDefaults label broadcast (THEME-9)', () => {
  it('applies the single label argument only to the first axis of a multi-entry array', () => {
    const result = withAxisDefaults(
      [{ id: 'primary' }, { id: 'secondary' }],
      'Shared label',
      { scaleType: 'linear' },
      '12px',
    );
    expect(result[0].label).toBe('Shared label');
    expect(result[1].label).toBeUndefined();
    // The exact defect: never let one string land on two axes.
    expect(result.filter((axis) => axis.label === 'Shared label')).toHaveLength(1);
  });

  it('leaves axes that set their own label untouched, whatever position they are in', () => {
    const result = withAxisDefaults(
      [{ label: 'Primary' }, { label: 'Secondary' }],
      'Fallback',
      { scaleType: 'linear' },
      '12px',
    );
    expect(result[0].label).toBe('Primary');
    expect(result[1].label).toBe('Secondary');
  });

  it('still labels the common single-axis case unchanged', () => {
    const result = withAxisDefaults([{ id: 'only' }], 'Cases', { scaleType: 'linear' }, '12px');
    expect(result[0].label).toBe('Cases');

    const synthesized = withAxisDefaults(undefined, 'Cases', { scaleType: 'linear' }, '12px');
    expect(synthesized[0].label).toBe('Cases');
  });
});

// THEME-9 #4 -- BarChart set no default tick formatter at all (raw domain
// numbers); a hand-rolled `Intl` compact-notation default was measured to be
// actively wrong in two of the four locales this package's consumers use:
// German does not compact thousands at all, and Swahili prepends a word
// ("elfu") that is WIDER than the raw number. Plain grouped formatting (no
// `notation: 'compact'`) is pinned here against a live `Intl.NumberFormat`
// computation rather than hardcoded locale punctuation, so the assertion
// survives ICU data updates.
describe('defaultNumericTickFormatter (THEME-9)', () => {
  it.each(['de-CH', 'en', 'fr', 'sw'])('formats %s ticks the same way Intl grouping would, with no compact notation', (locale) => {
    const formatter = defaultNumericTickFormatter(locale);
    for (const value of [12500, 998000, 1000000000]) {
      const expected = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
      expect(formatter(value, { location: 'tick' })).toBe(expected);
      // The exact failure mode measured live: compact notation prepending a
      // wider word in Swahili, or a 'K'/'M'/'B' suffix elsewhere.
      expect(formatter(value, { location: 'tick' })).not.toMatch(/[KMB]|elfu/i);
    }
  });

  it('keeps full precision outside the tick context (tooltip/legend) rather than rounding away a meaningful difference', () => {
    const formatter = defaultNumericTickFormatter('en');
    expect(formatter(12500.456, { location: 'tooltip' })).toBe('12,500.456');
    expect(formatter(12500.456, { location: 'tick' })).toBe('12,500.5');
  });
});

// THEME-9 #1/#3 -- MUI's own y-axis width default is a flat 45px (ticks) +
// 20px (label) regardless of what the ticks actually say (confirmed against
// @mui/x-charts' own DEFAULT_AXIS_SIZE_WIDTH/AXIS_LABEL_DEFAULT_HEIGHT and
// its useChartDimensions selector, where margin and axis size are additive).
// That is both too generous for short ticks and too stingy for wide
// unit-suffixed ones -- the measured Accessibility-panel overlap. Margins
// and the exact rendered overlap are verified live, not by unit test (per
// the WO); this pins the sizing FUNCTION's own contract.
describe('sizeYAxisForContent (THEME-9)', () => {
  it('sizes a linear axis from its own caller-supplied min/max', () => {
    const [axis] = sizeYAxisForContent(
      [{ scaleType: 'linear', min: 0, max: 1, label: 'Coverage (%)' }],
      [],
      '12px',
    );
    expect(axis.width).toBeGreaterThan(0);
  });

  it('reserves more width for a longer formatted tick, all else equal', () => {
    const [shortTick] = sizeYAxisForContent(
      [{ scaleType: 'linear', min: 0, max: 1 }], [], '12px',
    );
    const [wideTick] = sizeYAxisForContent(
      [{ scaleType: 'linear', min: 0, max: 1, valueFormatter: (v) => `${v} minutes` }],
      [], '12px',
    );
    expect(wideTick.width).toBeGreaterThan(shortTick.width);
  });

  it('falls back to the plotted series when the caller sets neither min nor max', () => {
    const [axis] = sizeYAxisForContent(
      [{ scaleType: 'linear' }],
      [{ data: [1, 250000] }],
      '12px',
    );
    expect(axis.width).toBeGreaterThan(0);
  });

  it('leaves the axis untouched when there is nothing to measure against', () => {
    const [axis] = sizeYAxisForContent([{ scaleType: 'linear' }], [], '12px');
    expect(axis.width).toBeUndefined();
  });

  it('never overrides a caller-supplied width', () => {
    const [axis] = sizeYAxisForContent(
      [{ scaleType: 'linear', min: 0, max: 1, width: 42 }], [], '12px',
    );
    expect(axis.width).toBe(42);
  });

  // UCM-CHART-12 Rule 2 (codex second-pass review finding): candidates existed (min/max set), but
  // a caller `valueFormatter` reduced every tick to a blank string -- distinct from "nothing to
  // measure at all" (the untouched/undefined case below), this must collapse to a real 0, not the
  // font-size floor a blank string previously still received.
  it('collapses to width 0 when every formatted tick is blank and there is no axis title', () => {
    const [axis] = sizeYAxisForContent(
      [{ scaleType: 'linear', min: 0, max: 1, valueFormatter: () => '' }], [], '12px',
    );
    expect(axis.width).toBe(0);
  });

  it('still reserves width for the axis TITLE when ticks are blank but a label is set', () => {
    const [axis] = sizeYAxisForContent(
      [{ scaleType: 'linear', min: 0, max: 1, valueFormatter: () => '', label: 'Coverage' }], [], '12px',
    );
    expect(axis.width).toBeGreaterThan(0);
  });

  it('leaves a categorical (band/point) axis alone -- its ticks are names, not numbers', () => {
    const [axis] = sizeYAxisForContent(
      [{ scaleType: 'band', data: ['a', 'b'] }], [], '12px',
    );
    expect(axis.width).toBeUndefined();
  });

  // Reviewer-caught regression (THEME-9): a series with no explicit
  // `yAxisId` is NOT "assigned to no axis" -- MUI defaults it to the FIRST
  // axis in the array (`yAxisIds[0]`), whatever that axis' id is. Matching
  // only `undefined === undefined` left the primary axis of a genuine
  // dual-axis chart (id set, series unmarked) with zero matched series and
  // therefore MUI's untouched flat default -- a silent no-op on exactly the
  // dual-axis case this WO was measured against (TimeSeriesChart's own
  // secondary-axis feature, CHART-5).
  it('assigns an unmarked series to the FIRST axis in a dual-axis array, matching MUI\'s own default', () => {
    const dualAxis = [{ scaleType: 'linear', id: 'primary' }, { scaleType: 'linear', id: 'secondary' }];
    const series = [
      { data: [1, 2, 3] }, // no yAxisId -- MUI assigns this to 'primary'
      { data: [400000, 500000], yAxisId: 'secondary' },
    ];

    const [primary, secondary] = sizeYAxisForContent(dualAxis, series, '12px');
    expect(primary.width).toBeGreaterThan(0);
    expect(secondary.width).toBeGreaterThan(0);
    // The secondary axis' series format much wider numbers -- it must
    // reserve more width than the primary axis, not the same (which is what
    // "both axes silently untouched" or "both matched the same series" would
    // produce).
    expect(secondary.width).toBeGreaterThan(primary.width);
  });
});
