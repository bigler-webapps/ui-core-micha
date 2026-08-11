import { createTheme, getContrastRatio as getMuiContrastRatio } from '@mui/material/styles';

import { STATUS_KEYS, TYPOGRAPHY_VARIANTS } from './tokens';
import { KIT_COMPONENT_SX_REGISTRY } from './kitSxRegistry';

const MUI_DEFAULT_THEME = createTheme();

function getPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function sameValue(left, right) {
  if (left === right) return true;
  if (left === undefined || right === undefined) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

const pathSurface = (surface, path = surface) => ({
  surface,
  get: (theme) => getPath(theme, path),
});

const keyedSurface = (surface, get) => ({ surface, get });

const STATUS_SURFACES = STATUS_KEYS.flatMap((status) =>
  ['text', 'fill', 'fillText', 'bg'].map((token) =>
    pathSurface(`palette.${status}.${token}`),
  ),
);

const TYPOGRAPHY_SURFACES = TYPOGRAPHY_VARIANTS.flatMap((variant) =>
  ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'].map((token) =>
    pathSurface(`typography.${variant}.${token}`),
  ),
);

const componentPath = (component, path) =>
  pathSurface(`components.${component}.${path}`);

const componentKeyLeaf = (component, path, key, leaf) => keyedSurface(
  `components.${component}.${path}.${key}.${leaf}`,
  (theme) => getPath(theme, `components.${component}.${path}`)?.[key]?.[leaf],
);

