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
  reportOffPaletteColours,
  reportKitSxBypasses,
  reportRedundantThemeValues,
  THEME_COMPLETENESS_SURFACES,
} from '../src/theme';
import { BASELINE_PALETTE } from '../src/theme/tokens';

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    if (!/\.jsx?$/.test(entry.name)) return [];
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

  it('anchors the select touch target on the input root, not the inner select slot', () => {
    // THEME-8: a min-height on styleOverrides.select lands on a display:block
    // element with variant-dependent, top-anchored padding -- the surplus
    // height collects entirely below the text instead of centring it. The
    // root is already flex/align-items:center, so anchoring there is what
    // actually centres the text. A test only checking "44px somewhere" would
    // pass on the broken version too.
    const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });
    const selectOverrides = theme.components.MuiSelect.styleOverrides;

    expect(selectOverrides.select?.minHeight).toBeUndefined();
    expect(selectOverrides.root.minHeight).toBe(40);
    expect(selectOverrides.root['@media (any-pointer: coarse)'].minHeight).toBe(44);
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

  it('normalises bgcolor against a backgroundColor baseline default', () => {
    const result = assertKitSxDisjoint({
      components: {
        MuiPaper: {
          styleOverrides: { root: { backgroundColor: '#FFFFFF' } },
        },
      },
    }, {
      registry: [{
        component: 'FixturePaper',
        muiComponent: 'MuiPaper',
        sx: { bgcolor: '#FFFFFF' },
      }],
    });

    expect(result.findings).toEqual([{
      surface: 'FixturePaper.MuiPaper.bgcolor',
      reason: expect.stringMatching(/FixturePaper.*MuiPaper.*bgcolor/),
    }]);
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
        {
          surface: 'SoftChip.root.MuiChip.height',
          reason: 'SoftChip is a small annotation chip, deliberately auto-height rather than the baseline interactive Chip\'s fixed 32px.',
        },
        {
          surface: 'SoftChip.caveat.MuiChip.borderRadius',
          reason: 'The caveat variant uses the shared square-ish radius token (shape.borderRadius), not the baseline Chip\'s pill radius.',
        },
        {
          surface: 'SoftChip.caveat.MuiChip.fontSize',
          reason: 'PRIM-1 token delta: caveat text is 12/500, one weight step above the nearest baseline variant (caption, 12/400). Adding a variant for this is an app-level baseline decision out of scope for this promotion; deliberately left unresolved.',
        },
        {
          surface: 'SoftChip.status.MuiChip.borderRadius',
          reason: 'The status variant is a pill, matching cockpit\'s existing lane-status pill shape, not the baseline Chip\'s default radius.',
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
      sourceFiles(path.resolve('src')),
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

describe('off-palette colour reporting', () => {
  it('flags an unknown hex literal and accepts a baseline palette value', () => {
    const result = reportOffPaletteColours([
      { path: 'Unknown.jsx', source: "const sx = { bgcolor: '#123456' };" },
      { path: 'Baseline.jsx', source: "const sx = { bgcolor: '#F4F5F6' };" },
      { path: 'Token.jsx', source: "const sx = { bgcolor: 'background.subtle' };" },
    ]);

    expect(result.findings).toEqual([{
      surface: 'Unknown.jsx:1.colour',
      reason: expect.stringMatching(/#123456.*baseline palette/i),
    }]);
  });

  it('flags a named CSS colour used by sx', () => {
    const result = reportOffPaletteColours([{
      path: 'Named.jsx',
      source: "const sx = { bgcolor: 'white' };",
    }]);

    expect(result.findings).toEqual([{
      surface: 'Named.jsx:1.colour',
      reason: expect.stringMatching(/named CSS colour.*white.*baseline palette/i),
    }]);
  });

  it('flags rgba literals and named Canvas fill colours', () => {
    const result = reportOffPaletteColours([
      {
        path: 'Border.jsx',
        source: "const sx = { border: '1px solid rgba(0,0,0,0.2)' };",
      },
      {
        path: 'exportChart.js',
        source: "context.fillStyle = 'white';",
      },
      {
        path: 'NamedBorder.jsx',
        source: "const sx = { border: '1px solid white', boxShadow: '0 0 1px black' };",
      },
    ]);

    expect(result.findings).toEqual([
      {
        surface: 'Border.jsx:1.colour',
        reason: expect.stringMatching(/rgba\(0,0,0,0\.2\).*baseline palette/i),
      },
      {
        surface: 'exportChart.js:1.colour',
        reason: expect.stringMatching(/named CSS colour.*white.*baseline palette/i),
      },
      {
        surface: 'NamedBorder.jsx:1.colour',
        reason: expect.stringMatching(/named CSS colour.*white.*baseline palette/i),
      },
      {
        surface: 'NamedBorder.jsx:1.colour',
        reason: expect.stringMatching(/named CSS colour.*black.*baseline palette/i),
      },
    ]);
  });

  it('excludes only QrSignupManager print-document HTML', () => {
    const result = reportOffPaletteColours([{
      path: 'src/components/QrSignupManager.jsx',
      source: [
        "const panel = { bgcolor: '#123456' };",
        'printWindow.document.write(`',
        '  <style>body { background: #654321; }</style>',
        '`);',
      ].join('\n'),
    }]);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toEqual({
      surface: 'src/components/QrSignupManager.jsx:1.colour',
      reason: expect.stringMatching(/#123456/),
    });
  });

  it('derives its allowlist from the supplied palette', () => {
    const source = [{ path: 'NewToken.jsx', source: "const sx = { bgcolor: '#123456' };" }];
    const extendedPalette = {
      ...BASELINE_PALETTE,
      fixture: { main: '#123456' },
    };

    expect(reportOffPaletteColours(source).findings).toHaveLength(1);
    expect(reportOffPaletteColours(source, { palette: extendedPalette }).findings).toEqual([]);
  });

  it('reports MUI numeric ramps separately without treating token paths as literals', () => {
    const result = reportOffPaletteColours([{
      path: 'Ramp.jsx',
      source: "const sx = { bgcolor: 'grey.50', borderColor: 'divider', color: 'success.bg', transition: 'release.50' };",
    }]);

    expect(result.findings).toEqual([{
      surface: 'Ramp.jsx:1.colour',
      reason: expect.stringMatching(/^Report only:.*grey\.50.*untouched numeric palette ramp/i),
    }]);
  });

  it('ignores comment issue numbers and theme implementation sources', () => {
    const result = reportOffPaletteColours([
      {
        path: 'src/components/charts/chartLabels.js',
        source: '// MUI issues mui-x#18768 and #18399',
      },
      {
        path: 'src/theme/createAppTheme.js',
        source: "const contrastSurface = '#123456';",
      },
    ]);

    expect(result.findings).toEqual([]);
  });

  it('keeps current kit source free of hard off-palette findings', () => {
    const result = reportOffPaletteColours(sourceFiles(path.resolve('src')));
    const hardFindings = result.findings.filter(
      ({ reason }) => !reason.startsWith('Report only:'),
    );

    expect(hardFindings).toEqual([]);
    expect(result.findings.some(({ reason }) => reason.includes('grey.50'))).toBe(true);
  });
});

describe('redundant app-side theme values', () => {
  const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

  it('flags an sx value that already equals the theme, naming the file, line, component and property', () => {
    const result = reportRedundantThemeValues(
      [{
        path: 'src/components/Example.jsx',
        source: "export function Example() {\n  return <Paper sx={{ borderColor: 'divider' }} />;\n}",
      }],
      { theme },
    );

    expect(result.findings).toEqual([{
      surface: 'src/components/Example.jsx:2.MuiPaper.borderColor',
      reason: expect.stringMatching(/MuiPaper.*borderColor.*theme already resolves/),
    }]);
  });

  it('does not flag a genuinely different value', () => {
    const result = reportRedundantThemeValues(
      [{
        path: 'src/components/Example.jsx',
        source: "<Paper sx={{ borderColor: 'error.main' }} />",
      }],
      { theme },
    );

    expect(result.findings).toEqual([]);
  });

  it('does not flag a component tag outside the attribution list at all', () => {
    const result = reportRedundantThemeValues(
      [{
        path: 'src/components/Example.jsx',
        source: "<Box sx={{ borderColor: 'divider' }} />",
      }],
      { theme },
    );

    expect(result.findings).toEqual([]);
  });

  it('does not flag a property the theme does not style on an attributable component', () => {
    // MuiTextField's baseline styleOverrides.root has no borderColor, so this
    // must fall through the themeValue === undefined branch, not match.
    const result = reportRedundantThemeValues(
      [{
        path: 'src/components/Example.jsx',
        source: "<TextField sx={{ borderColor: 'divider' }} />",
      }],
      { theme },
    );

    expect(result.findings).toEqual([]);
  });

  it('skips a numeric borderRadius rather than false-positive on MUI\'s theme-scale multiplier', () => {
    // sx={{ borderRadius: 8 }} on a Card actually renders as
    // theme.shape.borderRadius * 8, not the raw baseline styleOverride value
    // -- comparing the two numbers directly would be a false positive.
    const result = reportRedundantThemeValues(
      [{
        path: 'src/components/Example.jsx',
        source: `<Card sx={{ borderRadius: ${theme.components.MuiCard.styleOverrides.root.borderRadius} }} />`,
      }],
      { theme },
    );

    expect(result.findings).toEqual([]);
  });

  it('matches the finding shape of its sibling checks', () => {
    const result = reportRedundantThemeValues(
      [{ path: 'a.jsx', source: "<Paper sx={{ borderColor: 'divider' }} />" }],
      { theme },
    );

    expect(result).toEqual({ findings: expect.any(Array) });
    expect(result.findings[0]).toEqual({ surface: expect.any(String), reason: expect.any(String) });
  });

  it('returns no findings and requires a theme', () => {
    expect(reportRedundantThemeValues([{ path: 'a.jsx', source: "<Paper sx={{ borderColor: 'divider' }} />" }]))
      .toEqual({ findings: [] });
  });
});
