export const DEFAULT_LEGEND_POSITION = {
  vertical: 'bottom',
  horizontal: 'start',
};

export function withGridDefaults(grid) {
  return { horizontal: true, ...grid };
}

export function withAxisDefaults(axes, label, defaults, tickFontSize) {
  const values = axes?.length ? axes : [defaults];
  return values.map((axis) => ({
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
    label: axis.label || label,
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
