// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';

const scatterSpy = vi.hoisted(() => vi.fn(({ children }) => <div data-testid="mui-scatter">{children}</div>));
vi.mock('@mui/x-charts/ScatterChart', () => ({ ScatterChart: scatterSpy }));
vi.mock('@mui/x-charts/hooks', () => ({
  useXScale: () => (v) => v * 10,
  useYScale: () => (v) => 100 - v * 10,
}));

import {
  ScatterChart,
  ScatterReferenceCurve,
  ScatterReferenceLine,
  scaleBubbleRadius,
} from '../src/components/charts/ScatterChart';
import { createAppTheme } from '../src/theme/createAppTheme';

const theme = createAppTheme({ palette: { primary: { main: '#3D5A99' } } });
const i18n = i18next.createInstance();
i18n.init({ lng: 'en', resources: { en: { translation: {} } }, interpolation: { escapeValue: false } });

function withProviders(children) {
  return React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(I18nextProvider, { i18n }, children),
  );
}

function renderScatter(props = {}) {
  return render(withProviders(
    React.createElement(ScatterChart, {
      series: [{ id: 's', data: [{ x: 1, y: 1 }] }],
      ...props,
    }),
  ));
}

// THEME-10 -- the formula the access-gap panel already hand-rolls
// (`max(3, 10*sqrt(pop/maxPop))`), pinned as a pure function.
describe('scaleBubbleRadius', () => {
  it('matches the access-panel formula across the domain', () => {
    expect(scaleBubbleRadius(0, 100)).toBe(3);
    expect(scaleBubbleRadius(100, 100)).toBe(10);
    expect(scaleBubbleRadius(25, 100)).toBeCloseTo(5, 5);
  });

  it('floors at the minimum radius for a degenerate or non-finite input', () => {
    expect(scaleBubbleRadius(5, 0)).toBe(3);
    expect(scaleBubbleRadius(NaN, 100)).toBe(3);
    expect(scaleBubbleRadius(5, NaN)).toBe(3);
  });
});

describe('ScatterChart mark count and colour default (THEME-10)', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  // The failure mode nobody sees: a scatter that silently drops points.
  it('renders every supplied point, none dropped', () => {
    renderScatter({ series: [{ id: 's', data: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }] }] });
    expect(scatterSpy.mock.calls.at(-1)[0].series[0].data).toHaveLength(3);
  });

  it('defaults a single undifferentiated series to the neutral role colour, not a series hue', () => {
    renderScatter();
    expect(scatterSpy.mock.calls.at(-1)[0].colors).toEqual([theme.palette.text.secondary]);
  });

  it('uses the categorical palette, not the neutral tone, once a caller supplies multiple series', () => {
    renderScatter({
      series: [
        { id: 'a', data: [{ x: 1, y: 1 }] },
        { id: 'b', data: [{ x: 2, y: 2 }] },
      ],
    });
    const { colors } = scatterSpy.mock.calls.at(-1)[0];
    expect(colors).not.toEqual([theme.palette.text.secondary]);
    expect(colors.length).toBeGreaterThan(1);
  });

  it('lets a caller override the palette explicitly (e.g. a family/role register)', () => {
    renderScatter({ palette: ['#ABCDEF'] });
    expect(scatterSpy.mock.calls.at(-1)[0].colors).toEqual(['#ABCDEF']);
  });

  // reviewer/ui_reviewer U3: a single series that sets its OWN colour is not "undifferentiated"
  // -- the neutral default only applies when nothing else specifies a colour. This pins that
  // ScatterChart itself never strips or overrides a series' own `.color` (MUI's own resolution
  // of series.color vs. the colors fallback array is MUI's own contract, out of scope here --
  // same boundary BarChart.test.jsx already draws for the identical `colors={palette ||
  // neutralPalette.categorical}` pattern).
  it('leaves a single series\' own explicit colour untouched and does not treat it as neutral', () => {
    renderScatter({ series: [{ id: 's', color: '#123456', data: [{ x: 1, y: 1 }] }] });
    const props = scatterSpy.mock.calls.at(-1)[0];
    expect(props.series[0].color).toBe('#123456');
    expect(props.colors).not.toEqual([theme.palette.text.secondary]);
  });
});

