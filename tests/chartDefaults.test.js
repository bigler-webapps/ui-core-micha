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
  defaultNumericTickFormatter,
  PACKAGE_DEFAULT_MARGIN,
  resolveChartHeight,
  sizeYAxisForContent,
  warnOnHeightMismatch,
  withAxisDefaults,
  withMarginDefaults,
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

  it('adds a font-and-angle-derived EXTRA bottom margin, on top of the package default, only for rotated tick labels', () => {
    renderBar({ xAxis: [{ data: ['Jan', 'Feb'], tickLabelStyle: { angle: -45 } }] });
    const rotatedProps = barSpy.mock.calls.at(-1)[0];
    expect(rotatedProps.margin.bottom).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.bottom);
    expect(rotatedProps.xAxis[0].height).toBeGreaterThan(45);

    cleanup();
    renderBar({ xAxis: [{ data: ['Jan', 'Feb'], tickLabelStyle: { angle: 0 } }] });
    expect(barSpy.mock.calls.at(-1)[0].margin).toEqual(PACKAGE_DEFAULT_MARGIN);
  });

  // THEME-11 -- the package now forms an opinion on chart margins (was: MUI's own flat 20px on
  // every side, unconditionally, because this package never set one).
  describe('withMarginDefaults / package margin default (THEME-11)', () => {
    it('applies the package default on every side when the caller sets no margin', () => {
      renderBar();
      expect(barSpy.mock.calls.at(-1)[0].margin).toEqual(PACKAGE_DEFAULT_MARGIN);
    });

    // Trap 1 named in the WO: a package-level default injected BEFORE spaceForRotatedTicks'
    // own `margin?.bottom != null` check would make every rotated-tick chart think the caller
    // set bottom, and lose its extra rotation space entirely.
    it('still gives a rotated-tick chart its enlarged bottom margin, not the flat package default', () => {
      renderBar({ xAxis: [{ data: ['January', 'February'], tickLabelStyle: { angle: -90 } }] });
      const props = barSpy.mock.calls.at(-1)[0];
      expect(props.margin.bottom).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.bottom + 10);
    });

    // Scope 1's merge semantics: a caller-supplied PARTIAL margin keeps its own value on the
    // side it set and gets the package default on the others -- never MUI's wider 20px, and
    // never silently reset to the package default on the side the caller DID set.
    it('merges a caller-supplied partial margin per side, not wholesale', () => {
      renderBar({ margin: { left: 60 } });
      const { margin } = barSpy.mock.calls.at(-1)[0];
      expect(margin.left).toBe(60);
      expect(margin.top).toBe(PACKAGE_DEFAULT_MARGIN.top);
      expect(margin.bottom).toBe(PACKAGE_DEFAULT_MARGIN.bottom);
      expect(margin.right).toBe(PACKAGE_DEFAULT_MARGIN.right);
    });

    it('keeps every side a caller sets when they supply a full margin object', () => {
      renderBar({ margin: { top: 1, bottom: 2, left: 3, right: 4 } });
      expect(barSpy.mock.calls.at(-1)[0].margin).toEqual({ top: 1, bottom: 2, left: 3, right: 4 });
    });

    // A LINEAR x-axis's last tick label sits AT the plot edge (unlike a band axis's centred
    // ticks) and overhangs by about half its width -- the reason `right` is trimmed less than
    // `left`/`bottom`. Pinned here as a value; the actual no-clip claim is verified by the
    // rendered check (WO Part C), not derivable from a mocked MUI component.
    it('keeps a wider default right margin than left/bottom, for a linear x-axis\'s edge-sitting last tick', () => {
      expect(PACKAGE_DEFAULT_MARGIN.right).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.left);
      expect(PACKAGE_DEFAULT_MARGIN.right).toBeGreaterThan(PACKAGE_DEFAULT_MARGIN.bottom);
    });

    it('applies the SAME package default to LineChart as BarChart', () => {
      renderLine();
      expect(lineSpy.mock.calls.at(-1)[0].margin).toEqual(PACKAGE_DEFAULT_MARGIN);
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

// THEME-11 -- pure-function contract of the merge helper itself, independent of any chart
// component wiring (that's covered above, in 'chart chrome defaults').
describe('withMarginDefaults (THEME-11)', () => {
  it('returns the package default untouched when the caller sets no margin', () => {
    expect(withMarginDefaults(undefined)).toEqual(PACKAGE_DEFAULT_MARGIN);
  });

  it('merges a partial object per side', () => {
    expect(withMarginDefaults({ top: 40 })).toEqual({ ...PACKAGE_DEFAULT_MARGIN, top: 40 });
  });

  it('expands a numeric shorthand margin to all four sides before merging', () => {
    expect(withMarginDefaults(5)).toEqual({ top: 5, bottom: 5, left: 5, right: 5 });
  });

  it('leaves a fully-specified caller margin untouched', () => {
    const full = { top: 1, bottom: 2, left: 3, right: 4 };
    expect(withMarginDefaults(full)).toEqual(full);
  });
});

// CHART-8 -- pure-function contract of the minHeight/height/aspect resolver, independent of any
// chart component wiring (component-level wiring is covered per-preset in each own test file).
describe('resolveChartHeight (CHART-8)', () => {
  it('sizes the chart from minHeight alone when neither height nor aspect is set', () => {
    expect(resolveChartHeight({ minHeight: 300 })).toEqual({ wrapperMinHeight: 300, chartHeight: 300 });
  });

  it('leaves minHeight as a floor and gives the chart no fixed height when aspect is set (no height)', () => {
    expect(resolveChartHeight({ minHeight: 320, aspect: 1.8 })).toEqual({
      wrapperMinHeight: 320,
      chartHeight: undefined,
    });
  });

  it('caps the wrapper at height when minHeight is larger, closing the dead-space gap', () => {
    expect(resolveChartHeight({ minHeight: 420, height: 380 })).toEqual({
      wrapperMinHeight: 380,
      chartHeight: 380,
    });
  });

  it('is byte-identical (both values unchanged) when minHeight equals height', () => {
    expect(resolveChartHeight({ minHeight: 320, height: 320 })).toEqual({
      wrapperMinHeight: 320,
      chartHeight: 320,
    });
  });

  it('leaves the wrapper unset when height is passed alone', () => {
    expect(resolveChartHeight({ height: 280 })).toEqual({ wrapperMinHeight: undefined, chartHeight: 280 });
  });

  it('does not cap the wrapper when minHeight is smaller than height', () => {
    expect(resolveChartHeight({ minHeight: 200, height: 380 })).toEqual({
      wrapperMinHeight: 200,
      chartHeight: 380,
    });
  });
});

describe('warnOnHeightMismatch (CHART-8)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('warns, naming the component and both values, when minHeight and height disagree', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnHeightMismatch('BarChart', { minHeight: 420, height: 380 });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('BarChart');
    expect(warn.mock.calls[0][0]).toContain('420');
    expect(warn.mock.calls[0][0]).toContain('380');
  });

  it('does not warn when minHeight equals height', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnHeightMismatch('BarChart', { minHeight: 320, height: 320 });
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn on the legitimate minHeight + aspect (no height) combination', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnHeightMismatch('BarChart', { minHeight: 320, height: undefined });
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn when only one of the pair is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnHeightMismatch('BarChart', { minHeight: undefined, height: 280 });
    expect(warn).not.toHaveBeenCalled();
  });

  it('gives ChartFrame-accurate wording when heightWins is false (CHART-9)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnHeightMismatch('ChartFrame', { minHeight: 420, height: 380 }, { heightWins: false });
    expect(warn).toHaveBeenCalledOnce();
    const message = warn.mock.calls[0][0];
    expect(message).toContain('ChartFrame');
    expect(message).toContain('height is ignored');
    expect(message).not.toContain('height wins');
  });
});
