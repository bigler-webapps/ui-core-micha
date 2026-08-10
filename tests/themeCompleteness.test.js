import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import {
  assertThemeComplete,
  calculateContrastRatio,
  createAppTheme,
} from '../src/index';

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
    expect(baseline.findings).toEqual([]);
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
});
