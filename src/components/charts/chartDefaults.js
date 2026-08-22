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
export const PACKAGE_DEFAULT_MARGIN = {
  top: 10, bottom: 8, left: 8, right: 16,
};

/**
 * Applies the package's own margin default, per side -- a caller's own value on any side always
 * wins on that side; only an UNSET side gets the package default. A caller passing `{ left: 60 }`
 * therefore keeps that 60 on the left and gets the package defaults on the other three sides,
 * never MUI's wider ones. CHART-10: this applies identically whether or not the x-axis carries
 * rotated labels -- `spaceForRotatedTicks` no longer computes a `bottom` of its own.
 */
export function withMarginDefaults(margin) {
  const explicit = typeof margin === 'number'
    ? { top: margin, bottom: margin, left: margin, right: margin }
    : margin;
  return { ...PACKAGE_DEFAULT_MARGIN, ...explicit };
}

// CHART-11: small clearance between the rotated text block's own projected extent and the
// bottom of the axis's reserved band -- the same order of magnitude as the package's own
// PACKAGE_DEFAULT_MARGIN breathing-room, applied here for the same reason (a hard 0px gap reads
// as clipped even when nothing is actually cut off).
const ROTATED_TICK_CLEARANCE_PX = 8;

/**
 * CHART-11: `measureTextWidth` is injectable (defaults to the real `measureTickTextWidthPx`) so
 * tests can stub it for a deterministic result instead of depending on jsdom's SVG text layout
 * (unimplemented) or a real browser's font rendering.
 *
 * CHART-11 also corrects how the projection combines with `MUI_LABELLED_X_AXIS_HEIGHT`. The old
 * formula (`extraHeight = projectedHeight - fontSize`, added unconditionally on top of the full
 * 45px baseline) double-counts: the baseline already budgets tick+gap+one-line-of-text for the
 * NORMAL case, and adding the rotated projection's own full height on top of it, minus only a
 * bare `fontSize`, keeps far more of that baseline than a rotated label actually needs from it.
 * Measured live against hram real data: with an accurate measured `textWidth`, the OLD combine
 * step alone still left ~38px unused (axis.height 118 vs a real rendered tick-group height of
 * ~79px) -- the width term was not the only source of over-reservation. The axis height is now
 * the larger of the un-rotated baseline (a floor -- a barely-rotated label still gets the normal
 * allowance) and the rotated projection itself plus a small clearance -- verified live to close
 * the gap to single digits with no label clipping at 1280px or 375px (register note, CHART-11).
 */
function rotatedTickMetrics(axis, defaultLineHeight, measureTextWidth = measureTickTextWidthPx) {
  const angle = Number(axis.tickLabelStyle?.angle) || 0;
  if (angle === 0) return null;

  const fontSize = cssLengthToPixels(axis.tickLabelStyle?.fontSize);
  if (fontSize === 0) return null;

  const lineHeight = Number(axis.tickLabelStyle?.lineHeight) || defaultLineHeight;
  const longestLabel = longestFormattedTick(axis.data || [], axis.valueFormatter);
  const measuredWidth = measureTextWidth(longestLabel, fontSize);
  const textWidth = Math.max(
    fontSize,
    Number.isFinite(measuredWidth) && measuredWidth > 0
      ? measuredWidth
      : estimateTextWidthPx(longestLabel, fontSize),
  );
  const radians = (angle * Math.PI) / 180;
  const projectedHeight = Math.abs(Math.cos(radians)) * fontSize * lineHeight
    + Math.abs(Math.sin(radians)) * textWidth;
  const neededAxisHeight = Math.ceil(projectedHeight) + ROTATED_TICK_CLEARANCE_PX;
  // `max(0, …)`, not `max(1, …)`: axis.height (= MUI_LABELLED_X_AXIS_HEIGHT + extraHeight) must be
  // able to land exactly ON the baseline (45) when a barely-rotated label needs less than it --
  // a leftover `max(1, …)` here would silently make 46 the true floor while every doc comment and
  // test says 45 (caught in review: harmless in direction, but the two must actually agree).
  const extraHeight = Math.max(0, neededAxisHeight - MUI_LABELLED_X_AXIS_HEIGHT);

  return { extraHeight };
}

