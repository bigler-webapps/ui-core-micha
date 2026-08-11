import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import {
  assertThemeComplete,
  calculateContrastRatio,
  createAppTheme,
  THEME_COMPLETENESS_SURFACES,
} from '../src/theme';

describe('theme completeness', () => {
  it('finds untouched MUI surfaces and accepts createAppTheme', () => {
    const bare = assertThemeComplete(createTheme());
    const baseline = assertThemeComplete(
      createAppTheme({ palette: { primary: { main: '#0F62FE' } } }),
    );

    expect(bare.findings.length).toBeGreaterThan(0);
    expect(bare.findings.map(({ surface }) => surface)).toContain('shape.borderRadius');
    expect(assertThemeComplete(createTheme({ components: { MuiButton: {} } })).findings
      .map(({ surface }) => surface))
      .toContain('components.MuiButton.styleOverrides.root.minHeight');
    expect(bare.findings.map(({ surface }) => surface)).toEqual(expect.arrayContaining([
      'components.MuiBottomNavigation.styleOverrides.root.boxShadow',
      'components.MuiBottomNavigation.styleOverrides.root.backgroundColor',
      'components.MuiBottomNavigationAction.styleOverrides.root.padding',
      'components.MuiBottomNavigationAction.styleOverrides.root.gap',
      'components.MuiBottomNavigationAction.styleOverrides.root.& .MuiSvgIcon-root.width',
      'components.MuiBottomNavigationAction.styleOverrides.root.& .MuiSvgIcon-root.height',
      'components.MuiBottomNavigationAction.styleOverrides.root.color',
      'components.MuiBottomNavigationAction.styleOverrides.label.fontSize',
      'components.MuiBottomNavigationAction.styleOverrides.label.fontWeight',
      'components.MuiBottomNavigationAction.styleOverrides.label.lineHeight',
      'components.MuiBottomNavigationAction.styleOverrides.label.maxWidth',
      'components.MuiBottomNavigationAction.styleOverrides.label.whiteSpace',
      'components.MuiBottomNavigationAction.styleOverrides.label.overflow',
      'components.MuiBottomNavigationAction.styleOverrides.label.textOverflow',
      'components.MuiBottomNavigationAction.styleOverrides.label.&.Mui-selected.fontSize',
      'components.MuiBottomNavigationAction.styleOverrides.root.&.Mui-selected.color',
    ]));
    expect(baseline.findings).toEqual([]);
  });

  it('requires and automatically resolves the subtle background for a minimal adopter', () => {
    const muiDefault = createTheme();
    const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

    expect(muiDefault.palette.background.subtle).toBeUndefined();
    expect(THEME_COMPLETENESS_SURFACES.map(({ surface }) => surface))
      .toContain('palette.background.subtle');
    expect(assertThemeComplete(theme).findings).toEqual([]);
  });

  it('keeps the narrowed bottom-navigation inventory complete', () => {
    const bottomNavigationSurfaces = THEME_COMPLETENESS_SURFACES
      .map(({ surface }) => surface)
      .filter((surface) => surface.startsWith('components.MuiBottomNavigation'));

    expect(bottomNavigationSurfaces).toHaveLength(16);
    [
      'components.MuiBottomNavigation.styleOverrides.root.borderTop',
      'components.MuiBottomNavigation.styleOverrides.root.borderColor',
      'components.MuiBottomNavigationAction.styleOverrides.root.minWidth',
      'components.MuiBottomNavigationAction.styleOverrides.root.maxWidth',
    ].forEach((surface) => expect(bottomNavigationSurfaces).not.toContain(surface));
  });

  it('ignores a valid exemption for a deregistered surface', () => {
    const result = assertThemeComplete(
      createAppTheme({ palette: { primary: { main: '#0F62FE' } } }),
      {
        exemptions: [{
          surface: 'components.MuiBottomNavigation.styleOverrides.root.borderTop',
          reason: 'Legacy exemption retained while the application upgrades.',
        }],
      },
    );

    expect(result.findings).toEqual([]);
  });

  it('suppresses exactly one surface when an exemption includes a reason', () => {
    const theme = createTheme();
    const before = assertThemeComplete(theme).findings;
    const after = assertThemeComplete(theme, {
      exemptions: [{
        surface: 'palette.background.paper',
        reason: 'This application deliberately uses white as its surface.',
      }],
    }).findings;

    expect(after).toHaveLength(before.length - 1);
    expect(after.map(({ surface }) => surface)).not.toContain('palette.background.paper');
  });

  it('reports an exemption without a reason as its own finding', () => {
    const result = assertThemeComplete(createTheme(), {
      exemptions: [{ surface: 'shape.borderRadius' }],
    });

    expect(result.findings.map(({ surface }) => surface)).toContain('exemption.shape.borderRadius');
    expect(result.findings.map(({ surface }) => surface)).toContain('shape.borderRadius');
  });

  it('meets status-on-tint and control-boundary contrast thresholds', () => {
    const theme = createAppTheme({ palette: { primary: { main: '#8AB4F8' } } });

    for (const status of ['success', 'warning', 'error', 'info', 'stale']) {
      expect(calculateContrastRatio(theme.palette[status].text, theme.palette[status].bg)).toBeGreaterThanOrEqual(4.5);
    }
    for (const state of ['main', 'hover', 'focus', 'error']) {
      expect(calculateContrastRatio(theme.palette.controlBorder[state], '#FFFFFF')).toBeGreaterThanOrEqual(3);
      expect(calculateContrastRatio(theme.palette.controlBorder[state], theme.palette.background.default)).toBeGreaterThanOrEqual(3);
    }

    theme.palette.success.text = 'not-a-colour';
    expect(assertThemeComplete(theme).findings.map(({ surface }) => surface))
      .toContain('contrast.success.text-on-bg');
  });

  it('keeps secondary ink AA-legible on the subtle background', () => {
    const ratio = calculateContrastRatio('#5B6670', '#F4F5F6');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('requires every MUI status main to clear AA on white and the page background', () => {
    const theme = createAppTheme({ palette: { primary: { main: '#8AB4F8' } } });

    for (const status of ['success', 'warning', 'error', 'info']) {
      expect(calculateContrastRatio(theme.palette[status].main, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
      expect(calculateContrastRatio(
        theme.palette[status].main,
        theme.palette.background.default,
      )).toBeGreaterThanOrEqual(4.5);
    }

    theme.palette.warning.main = '#C08A2C';
    expect(assertThemeComplete(theme).findings.map(({ surface }) => surface)).toEqual(
      expect.arrayContaining([
        'contrast.warning.main-on-white',
        'contrast.warning.main-on-page',
      ]),
    );
  });

  it('reports main contrast findings without hard-failing for a non-adopting app theme', () => {
    const result = assertThemeComplete(createTheme());

    expect(result.findings.map(({ surface }) => surface)).toEqual(
      expect.arrayContaining([
        'contrast.warning.main-on-white',
        'contrast.warning.main-on-page',
      ]),
    );
  });
});
