import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';

import { createTheme, darken, getContrastRatio } from '@mui/material/styles';

import {
  BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS,
  BASELINE_PALETTE,
  BASELINE_STATIC,
  MOTION,
} from './tokens';

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

function createPaletteAwareComponents(palette) {
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

  return {
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

  const paletteTheme = createTheme(
    { palette: appConfig.palette },
    { palette: BASELINE_PALETTE },
    { palette: appConfig.palette },
  );
  const finalPalette = paletteTheme.palette;
  const computedPalette = {
    controlBorder: {
      ...finalPalette.controlBorder,
      focus: deriveFocusColour(finalPalette.primary.main, [
        '#FFFFFF',
        finalPalette.background.default,
      ]),
    },
  };
  const resolvedPalette = { ...finalPalette, ...computedPalette };
  const fontFamily = appConfig.typography?.fontFamily || BASELINE_STATIC.typography.fontFamily;

  return createTheme(
    {
      ...BASELINE_STATIC,
      typography: {
        ...BASELINE_STATIC.typography,
        fontFamily,
      },
      fontLoading: {
        ...BASELINE_STATIC.fontLoading,
        weights: [...BASELINE_STATIC.fontLoading.weights],
      },
      palette: resolvedPalette,
      themeCompleteness: {
        baseline: true,
        exemptions: BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS.map((exemption) => ({
          ...exemption,
        })),
      },
    },
    {
      components: createPaletteAwareComponents(resolvedPalette),
    },
    appConfig,
    {
      palette: {
        dataSeries: {
          categorical: [...resolvedPalette.dataSeries.categorical],
        },
      },
    },
  );
}
