export const DEFAULT_LEGEND_POSITION = {
  vertical: 'bottom',
  horizontal: 'start',
};

export function withGridDefaults(grid) {
  return { horizontal: true, ...grid };
}

export function withAxisDefaults(axes, label, defaults, tickFontSize) {
  const values = axes?.length ? axes : [defaults];
  return values.map((axis, index) => ({
    // `defaults.scaleType` (and any other scale-defining default) must
    // survive even when the caller passes their OWN xAxis/yAxis array --
    // confirmed live in the dev harness: a caller-supplied axis with `data`
    // but no `scaleType` previously lost 'point'/'band' entirely (only
    // applied when the whole array was absent), leaving MUI's scale
    // undefined and every point position NaN (`<path> attribute d:
    // Expected number, "MNaN,..."` in the real rendered SVG -- a mocked
    // prop-assertion test cannot catch this, it only reproduces on an
    // actual MUI scale computation).
    ...defaults,
    ...axis,
    tickLabelStyle: {
      fontSize: tickFontSize,
      ...axis.tickLabelStyle,
    },
    // THEME-9: the single `label` argument is the caller's ONE string for
    // this whole axis family (xAxisLabel/yAxisLabel) -- it may only ever
    // fall back onto ONE axis. Applying it via .map() to every entry
    // broadcast the identical label onto every axis in a multi-axis array
    // (measured live: hram's dual-axis chart carried the same 43-character
    // label on both y-axes). Only the first entry -- the common single-axis
    // case is index 0 -- gets the fallback; a caller building a genuine
    // multi-axis array must label each entry itself (as TimeSeriesChart's
    // own secondary-axis support already does), exactly like MUI's own
    // default `position: 'left'` (only the first entry, MUI docs).
    label: axis.label || (index === 0 ? label : undefined),
  }));
}

function cssLengthToPixels(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  if (value.endsWith('rem') || value.endsWith('em')) return parsed * 16;
  return parsed;
}

const MUI_LABELLED_X_AXIS_HEIGHT = 45;
// Still used by `sizeYAxisForContent` (THEME-9, y-axis width) below -- unrelated to CHART-11,
// which only replaces how the ROTATED x-axis path (`rotatedTickMetrics`) estimates width.
const AVERAGE_GLYPH_WIDTH_EM = 0.6;

// CHART-11: per-character width table (em units), the ESTIMATE fallback used only when no DOM is
// available to actually measure a tick label's rendered extent (SSR, or a test environment where
// `measureTickTextWidthPx` returns null -- jsdom does not implement real SVG text layout). A
// single flat multiplier (the pre-CHART-11 constant, `AVERAGE_GLYPH_WIDTH_EM = 0.6`) systematically
// overestimated real ward-name-shaped strings: they mix spaces, apostrophes and narrow lowercase
// letters ("Mang'ula", "Msolwa Station") with a few wide/uppercase ones, and a flat multiplier
// prices every character at the wide end. Three tiers, not a full per-glyph font metrics table --
// proportionate to "an estimate", not a replacement for real measurement.
const NARROW_GLYPH_WIDTH_EM = 0.28; // i l j I ' . , : ; ! | and space
const WIDE_GLYPH_WIDTH_EM = 0.78; // uppercase (except I), plus lowercase m/w
const DEFAULT_GLYPH_WIDTH_EM = 0.52; // everything else -- most lowercase letters and digits
const NARROW_GLYPH_CHARS = new Set(["i", "l", "j", "I", "'", ".", ",", ":", ";", "!", "|", " "]);
const WIDE_GLYPH_CHARS = new Set(["m", "w"]);

function glyphWidthEm(char) {
  if (NARROW_GLYPH_CHARS.has(char)) return NARROW_GLYPH_WIDTH_EM;
  if (WIDE_GLYPH_CHARS.has(char) || (char >= 'A' && char <= 'Z')) return WIDE_GLYPH_WIDTH_EM;
  return DEFAULT_GLYPH_WIDTH_EM;
}

/**
 * CHART-11 ESTIMATE fallback (declared explicitly, not dressed up as a measurement): sums a
 * per-character width table instead of applying one flat multiplier to the whole string. Only
 * reached when `measureTickTextWidthPx` returns null.
 */
