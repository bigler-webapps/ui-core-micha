import { darken, lighten } from '@mui/material/styles';

// MUI's palette augmentation (createPalette -> augmentColor) only runs on the
// FIRST argument passed to createTheme; every later argument -- which is how
// createAppTheme layers BASELINE_PALETTE on top -- is deep-merged as a raw
// object with no augmentation. A status entry missing `main`/`contrastText`
// therefore silently keeps MUI's stock hue for `color="success"` etc. even
// though `text`/`fill`/`bg` are set correctly, so every status channel MUI
// recognises (success/warning/error/info) must carry its own explicit
// main/light/dark/contrastText, computed the same way augmentColor would.
const withMainShades = (main, contrastText) => ({
  main,
  light: lighten(main, 0.2),
  dark: darken(main, 0.3),
  contrastText,
});

export const SERIES_COLOURS = [
  '#3D5A99',
  '#3E80B8',
  '#2E8F8A',
  '#7A5FA8',
  '#9C4F86',
  '#8A7355',
];

export const STATUS_KEYS = ['success', 'warning', 'error', 'info', 'stale'];

export const TYPOGRAPHY_VARIANTS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle1',
  'subtitle2',
  'body1',
  'body2',
  'button',
  'caption',
  'overline',
];

const typeVariant = (fontSize, fontWeight, lineHeight, extra = {}) => ({
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing: 0,
  ...extra,
});

export const BASELINE_PALETTE = {
  ink: {
    primary: '#212529',
    secondary: '#5B6670',
    muted: '#6A7178',
  },
  text: {
    primary: '#212529',
    secondary: '#5B6670',
    disabled: '#6A7178',
  },
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
  },
  divider: 'rgba(33,37,41,.10)',
  controlBorder: {
    main: 'rgba(33,37,41,.50)',
    hover: 'rgba(33,37,41,.65)',
    error: '#BF3227',
  },
  success: {
    ...withMainShades('#1B8038', '#FFFFFF'),
    text: '#35794A',
    fill: '#1B8038',
    fillText: '#FFFFFF',
    bg: '#E5F4E9',
  },
  warning: {
    ...withMainShades('#976100', '#FFFFFF'),
    text: '#976100',
    fill: '#C08A2C',
    fillText: '#212529',
    bg: '#FBF0DC',
  },
  error: {
    ...withMainShades('#BF3227', '#FFFFFF'),
    text: '#BF3227',
    fill: '#BF3227',
    fillText: '#FFFFFF',
    bg: '#FBEAE8',
  },
  // The canonical sheet introduces no new info hue. These values reuse
  // MUI's own info.dark/main family while adding the shared status shape.
  info: {
    ...withMainShades('#01579B', '#FFFFFF'),
    text: '#01579B',
    fill: '#01579B',
    fillText: '#FFFFFF',
    bg: '#E5F6FD',
  },
  stale: {
    text: '#5B6B7D',
    fill: '#5B6B7D',
    fillText: '#FFFFFF',
    bg: '#EAEDF1',
  },
  dataSeries: {
    categorical: SERIES_COLOURS,
  },
};

export const OVERLAY_SHADOW =
  '0 8px 24px rgba(20,26,31,.16), 0 2px 8px rgba(20,26,31,.08)';

export const MOTION = {
  duration: {
    fast: 120,
    base: 180,
    overlayEnter: 220,
    overlayExit: 180,
    chart: 300,
  },
  easing: {
    enter: 'cubic-bezier(0.0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    state: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  reduced: '0.01ms',
};

const coarseHitArea = {
  '@media (any-pointer: coarse)': {
    minHeight: 44,
    minWidth: 44,
  },
};

const autofill = {
  '&:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 100px #FFFFFF inset',
    WebkitTextFillColor: '#212529',
    caretColor: '#212529',
  },
  '&:autofill': {
    boxShadow: '0 0 0 100px #FFFFFF inset',
    WebkitTextFillColor: '#212529',
    caretColor: '#212529',
  },
};

