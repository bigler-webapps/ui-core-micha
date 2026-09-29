import { describe, expect, it } from 'vitest';

import { assertThemeComplete, createAppTheme } from '../src/theme';
import { BASELINE_PALETTE } from '../src/theme/tokens';

const primary = { main: '#0F62FE' };
const pageBackgrounds = [
  '#FAFAFA',
  '#D8E4E1',
  '#eceae2',
  '#E8EAF6',
  '#E6EAF0',
  '#E398C7',
];

function pageContrastFindings(theme) {
  return assertThemeComplete(theme).findings.filter(({ surface }) => (
    /^contrast\.(success|warning|error|info)\.main-on-(white|page)$/.test(surface)
      || surface.startsWith('contrast.controlBorder.')
  ));
}

describe('createAppTheme page-sensitive baseline contrast', () => {
  it.each(pageBackgrounds)('derives baseline colours for page %s', (background) => {
    const theme = createAppTheme({ palette: { primary, background: { default: background } } });

    expect(pageContrastFindings(theme)).toEqual([]);
  });

  it('keeps all baseline values byte-identical when they already pass', () => {
    const theme = createAppTheme({ palette: { primary } });

    for (const status of ['success', 'warning', 'error', 'info']) {
      expect(theme.palette[status]).toMatchObject({
        main: BASELINE_PALETTE[status].main,
        light: BASELINE_PALETTE[status].light,
        dark: BASELINE_PALETTE[status].dark,
        contrastText: BASELINE_PALETTE[status].contrastText,
      });
    }
    for (const state of ['main', 'hover', 'error']) {
      expect(theme.palette.controlBorder[state]).toBe(BASELINE_PALETTE.controlBorder[state]);
    }
  });

  it('leaves app-supplied failing status and control-border values untouched', () => {
    const appConfig = {
      palette: {
        primary,
        background: { default: '#E398C7' },
        success: { main: '#A5D6A7' },
        warning: { main: '#FFE082' },
        controlBorder: { main: '#FFFFFF', hover: '#FAFAFA', error: '#FFCDD2' },
      },
    };
    const theme = createAppTheme(appConfig);
    const findings = assertThemeComplete(theme).findings.map(({ surface }) => surface);

    expect(theme.palette.success.main).toBe(appConfig.palette.success.main);
    expect(theme.palette.warning.main).toBe(appConfig.palette.warning.main);
    expect(theme.palette.controlBorder.main).toBe(appConfig.palette.controlBorder.main);
    expect(theme.palette.controlBorder.hover).toBe(appConfig.palette.controlBorder.hover);
    expect(theme.palette.controlBorder.error).toBe(appConfig.palette.controlBorder.error);
    for (const surface of [
      'contrast.success.main-on-white',
      'contrast.success.main-on-page',
      'contrast.warning.main-on-white',
      'contrast.warning.main-on-page',
      'contrast.controlBorder.main-on-white',
      'contrast.controlBorder.main-on-page',
      'contrast.controlBorder.hover-on-white',
      'contrast.controlBorder.hover-on-page',
      'contrast.controlBorder.error-on-white',
      'contrast.controlBorder.error-on-page',
    ]) {
      expect(findings).toContain(surface);
    }

    // The two untouched status keys (error/info) -- both fail on ygbs's pink
    // per the Envelope's measured table -- must still derive normally, proving
    // rule 3 is checked per status key, not per whole-status-object: this
    // config only overrides success/warning, so error/info stay baseline-owned
    // and should move off their baseline hex and stop failing.
    expect(theme.palette.error.main).not.toBe(BASELINE_PALETTE.error.main);
    expect(theme.palette.info.main).not.toBe(BASELINE_PALETTE.info.main);
    expect(findings).not.toContain('contrast.error.main-on-page');
    expect(findings).not.toContain('contrast.info.main-on-page');
  });

  it('terminates and leaves findings when the darkening cap cannot pass', () => {
    const create = () => createAppTheme({
      palette: { primary, background: { default: '#666666' } },
    });

    expect(create).not.toThrow();
    const theme = create();
    expect(theme.palette.success.main).toBeDefined();
    expect(theme.palette.warning.main).toBeDefined();
    expect(theme.palette.error.main).toBeDefined();
    expect(theme.palette.info.main).toBeDefined();
    expect(theme.palette.controlBorder.main).toBeDefined();
    expect(theme.palette.controlBorder.hover).toBeDefined();
    expect(theme.palette.controlBorder.error).toBeDefined();
    expect(assertThemeComplete(theme).findings.map(({ surface }) => surface)).toContain(
      'contrast.success.main-on-page',
    );
  });
});