function estimateTextWidthPx(text, fontSizePx) {
  let widthEm = 0;
  for (const char of text) widthEm += glyphWidthEm(char);
  return widthEm * fontSizePx;
}

let hiddenMeasurementTextNode;

function getHiddenMeasurementTextNode() {
  if (typeof document === 'undefined') return null;
  if (hiddenMeasurementTextNode && hiddenMeasurementTextNode.isConnected) {
    return hiddenMeasurementTextNode;
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.overflow = 'hidden';
  svg.style.pointerEvents = 'none';
  const text = document.createElementNS(svgNS, 'text');
  svg.appendChild(text);
  (document.body || document.documentElement).appendChild(svg);
  hiddenMeasurementTextNode = text;
  return text;
}

/**
 * CHART-11: measures a tick label's real rendered width via a transient, invisible, shared SVG
 * `<text>` node -- the same element type MUI's own axis ticks render as, so glyph metrics match
 * whatever font actually cascades to it (this package has no access to the consumer's theme font
 * at this call site; the transient node inherits the page's own cascade, same as a real tick
 * would). Returns `null` (never throws) when no DOM is available (SSR) or when
 * `getComputedTextLength` is unsupported/unreliable there (jsdom does not implement real SVG text
 * layout) -- callers fall back to `estimateTextWidthPx` in that case, and tests inject their own
 * stub via `spaceForRotatedTicks`'s optional `measureTextWidth` parameter for determinism.
 */
function measureTickTextWidthPx(text, fontSizePx) {
  try {
    const node = getHiddenMeasurementTextNode();
    if (!node) return null;
    node.setAttribute('font-size', String(fontSizePx));
    node.textContent = text;
    const length = node.getComputedTextLength();
    return Number.isFinite(length) && length > 0 ? length : null;
  } catch {
    return null;
  }
}

// THEME-11: this package never formed an opinion on chart margins, so every chart fell back to
// MUI's own DEFAULT_MARGINS (20px on all four sides) -- measured live (hram's KPI cards) as 167
// of a 270px-tall chart being furniture. Per-side, not a uniform trim, because each side is for
// something different: `left`/`bottom` are pure padding (the tick labels already live inside
// axisSizeLeft / DEFAULT_AXIS_SIZE_HEIGHT), `top` keeps room for the topmost y-tick label's own
// ~9px overhang past the plot (it is centred on its gridline, not below it), and `right` stays
// less trimmed than `left` because a LINEAR x-axis's last tick label sits AT the edge and
// overhangs by about half its width (~13px at caption size) -- a band axis wouldn't need it, but
// making this conditional on scale type would be inferred behaviour with no named consumer.
//
// UCM-CHART-12 Rule 3: no caller-supplied `margin` exists any more (the model owns spacing
// completely, `resolveChartLayout` builds the final margin object directly) -- this is now only
// the base every side starts from before `resolveChartLayout` adds the legend band to one side.
export const PACKAGE_DEFAULT_MARGIN = {
  top: 10, bottom: 8, left: 8, right: 16,
};

// CHART-11: small clearance between the rotated text block's own projected extent and the
// bottom of the axis's reserved band -- the same order of magnitude as the package's own
// PACKAGE_DEFAULT_MARGIN breathing-room, applied here for the same reason (a hard 0px gap reads
// as clipped even when nothing is actually cut off).
const ROTATED_TICK_CLEARANCE_PX = 8;

// THEME-9: MUI X-Charts' own default y-axis width is a flat 45px (ticks) +
// 20px (label, if present) = 65px regardless of what the ticks actually say
// -- confirmed against @mui/x-charts' own DEFAULT_AXIS_SIZE_WIDTH /
// AXIS_LABEL_DEFAULT_HEIGHT constants and its `useChartDimensions` selector
// (drawingArea.left = margin.left + axisSizeLeft, i.e. margin and axis size
// are ADDITIVE, not one containing the other). That flat default is both too
// generous for short ticks ("0%"/"50%"/"100%") and too stingy for wide ones
// ("50.0 min"), which is exactly the measured overlap on the Accessibility
// y-axis. Mirrors spaceForRotatedTicks' existing text-width heuristic below.
const Y_AXIS_TICK_SIZE = 6;
const Y_AXIS_TICK_LABEL_GAP = 2;
const Y_AXIS_LABEL_TICK_GAP = 2;
// A rotated (90deg) axis-label's line-box "thickness" -- what it costs in
// WIDTH once rotated -- runs a bit past its raw font size once ascender/
// descender room is included; matches the ~18px measured live for a 14px
// label (14 * 1.3 ~= 18).
const Y_AXIS_LABEL_THICKNESS_FACTOR = 1.3;
// A small safety margin on the estimate: `spaceForRotatedTicks`'s own risk
// note applies here too -- a too-tight cut recreates the overlap it was
// meant to fix, and glyph-width heuristics are approximate by nature.
const Y_AXIS_WIDTH_SAFETY_FACTOR = 1.1;
// MUI X-Charts' ChartsYAxisImpl hardcodes the axis-label font at 14px
// (`additionalProps.style: {...theme.typography.body1, fontSize: 14, ...}`
// -- fontSize:14 is set AFTER the theme.typography.body1 spread, so it wins
// regardless of what body1 actually resolves to). Matching that literal
// constant here -- rather than reading it off `theme.typography.body1` --
// keeps this sizing correct even if this package's body1 size ever changes;
// coupling it to body1 was only ever coincidentally right because body1
// happens to be 14px today.
const MUI_AXIS_LABEL_FONT_SIZE_PX = 14;

function longestFormattedTick(values, valueFormatter) {
  return values.reduce((longest, value) => {
    let text;
    try {
      text = valueFormatter ? String(valueFormatter(value, { location: 'tick' })) : String(value);
    } catch {
      // Some formatters require MUI's complete scale context; falling back
      // to the raw value is conservative -- it reserves at least as much
      // space as the unformatted number would need.
      text = String(value);
    }
    return text.length > longest.length ? text : longest;
  }, '');
}

/**
 * Sizes a linear y-axis to its actual tick content instead of MUI's flat
 * default. Only touches axes the caller left unsized (`axis.width == null`)
 * and only linear/numeric ones -- a categorical axis's ticks are names, not
 * numbers, and sizing those is not this function's job. Candidate values come
 * from the axis' own `min`/`max` when the caller set them (as every current
 * consumer does), falling back to the series actually plotted against this
 * axis; if neither yields a candidate, the axis is left untouched rather than
 * guessed at.
 *
 * `tickFontSize` is only the FALLBACK -- an axis' own `tickLabelStyle.fontSize`
 * (set by `withAxisDefaults`, itself overridable per-axis by the caller) is
 * read first, so a caller-tuned tick font is sized correctly rather than
 * against the package-wide default. The axis LABEL's font is not a caller
 * knob at all (`MUI_AXIS_LABEL_FONT_SIZE_PX` -- MUI hardcodes it).
 *
 * The series-to-axis match for the fallback deliberately mirrors MUI's own
 * default-assignment rule, not a naive `undefined === undefined`: a series
 * with no explicit `yAxisId` is assigned to the FIRST axis in the array
 * (`yAxisIds[0]` in MUI's own selector), never to "no id". Matching only
 * `undefined === undefined` left the primary axis of a real dual-axis chart
 * (id `'primary'`, its series never set `yAxisId`) with zero matched series
 * and therefore MUI's untouched flat default -- a silent no-op on exactly
 * the dual-axis case this WO was measured against.
 */
export function sizeYAxisForContent(yAxis, series, tickFontSize) {
  const fallbackTickFontSizePx = cssLengthToPixels(tickFontSize);
  const defaultAxisId = yAxis[0]?.id;
  return yAxis.map((axis) => {
    if (axis.width != null) return axis;
    if (axis.scaleType && axis.scaleType !== 'linear') return axis;

    const tickFontSizePx = cssLengthToPixels(axis.tickLabelStyle?.fontSize) || fallbackTickFontSizePx;
    if (tickFontSizePx === 0) return axis;

    const candidates = [];
    if (typeof axis.min === 'number') candidates.push(axis.min);
    if (typeof axis.max === 'number') candidates.push(axis.max);
    if (candidates.length === 0) {
      (series || [])
        .filter((item) => (item.yAxisId ?? defaultAxisId) === axis.id)
        .forEach((item) => (item.data || []).forEach((value) => {
          if (typeof value === 'number') candidates.push(value);
        }));
    }
    if (candidates.length === 0) return axis;

    const longestTick = longestFormattedTick(candidates, axis.valueFormatter);
    // UCM-CHART-12 Rule 2 (codex second-pass review finding): candidates existed, but a caller
    // `valueFormatter` reduced every one of them to a blank string -- this is the y-axis analogue
    // of `xAxisHasVisibleTicks`'s Access-scatter case, and must collapse the same way. Distinct
    // from `candidates.length === 0` above (nothing to measure at all, MUI's own default applies,
    // untouched): here there WAS content, it just renders as nothing. With no axis title either,
    // the axis has genuinely nothing to show, so the whole band collapses to 0 -- not merely the
    // text-width term floored, matching the x-axis band's own all-or-nothing zero.
    if (longestTick.length === 0 && !axis.label) return { ...axis, width: 0 };
    const tickTextWidth = longestTick.length === 0 ? 0 : Math.max(
      tickFontSizePx,
      longestTick.length * tickFontSizePx * AVERAGE_GLYPH_WIDTH_EM,
    );
    const labelThickness = axis.label
      ? Math.ceil(MUI_AXIS_LABEL_FONT_SIZE_PX * Y_AXIS_LABEL_THICKNESS_FACTOR) + Y_AXIS_LABEL_TICK_GAP
      : 0;
    const width = Math.ceil(
      (tickTextWidth + Y_AXIS_TICK_SIZE + Y_AXIS_TICK_LABEL_GAP + labelThickness)
      * Y_AXIS_WIDTH_SAFETY_FACTOR,
    );

    return { ...axis, width };
  });
}

/**
 * Locale-correct, unit-free tick numbers as the default -- BarChart set none
 * at all (raw numbers straight from the domain), and a hand-rolled `Intl`
 * compact-notation default was measured to be actively wrong: German does
 * not compact thousands at all (`12'500` stays `12'500`) and Swahili prepends
 * a word that is WIDER than the raw number (`elfu 12.5`) -- compact notation
 * does not solve the width problem and worsens it in one locale. Plain
 * grouped formatting (no `notation: 'compact'`) is safe across all four
 * locales this package's consumers use. Ticks get a short, rounded form;
 * tooltip/legend keep full precision -- teaching screens must not round away
 * a meaningful difference. A caller's own `valueFormatter` always wins (this
 * is only ever used as a default, per `withAxisDefaults`' `{...defaults,
 * ...axis}` merge).
 */
export function defaultNumericTickFormatter(locale) {
  return (value, context) => (context?.location === 'tick'
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
    : new Intl.NumberFormat(locale).format(value));
}

// UCM-CHART-15: named size tokens, resolved through the theme's 8px spacing unit
// (`src/theme/tokens.js`'s `spacing: 8`). Through UCM-CHART-12/14, `standard` stayed pinned to
// the pre-existing deployed default (`TimeSeriesChart`'s old `CHART_HEIGHT = 320`) so that
// migration did not also silently redraw every already-shipped default-sized chart -- that pin
// was a migration guardrail, not a design verdict. The migration it protected is complete, and
// the operator judged the whole scale too cramped (`tall` had already forced hram to use the
// `height` px escape to get past the old ceiling), so this WO shifts every token up one step and
// adds two steps above the old `tall`, chosen rather than inherited. Documented plainly in
// `docs/CHART-LAYOUT.md` -- these are visible product decisions, not internal plumbing.
export const CHART_SIZE_SPACING_UNITS = {
  compact: 40, standard: 50, tall: 60, extra_tall: 70, super_tall: 80,
};

// UCM-CHART-12 Rule 2: every band is its own measured content, or zero -- no band is ever a
// constant taken on faith. These two ARE constants, but only for the "content is present" case;
// each one collapses to 0 the moment its content is absent (`resolveXAxisGeometry`,
// `resolveChartLayout` below).
//
// ui_reviewer finding U1: before this WO, a plain (unrotated, untitled) axis got NO explicit
// `axis.height` at all -- MUI computed its own default internally. This resolver now always sets
// `axis.height` explicitly (Rule 1: nothing outside the resolver does chart arithmetic), which
// looked like a silent behaviour change until checked against MUI's own source
// (`@mui/x-charts/constants`): `DEFAULT_AXIS_SIZE_HEIGHT = 25` and `AXIS_LABEL_DEFAULT_HEIGHT =
// 20` -- i.e. `TICK_BAND_BASE_PX`/`AXIS_TITLE_BAND_PX` below are not an approximation, they are
// MUI's own constants, confirmed pixel-for-pixel. Making them explicit changes nothing about what
// renders for that common case; `TICK_BAND_BASE_PX + AXIS_TITLE_BAND_PX` = 45 is also exactly the
// pre-CHART-12 `MUI_LABELLED_X_AXIS_HEIGHT`, decomposed into the two bands Rule 2 requires instead
// of one opaque "labelled axis height" figure.
const TICK_BAND_BASE_PX = 25;
const AXIS_TITLE_BAND_PX = MUI_LABELLED_X_AXIS_HEIGHT - TICK_BAND_BASE_PX;
// One row of legend chips + gap -- MUI does not reserve this space itself (confirmed: nothing in
// this package's pre-CHART-12 margin/axis math ever accounted for the legend), so a visible
// legend growing the SVG uncounted was the sixth defect this WO's Rule 2 also closes.
const LEGEND_BAND_PX = 32;

// UCM-CHART-12 `xLabels: "auto"`: with no real container-width measurement available before
// render (the presets stay responsive -- MUI measures actual width via ResizeObserver, which this
// pure function cannot see), "auto" is a documented HEURISTIC, not a true fit computation: rotate
// once there are enough categories AND the longest one, MEASURED (same mechanism as the rotated
// projection below -- real DOM measurement when available, the per-glyph estimate otherwise), is
// wide enough that a horizontal row would plausibly collide. Codex second-pass review finding:
// the first cut of this heuristic used a raw character-count threshold instead of the measured
// width this function already has available -- replaced, since "decide from the measured labels"
// (Rule 3) is achievable even without a real container width to compare against. The count
// threshold stays as the OTHER half of the heuristic: a handful of wide labels can still fit
// spread across a wide chart, so width alone should not trigger rotation either.
const AUTO_ROTATE_TICK_COUNT = 6;
const AUTO_ROTATE_LABEL_WIDTH_PX = 50;

function xAxisTickContentText(axis) {
  const data = axis?.data;
  if (!Array.isArray(data)) return null; // no data array -- can't tell (e.g. a numeric scale); assume content
  return longestFormattedTick(data, axis.valueFormatter);
}

// The Access-scatter case (WO Part A): an axis whose tick labels are all blank/absent must
// collapse its reserved band to zero, not keep the package's floor. `null` (no data array at
// all -- a linear numeric axis, whose ticks come from the scale, not a caller-supplied list)
// is treated as "assume content", since there is nothing here to measure as empty.
function xAxisHasVisibleTicks(axis) {
  const text = xAxisTickContentText(axis);
  return text === null || text.length > 0;
}

/**
 * UCM-CHART-12: decides the x-axis tick band's height and rotation angle. Replaces CHART-10/11's
 * `spaceForRotatedTicks`/`rotatedTickMetrics` -- same measured-text-width mechanism
 * (`measureTickTextWidthPx`, with `estimateTextWidthPx` as the no-DOM fallback and
 * `measureTextWidth` as the test injection point), but now driven by `xLabels`
 * ("auto"|"horizontal"|"angled") instead of a caller-supplied `tickLabelStyle.angle`, and
 * returning 0 outright when the axis has no visible tick content (Rule 2).
 */
function resolveXAxisGeometry(axis, xLabelsMode, defaultLineHeight, measureTextWidth, fallbackTickFontSize) {
  if (!xAxisHasVisibleTicks(axis)) return { tickBand: 0, angle: 0 };

  const fontSize = cssLengthToPixels(axis?.tickLabelStyle?.fontSize) || cssLengthToPixels(fallbackTickFontSize);
  const longestLabel = xAxisTickContentText(axis) || '';
  const dataCount = Array.isArray(axis?.data) ? axis.data.length : 0;
  const measure = measureTextWidth || measureTickTextWidthPx;

  // Measured once, up front -- both "auto"'s rotation DECISION and the rotated-band PROJECTION
  // below need the label's real width, and must agree on what "real" means (same measurement,
  // same estimate fallback) or the two could disagree about the same label.
  const labelWidthPx = fontSize > 0
    ? Math.max(fontSize, (() => {
      const measured = measure(longestLabel, fontSize);
      return Number.isFinite(measured) && measured > 0 ? measured : estimateTextWidthPx(longestLabel, fontSize);
    })())
    : 0;

  let angle = 0;
  if (xLabelsMode === 'angled') {
    angle = Number(axis?.tickLabelStyle?.angle) || -45;
  } else if (xLabelsMode === 'auto') {
    const needsRotation = dataCount > AUTO_ROTATE_TICK_COUNT && labelWidthPx > AUTO_ROTATE_LABEL_WIDTH_PX;
    angle = needsRotation ? -45 : 0;
  } // "horizontal" always stays at angle 0

  if (angle === 0) return { tickBand: TICK_BAND_BASE_PX, angle: 0 };
  // Rotation is a visual instruction independent of whether a font size is knowable here -- an
  // "angled" axis still rotates even when `fontSize` can't be resolved (no theme fallback given),
  // it just can't project a tighter band than the floor without one.
  if (fontSize === 0) return { tickBand: TICK_BAND_BASE_PX, angle };

  const lineHeight = Number(axis?.tickLabelStyle?.lineHeight) || defaultLineHeight;
  const textWidth = labelWidthPx;
  const radians = (angle * Math.PI) / 180;
  const projectedHeight = Math.abs(Math.cos(radians)) * fontSize * lineHeight
    + Math.abs(Math.sin(radians)) * textWidth;
  const tickBand = Math.max(TICK_BAND_BASE_PX, Math.ceil(projectedHeight) + ROTATED_TICK_CLEARANCE_PX);
  return { tickBand, angle };
}

function resolveChartHeightPx(size, height, spacing) {
  if (height != null) return height;
  const units = CHART_SIZE_SPACING_UNITS[size];
  if (units == null) {
    throw new Error(
      `[ui-core-micha] Unknown chart size="${size}". Use "compact" | "standard" | "tall" | `
      + '"extra_tall" | "super_tall", or pass height (in px) for the documented escape.',
    );
  }
  // MUI's `theme.spacing(n)` returns a CSS length STRING ("320px"), not a number -- the chart
  // height feeds straight into MUI X-Charts' own numeric `height` prop, so it must be unwrapped
  // back to a px number via the same `cssLengthToPixels` the rest of this file already uses.
  return typeof spacing === 'function' ? cssLengthToPixels(spacing(units)) : units * 8;
}

/**
 * UCM-CHART-12: the one function that owns a chart's geometry (Rule 1-3), replacing
 * `resolveChartHeight` + `spaceForRotatedTicks` + `warnOnHeightMismatch`. Returns the COMPLETE
 * geometry a preset needs -- wrapper `sx`, chart height, margins, and both resolved axis arrays --
 * plus the named `bands` the composition invariant is asserted against:
 *
 *   chartHeight === bands.plotHeight + bands.xAxisBand + bands.xTitleBand + bands.legendBand
 *   containerWidth === bands.yAxisBand + bands.plotWidth + bands.rightPad   (when `containerWidth` is given)
 *
 * `plotHeight`/`plotWidth` are the RESIDUAL of `chartHeight`/`containerWidth` minus the OTHER
 * fields this function itself returns (`margin.top/bottom`, `xAxis[0].height`, `yAxisBand`) --
 * by construction, summing them back up can never fail to balance, so that arithmetic identity
 * ALONE proves nothing about a `UCM-CHART-10`-shaped bug (a term double-counted between
 * `xAxis.height` and `margin.bottom`). What actually catches that class of bug is asserting each
 * individual band lands in exactly one place downstream, independently of the others:
 * `xAxis[0].height === xAxisBand + xTitleBand` (nothing else may also carry the tick/title
 * allowance) and `margin.top + margin.bottom - PACKAGE_DEFAULT_MARGIN.top -
 * PACKAGE_DEFAULT_MARGIN.bottom === legendBand` (the ONLY thing margin grows for, over its own
 * package baseline, is the legend). The test suite asserts both forms side by side.
 *
 * `plotHeight` deliberately does NOT subtract the base `PACKAGE_DEFAULT_MARGIN` breathing room --
 * that margin is intentional spacing around the plot (THEME-11), not one of the three itemized
 * "furniture" bands (tick/title/legend) this WO exists to zero out, so it is treated as part of
 * "the rest of the chart", the same as `plotHeight` itself.
 *
 * `containerWidth` is optional and only meaningful for tests / the browser-level check -- the
 * presets themselves stay responsive (no explicit width) and never pass it.
 */
export function resolveChartLayout({
  size = 'standard',
  height,
  xAxis,
  yAxis,
  series = [],
  xLabels = 'auto',
  hideLegend = false,
  legendPosition = DEFAULT_LEGEND_POSITION,
  slotProps,
  tickFontSize,
  spacing,
  defaultLineHeight = 1,
  measureTextWidth,
  containerWidth,
} = {}) {
  const chartHeight = resolveChartHeightPx(size, height, spacing);

  const xAxisList = xAxis?.length ? xAxis : [{}];
  const primaryXAxis = xAxisList[0];
  const { tickBand: xAxisBand, angle } = resolveXAxisGeometry(
    primaryXAxis, xLabels, defaultLineHeight, measureTextWidth, tickFontSize,
  );
  const xTitleBand = primaryXAxis?.label ? AXIS_TITLE_BAND_PX : 0;

  // Codex second-pass review finding: a caller-set `slotProps.legend.position` overrides
  // `legendPosition` at RENDER time (`withChartSlotDefaults`) but was invisible here, so the
  // margin/height this function reserved could disagree with where the legend actually rendered.
  // `resolveLegendPosition` is the one merge both call sites now share.
  const effectiveLegendPosition = resolveLegendPosition(legendPosition, slotProps);

  // A `vertical: 'middle'` legend renders on the SIDE (consuming width, not height) -- reviewer
  // finding: only branching on 'top' vs. not-'top' always reserved the legend band vertically,
  // over-reserving height and under-reserving width for a side-placed legend. This WO's width
  // invariant does not itemize a legend-width band, so a side legend simply gets none of the
  // height reservation here rather than a wrong one -- consistent with the WO's own text ("0 when
  // legend is off or horizontal").
  const legendVertical = effectiveLegendPosition.vertical;
  const legendIsSidePlaced = legendVertical === 'middle';
  const legendHeightBand = hideLegend || legendIsSidePlaced ? 0 : LEGEND_BAND_PX;
  const legendOnTop = legendHeightBand > 0 && legendVertical === 'top';

  const sizedYAxis = sizeYAxisForContent(yAxis?.length ? yAxis : [{}], series, tickFontSize);
  // Codex second-pass review finding: a dual-axis chart (TimeSeriesChart's `axis: 'secondary'`
  // feature, CHART-5) has a SECOND y-axis on the right, consuming its own width -- the resolver
  // only ever accounted for `sizedYAxis[0]`. `position` defaults to `'left'` for an unmarked axis
  // (matching MUI's own default-assignment rule, same as `sizeYAxisForContent`'s own series-match
  // logic above), so only an explicit `'right'` counts as the secondary axis.
  const primaryYAxis = sizedYAxis.find((axisEntry) => axisEntry.position !== 'right') ?? sizedYAxis[0];
  const secondaryYAxisEntry = sizedYAxis.find((axisEntry) => axisEntry.position === 'right');
  const yAxisBand = primaryYAxis?.width ?? 0;
  const secondaryYAxisBand = secondaryYAxisEntry?.width ?? 0;
  const rightPad = PACKAGE_DEFAULT_MARGIN.right;

  const resolvedXAxis = xAxisList.map((axisEntry, index) => {
    if (index !== 0) return axisEntry;
    // `xLabels` is the SOLE source of truth for rotation (Rule 3) -- `angle` is always written
    // explicitly here, even when 0, rather than only overriding a truthy value, and regardless of
    // whether the caller also set an explicit `height` (own `height` bypasses the model's SIZE,
    // never its ROTATION -- codex second-pass review finding: the two were previously coupled,
    // so a caller-set `height` could silently keep a stale rotated `tickLabelStyle.angle` even
    // under `xLabels="horizontal"`). Leaving a stale caller-supplied angle in place when `xLabels`
    // resolved to no rotation would let MUI still render a rotated label whose band this resolver
    // reserved as if it were flat -- exactly the space/render mismatch this WO exists to close,
    // just inverted (under-reservation instead of CHART-10's over-reservation).
    const { angle: _callerAngle, ...restTickLabelStyle } = axisEntry.tickLabelStyle || {};
    return {
      ...axisEntry,
      height: axisEntry.height ?? (xAxisBand + xTitleBand),
      tickLabelStyle: { ...restTickLabelStyle, angle },
    };
  });

  const margin = {
    top: PACKAGE_DEFAULT_MARGIN.top + (legendOnTop ? legendHeightBand : 0),
    bottom: PACKAGE_DEFAULT_MARGIN.bottom + (legendOnTop ? 0 : legendHeightBand),
    left: PACKAGE_DEFAULT_MARGIN.left,
    right: rightPad + secondaryYAxisBand,
  };

  // `plotHeight`/`plotWidth`: the residual of `chartHeight`/`containerWidth` minus the three named
  // furniture bands (see this function's own docblock for why this alone does not prove the
  // absence of a double-counted term, and what does).
  const plotHeight = chartHeight - xAxisBand - xTitleBand - legendHeightBand;
  const plotWidth = containerWidth != null
    ? containerWidth - yAxisBand - secondaryYAxisBand - rightPad
    : undefined;

  return {
    chartHeight,
    sx: { width: '100%', height: chartHeight },
    margin,
    xAxis: resolvedXAxis,
    yAxis: sizedYAxis,
    bands: {
      plotHeight,
      xAxisBand,
      secondaryYAxisBand,
      xTitleBand,
      legendBand: legendHeightBand,
      yAxisBand,
      rightPad,
      ...(containerWidth != null ? { plotWidth, containerWidth } : {}),
    },
  };
}

/**
 * UCM-CHART-12 Rule 1/3: `minHeight`, `aspect`, and `margin` are gone from the four chart presets
 * -- the model owns sizing and spacing completely. Passing one is a dev-mode error naming its
 * replacement (never a silent ignore, so the 38 existing call sites this breaks get a clear
 * migration path instead of a layout that quietly stops matching what the prop says) -- gated on
 * `NODE_ENV !== 'production'` like the deleted `warnOnHeightMismatch` was, so a shared package
 * cannot crash a consumer's production page over a layout prop; loud in dev, inert in prod.
 *
 * `removedIn` (codex review finding, UCM-CHART-13): a shared helper hardcoding ONE WO/version
 * string would misattribute the removal for every OTHER call site that reuses it -- `ChartFrame`
 * (UCM-CHART-13, v3.1.0) removes `height`/`aspect` for a different reason, in a different WO, than
 * the four presets' own `minHeight`/`aspect`/`margin` (UCM-CHART-12, v3.0.0). The default keeps
 * every existing call site's message byte-identical; only a NEW call site needs to override it.
 */
export function assertRemovedChartProp(componentName, propName, value, replacement, removedIn = 'UCM-CHART-12, v3.0.0') {
  if (value === undefined || process.env.NODE_ENV === 'production') return;
  throw new Error(
    `[ui-core-micha] <${componentName}> no longer accepts "${propName}" (removed in ${removedIn} `
    + `-- see docs/CHART-LAYOUT.md). ${replacement}`,
  );
}

/**
 * UCM-CHART-12 (codex second-pass review finding): the single source of truth for where the
 * legend actually renders -- `legendPosition` merged with a `slotProps.legend.position` override,
 * same precedence `withChartSlotDefaults` already applied. Before this fix, `resolveChartLayout`
 * only ever looked at `legendPosition` when deciding how much space to reserve and on which side,
 * while `withChartSlotDefaults` (below) separately let `slotProps.legend.position` win at RENDER
 * time -- a caller passing both could get a legend rendered top/side while the resolver had
 * reserved space for bottom (or none), the exact reserved-vs-rendered mismatch this WO exists to
 * close. Both call sites now merge through this one function.
 */
export function resolveLegendPosition(legendPosition, slotProps) {
  return {
    ...DEFAULT_LEGEND_POSITION,
    ...legendPosition,
    ...slotProps?.legend?.position,
  };
}

export function withChartSlotDefaults(slotProps, legendPosition) {
  const position = resolveLegendPosition(legendPosition, slotProps);
  return {
    ...slotProps,
    tooltip: {
      trigger: 'axis',
      ...slotProps?.tooltip,
    },
    legend: {
      ...slotProps?.legend,
      position,
    },
  };
}