export const BASELINE_STATIC = {
  typography: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: typeVariant('32px', 600, 1.2),
    h2: typeVariant('28px', 600, 1.22),
    h3: typeVariant('24px', 600, 1.25),
    h4: typeVariant('20px', 600, 1.3),
    h5: typeVariant('18px', 600, 1.3),
    h6: typeVariant('16px', 600, 1.35),
    subtitle1: typeVariant('15px', 600, 1.4),
    subtitle2: typeVariant('13px', 500, 1.4),
    body1: typeVariant('14px', 400, 1.55),
    body2: typeVariant('13px', 400, 1.55),
    button: typeVariant('14px', 500, 1.4, { textTransform: 'none' }),
    caption: typeVariant('12px', 400, 1.4),
    overline: typeVariant('11px', 600, 1.4, {
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
    }),
  },
  shape: {
    borderRadius: 3,
  },
  radius: {
    control: 3,
    card: 8,
  },
  spacing: 8,
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  density: {
    controlHeight: 40,
    touchTarget: 44,
    tableCellPadding: '10px 16px',
    chip: { height: 32, radius: 16, fontSize: 13 },
    containerGutter: { default: 24, wide: 32 },
  },
  fontLoading: {
    family: 'DM Sans',
    weights: [400, 500, 600],
    source: '@fontsource/dm-sans',
  },
  shadow: {
    rest: 'none',
    overlay: OVERLAY_SHADOW,
  },
  motion: MOTION,
  transitions: {
    duration: {
      fast: MOTION.duration.fast,
      base: MOTION.duration.base,
      overlayEnter: MOTION.duration.overlayEnter,
      overlayExit: MOTION.duration.overlayExit,
      chart: MOTION.duration.chart,
    },
    easing: {
      enter: MOTION.easing.enter,
      exit: MOTION.easing.exit,
      state: MOTION.easing.state,
    },
  },
  // MUI's 25-entry shadows array is intentionally retained intact. Resting
  // surfaces are made shadowless via the Paper/Card defaults below, while
  // named transient surfaces receive shadow.overlay explicitly.
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 3,
          textTransform: 'none',
          transitionDuration: '120ms',
          ...coarseHitArea,
        },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { padding: '10px 16px' } },
    },
    MuiIconButton: {
      styleOverrides: { root: { minHeight: 40, minWidth: 40, ...coarseHitArea } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: 'rgba(33,37,41,.10)' } },
    },
    MuiSelect: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        select: {
          minHeight: 40,
          boxSizing: 'border-box',
          '@media (any-pointer: coarse)': { minHeight: 44 },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: { root: { minHeight: 40, minWidth: 40, ...coarseHitArea } },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: { minHeight: 40, ...coarseHitArea },
        label: { fontSize: '14px', lineHeight: 1.55 },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 24,
          paddingRight: 24,
          '@media (min-width:1200px)': { paddingLeft: 32, paddingRight: 32 },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0, variant: 'outlined' },
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: 'none' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0, variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 8, boxShadow: 'none' } },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 32,
          borderRadius: 16,
          fontSize: '13px',
          position: 'relative',
          '@media (any-pointer: coarse)': {
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: '-6px',
            },
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { minHeight: 40, ...coarseHitArea } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 3,
          ...coarseHitArea,
        },
        input: autofill,
      },
      // `variants` is a sibling of `styleOverrides`, not nested inside it -
      // MUI matches these by `props` and applies `style` independently of the
      // styleOverrides merge, so this is the correct placement (a `variants`
      // array embedded inside styleOverrides.root would just be inert CSS-in-JS).
      variants: [
        { props: { multiline: false }, style: { height: 40 } },
      ],
    },
    MuiFilledInput: {
      styleOverrides: { input: autofill },
    },
    MuiInput: {
      styleOverrides: { input: autofill },
    },
    MuiDialog: {
      defaultProps: { transitionDuration: { enter: 220, exit: 180 } },
      styleOverrides: { paper: { borderRadius: 8, boxShadow: OVERLAY_SHADOW } },
    },
    MuiDrawer: {
      defaultProps: { transitionDuration: { enter: 220, exit: 180 } },
      styleOverrides: { paper: { boxShadow: OVERLAY_SHADOW } },
    },
    MuiMenu: {
      defaultProps: { transitionDuration: { enter: 220, exit: 180 } },
      styleOverrides: { paper: { boxShadow: OVERLAY_SHADOW } },
    },
    MuiTooltip: {
      defaultProps: {
        slotProps: { transition: { timeout: { enter: 220, exit: 180 } } },
      },
      styleOverrides: {
        tooltip: { boxShadow: OVERLAY_SHADOW, transitionDuration: '220ms' },
      },
    },
  },
};

export const BASELINE_INTENTIONAL_DEFAULT_EXEMPTIONS = [
  {
    surface: 'palette.background.paper',
    reason: 'The canonical surface is deliberately MUI white.',
  },
  {
    surface: 'spacing.unit',
    reason: 'The canonical spacing rhythm deliberately retains MUI\'s 8px unit.',
  },
  {
    surface: 'breakpoints.values',
    reason: 'The canonical breakpoint values deliberately retain MUI\'s defaults.',
  },
  ...['subtitle2', 'body1', 'body2', 'button', 'caption'].map((variant) => ({
    surface: `typography.${variant}.fontWeight`,
    reason: `The canonical ${variant} weight deliberately equals MUI's numeric default.`,
  })),
];
