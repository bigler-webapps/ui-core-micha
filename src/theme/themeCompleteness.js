import { createTheme, getContrastRatio as getMuiContrastRatio } from '@mui/material/styles';

import {
  BASELINE_PALETTE,
  BASELINE_STATIC,
  STATUS_KEYS,
  TYPOGRAPHY_VARIANTS,
} from './tokens';
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
  componentPath('MuiSelect', 'styleOverrides.root.minHeight'),
  componentKeyLeaf('MuiSelect', 'styleOverrides.root', '@media (any-pointer: coarse)', 'minHeight'),
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

// MUI's sx prop accepts aliases and CSS spacing shorthands that
// styleOverrides' plain CSS-in-JS objects do not. Each known alias is
// expanded to the canonical CSS properties it can affect so the
// disjointness check compares effects, not raw key spellings; a property
// outside this table expands to itself.
const SPACING_SHORTHAND_LONGHANDS = {
  bgcolor: ['backgroundColor'],
  typography: [
    'fontFamily',
    'fontSize',
    'fontStyle',
    'fontWeight',
    'letterSpacing',
    'lineHeight',
    'textTransform',
  ],
  p: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  px: ['paddingLeft', 'paddingRight'],
  paddingX: ['paddingLeft', 'paddingRight'],
  py: ['paddingTop', 'paddingBottom'],
  paddingY: ['paddingTop', 'paddingBottom'],
  pt: ['paddingTop'],
  pr: ['paddingRight'],
  pb: ['paddingBottom'],
  pl: ['paddingLeft'],
  m: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  margin: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  mx: ['marginLeft', 'marginRight'],
  marginX: ['marginLeft', 'marginRight'],
  my: ['marginTop', 'marginBottom'],
  marginY: ['marginTop', 'marginBottom'],
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
 * the baseline MUI component they target. Known sx aliases are compared by
 * the CSS properties they affect, not by literal key name.
 *
 * This is deliberately a lower bound on shadowing: unknown normalisation gaps
 * remain. A clean result proves only that the registered top-level key sets
 * are disjoint; it is not proof that no component can shadow the baseline.
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

const BASIC_CSS_COLOUR_NAMES = new Set([
  'aqua',
  'black',
  'blue',
  'fuchsia',
  'gray',
  'green',
  'grey',
  'lime',
  'maroon',
  'navy',
  'olive',
  'purple',
  'red',
  'silver',
  'teal',
  'white',
  'yellow',
]);

const MUI_DEFAULT_NUMERIC_RAMP_NAMES = new Set([
  'amber',
  'blue',
  'bluegrey',
  'brown',
  'cyan',
  'deeporange',
  'deeppurple',
  'green',
  'grey',
  'indigo',
  'lightblue',
  'lightgreen',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'yellow',
]);

const HEX_COLOUR_PATTERN = /#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})(?![\da-f])/gi;
const RGB_COLOUR_PATTERN = /rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)/gi;
const NAMED_COLOUR_PATTERN = new RegExp(
  `\\b(?:${[...BASIC_CSS_COLOUR_NAMES].join('|')})\\b`,
  'gi',
);
const COLOUR_PROPERTY_PATTERN = /\b(?:background(?:Color)?|bgcolor|border(?:Top|Right|Bottom|Left)?(?:Color)?|boxShadow|caretColor|color|fill|fillStyle|outline(?:Color)?|stroke|strokeStyle|textShadow|WebkitTextFillColor)\s*(?::|=)\s*$/;

function colourKey(value) {
  const colour = parseColour(value);
  return colour ? `${colour.r},${colour.g},${colour.b},${colour.a}` : null;
}

function collectBaselineColourKeys(...roots) {
  const keys = new Set();
  const visit = (value) => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(HEX_COLOUR_PATTERN)) {
        const key = colourKey(match[0]);
        if (key) keys.add(key);
      }
      for (const match of value.matchAll(RGB_COLOUR_PATTERN)) {
        const key = colourKey(match[0]);
        if (key) keys.add(key);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  roots.forEach(visit);
  return keys;
}

