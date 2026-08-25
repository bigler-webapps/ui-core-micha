// UCM-CHART-17: the two exports promise two different things and now keep them.
//
// SVG stays a true, portable vector: only the chart's own MUI x-charts surface, but with the
// computed styles that render it correctly (font, colour, stroke) written inline, since nothing
// downstream of a cloned+serialised node carries the page's emotion CSS classes. PNG rasterises
// the whole container -- chart, hand-built legend, size key, footnotes -- because that is what
// the screen actually shows (`AccessGapScatterPanel` and its siblings render the legend/size key
// as HTML/SVG siblings of the chart since `HRAM-RES-39`/`HRAM-VIS-2`, outside the chart's own SVG).
//
// Both paths route DOM through an SVG (`<foreignObject>` for the PNG's arbitrary HTML+SVG mix,
// direct serialisation for the chart-only SVG) into an `Image`, then a `<canvas>` -- the platform's
// own APIs, no rasteriser dependency added (this package's only runtime dependency stays
// `@fontsource/dm-sans`). A library was seriously considered, not just skipped: the naive version
// of this technique (an `Image` loaded from a `blob:` URL) taints the canvas on `toBlob` in Chrome
// the moment the SVG contains a `<foreignObject>`, unconditionally -- see `rasterize`'s own comment
// for how that was confirmed live and worked around with a `data:` URI instead, which is what
// makes the platform-only approach actually viable rather than merely attempted.
//
// Font embedding: NOT done. Inlined `font-family` records the real value (e.g. `"DM Sans", ...`
// with its documented fallback stack) instead of nothing at all, which is already a correctness
// improvement over the pre-fix export (unstyled, arbitrary browser default). A machine without DM
// Sans installed falls back through that stack -- an honest, visible degradation, not a silent one,
// and embedding the font file was judged not worth the added complexity/weight for this WO.

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

// Typography and SVG paint -- what actually makes a chart LOOK like the theme instead of bare SVG
// defaults (tick fonts and sizes, axis/grid colours, text fill). Deliberately curated, not a full
// `getComputedStyle` dump: every extra property is bytes in a file a human may open in Illustrator
// or Inkscape.
const CHART_STYLE_PROPERTIES = [
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin',
  'opacity', 'fill-opacity', 'stroke-opacity', 'text-anchor', 'dominant-baseline', 'color',
];

// Box layout/appearance for the HTML legend and size key a panel renders beside the chart --
// only needed for the PNG's whole-container rasterisation, where a hand-built legend is plain
// HTML with no chart-specific paint properties of its own. `overflow` and the grid properties
// (reviewer finding) cover MUI's own composed layouts too, not only a hand-built flex legend --
// `ChartsSurface` itself sits in a `grid-area`, so a container that lets MUI position multiple
// parts via CSS Grid needs those to reposition correctly once cloned out of the page.
const CONTAINER_LAYOUT_STYLE_PROPERTIES = [
  'background-color', 'border-color', 'border-width', 'border-style', 'border-radius',
  'display', 'flex-direction', 'flex-wrap', 'flex', 'align-items', 'justify-content',
  'justify-items', 'align-content', 'gap', 'overflow',
  'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-area',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'width', 'height', 'box-sizing', 'text-align', 'white-space',
];

// Deliberate, not positional (UCM-CHART-17 scope item 3): MUI x-charts' own root `<svg>` always
// carries `MuiChartsSurface-root` (`@mui/x-charts/ChartsSurface`) -- a stable selector, unlike "the
// first svg in the container", which silently exported a size-key SVG once one existed ahead of
// the chart. Falls back to the first SVG for a bespoke (non-MUI) SVG child, which `ChartFrame`'s
// own docblock explicitly allows.
function findChartSvg(chartContainer) {
  const svg = chartContainer?.querySelector('svg.MuiChartsSurface-root') || chartContainer?.querySelector('svg');
  if (!svg) throw new Error('Chart container does not contain an SVG element.');
  return svg;
}

// Walks `sourceRoot` and `cloneRoot` in lockstep (both traversed in the same, deterministic
// document order, since `cloneRoot` is a structural copy of `sourceRoot`) and writes each node's
// RESOLVED style for `properties` onto the clone as an inline `style` attribute. This is what
// carries the page's emotion CSS classes (which the clone keeps by name but not by rule) into a
// standalone file that has no access to that stylesheet.
function inlineComputedStyles(sourceRoot, cloneRoot, properties) {
  const sourceNodes = [sourceRoot, ...sourceRoot.querySelectorAll('*')];
  const cloneNodes = [cloneRoot, ...cloneRoot.querySelectorAll('*')];
  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode || cloneNode.nodeType !== Node.ELEMENT_NODE) return;
    const computed = window.getComputedStyle(sourceNode);
    const declarations = properties
      .map((property) => `${property}: ${computed.getPropertyValue(property)}`)
      .join('; ');
    const existing = cloneNode.getAttribute('style');
    cloneNode.setAttribute('style', existing ? `${existing}; ${declarations}` : declarations);
  });
}