describe('ScatterChart bubble z-order (THEME-10)', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('sorts each series largest-first when sizeAccessor is set, so a small bubble is never hidden under a large one', () => {
    renderScatter({
      sizeAccessor: (p) => p.pop,
      series: [{ id: 's', data: [{ x: 1, y: 1, pop: 10 }, { x: 2, y: 2, pop: 500 }, { x: 3, y: 3, pop: 100 }] }],
    });
    const data = scatterSpy.mock.calls.at(-1)[0].series[0].data;
    expect(data.map((p) => p.pop)).toEqual([500, 100, 10]);
  });

  it('leaves point order untouched outside bubble mode', () => {
    const original = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    renderScatter({ series: [{ id: 's', data: original }] });
    expect(scatterSpy.mock.calls.at(-1)[0].series[0].data).toEqual(original);
  });
});

describe('ScatterChart per-point marker style (THEME-10)', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders a hollow marker (fill: none) only for the point getPointStyle marks hollow', () => {
    renderScatter({
      getPointStyle: (p) => (p.isStatusQuo ? { hollow: true } : {}),
      series: [{ id: 's', data: [{ x: 1, y: 1, isStatusQuo: true }, { x: 2, y: 2, isStatusQuo: false }] }],
    });
    const Marker = scatterSpy.mock.calls.at(-1)[0].slots.marker;
    const markerProps = { seriesId: 's', color: '#111', x: 0, y: 0, isHighlighted: false, isFaded: false, size: 5 };

    const hollow = render(React.createElement(Marker, { ...markerProps, dataIndex: 0 }));
    const filled = render(React.createElement(Marker, { ...markerProps, dataIndex: 1 }));

    expect(hollow.container.querySelector('circle').getAttribute('fill')).toBe('none');
    expect(filled.container.querySelector('circle').getAttribute('fill')).toBe('#111');
  });

  it('sizes a bubble marker from sizeAccessor via scaleBubbleRadius, resolved against the POST-sort index', () => {
    renderScatter({
      sizeAccessor: (p) => p.pop,
      series: [{ id: 's', data: [{ x: 1, y: 1, pop: 0 }, { x: 2, y: 2, pop: 100 }] }],
    });
    const Marker = scatterSpy.mock.calls.at(-1)[0].slots.marker;
    const markerProps = { seriesId: 's', color: '#111', x: 0, y: 0, isHighlighted: false, isFaded: false, size: 5 };

    // Data was re-sorted largest-first: index 0 is now pop:100, index 1 is pop:0.
    const big = render(React.createElement(Marker, { ...markerProps, dataIndex: 0 }));
    const small = render(React.createElement(Marker, { ...markerProps, dataIndex: 1 }));

    expect(Number(big.container.querySelector('circle').getAttribute('r'))).toBeCloseTo(10, 5);
    expect(Number(small.container.querySelector('circle').getAttribute('r'))).toBe(3);
  });

  // Live-render caught regression: bubble sizing must share ONE max across every series (a
  // single comparable scale, matching the access-gap panel's own
  // `maxPop = Math.max(1, ...points.map(p => p.population))` over ALL points regardless of
  // division/settlement) -- a per-series max would let each series' own largest point always
  // render at full radius, making cross-series bubble size meaningless.
  it('sizes bubbles against ONE chart-wide max across all series, not a max per series', () => {
    renderScatter({
      sizeAccessor: (p) => p.pop,
      series: [
        { id: 'small-series', data: [{ x: 1, y: 1, pop: 100 }] },
        { id: 'big-series', data: [{ x: 2, y: 2, pop: 1000 }] },
      ],
    });
    const props = scatterSpy.mock.calls.at(-1)[0];
    const Marker = props.slots.marker;
    const markerProps = { color: '#111', x: 0, y: 0, isHighlighted: false, isFaded: false, size: 5 };

    // If sized per-series, "small-series"'s own only point (pop:100) would be its own series
    // max and render at full radius (10) -- wrongly implying it's as large as big-series's point.
    const smallSeriesPoint = render(React.createElement(Marker, { ...markerProps, seriesId: 'small-series', dataIndex: 0 }));
    const bigSeriesPoint = render(React.createElement(Marker, { ...markerProps, seriesId: 'big-series', dataIndex: 0 }));

    const smallR = Number(smallSeriesPoint.container.querySelector('circle').getAttribute('r'));
    const bigR = Number(bigSeriesPoint.container.querySelector('circle').getAttribute('r'));
    expect(bigR).toBeCloseTo(10, 5);
    expect(smallR).toBeCloseTo(10 * Math.sqrt(100 / 1000), 5);
    expect(smallR).toBeLessThan(bigR);
  });

  it('renders a square/diamond shape when getPointStyle requests one', () => {
    renderScatter({
      getPointStyle: (p) => ({ shape: p.shape }),
      series: [{ id: 's', data: [{ x: 1, y: 1, shape: 'square' }, { x: 2, y: 2, shape: 'diamond' }] }],
    });
    const Marker = scatterSpy.mock.calls.at(-1)[0].slots.marker;
    const markerProps = { seriesId: 's', color: '#111', x: 0, y: 0, isHighlighted: false, isFaded: false, size: 5 };

    const square = render(React.createElement(Marker, { ...markerProps, dataIndex: 0 }));
    const diamond = render(React.createElement(Marker, { ...markerProps, dataIndex: 1 }));

    expect(square.container.querySelector('rect')).not.toBeNull();
    expect(diamond.container.querySelector('polygon')).not.toBeNull();
  });
});

