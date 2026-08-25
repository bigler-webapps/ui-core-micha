// @vitest-environment jsdom
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { exportChartPng, exportChartSvg } from '../src/components/charts/exportChart';

// UCM-CHART-17: a container shaped like `AccessGapScatterPanel` -- the chart's own MUI surface,
// PLUS a second SVG (the hand-built size key) and an HTML legend beside it, exactly the shape that
// broke "the first SVG" (scope item 3) and dropped the legend from every export (Part A, defect 2).
function buildContainer() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="legend">Legend HTML</div>
    <svg class="MuiChartsSurface-root" width="300" height="200">
      <g><text class="MuiChartsAxis-tickLabel">Alpha</text></g>
      <line class="MuiChartsAxis-line" x1="0" x2="300" y1="10" y2="10"></line>
    </svg>
    <svg class="size-key" width="40" height="40"><circle r="4"></circle></svg>
  `;
  document.body.appendChild(container);
  return container;
}

describe('exportChartSvg (UCM-CHART-17)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves with its existing signature and returns a Blob', () => {
    const container = buildContainer();
    const blob = exportChartSvg(container, 'chart.svg');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/svg+xml;charset=utf-8');
  });

  // reviewer finding: MUI's ChartsSurface only ever carries a `viewBox` -- its real pixel size is
  // CSS (`width: 100%`), which has nothing to resolve against once cloned out of the page. Without
  // an explicit width/height a standalone viewer falls back to the SVG UA default (300x150), i.e.
  // the wrong size regardless of how faithfully everything else is styled.
  it('sets explicit width/height attributes on the exported SVG, not just the source viewBox', async () => {
    const container = buildContainer();
    const blob = exportChartSvg(container);
    const text = await blob.text();
    expect(text).toMatch(/<svg[^>]*\bwidth="\d+"/);
    expect(text).toMatch(/<svg[^>]*\bheight="\d+"/);
  });

  // WO scope item 3: the legend sits BEFORE the chart's own svg in this fixture (as it does in
  // `AccessGapScatterPanel`), and a second, unrelated SVG (the size key) sits after it -- "the
  // first SVG" would grab neither of those correctly. `MuiChartsSurface-root` is the deliberate,
  // non-positional signal.
  it('takes the chart surface deliberately, not the first (or any other) SVG in the container', async () => {
    const container = buildContainer();
    const blob = exportChartSvg(container);
    const text = await blob.text();
    expect(text).toContain('MuiChartsSurface-root');
    expect(text).toContain('Alpha');
    expect(text).not.toContain('size-key');
  });

  // WO defect 1 + Unit tests: the clone must carry the RESOLVED style, not just the (rule-less,
  // once serialised standalone) class name -- this is the whole point of the fix.
  it('inlines computed styles for tick labels and axis strokes onto the cloned SVG', async () => {
    const container = buildContainer();
    const tickLabel = container.querySelector('.MuiChartsAxis-tickLabel');
    tickLabel.style.fontFamily = 'DM Sans';
    tickLabel.style.fill = 'rgb(10, 20, 30)';
    const axisLine = container.querySelector('.MuiChartsAxis-line');
    axisLine.style.stroke = 'rgb(200, 200, 200)';

    const blob = exportChartSvg(container);
    const text = await blob.text();
    expect(text).toContain('font-family: &quot;DM Sans&quot;');
    expect(text).toContain('fill: rgb(10, 20, 30)');
    expect(text).toContain('stroke: rgb(200, 200, 200)');
  });

  it('does not gain the legend or size key -- true vector, chart only', async () => {
    const container = buildContainer();
    const blob = exportChartSvg(container);
    const text = await blob.text();
    expect(text).not.toContain('Legend HTML');
  });

  // UCM-CHART-18 scope item 3: a rotated element (e.g. a legend swatch rotated into a diamond)
  // must export rotated -- `transform` was missing from the inlined properties entirely. Applied
  // via a STYLESHEET rule, not an inline style directly on the source node -- `cloneNode` copies
  // an element's own inline `style` ATTRIBUTE verbatim regardless of what `inlineComputedStyles`
  // does, which would make a test that sets `tickLabel.style.transform` pass whether or not
  // `transform` is actually in the inlined property list (exactly the "asserts a number, proves
  // nothing" trap the WO's risk section warns about) -- a class-based rule is only ever picked up
  // through `getComputedStyle`, so it genuinely exercises `inlineComputedStyles`.
  it('inlines the resolved transform onto the cloned chart surface', async () => {
    const container = buildContainer();
    const style = document.createElement('style');
    style.textContent = '.rotated-probe { transform: rotate(45deg); transform-origin: 20% 30%; }';
    document.head.appendChild(style);
    const tickLabel = container.querySelector('.MuiChartsAxis-tickLabel');
    tickLabel.classList.add('rotated-probe');

    const blob = exportChartSvg(container);
    const text = await blob.text();
    document.head.removeChild(style);
    expect(text).toMatch(/transform:\s*rotate\(45deg\)/);
    expect(text).toMatch(/transform-origin:\s*20%\s*30%/);
  });

  it('throws when the container has no SVG at all', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    expect(() => exportChartSvg(container)).toThrow(/does not contain an SVG/);
  });
});

describe('exportChartPng (UCM-CHART-17)', () => {
  let originalGetContext;
  let originalToBlob;
  let originalImage;

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalToBlob = HTMLCanvasElement.prototype.toBlob;
    // jsdom has no real canvas/image-decoding backend (`getContext('2d')` returns null, `Image`
    // never fires `onload`) -- this stands in for the platform pipeline `exportChartPng` drives,
    // to test its OWN plumbing (does it resolve, with the right Blob type, for the documented
    // input shape), not visual output. Visual correctness is the WO's own explicit non-unit-test
    // gate: open the exported files.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }));
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback) {
      callback(new Blob(['png-bytes'], { type: 'image/png' }));
    };
    originalImage = global.Image;
    global.Image = class MockImage {
      set src(value) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }

      // eslint-disable-next-line class-methods-use-this
      get src() {
        return this._src;
      }
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    global.Image = originalImage;
  });

  // Captures the actual intermediate SVG `exportChartPng` builds (intercepting the `Image` src it
  // loads, per `rasterize`'s own data:-URI choice -- see the taint-avoidance test above) and
  // decodes it back to markup, so a test can inspect exactly what got serialised rather than only
  // whether the call resolved.
  async function captureExportedMarkup(container, backgroundColour = '#ffffff') {
    let capturedSrc;
    global.Image = class CapturingImage {
      set src(value) {
        capturedSrc = value;
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }

      // eslint-disable-next-line class-methods-use-this
      get src() {
        return this._src;
      }
    };
    await exportChartPng(container, 'chart.png', backgroundColour);
    return decodeURIComponent(capturedSrc.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
  }

  // WO Unit tests: "the PNG path resolves for a container holding more than one SVG" -- the exact
  // shape (chart surface + size key) that the pre-fix `findSvg`'s "first SVG" logic depended on
  // being ordered correctly.
  it('resolves with its existing signature for a container holding more than one SVG', async () => {
    const container = buildContainer();
    const blob = await exportChartPng(container, 'chart.png', '#ffffff');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  // Risk section, confirmed live against a real browser (see `rasterize`'s own comment): a
  // `blob:` object URL taints the canvas the moment the SVG carries a `<foreignObject>`, in every
  // case tested, `toBlob` then throws regardless of content. A `data:` URI does not. Locking this
  // in so a future edit reaching back for `URL.createObjectURL` here regresses to the taint, not
  // just to a style change.
  it('loads the container SVG as a data: URI, never a blob: URL, to avoid canvas tainting', async () => {
    const container = buildContainer();
    let capturedSrc;
    global.Image = class CapturingImage {
      set src(value) {
        capturedSrc = value;
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }

      // eslint-disable-next-line class-methods-use-this
      get src() {
        return this._src;
      }
    };
    await exportChartPng(container, 'chart.png', '#ffffff');
    expect(capturedSrc).toMatch(/^data:image\/svg\+xml/);
  });

  // UCM-CHART-18 defect 1: `chartRef` wraps `children` only, so a panel's own controls (e.g. an
  // info `IconButton` in the footer) are inside what gets rasterised. An exported image should
  // show what the chart communicates, not what can be clicked. The button is placed BEFORE a
  // later, unrelated sibling (reviewer finding: the original fixture had the button as the LAST
  // descendant, so a "strip before inline" ordering regression would still have left every
  // asserted node's index aligned and the test would have passed either way) -- `After the button`
  // is what actually exercises the lockstep-index trap the WO names as the single most likely way
  // to get this wrong.
  it('drops interactive controls from the whole-container PNG, keeping non-interactive siblings both before and after it', async () => {
    const container = buildContainer();
    // The distinctive colour on `#after-button`, applied via a stylesheet rule (so it is only
    // ever picked up through `getComputedStyle`, never copied verbatim by `cloneNode`), is what
    // actually exercises the lockstep-index trap: content-presence assertions alone pass whether
    // or not the button is removed before or after inlining (removing a node shifts which style
    // string lands on which SURVIVING element, but every surviving TEXT NODE is still there
    // either way) -- only checking that THIS specific element carries THIS specific colour proves
    // its index wasn't shifted onto a neighbour's style by an out-of-order removal.
    const style = document.createElement('style');
    style.textContent = '#after-button { color: rgb(1, 2, 3); }';
    document.head.appendChild(style);
    const footer = document.createElement('div');
    footer.innerHTML = '<span>Caveat note</span><button type="button">More about these caveats</button><span id="after-button">After the button</span>';
    container.appendChild(footer);

    const svgMarkup = await captureExportedMarkup(container);
    document.head.removeChild(style);
    expect(svgMarkup).not.toContain('<button');
    expect(svgMarkup).not.toContain('More about these caveats');
    expect(svgMarkup).toContain('Caveat note');
    const afterButtonMatch = svgMarkup.match(/<span id="after-button"[^>]*style="([^"]*)"/);
    expect(afterButtonMatch).not.toBeNull();
    expect(afterButtonMatch[1]).toContain('color: rgb(1, 2, 3)');
  });

  it('drops an anchor-based drill-down link, keeping its non-interactive siblings', async () => {
    const container = buildContainer();
    const footer = document.createElement('div');
    footer.innerHTML = '<a href="/details">View details</a><span>Static note</span>';
    container.appendChild(footer);

    const svgMarkup = await captureExportedMarkup(container);
    expect(svgMarkup).not.toContain('<a ');
    expect(svgMarkup).not.toContain('View details');
    expect(svgMarkup).toContain('Static note');
  });

  // Risk section counter-check: MUI's own chart legend can itself be interactive -- this must
  // remove OPERATION, not CONTENT. A legend built from non-interactive markup (as every affected
  // hram panel's hand-built legend is, per the WO) must survive completely intact.
  it('keeps a non-interactive legend fully intact -- removes operation, not content', async () => {
    const container = buildContainer();
    // the fixture's own `.legend` div ("Legend HTML") already carries no button/input/role --
    // confirm it survives the same export that strips the footer's button above.
    const svgMarkup = await captureExportedMarkup(container);
    expect(svgMarkup).toContain('Legend HTML');
  });

  // reviewer + ui_reviewer finding, independently: MUI's own chart legend, when interactive
  // (`onItemClick`/`toggleVisibilityOnClick`), renders each item as `<button role="button"
  // class="...MuiChartsLegend-series...">` wrapping the swatch+label -- that markup IS the
  // legend's content. A blanket removal would delete it along with the click handler; this is the
  // WO's own risk section made concrete, and it must be UNWRAPPED (content kept, button-ness
  // dropped), not removed.
  it('unwraps an interactive MUI legend item instead of removing it -- keeps the swatch and label', async () => {
    const container = buildContainer();
    const legendUl = document.createElement('ul');
    legendUl.className = 'MuiChartsLegend-root';
    legendUl.innerHTML = `
      <li data-series="opened">
        <button type="button" role="button" class="MuiChartsLegend-series">
          <span class="MuiChartsLegend-mark" style="background-color: rgb(25, 118, 210);"></span>
          <span class="MuiChartsLegend-label">Opened</span>
        </button>
      </li>
    `;
    container.appendChild(legendUl);

    const svgMarkup = await captureExportedMarkup(container);
    expect(svgMarkup).not.toContain('<button');
    expect(svgMarkup).toContain('MuiChartsLegend-series');
    expect(svgMarkup).toContain('MuiChartsLegend-mark');
    expect(svgMarkup).toContain('Opened');
  });

  it('rejects when the container fails to rasterize', async () => {
    global.Image = class FailingImage {
      set src(value) {
        this._src = value;
        queueMicrotask(() => this.onerror?.());
      }

      // eslint-disable-next-line class-methods-use-this
      get src() {
        return this._src;
      }
    };
    const container = buildContainer();
    await expect(exportChartPng(container)).rejects.toThrow(/rasterize/);
  });
});