function maskComments(source) {
  const characters = [...source];
  let quote = null;
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    if (quote) {
      if (character === quote && characters[index - 1] !== '\\') quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '/' && characters[index + 1] === '/') {
      for (; index < characters.length && characters[index] !== '\n'; index += 1) {
        characters[index] = ' ';
      }
      index -= 1;
    } else if (character === '/' && characters[index + 1] === '*') {
      characters[index] = ' ';
      characters[index + 1] = ' ';
      index += 2;
      while (index < characters.length
        && !(characters[index] === '*' && characters[index + 1] === '/')) {
        if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
        index += 1;
      }
      if (index < characters.length) {
        characters[index] = ' ';
        characters[index + 1] = ' ';
        index += 1;
      }
    }
  }
  return characters.join('');
}

function maskQrPrintDocument(source, path) {
  if (!path.replaceAll('\\', '/').endsWith('/QrSignupManager.jsx')) return source;
  const call = /\bprintWindow\.document\.write\s*\(\s*`/g.exec(source);
  if (!call) return source;
  const start = call.index + call[0].lastIndexOf('`');
  let end = start + 1;
  while (end < source.length) {
    if (source[end] === '`' && source[end - 1] !== '\\') break;
    end += 1;
  }
  if (end >= source.length) return source;

  // The generated print document is standalone HTML rendered outside the
  // React tree, where no application theme is available. Mask the region as
  // one unit instead of accumulating permanent per-colour exemptions.
  return source.slice(0, start)
    + source.slice(start, end + 1).replace(/[^\r\n]/g, ' ')
    + source.slice(end + 1);
}

function normalizedSources(sources) {
  return sources.map((entry, index) =>
    typeof entry === 'string'
      ? { path: `source-${index + 1}`, source: entry }
      : { path: entry.path || `source-${index + 1}`, source: entry.source || '' },
  );
}

/**
 * Reports colour literals in component source that do not come from the
 * baseline palette, plus report-only uses of MUI's untouched numeric ramps.
 */
export function reportOffPaletteColours(
  sources = [],
  { palette = BASELINE_PALETTE, baselineStatic = BASELINE_STATIC } = {},
) {
  const allowedColours = collectBaselineColourKeys(palette, baselineStatic);
  const findings = [];
  const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;

  for (const { path, source } of normalizedSources(sources)) {
    const normalizedPath = path.replaceAll('\\', '/');
    if (/(^|\/)src\/theme\//.test(normalizedPath)) continue;
    const scanSource = maskComments(maskQrPrintDocument(source, normalizedPath));

    for (const match of scanSource.matchAll(stringPattern)) {
      const value = match[2].trim();
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      const surface = `${path}:${line}.colour`;

      for (const hex of value.matchAll(HEX_COLOUR_PATTERN)) {
        if (!allowedColours.has(colourKey(hex[0]))) {
          findings.push({
            surface,
            reason: `Off-palette hex colour "${hex[0]}" is not derived from the baseline palette.`,
          });
        }
      }

      for (const rgb of value.matchAll(RGB_COLOUR_PATTERN)) {
        if (!allowedColours.has(colourKey(rgb[0]))) {
          findings.push({
            surface,
            reason: `Off-palette rgb colour "${rgb[0]}" is not derived from the baseline palette.`,
          });
        }
      }

      const before = scanSource.slice(Math.max(0, match.index - 40), match.index);
      const isColourProperty = COLOUR_PROPERTY_PATTERN.test(before);
      const numericRamp = value.match(/^([a-z]+)\.(\d+)$/i);
      if (isColourProperty && !numericRamp) {
        for (const namedColour of value.matchAll(NAMED_COLOUR_PATTERN)) {
          findings.push({
            surface,
            reason: `Named CSS colour "${namedColour[0]}" bypasses the baseline palette.`,
          });
        }
      }

      if (numericRamp && MUI_DEFAULT_NUMERIC_RAMP_NAMES.has(numericRamp[1].toLowerCase())) {
        findings.push({
          surface,
          reason: `Report only: "${value}" uses MUI's untouched numeric palette ramp, not a baseline token.`,
        });
      }
    }
  }

  return { findings };
}

function balancedBraceRegion(text, start) {
  let depth = 0;
  let quote = null;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === quote && text[index - 1] !== '\\') quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return text.slice(start);
}

function topLevelObjectEntries(objectText) {
  const inner = objectText.slice(1, -1);
  const entries = [];
  let depth = 0;
  let quote = null;
  let entryStart = 0;
  const push = (raw) => {
    const trimmed = raw.trim();
    if (trimmed) entries.push(trimmed);
  };
  for (let index = 0; index < inner.length; index += 1) {
    const character = inner[index];
    if (quote) {
      if (character === quote && inner[index - 1] !== '\\') quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{' || character === '[' || character === '(') depth += 1;
    else if (character === '}' || character === ']' || character === ')') depth -= 1;
    else if (character === ',' && depth === 0) {
      push(inner.slice(entryStart, index));
      entryStart = index + 1;
    }
  }
  push(inner.slice(entryStart));
  return entries;
}

function splitSxEntry(entry) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < entry.length; index += 1) {
    const character = entry[index];
    if (quote) {
      if (character === quote && entry[index - 1] !== '\\') quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{' || character === '[' || character === '(') depth += 1;
    else if (character === '}' || character === ']' || character === ')') depth -= 1;
    else if (character === ':' && depth === 0) {
      return { rawKey: entry.slice(0, index).trim(), rawValue: entry.slice(index + 1).trim() };
    }
  }
  return null;
}

const SIMPLE_IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;
const QUOTED_STRING_PATTERN = /^(['"])((?:\\.|(?!\1)[\s\S])*)\1$/;
const NUMERIC_LITERAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

/**
 * Reads a top-level `sx={{ ... }}` object literal on a baseline-styled tag
 * and returns its simple `{ property, value }` entries: identifier keys only
 * (a quoted key is a nested selector like `'&:hover'` and is skipped, not a
 * property), values that are a plain quoted string or bare number only. A
 * template literal, identifier reference, spread, or function call is out of
 * scope by design -- this is a lower bound, not a JS evaluator.
 */
function literalSxEntries(sxValueText) {
  if (!/^\{\s*\{/.test(sxValueText)) return [];
  const objectText = balancedBraceRegion(sxValueText, sxValueText.indexOf('{', 1));
  const entries = [];
  for (const rawEntry of topLevelObjectEntries(objectText)) {
    const split = splitSxEntry(rawEntry);
    if (!split) continue;
    const { rawKey, rawValue } = split;
    if (!SIMPLE_IDENTIFIER_PATTERN.test(rawKey)) continue;

    const quoted = rawValue.match(QUOTED_STRING_PATTERN);
    if (quoted) {
      entries.push({ property: rawKey, value: quoted[2] });
      continue;
    }
    if (NUMERIC_LITERAL_PATTERN.test(rawValue)) {
      entries.push({ property: rawKey, value: Number(rawValue) });
    }
  }
  return entries;
}

// MUI's sx system multiplies a bare NUMBER by a theme scale factor for these
// properties (`theme.shape.borderRadius` for borderRadius, `theme.spacing()`
// for every spacing alias) before it ever reaches the DOM -- a raw
// `styleOverrides.root` value is already-resolved CSS, unscaled. Comparing
// the two numbers directly would be a false positive (e.g. `borderRadius: 8`
// in sx renders as `theme.shape.borderRadius * 8`, not `8`), and false
// positives are the failure mode this whole check exists to avoid. Numeric
// literals on these properties are therefore skipped, not compared -- a
// false negative (this check's accepted lower bound) is the safe direction
// to err in, a false positive is not.
const MUI_NUMERIC_SCALE_PROPERTIES = new Set([
  'borderRadius',
  ...Object.keys(SPACING_SHORTHAND_LONGHANDS).filter((key) => key !== 'bgcolor' && key !== 'typography'),
]);

/**
 * Resolves what an sx value would actually render as, for comparison against
 * a theme styleOverride value already resolved to a real CSS value. A string
 * sx value is tried as a `theme.palette.<value>` token path first (MUI's own
 * resolution for palette-aware sx properties, e.g. `borderColor: 'divider'`
 * -> `theme.palette.divider`); if that path is undefined, the raw string is
 * used as-is (a plain CSS keyword like `'none'` is not a token path).
 */
function resolveSxValue(theme, value) {
  if (typeof value !== 'string') return value;
  const paletteValue = getPath(theme, `palette.${value}`);
  return paletteValue !== undefined ? paletteValue : value;
}

/**
 * Reports an app's own `sx` value that already equals what its theme
 * resolves for that MUI component and property -- not "you overrode the
 * baseline" (in an app, that is the intended mechanism), but "you re-stated
 * a value you already had", which silently diverges the next time the token
 * changes. Attribution is by JSX tag name against the same
 * `BASELINE_STYLED_MUI_COMPONENTS` list `reportKitSxBypasses` uses, checked
 * against `theme.components.Mui<Tag>.styleOverrides.root.<property>` only
 * (no other slot). Report-only; there is no exemption arm yet -- each
 * adopting app makes this a hard assertion in its own follow-up WO once it
 * has acted on the findings.
 *
 * This is a lower bound, and the bound is open, not enumerated: a `styled()`
 * component, a component rendered through `component={...}` (so its JSX tag
 * name is not the MUI component it becomes), an aliased import
 * (`import { Paper as Surface }`), array/callback/conditional `sx`, and a
 * template-literal or identifier-reference value are all unattributed or
 * unresolved by this method. A numeric `sx` value on a property MUI scales
 * by a theme factor (`borderRadius`, every spacing alias) is deliberately
 * SKIPPED rather than compared -- see `MUI_NUMERIC_SCALE_PROPERTIES` -- since
 * comparing the raw numbers would be a false positive, not a missed finding.
 * A clean result means "nothing found by this method", not "no redundant
 * value exists".
 */
export function reportRedundantThemeValues(sources = [], { theme } = {}) {
  const findings = [];
  if (!theme) return { findings };
  const componentPattern = BASELINE_STYLED_MUI_COMPONENTS.join('|');
  const tagPattern = new RegExp(`<(${componentPattern})\\b`, 'g');

  for (const { path, source } of normalizedSources(sources)) {
    const scanSource = maskComments(maskQrPrintDocument(source, path.replaceAll('\\', '/')));

    for (const match of scanSource.matchAll(tagPattern)) {
      const tagName = match[1];
      const tag = jsxOpeningTag(scanSource, match.index);
      const sxValueText = topLevelSxValue(tag);
      const line = source.slice(0, match.index).split(/\r?\n/).length;

      for (const { property, value } of literalSxEntries(sxValueText)) {
        if (typeof value === 'number' && MUI_NUMERIC_SCALE_PROPERTIES.has(property)) continue;
        const [canonicalProperty] = expandShorthandProperty(property);
        const lookupProperty = expandShorthandProperty(property).length === 1
          ? canonicalProperty
          : property;
        const themeValue = getPath(
          theme,
          `components.Mui${tagName}.styleOverrides.root.${lookupProperty}`,
        );
        if (themeValue === undefined) continue;
        if (sameValue(resolveSxValue(theme, value), themeValue)) {
          findings.push({
            surface: `${path}:${line}.Mui${tagName}.${property}`,
            reason: `Mui${tagName}'s sx sets "${property}" to a value the theme already resolves to the same thing.`,
          });
        }
      }
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