function svgToBlob(svg) {
  return new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// The chart's own surface, faithfully styled -- true vector, chart only. Does not gain the
// legend/size key rendered beside it; that is correct for what this format is for (Part A).
function chartSvgBlob(chartContainer) {
  const svg = findChartSvg(chartContainer);
  const clone = svg.cloneNode(true);
  inlineComputedStyles(svg, clone, CHART_STYLE_PROPERTIES);
  // reviewer finding: MUI's ChartsSurface only ever gives the root <svg> a `viewBox` -- its actual
  // pixel size comes from CSS (`width: 100%; height: 100%` against the page's own layout), which
  // has nothing to resolve against once cloned out to a standalone file. Without an explicit
  // width/height a standalone viewer falls back to the SVG UA default (typically 300x150).
  const rect = svg.getBoundingClientRect();
  clone.setAttribute('width', Math.ceil(rect.width) || svg.clientWidth || 1);
  clone.setAttribute('height', Math.ceil(rect.height) || svg.clientHeight || 1);
  clone.setAttribute('xmlns', SVG_NS);
  return svgToBlob(clone);
}

// The whole container, as seen -- chart plus everything the panel renders beside it, via an SVG
// `<foreignObject>` wrapping a styled clone of the container's actual DOM. Standard platform
// technique for DOM rasterisation without a library: the intermediate SVG is never downloaded, only
// decoded into an `Image` and drawn onto a `<canvas>`.
function containerSvgBlob(chartContainer) {
  const rect = chartContainer.getBoundingClientRect();
  const width = Math.ceil(rect.width) || chartContainer.scrollWidth || 1;
  const height = Math.ceil(rect.height) || chartContainer.scrollHeight || 1;

  const clone = chartContainer.cloneNode(true);
  inlineComputedStyles(chartContainer, clone, [...CHART_STYLE_PROPERTIES, ...CONTAINER_LAYOUT_STYLE_PROPERTIES]);
  clone.setAttribute('xmlns', XHTML_NS);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const foreignObject = document.createElementNS(SVG_NS, 'foreignObject');
  foreignObject.setAttribute('width', '100%');
  foreignObject.setAttribute('height', '100%');
  foreignObject.appendChild(clone);
  svg.appendChild(foreignObject);

  return { svg, width, height };
}

// UCM-CHART-17 risk section, confirmed live (not assumed): an SVG containing a `<foreignObject>`
// taints the canvas on `toBlob` in Chrome -- unconditionally, even with zero external references
// (verified: a foreignObject holding nothing but plain styled text already triggers
// `SecurityError: Tainted canvases may not be exported`) -- but ONLY when the image is loaded via
// a `blob:` object URL. The identical SVG loaded via a `data:` URI does not taint the canvas at
// all. This is why the SVG-only export (`chartSvgBlob`, no foreignObject) can keep using
// `URL.createObjectURL` for its own download, while the PNG path's `Image` source specifically
// must be a `data:` URI. No rasteriser dependency needed once this is accounted for.
async function svgToDataUri(svg) {
  const svgString = await svgToBlob(svg).text();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

async function rasterize(svg, width, height, backgroundColour) {
  const dataUri = await svgToDataUri(svg);
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const context = canvas.getContext('2d');
        context.fillStyle = backgroundColour;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Unable to create PNG export.'));
            return;
          }
          resolve(blob);
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      reject(new Error('Unable to rasterize chart container for PNG export.'));
    };
    image.src = dataUri;
  });
}

/** Serializes the chart's own SVG surface, styles inlined, and downloads it. */
export function exportChartSvg(chartContainer, filename = 'chart.svg') {
  const blob = chartSvgBlob(chartContainer);
  download(blob, filename);
  return blob;
}

/**
 * Rasterizes the whole chart container -- chart, legend, size key, footnotes, everything the panel
 * renders beside the chart -- at two-times scale and downloads it.
 */
export async function exportChartPng(chartContainer, filename = 'chart.png', backgroundColour) {
  const { svg, width, height } = containerSvgBlob(chartContainer);
  const blob = await rasterize(svg, width, height, backgroundColour);
  download(blob, filename);
  return blob;
}
