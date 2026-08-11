import fs from 'node:fs';
import path from 'node:path';

import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import {
  assertThemeComplete,
  assertKitSxDisjoint,
  calculateContrastRatio,
  createAppTheme,
  KIT_COMPONENT_SX_REGISTRY,
  reportKitSxBypasses,
  THEME_COMPLETENESS_SURFACES,
} from '../src/theme';

function jsxSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsxSources(entryPath);
    if (!entry.name.endsWith('.jsx')) return [];
    return [{ path: path.relative(process.cwd(), entryPath), source: fs.readFileSync(entryPath, 'utf8') }];
  });
}

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

describe('kit sx disjointness', () => {
  const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

  it('finds the real shadowing incident shape and names every part', () => {
    const result = assertKitSxDisjoint(theme, {
      registry: [{
        component: 'FixtureBottomNav',
        muiComponent: 'MuiBottomNavigation',
        sx: { boxShadow: 'none' },
      }],
    });

    expect(result.findings).toEqual([{
      surface: 'FixtureBottomNav.MuiBottomNavigation.boxShadow',
      reason: expect.stringMatching(/FixtureBottomNav.*MuiBottomNavigation.*boxShadow/),
    }]);
  });

  it('checks same-root variant slots without conflating child slots', () => {
    const chipResult = assertKitSxDisjoint(theme, {
      registry: [{
        component: 'FixtureChip',
        muiComponent: 'MuiChip',
        sx: { borderColor: 'red' },
      }],
    });
    const bottomNavActionResult = assertKitSxDisjoint(theme, {
      registry: [{
        component: 'FixtureBottomNavAction',
        muiComponent: 'MuiBottomNavigationAction',
        sx: { maxWidth: 'none' },
      }],
    });

    expect(chipResult.findings.map(({ surface }) => surface))
      .toContain('FixtureChip.MuiChip.borderColor');
    expect(bottomNavActionResult.findings).toEqual([]);
  });

  it('keeps every registered kit sx object disjoint from the baseline', () => {
    expect(KIT_COMPONENT_SX_REGISTRY.length).toBeGreaterThan(2);
    expect(assertKitSxDisjoint(theme, {
      exemptions: [
        {
          surface: 'UserListComponent.bodyCell.MuiTableCell.py',
          reason: 'The user list intentionally uses a tighter row density than the baseline TableCell default.',
        },
        {
          surface: 'UserListComponent.emptyCell.MuiTableCell.py',
          reason: 'The empty-state message intentionally uses more vertical breathing room than the baseline TableCell default.',
        },
      ],
    }).findings).toEqual([]);
  });

  it('flags inline sx while accepting a top-level exported object', () => {
    const result = reportKitSxBypasses([
      {
        path: 'InlineFixture.jsx',
        source: 'export function Fixture() { return <Button sx={{ minHeight: 12 }} />; }',
      },
      {
        path: 'ExportedFixture.jsx',
        source: 'export const FIXTURE_SX = { minHeight: 12 }; export function Fixture() { return <Button sx={FIXTURE_SX} />; }',
      },
    ]);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toEqual({
      surface: 'InlineFixture.jsx:1.MuiButton.sx',
      reason: expect.stringMatching(/Button.*inline sx object.*exported object/i),
    });
  });

  it('flags a local sx identifier and ignores nested JSX props', () => {
    const result = reportKitSxBypasses([
      {
        path: 'LocalFixture.jsx',
        source: 'const LOCAL_SX = { minHeight: 12 }; export function Fixture() { return <Button sx={LOCAL_SX} />; }',
      },
      {
        path: 'NestedFixture.jsx',
        source: 'export function Fixture() { return <Button startIcon={<Box sx={{ width: 12 }} />} />; }',
      },
    ]);

    expect(result.findings).toEqual([{
      surface: 'LocalFixture.jsx:1.MuiButton.sx',
      reason: expect.stringMatching(/Button.*non-exported sx object.*LOCAL_SX/i),
    }]);
  });

  it('flags an exported sx object omitted from the registry', () => {
    const result = reportKitSxBypasses([{
      path: 'UnregisteredFixture.jsx',
      source: 'export const UNREGISTERED_SX = { minHeight: 12 }; export function Fixture() { return <Button sx={UNREGISTERED_SX} />; }',
    }], { registry: [] });

    expect(result.findings).toEqual([{
      surface: 'UnregisteredFixture.jsx:1.MuiButton.sx',
      reason: expect.stringMatching(/Button.*exported sx object.*UNREGISTERED_SX.*MuiButton registry entry/i),
    }]);
  });

  it('flags an sx object registered against the wrong MUI key', () => {
    const result = reportKitSxBypasses([{
      path: 'WrongTargetFixture.jsx',
      source: 'export const WRONG_TARGET_SX = { minHeight: 12 }; export function Fixture() { return <Button sx={WRONG_TARGET_SX} />; }',
    }], {
      registry: [{ exportName: 'WRONG_TARGET_SX', muiComponent: 'MuiPaper' }],
    });

    expect(result.findings).toEqual([{
      surface: 'WrongTargetFixture.jsx:1.MuiButton.sx',
      reason: expect.stringMatching(/WRONG_TARGET_SX.*MuiButton registry entry/i),
    }]);
  });

  it('does not let current kit source bypass the exported-object convention', () => {
    expect(reportKitSxBypasses(
      jsxSources(path.resolve('src')),
      { registry: KIT_COMPONENT_SX_REGISTRY },
    ).findings).toEqual([]);
  });

  it('suppresses exactly one collision with a reason', () => {
    const registry = [{
      component: 'FixtureButton',
      muiComponent: 'MuiButton',
      sx: { minHeight: 12, textTransform: 'uppercase' },
    }];
    const before = assertKitSxDisjoint(theme, { registry }).findings;
    const after = assertKitSxDisjoint(theme, {
      registry,
      exemptions: [{
        surface: 'FixtureButton.MuiButton.minHeight',
        reason: 'The fixture deliberately overrides one baseline property.',
      }],
    }).findings;

    expect(before).toHaveLength(2);
    expect(after).toHaveLength(1);
    expect(after[0].surface).toBe('FixtureButton.MuiButton.textTransform');
  });

  it('honours a reasoned exemption declared on the theme', () => {
    const exemptTheme = {
      ...theme,
      themeCompleteness: {
        ...theme.themeCompleteness,
        exemptions: [{
          surface: 'FixtureButton.MuiButton.minHeight',
          reason: 'The fixture deliberately owns its compact height.',
        }],
      },
    };
    const result = assertKitSxDisjoint(exemptTheme, {
      registry: [{
        component: 'FixtureButton',
        muiComponent: 'MuiButton',
        sx: { minHeight: 12 },
      }],
    });

    expect(result.findings).toEqual([]);
  });

  it('reports an exemption without a reason as its own finding', () => {
    const result = assertKitSxDisjoint(theme, {
      registry: [{
        component: 'FixtureButton',
        muiComponent: 'MuiButton',
        sx: { minHeight: 12 },
      }],
      exemptions: [{ surface: 'FixtureButton.MuiButton.minHeight' }],
    });

    expect(result.findings.map(({ surface }) => surface)).toEqual([
      'exemption.FixtureButton.MuiButton.minHeight',
      'FixtureButton.MuiButton.minHeight',
    ]);
  });
});