/**
 * CHART-10: rotated labels project both their line box and text width vertically, and X-Charts
 * uses `xAxis.height` -- not `margin.bottom` -- to size the band that actually CONTAINS them.
 * `margin.bottom` only separates that axis band from the SVG edge; it plays no part in whether a
 * label fits. Measured live (hram, 2026-08-22, real data): once `axis.height` carries the
 * allowance, the rendered tick labels sit fully INSIDE the axis band with nothing below them --
 * `margin.bottom` growing by the same allowance on top was reserving space nothing ever used, up
 * to 130px (38% of a 340px card) on long rotated labels. Only `axis.height` grows here now;
 * `margin` is returned untouched (whatever the caller passed, or didn't) so `withMarginDefaults`
 * downstream applies the package's ordinary bottom default in every case, rotated or not -- a
 * caller-set `margin.bottom` was never touched by this function even before this fix, and still
 * isn't.
 *
 * CHART-11: `measureTextWidth` is an optional injection point (defaults to a real DOM
 * measurement) that only exists for deterministic tests -- neither preset caller passes it, so
 * neither needs to change.
 */
export function spaceForRotatedTicks(xAxis, margin, defaultLineHeight = 1, measureTextWidth) {
  const spacedXAxis = xAxis.map((axis) => {
    const metrics = rotatedTickMetrics(axis, defaultLineHeight, measureTextWidth);
    if (!metrics) return axis;
    if (axis.height != null) return axis;
    return { ...axis, height: MUI_LABELLED_X_AXIS_HEIGHT + metrics.extraHeight };
  });

  return { xAxis: spacedXAxis, margin };
}

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
    const tickTextWidth = Math.max(
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

/**
 * CHART-8: resolves the `{minHeight, height, aspect}` trio these presets accept into what the
 * wrapper reserves and what height (if any) sizes the chart itself. Three-way, not two-way --
 * `aspect` changes the answer:
 *  - `height` set -> it sizes the chart; the wrapper never reserves more than that (a caller-set
 *    `minHeight` larger than `height` is capped here, closing the dead-space gap this WO exists
 *    to fix -- equal values, or no `minHeight` at all, pass through unchanged).
 *  - no `height`, `aspect` set -> unchanged from before this WO: the wrapper's own `aspectRatio`
 *    derives its height from its width, and `minHeight` stays exactly what its name says, a floor
 *    stopping it collapsing on a narrow viewport. Do not give the chart a fixed height here --
 *    that would remove the responsive behaviour four live call sites rely on.
 *  - no `height`, no `aspect` -> `minHeight` sizes the chart itself. There is no other sizing
 *    information to go on, and a caller in this shape meant the chart to have that height, not
 *    merely a wrapper floor around an unsized chart.
 */
export function resolveChartHeight({ minHeight, height, aspect }) {
  if (height != null) {
    const wrapperMinHeight = minHeight != null && minHeight > height ? height : minHeight;
    return { wrapperMinHeight, chartHeight: height };
  }
  if (aspect != null) {
    return { wrapperMinHeight: minHeight, chartHeight: undefined };
  }
  return { wrapperMinHeight: minHeight, chartHeight: minHeight };
}

/**
 * CHART-8: dev-only warning when a caller passes both `minHeight` and `height` and they disagree
 * -- the incoherent pair this WO closes. Not a throw: a shared package throwing on a prop
 * combination in production would break a consumer's page over a layout nit. Silent on the
 * equal-value majority and on the legitimate `minHeight` + `aspect` (no `height`) combination.
 *
 * CHART-9: `heightWins` distinguishes the two shapes this fires from. The four chart presets
 * (default, `heightWins: true`) DO apply `resolveChartHeight`'s `height` to their box, so the
 * original "height wins" wording is accurate there. `ChartFrame` (`heightWins: false`) never
 * applies `height` to its box at all -- `minHeight` always keeps reserving the floor -- so it gets
 * its own accurate wording instead of reusing the presets' story.
 */
export function warnOnHeightMismatch(componentName, { minHeight, height }, { heightWins = true } = {}) {
  if (process.env.NODE_ENV === 'production') return;
  if (minHeight == null || height == null || minHeight === height) return;
  const resolution = heightWins
    ? 'they disagree, so height wins and the wrapper no longer reserves the extra space below the '
      + 'chart. Pass only height, or drop minHeight if it should just track height.'
    : 'they disagree; height is ignored here and minHeight keeps sizing the wrapper as a floor. '
      + 'Pass only minHeight, or drop height if it was meant to size the whole card.';
  // eslint-disable-next-line no-console
  console.warn(
    `[ui-core-micha] <${componentName}> received both minHeight={${minHeight}} and height={${height}}; `
    + resolution,
  );
}

export function withChartSlotDefaults(slotProps, legendPosition) {
  const position = {
    ...DEFAULT_LEGEND_POSITION,
    ...legendPosition,
    ...slotProps?.legend?.position,
  };
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
