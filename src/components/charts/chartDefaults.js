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
const MUI_CHART_MARGIN_BOTTOM = 20;
const AVERAGE_GLYPH_WIDTH_EM = 0.6;

function formattedTickText(axis, value) {
  if (!axis.valueFormatter) return String(value);
  try {
    return String(axis.valueFormatter(value, { location: 'tick' }));
  } catch {
    // Some formatters require MUI's complete scale context. Falling back to
    // the raw value is conservative: it reserves at least as much space.
    return String(value);
  }
}

function rotatedTickMetrics(axis, defaultLineHeight) {
  const angle = Number(axis.tickLabelStyle?.angle) || 0;
  if (angle === 0) return null;

  const fontSize = cssLengthToPixels(axis.tickLabelStyle?.fontSize);
  if (fontSize === 0) return null;

  const lineHeight = Number(axis.tickLabelStyle?.lineHeight) || defaultLineHeight;
  const longestLabel = (axis.data || []).reduce((longest, value) => {
    const text = formattedTickText(axis, value);
    return text.length > longest.length ? text : longest;
  }, '');
  const textWidth = Math.max(fontSize, longestLabel.length * fontSize * AVERAGE_GLYPH_WIDTH_EM);
  const radians = (angle * Math.PI) / 180;
  const projectedHeight = Math.abs(Math.cos(radians)) * fontSize * lineHeight
    + Math.abs(Math.sin(radians)) * textWidth;
  const extraHeight = Math.max(1, Math.ceil(projectedHeight - fontSize));

  return { extraHeight };
}

/**
 * Rotated labels project both their line box and text width vertically.
 * X-Charts uses xAxis.height when deciding whether a label fits, while margin
 * only separates the axis from the SVG edge, so both surfaces must grow.
 * Explicit caller height and bottom-margin values always remain untouched.
 */
export function spaceForRotatedTicks(xAxis, margin, defaultLineHeight = 1) {
  let largestExtraHeight = 0;
  const spacedXAxis = xAxis.map((axis) => {
    const metrics = rotatedTickMetrics(axis, defaultLineHeight);
    if (!metrics) return axis;

    largestExtraHeight = Math.max(largestExtraHeight, metrics.extraHeight);
    if (axis.height != null) return axis;
    return { ...axis, height: MUI_LABELLED_X_AXIS_HEIGHT + metrics.extraHeight };
  });

  const callerSetBottom = typeof margin === 'number' || margin?.bottom != null;
  const spacedMargin = largestExtraHeight > 0 && !callerSetBottom
    ? { ...margin, bottom: MUI_CHART_MARGIN_BOTTOM + largestExtraHeight }
    : margin;

  return { xAxis: spacedXAxis, margin: spacedMargin };
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