describe('ScatterReferenceCurve / ScatterReferenceLine (THEME-10)', () => {
  it('draws a path through the curve points using the chart\'s own live scale', () => {
    const { container } = render(React.createElement(ScatterReferenceCurve, {
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      color: '#222',
    }));
    expect(container.querySelector('path').getAttribute('d')).toBe('M0,100 L10,90');
  });

  it('draws a labelled reference line at the given label position', () => {
    const { container } = render(React.createElement(ScatterReferenceLine, {
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      label: 'No gap',
      labelAt: { x: 0.9, y: 0.9 },
      color: '#222',
    }));
    expect(container.querySelector('line')).not.toBeNull();
    expect(container.textContent).toBe('No gap');
  });

  it('draws an unlabelled reference line when no label is given', () => {
    const { container } = render(React.createElement(ScatterReferenceLine, {
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      color: '#222',
    }));
    expect(container.querySelector('line')).not.toBeNull();
    expect(container.querySelector('text')).toBeNull();
  });
});

// UCM-CHART-12: `size`/`height` resolution, wired through the actual component. Replaces the
// deleted `minHeight`/`aspect` CHART-8 trio.
describe('ScatterChart size/height resolution (UCM-CHART-12, UCM-CHART-15)', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it.each([
    ['compact', 320],
    ['standard', 400],
    ['tall', 480],
    ['extra_tall', 560],
    ['super_tall', 640],
  ])('resolves size="%s" to %ipx, on both the chart height and the wrapper', (size, px) => {
    renderScatter({ size });
    expect(scatterSpy.mock.calls.at(-1)[0].height).toBe(px);
    expect(window.getComputedStyle(screen.getByTestId('scatter-chart-container')).height).toBe(`${px}px`);
  });

  it('lets height override size entirely, as the documented escape', () => {
    renderScatter({ size: 'tall', height: 280 });
    expect(scatterSpy.mock.calls.at(-1)[0].height).toBe(280);
    expect(window.getComputedStyle(screen.getByTestId('scatter-chart-container')).height).toBe('280px');
  });

  it('throws in dev when a caller still passes minHeight, naming the replacement', () => {
    expect(() => renderScatter({ minHeight: 300 })).toThrow(/size=.*standard.*tall/);
  });

  it('throws in dev when a caller still passes aspect, naming the removal', () => {
    expect(() => renderScatter({ aspect: 1.8 })).toThrow(/aspect/);
  });

  it('throws in dev when a caller still passes margin, naming the removal', () => {
    expect(() => renderScatter({ margin: { top: 1 } })).toThrow(/margin/);
  });
});
