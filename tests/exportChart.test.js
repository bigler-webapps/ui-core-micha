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
