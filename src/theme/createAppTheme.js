import './fonts';

import { createTheme, darken, decomposeColor, getContrastRatio, lighten } from '@mui/material/styles';

import {
  BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS,
  BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS_DARK,
  BASELINE_PALETTE,
  BASELINE_PALETTE_DARK,
  BASELINE_STATIC,
  BREAKPOINT_SM,
  DARK_OVERLAY_SHADOW,
  DARK_OVERLAY_SURFACE,
  DARK_SCRIM,
  MOTION,
  breakpointDownQuery,
  withMainShades,
} from './tokens';
import { calculateContrastRatio } from './themeCompleteness';

function findFunction(value, path) {
  if (typeof value === 'function') return path;
  if (!value || typeof value !== 'object') return null;

  for (const [key, child] of Object.entries(value)) {
    const found = findFunction(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

function validateStyleOverrides(components = {}) {
  for (const [componentName, component] of Object.entries(components)) {
    if (!component?.styleOverrides) continue;
    const slot = findFunction(
      component.styleOverrides,
      `components.${componentName}.styleOverrides`,
    );
    if (slot) {
      throw new TypeError(
        `createAppTheme: ${slot} must be an object, not a function. ` +
          'Use object styleOverrides and MUI variants for prop- or state-dependent styles.',
      );
    }
  }
}

function clearsContrast(colour, surfaces) {
  return surfaces.every((surface) => getContrastRatio(colour, surface) >= 3);
}

function normalizeColour(colour) {
  const match = colour.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (!match) return colour;
  return `#${match.slice(1).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function lightenColour(colour, coefficient) {
  const normalized = normalizeColour(colour);
  const match = normalized.match(/^#([\da-f]{6})$/i);
  if (!match) return normalizeColour(lighten(colour, coefficient));
  const channels = [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel + (255 - channel) * coefficient)
    .toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// Darkened until it clears 3:1 against BOTH '#FFFFFF' and background.default
// -- the exact two surfaces assertThemeComplete's contrastFindings checks --
// so deriving against background.paper alone (which need not be white for an
// app that overrides it) could pass here and still fail there.
function deriveFocusColour(primary, surfaces) {
  let focus = primary;
  for (let coefficient = 0.05; !clearsContrast(focus, surfaces); coefficient += 0.05) {
    focus = darken(primary, Math.min(coefficient, 0.9));
    if (coefficient >= 0.9) break;
  }
  return focus;
}

function deriveLightenedColour(original, surfaces) {
  if (clearsContrast(original, surfaces)) return original;
  let colour = original;
  for (let coefficient = 0.05; !clearsContrast(colour, surfaces); coefficient += 0.05) {
    colour = lightenColour(original, Math.min(coefficient, 0.9));
    if (coefficient >= 0.9) break;
  }
  return colour;
}

function clearsPageContrast(colour, surfaces, threshold) {
  return surfaces.every((surface) => {
    const ratio = calculateContrastRatio(colour, surface);
    return Number.isFinite(ratio) && ratio >= threshold;
  });
}

function deriveDarkenedPageColour(original, surfaces, threshold) {
  if (clearsPageContrast(original, surfaces, threshold)) return original;

  let colour = original;
  for (let coefficient = 0.05; !clearsPageContrast(colour, surfaces, threshold); coefficient += 0.05) {
    colour = darken(original, Math.min(coefficient, 0.9));
    if (coefficient >= 0.9) break;
  }
  return colour;
}

function deriveLightenedPageColour(original, surfaces, threshold) {
  if (clearsPageContrast(original, surfaces, threshold)) return original;

  let colour = original;
  for (let coefficient = 0.05; !clearsPageContrast(colour, surfaces, threshold); coefficient += 0.05) {
    colour = lightenColour(original, Math.min(coefficient, 0.9));
    if (coefficient >= 0.9) break;
  }
  return colour;
}

// ink.primary may be supplied as hex or rgb(); decomposeColor normalises both.
function inkChannels(ink) {
  return decomposeColor(ink).values.slice(0, 3).map((value) => Math.round(value));
}

// 0.02 steps: the frozen sheet value (0.38) is the first even step that clears
// 3:1; a 0.01 search would land on 0.37 and drift from the frozen baseline.
function deriveDarkAlphaColour(ink, surfaces) {
  const [red, green, blue] = inkChannels(ink);
  let alpha = 0;
  while (alpha <= 1) {
    const colour = `rgba(${red},${green},${blue},${alpha.toFixed(2)})`;
    if (clearsPageContrast(colour, surfaces, 3)) return colour;
    alpha = Number((alpha + 0.02).toFixed(2));
  }
  return `rgba(${red},${green},${blue},1)`;
}

const RGBA_PATTERN = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d*\.?\d+)\s*\)$/;

function deriveAlphaPageColour(original, surfaces, threshold) {
  if (clearsPageContrast(original, surfaces, threshold)) return original;

  const match = original.match(RGBA_PATTERN);
  if (!match) return original;

  const [, red, green, blue, alphaText] = match;
  let alpha = Number(alphaText);
  let colour = original;
  while (alpha < 1) {
    alpha = Math.min(1, Number((alpha + 0.05).toFixed(2)));
    colour = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    if (clearsPageContrast(colour, surfaces, threshold)) return colour;
  }
  return colour;
}

function createPaletteAwareComponents(palette, isDark) {
  const stateTransition = `border-color ${MOTION.duration.fast}ms ${MOTION.easing.state}, color ${MOTION.duration.fast}ms ${MOTION.easing.state}, background-color ${MOTION.duration.fast}ms ${MOTION.easing.state}`;
  const autofill = {
    '&:-webkit-autofill': {
      WebkitBoxShadow: `0 0 0 100px ${palette.background.paper} inset`,
      WebkitTextFillColor: palette.ink.primary,
      caretColor: palette.ink.primary,
    },
    '&:autofill': {
      boxShadow: `0 0 0 100px ${palette.background.paper} inset`,
      WebkitTextFillColor: palette.ink.primary,
      caretColor: palette.ink.primary,
    },
  };
  const alertStyles = Object.fromEntries(
    ['success', 'warning', 'error', 'info'].map((status) => [
      `standard${status[0].toUpperCase()}${status.slice(1)}`,
      {
        color: palette[status].text,
        backgroundColor: palette[status].bg,
        '& .MuiAlert-icon': { color: palette[status].text },
      },
    ]),
  );

  const components = {
    MuiButton: {
      styleOverrides: {
        root: { transition: stateTransition },
        outlined: {
          borderColor: palette.controlBorder.main,
          '&:hover': { borderColor: palette.controlBorder.hover },
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: palette.divider } },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: palette.controlBorder.main,
          transition: stateTransition,
          '&:hover': { color: palette.controlBorder.hover },
          '&.Mui-checked': { color: palette.primary.main },
          '&.MuiCheckbox-indeterminate': { color: palette.primary.main },
          '&.Mui-error': { color: palette.controlBorder.error },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { borderColor: palette.divider } },
    },
    MuiCard: {
      styleOverrides: { root: { borderColor: palette.divider } },
    },
    MuiChip: {
      styleOverrides: {
        outlined: { borderColor: palette.controlBorder.main },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: palette.background.paper,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: palette.text.secondary,
          '&.Mui-selected': { color: palette.primary.main },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          transition: stateTransition,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.controlBorder.main,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.controlBorder.hover,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.controlBorder.focus,
            borderWidth: 2,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.controlBorder.error,
          },
        },
        input: autofill,
      },
    },
    MuiFilledInput: {
      styleOverrides: { input: autofill },
    },
    MuiInput: {
      styleOverrides: { input: autofill },
    },
    MuiAlert: {
      styleOverrides: alertStyles,
    },
  };

  if (isDark) {
    for (const component of ['MuiDialog', 'MuiMenu', 'MuiPopover', 'MuiDrawer']) {
      components[component] = {
        styleOverrides: {
          paper: {
            backgroundColor: DARK_OVERLAY_SURFACE,
            boxShadow: DARK_OVERLAY_SHADOW,
          },
        },
      };
    }
    components.MuiBackdrop = { styleOverrides: { root: { backgroundColor: DARK_SCRIM } } };
  }

  return components;
}

/**
 * Builds the shared application theme while leaving app identity in primary
 * and fontFamily. Palette resolution happens before palette-aware component
 * objects are created, so runtime app/site overrides cannot leave stale values.
 */
export function createAppTheme(appConfig = {}) {
  if (!appConfig?.palette?.primary) {
    throw new TypeError('createAppTheme: appConfig.palette.primary is required.');
  }
  validateStyleOverrides(appConfig.components);

  const isDark = appConfig.palette.mode === 'dark';
  const baselinePalette = isDark ? BASELINE_PALETTE_DARK : BASELINE_PALETTE;

  const paletteTheme = createTheme(
    { palette: appConfig.palette },
    { palette: baselinePalette },
    { palette: appConfig.palette },
  );
  const finalPalette = paletteTheme.palette;
  const contrastSurfaces = isDark
    ? [finalPalette.background.default, finalPalette.background.paper]
    : ['#FFFFFF', finalPalette.background.default];
  const derivedStatusEntries = {};
  for (const status of ['success', 'warning', 'error', 'info']) {
    if (appConfig.palette?.[status]?.main !== undefined) continue;

    const current = finalPalette[status];
    const statusSurfaces = isDark
      ? [finalPalette.background.default, current.bg]
      : contrastSurfaces;
    const main = isDark
      ? deriveLightenedPageColour(current.main, statusSurfaces, 4.5)
      : deriveDarkenedPageColour(current.main, statusSurfaces, 4.5);
    if (main !== current.main) {
      derivedStatusEntries[status] = {
        ...current,
        ...withMainShades(main, current.contrastText),
      };
    }
  }

  const derivedControlBorderEntries = {};
  for (const state of ['main', 'hover', 'error']) {
    if (appConfig.palette?.controlBorder?.[state] !== undefined) continue;

    const current = finalPalette.controlBorder[state];
    const derived = isDark
      ? state === 'error'
        ? deriveLightenedPageColour(current, [finalPalette.background.default, finalPalette.error.bg], 3)
        : deriveDarkAlphaColour(finalPalette.ink.primary, contrastSurfaces)
      : state === 'error'
        ? deriveDarkenedPageColour(current, contrastSurfaces, 3)
        : deriveAlphaPageColour(current, contrastSurfaces, 3);
    if (derived !== current) derivedControlBorderEntries[state] = derived;
  }
  if (isDark && appConfig.palette?.controlBorder?.hover === undefined) {
    const main = derivedControlBorderEntries.main || finalPalette.controlBorder.main;
    const alpha = Number(main.match(/,([\d.]+)\)$/)?.[1] || 0);
    const hoverAlpha = Math.min(1, Number((alpha + 0.15).toFixed(2)));
    const [red, green, blue] = inkChannels(finalPalette.ink.primary);
    derivedControlBorderEntries.hover = `rgba(${red},${green},${blue},${hoverAlpha.toFixed(2)})`;
  }

  const primaryMain = isDark
    ? deriveLightenedPageColour(finalPalette.primary.main, [finalPalette.background.default], 4.5)
    : finalPalette.primary.main;
  const primaryContrastText = isDark
    ? (getContrastRatio('#FFFFFF', primaryMain) >= getContrastRatio(finalPalette.background.default, primaryMain)
      ? '#FFFFFF'
      : finalPalette.background.default)
    : finalPalette.primary.contrastText;
  const derivedSeries = isDark && appConfig.palette?.dataSeries?.categorical === undefined
    ? finalPalette.dataSeries.categorical.map((colour) => (
      deriveLightenedPageColour(colour, [finalPalette.background.paper], 3)
    ))
    : finalPalette.dataSeries.categorical;

  const computedPalette = {
    ...derivedStatusEntries,
    controlBorder: {
      ...finalPalette.controlBorder,
      ...derivedControlBorderEntries,
      focus: isDark
        ? (appConfig.palette?.controlBorder?.focus
          ?? deriveLightenedColour(primaryMain, contrastSurfaces))
        : deriveFocusColour(finalPalette.primary.main, contrastSurfaces),
    },
    primary: {
      ...finalPalette.primary,
      // A lightened main needs its own light/dark shades, or hover states keep
      // the shades of the colour that was replaced.
      ...(isDark && primaryMain !== finalPalette.primary.main
        ? withMainShades(primaryMain, primaryContrastText)
        : { main: primaryMain }),
      contrastText: primaryContrastText,
    },
    dataSeries: { categorical: derivedSeries },
  };
  const resolvedPalette = { ...finalPalette, ...computedPalette };
  const fontFamily = appConfig.typography?.fontFamily || BASELINE_STATIC.typography.fontFamily;
  // The h4 step below `sm` follows the app's own `sm` if it overrides the breakpoint,
  // so the step always ends where theme.breakpoints.down('sm') ends.
  const { [breakpointDownQuery(BREAKPOINT_SM)]: h4Mobile, ...h4Base } = BASELINE_STATIC.typography.h4;
  const smValue = appConfig.breakpoints?.values?.sm ?? BREAKPOINT_SM;

  return createTheme(
    {
      ...BASELINE_STATIC,
      typography: {
        ...BASELINE_STATIC.typography,
        fontFamily,
        h4: { ...h4Base, [breakpointDownQuery(smValue)]: h4Mobile },
      },
      fontLoading: {
        ...BASELINE_STATIC.fontLoading,
        weights: [...BASELINE_STATIC.fontLoading.weights],
      },
      shadow: isDark ? { ...BASELINE_STATIC.shadow, overlay: DARK_OVERLAY_SHADOW } : BASELINE_STATIC.shadow,
      palette: resolvedPalette,
      themeCompleteness: {
        baseline: true,
        exemptions: (isDark
          ? BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS_DARK
          : BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS).map((exemption) => ({
          ...exemption,
        })),
      },
    },
    {
      components: createPaletteAwareComponents(resolvedPalette, isDark),
    },
    appConfig,
    {
      palette: {
        ...(isDark ? computedPalette : {}),
        dataSeries: {
          categorical: [...resolvedPalette.dataSeries.categorical],
        },
      },
    },
  );
}