const COMPONENT_SURFACES = [
  keyedSurface(
    'components.MuiCssBaseline.reduced-motion.transitionDuration',
    (theme) => theme.components?.MuiCssBaseline?.styleOverrides
      ?.['@media (prefers-reduced-motion: reduce)']
      ?.['*, *::before, *::after']?.transitionDuration,
  ),
  componentPath('MuiButton', 'defaultProps.disableElevation'),
  componentPath('MuiButton', 'styleOverrides.root.minHeight'),
  componentPath('MuiButton', 'styleOverrides.root.borderRadius'),
  componentPath('MuiButton', 'styleOverrides.root.textTransform'),
  componentKeyLeaf('MuiButton', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minHeight'),
  componentKeyLeaf('MuiButton', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minWidth'),
  componentPath('MuiButton', 'styleOverrides.contained.boxShadow'),
  componentPath('MuiButton', 'styleOverrides.outlined.borderColor'),
  componentPath('MuiTableCell', 'styleOverrides.root.padding'),
  componentPath('MuiIconButton', 'styleOverrides.root.minHeight'),
  componentPath('MuiIconButton', 'styleOverrides.root.minWidth'),
  componentKeyLeaf('MuiIconButton', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minHeight'),
  componentKeyLeaf('MuiIconButton', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minWidth'),
  componentPath('MuiDivider', 'styleOverrides.root.borderColor'),
  componentPath('MuiTooltip', 'styleOverrides.tooltip.boxShadow'),
  componentPath('MuiTooltip', 'styleOverrides.tooltip.transitionDuration'),
  componentPath('MuiTooltip', 'defaultProps.slotProps.transition.timeout.enter'),
  componentPath('MuiTooltip', 'defaultProps.slotProps.transition.timeout.exit'),
  componentPath('MuiSelect', 'defaultProps.variant'),
  componentPath('MuiSelect', 'styleOverrides.select.minHeight'),
  componentKeyLeaf('MuiSelect', 'styleOverrides.select', '@media (any-pointer: coarse)', 'minHeight'),
  componentPath('MuiCheckbox', 'styleOverrides.root.color'),
  componentKeyLeaf('MuiCheckbox', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minHeight'),
  componentKeyLeaf('MuiCheckbox', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minWidth'),
  componentPath('MuiFormControlLabel', 'styleOverrides.root.minHeight'),
  componentKeyLeaf('MuiFormControlLabel', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minHeight'),
  componentKeyLeaf('MuiFormControlLabel', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minWidth'),
  componentPath('MuiFormControlLabel', 'styleOverrides.label.fontSize'),
  componentPath('MuiContainer', 'styleOverrides.root.paddingLeft'),
  componentPath('MuiContainer', 'styleOverrides.root.paddingRight'),
  componentKeyLeaf('MuiContainer', 'styleOverrides.root', '@media (min-width:1200px)', 'paddingLeft'),
  componentKeyLeaf('MuiContainer', 'styleOverrides.root', '@media (min-width:1200px)', 'paddingRight'),
  componentPath('MuiPaper', 'defaultProps.elevation'),
  componentPath('MuiPaper', 'defaultProps.variant'),
  componentPath('MuiPaper', 'styleOverrides.root.borderRadius'),
  componentPath('MuiPaper', 'styleOverrides.root.boxShadow'),
  componentPath('MuiCard', 'defaultProps.elevation'),
  componentPath('MuiCard', 'defaultProps.variant'),
  componentPath('MuiCard', 'styleOverrides.root.borderRadius'),
  componentPath('MuiCard', 'styleOverrides.root.boxShadow'),
  componentPath('MuiChip', 'styleOverrides.root.height'),
  componentPath('MuiChip', 'styleOverrides.root.borderRadius'),
  componentPath('MuiChip', 'styleOverrides.root.fontSize'),
  keyedSurface(
    'components.MuiChip.styleOverrides.root.coarse-hit-area.inset',
    (theme) => theme.components?.MuiChip?.styleOverrides?.root
      ?.['@media (any-pointer: coarse)']?.['&::after']?.inset,
  ),
  componentPath('MuiBottomNavigation', 'styleOverrides.root.boxShadow'),
  componentPath('MuiBottomNavigation', 'styleOverrides.root.backgroundColor'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.root.padding'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.root.gap'),
  componentKeyLeaf('MuiBottomNavigationAction', 'styleOverrides.root', '& .MuiSvgIcon-root', 'width'),
  componentKeyLeaf('MuiBottomNavigationAction', 'styleOverrides.root', '& .MuiSvgIcon-root', 'height'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.root.color'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.label.fontSize'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.label.fontWeight'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.label.lineHeight'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.label.maxWidth'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.label.whiteSpace'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.label.overflow'),
  componentPath('MuiBottomNavigationAction', 'styleOverrides.label.textOverflow'),
  componentKeyLeaf('MuiBottomNavigationAction', 'styleOverrides.label', '&.Mui-selected', 'fontSize'),
  componentKeyLeaf('MuiBottomNavigationAction', 'styleOverrides.root', '&.Mui-selected', 'color'),
  componentPath('MuiTextField', 'defaultProps.variant'),
  componentPath('MuiTextField', 'styleOverrides.root.minHeight'),
  componentKeyLeaf('MuiTextField', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minHeight'),
  componentKeyLeaf('MuiTextField', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minWidth'),
  componentPath('MuiOutlinedInput', 'styleOverrides.root.minHeight'),
  componentPath('MuiOutlinedInput', 'styleOverrides.root.borderRadius'),
  keyedSurface(
    'components.MuiOutlinedInput.variants.non-multiline-height',
    (theme) => theme.components?.MuiOutlinedInput?.variants
      ?.find(({ props }) => props?.multiline === false)?.style?.height,
  ),
  componentKeyLeaf('MuiOutlinedInput', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minHeight'),
  componentKeyLeaf('MuiOutlinedInput', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minWidth'),
  componentKeyLeaf('MuiOutlinedInput', 'styleOverrides.root', '& .MuiOutlinedInput-notchedOutline', 'borderColor'),
  componentKeyLeaf('MuiOutlinedInput', 'styleOverrides.root', '&:hover .MuiOutlinedInput-notchedOutline', 'borderColor'),
  componentKeyLeaf('MuiOutlinedInput', 'styleOverrides.root', '&.Mui-focused .MuiOutlinedInput-notchedOutline', 'borderColor'),
  componentKeyLeaf('MuiOutlinedInput', 'styleOverrides.root', '&.Mui-error .MuiOutlinedInput-notchedOutline', 'borderColor'),
  componentPath('MuiDialog', 'defaultProps.transitionDuration.enter'),
  componentPath('MuiDialog', 'defaultProps.transitionDuration.exit'),
  componentPath('MuiDialog', 'styleOverrides.paper.borderRadius'),
  componentPath('MuiDialog', 'styleOverrides.paper.boxShadow'),
  componentPath('MuiDrawer', 'styleOverrides.paper.boxShadow'),
  componentPath('MuiMenu', 'styleOverrides.paper.boxShadow'),
  ...['success', 'warning', 'error', 'info'].flatMap((status) => {
    const slot = `standard${status[0].toUpperCase()}${status.slice(1)}`;
    return [
      componentPath('MuiAlert', `styleOverrides.${slot}.color`),
      componentPath('MuiAlert', `styleOverrides.${slot}.backgroundColor`),
      componentKeyLeaf('MuiAlert', `styleOverrides.${slot}`, '& .MuiAlert-icon', 'color'),
    ];
  }),
  ...['MuiOutlinedInput', 'MuiFilledInput', 'MuiInput'].flatMap((component) => [
    componentKeyLeaf(component, 'styleOverrides.input', '&:-webkit-autofill', 'WebkitBoxShadow'),
    componentKeyLeaf(component, 'styleOverrides.input', '&:-webkit-autofill', 'WebkitTextFillColor'),
    componentKeyLeaf(component, 'styleOverrides.input', '&:autofill', 'boxShadow'),
    componentKeyLeaf(component, 'styleOverrides.input', '&:autofill', 'WebkitTextFillColor'),
  ]),
];

/** The versioned surface inventory used by every adopting application. */
export const THEME_COMPLETENESS_SURFACES = [
  pathSurface('palette.primary.main'),
  ...STATUS_SURFACES,
  pathSurface('palette.ink.primary'),
  pathSurface('palette.ink.secondary'),
  pathSurface('palette.ink.muted'),
  pathSurface('palette.background.default'),
  pathSurface('palette.background.paper'),
  pathSurface('palette.background.subtle'),
  pathSurface('palette.divider'),
  pathSurface('palette.controlBorder.main'),
  pathSurface('palette.controlBorder.hover'),
  pathSurface('palette.controlBorder.focus'),
  pathSurface('palette.controlBorder.error'),
  pathSurface('palette.dataSeries.categorical'),
  pathSurface('radius.control'),
  pathSurface('radius.card'),
  pathSurface('typography.fontFamily'),
  ...TYPOGRAPHY_SURFACES,
  pathSurface('shape.borderRadius'),
  {
    surface: 'spacing.unit',
    get: (theme) => (typeof theme.spacing === 'function' ? theme.spacing(1) : undefined),
  },
  pathSurface('breakpoints.values'),
  pathSurface('shadow.rest'),
  pathSurface('shadow.overlay'),
  pathSurface('motion.duration.fast'),
  pathSurface('motion.duration.base'),
  pathSurface('motion.duration.overlayEnter'),
  pathSurface('motion.duration.overlayExit'),
  pathSurface('motion.duration.chart'),
  pathSurface('motion.easing.enter'),
  pathSurface('motion.easing.exit'),
  pathSurface('motion.easing.state'),
  pathSurface('motion.reduced'),
  pathSurface('fontLoading.family'),
  pathSurface('fontLoading.weights'),
  ...COMPONENT_SURFACES,
];

function parseColour(colour) {
  if (typeof colour !== 'string') return null;
  const value = colour.trim();
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const expanded = hex.length === 3
      ? hex.split('').map((part) => part + part).join('')
      : hex;
    if (!/^[\da-f]{6}([\da-f]{2})?$/i.test(expanded)) return null;
    return {
      r: parseInt(expanded.slice(0, 2), 16),
      g: parseInt(expanded.slice(2, 4), 16),
      b: parseInt(expanded.slice(4, 6), 16),
      a: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }

  const match = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function composite(foreground, background) {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

function luminance(colour) {
  const channels = [colour.r, colour.g, colour.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

/** Calculates WCAG contrast, including alpha compositing over the background. */
export function calculateContrastRatio(foreground, background) {
  const foregroundColour = parseColour(foreground);
  const backgroundColour = parseColour(background);
  if (!foregroundColour || !backgroundColour) {
    try {
      const ratio = getMuiContrastRatio(foreground, background);
      return Number.isFinite(ratio) ? ratio : Number.NaN;
    } catch {
      return Number.NaN;
    }
  }

  const opaqueBackground = backgroundColour.a < 1
    ? composite(backgroundColour, { r: 255, g: 255, b: 255, a: 1 })
    : backgroundColour;
  const opaqueForeground = foregroundColour.a < 1
    ? composite(foregroundColour, opaqueBackground)
    : foregroundColour;
  const light = Math.max(luminance(opaqueForeground), luminance(opaqueBackground));
  const dark = Math.min(luminance(opaqueForeground), luminance(opaqueBackground));
  return (light + 0.05) / (dark + 0.05);
}

function contrastFindings(theme) {
  const findings = [];
  for (const status of STATUS_KEYS) {
    const tokens = theme.palette?.[status];
    if (!tokens) continue;
    const textRatio = calculateContrastRatio(tokens.text, tokens.bg);
    if (!Number.isFinite(textRatio) || textRatio < 4.5) {
      findings.push({
        surface: `contrast.${status}.text-on-bg`,
        reason: Number.isFinite(textRatio)
          ? `Expected at least 4.5:1; received ${textRatio.toFixed(2)}:1.`
          : 'Contrast could not be calculated from the declared colours.',
      });
    }
    const fillRatio = calculateContrastRatio(tokens.fillText, tokens.fill);
    if (!Number.isFinite(fillRatio) || fillRatio < 4.5) {
      findings.push({
        surface: `contrast.${status}.fillText-on-fill`,
        reason: Number.isFinite(fillRatio)
          ? `Expected at least 4.5:1; received ${fillRatio.toFixed(2)}:1.`
          : 'Contrast could not be calculated from the declared colours.',
      });
    }
  }

  const backgrounds = {
    white: '#FFFFFF',
    page: theme.palette?.background?.default,
  };
  for (const status of STATUS_KEYS) {
    const main = theme.palette?.[status]?.main;
    if (!main) continue;
    for (const [surface, background] of Object.entries(backgrounds)) {
      const ratio = calculateContrastRatio(main, background);
      if (!Number.isFinite(ratio) || ratio < 4.5) {
        findings.push({
          surface: `contrast.${status}.main-on-${surface}`,
          reason: Number.isFinite(ratio)
            ? `Expected at least 4.5:1; received ${ratio.toFixed(2)}:1.`
            : 'Contrast could not be calculated from the declared colours.',
        });
      }
    }
  }

  for (const state of ['main', 'hover', 'focus', 'error']) {
    const colour = theme.palette?.controlBorder?.[state];
    if (!colour) continue;
    for (const [surface, background] of Object.entries(backgrounds)) {
      const ratio = calculateContrastRatio(colour, background);
      if (!Number.isFinite(ratio) || ratio < 3) {
        findings.push({
          surface: `contrast.controlBorder.${state}-on-${surface}`,
          reason: Number.isFinite(ratio)
            ? `Expected at least 3:1; received ${ratio.toFixed(2)}:1.`
            : 'Contrast could not be calculated from the declared colours.',
        });
      }
    }
  }
  return findings;
}

/**
 * Returns completeness findings. Adopting applications make this a hard CI
 * assertion in their own suite; non-adopters may call it for reporting only.
 */
export function assertThemeComplete(theme, { exemptions = [] } = {}) {
  const declaredExemptions = [
    ...(theme?.themeCompleteness?.exemptions || []),
    ...exemptions,
  ];
  const validExemptions = new Set();
  const findings = [];

  for (const exemption of declaredExemptions) {
    if (!exemption?.surface || !exemption?.reason?.trim()) {
      findings.push({
        surface: `exemption.${exemption?.surface || 'unknown'}`,
        reason: 'A completeness exemption must name a surface and include a reason.',
      });
      continue;
    }
    validExemptions.add(exemption.surface);
  }

  for (const descriptor of THEME_COMPLETENESS_SURFACES) {
    const value = descriptor.get(theme);
    const defaultValue = descriptor.get(MUI_DEFAULT_THEME);
    if ((value === undefined || sameValue(value, defaultValue)) && !validExemptions.has(descriptor.surface)) {
      findings.push({
        surface: descriptor.surface,
        reason: value === undefined
          ? 'The surface is not deliberately defined.'
          : 'The surface still equals MUI\'s untouched default.',
      });
    }
  }

  findings.push(...contrastFindings(theme));
  return { findings };
}

const SAME_ROOT_STYLE_OVERRIDE_SLOTS = {
  MuiAlert: ['standardSuccess', 'standardWarning', 'standardError', 'standardInfo'],
  MuiButton: ['root', 'contained', 'outlined'],
  MuiChip: ['root', 'outlined'],
};

// MUI's sx prop accepts CSS spacing shorthands (`py`, `px`, `pt`, ...) that
// styleOverrides' plain CSS-in-JS objects do not -- a baseline `padding`
// default and a component's own `sx={{ py: 1 }}` collide on the vertical
// axis even though the two key strings never match literally. Each key is
// expanded to the canonical longhand properties it can affect so the
// disjointness check compares axes, not raw key spellings; a property
// outside this table expands to itself.
const SPACING_SHORTHAND_LONGHANDS = {
  p: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  px: ['paddingLeft', 'paddingRight'],
  py: ['paddingTop', 'paddingBottom'],
  pt: ['paddingTop'],
  pr: ['paddingRight'],
  pb: ['paddingBottom'],
  pl: ['paddingLeft'],
  m: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  margin: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  mx: ['marginLeft', 'marginRight'],
  my: ['marginTop', 'marginBottom'],
  mt: ['marginTop'],
  mr: ['marginRight'],
  mb: ['marginBottom'],
  ml: ['marginLeft'],
};

function expandShorthandProperty(property) {
  return SPACING_SHORTHAND_LONGHANDS[property] || [property];
}

function styleOverrideKeys(componentConfig, slots = ['root']) {
  const keys = new Set();
  for (const slot of slots) {
    const slotStyles = componentConfig?.styleOverrides?.[slot];
    if (!slotStyles || typeof slotStyles !== 'object' || Array.isArray(slotStyles)) continue;
    Object.keys(slotStyles).forEach((key) => expandShorthandProperty(key).forEach((longhand) => keys.add(longhand)));
  }
  return keys;
}

/**
 * Reports top-level property collisions between registered kit sx objects and
 * the baseline MUI component they target. Spacing shorthands (`py`/`px`/...)
 * are compared by the longhand axis they affect, not by literal key name --
 * see `SPACING_SHORTHAND_LONGHANDS`.
 *
 * This is deliberately a lower bound on shadowing: conditional sx, nested sx,
 * callback results, and nested selector properties are not inspected. A clean
 * result therefore proves only that the registered top-level key sets are
 * disjoint; it is not proof that no component can shadow the baseline.
 */
export function assertKitSxDisjoint(
  theme,
  { registry = KIT_COMPONENT_SX_REGISTRY, exemptions = [] } = {},
) {
  const declaredExemptions = [
    ...(theme?.themeCompleteness?.exemptions || []),
    ...exemptions,
  ];
  const validExemptions = new Set();
  const findings = [];

  for (const exemption of declaredExemptions) {
    if (!exemption?.surface || !exemption?.reason?.trim()) {
      findings.push({
        surface: `exemption.${exemption?.surface || 'unknown'}`,
        reason: 'A completeness exemption must name a surface and include a reason.',
      });
      continue;
    }
    validExemptions.add(exemption.surface);
  }

  for (const entry of registry) {
    const baselineKeys = styleOverrideKeys(
      theme?.components?.[entry.muiComponent],
      entry.slots || SAME_ROOT_STYLE_OVERRIDE_SLOTS[entry.muiComponent],
    );
    for (const property of Object.keys(entry.sx || {})) {
      const surface = `${entry.component}.${entry.muiComponent}.${property}`;
      const collides = expandShorthandProperty(property).some((longhand) => baselineKeys.has(longhand));
      if (collides && !validExemptions.has(surface)) {
        findings.push({
          surface,
          reason: `${entry.component} sx shadows ${entry.muiComponent} styleOverrides property "${property}".`,
        });
      }
    }
  }

  return { findings };
}

const BASELINE_STYLED_MUI_COMPONENTS = [
  'Alert',
  'BottomNavigation',
  'BottomNavigationAction',
  'Button',
  'Card',
  'Checkbox',
  'Chip',
  'Container',
  'CssBaseline',
  'Dialog',
  'Divider',
  'Drawer',
  'FilledInput',
  'FormControlLabel',
  'IconButton',
  'Input',
  'Menu',
  'OutlinedInput',
  'Paper',
  'Select',
  'TableCell',
  'TextField',
  'Tooltip',
];

function jsxOpeningTag(source, start) {
  let braces = 0;
  let quote = null;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== '\\') quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if (character === '{') {
      braces += 1;
    } else if (character === '}') {
      braces = Math.max(0, braces - 1);
    } else if (character === '>' && braces === 0) {
      return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

function topLevelSxValue(tag) {
  let braces = 0;
  let quote = null;
  for (let index = 0; index < tag.length; index += 1) {
    const character = tag[index];
    if (quote) {
      if (character === quote && tag[index - 1] !== '\\') quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (braces === 0 && (index === 0 || /\s/.test(tag[index - 1]))) {
      const attribute = tag.slice(index).match(/^sx\b\s*=\s*/)?.[0];
      if (attribute) return tag.slice(index + attribute.length);
    }
    if (character === '{') braces += 1;
    if (character === '}') braces = Math.max(0, braces - 1);
  }
  return '';
}

/**
 * Reports baseline-styled MUI tags that bypass the exported-object convention.
 * Like assertKitSxDisjoint, this is a documented lower bound: conditional,
 * array, callback, and otherwise nested sx expressions are not inspected.
 */
export function reportKitSxBypasses(sources = [], { registry } = {}) {
  const normalized = sources.map((entry, index) =>
    typeof entry === 'string'
      ? { path: `source-${index + 1}`, source: entry }
      : { path: entry.path || `source-${index + 1}`, source: entry.source || '' },
  );
  const findings = [];
  const registeredTargets = registry
    ? registry.reduce((targets, { exportName, muiComponent }) => {
      if (!exportName || !muiComponent) return targets;
      if (!targets.has(exportName)) targets.set(exportName, new Set());
      targets.get(exportName).add(muiComponent);
      return targets;
    }, new Map())
    : null;
  const componentPattern = BASELINE_STYLED_MUI_COMPONENTS.join('|');
  const tagPattern = new RegExp(`<(${componentPattern})\\b`, 'g');

  for (const { path, source } of normalized) {
    const exportedObjects = new Set(
      [...source.matchAll(/\bexport\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g)]
        .map((match) => match[1]),
    );

    for (const match of source.matchAll(tagPattern)) {
      const tag = jsxOpeningTag(source, match.index);
      const sxValue = topLevelSxValue(tag);
      const inline = /^\{\s*\{/.test(sxValue);
      const identifier = sxValue.match(/^\{\s*([A-Za-z_$][\w$]*)\s*\}/)?.[1];
      const exported = identifier && exportedObjects.has(identifier);
      const muiComponent = `Mui${match[1]}`;
      const unregistered = exported
        && registeredTargets
        && !registeredTargets.get(identifier)?.has(muiComponent);
      if (!inline && (!identifier || (exported && !unregistered))) continue;

      const line = source.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        surface: `${path}:${line}.Mui${match[1]}.sx`,
        reason: inline
          ? `${match[1]} uses an inline sx object instead of a top-level exported object.`
          : unregistered
            ? `${match[1]} uses exported sx object "${identifier}" without a ${muiComponent} registry entry.`
            : `${match[1]} uses non-exported sx object "${identifier}".`,
      });
    }
  }

  return { findings };
}

/** Reports adoption signals as numbers; it never changes completeness. */
export function reportThemeAdoption(sources = []) {
  const normalized = sources.map((entry, index) =>
    typeof entry === 'string'
      ? { path: `source-${index + 1}`, source: entry }
      : { path: entry.path || `source-${index + 1}`, source: entry.source || '' },
  );
  const themeBypassPaths = normalized
    .filter(({ source }) => /\bcreateTheme\s*\(/.test(source) && !/\bcreateAppTheme\s*\(/.test(source))
    .map(({ path }) => path);
  const inlineHexCount = normalized.reduce(
    (count, { source }) => count + (source.match(/#[\da-f]{3,8}\b/gi)?.length || 0),
    0,
  );
  return {
    inlineHexCount,
    themeBypassPathCount: themeBypassPaths.length,
    themeBypassPaths,
  };
}
