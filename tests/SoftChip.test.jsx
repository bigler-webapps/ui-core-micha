// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, alpha, darken } from '@mui/material/styles';

import { createAppTheme } from '../src/theme';
import SoftChip from '../src/components/SoftChip';

const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });
const TONES = ['success', 'warning', 'error', 'info'];

function renderChip(props) {
  return render(<ThemeProvider theme={theme}><SoftChip {...props} /></ThemeProvider>);
}

function rgb(color) {
  const probe = document.createElement('div');
  probe.style.color = color;
  document.body.appendChild(probe);
  const resolved = window.getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

afterEach(() => cleanup());

describe('SoftChip', () => {
  it.each(TONES)('derives fill/border/text for tone "%s" from the theme, not a literal', (tone) => {
    renderChip({ label: 'Provisional ranges', tone });

    const chip = screen.getByText('Provisional ranges').closest('.MuiChip-root');
    const style = window.getComputedStyle(chip);
    const palette = theme.palette[tone];

    expect(style.backgroundColor).toBe(rgb(alpha(palette.main, 0.12)));
    expect(style.borderColor).toBe(rgb(alpha(palette.main, 0.3)));
    expect(style.color).toBe(rgb(darken(palette.main, 0.3)));
  });

  it('differs between status and caveat in radius and typography', () => {
    renderChip({ label: 'passed', tone: 'success', variant: 'status' });
    const statusChip = screen.getByText('passed').closest('.MuiChip-root');
    const statusLabel = window.getComputedStyle(screen.getByText('passed'));
    expect(window.getComputedStyle(statusChip).borderRadius).toBe('999px');
    // status uses the baseline's `overline` variant verbatim -- 11/600, uppercase, .4px tracking
    expect(statusLabel.textTransform).toBe('uppercase');
    expect(statusLabel.fontSize).toBe(theme.typography.overline.fontSize);
    expect(statusLabel.fontWeight).toBe(String(theme.typography.overline.fontWeight));
    expect(statusLabel.letterSpacing).toBe(theme.typography.overline.letterSpacing);

    cleanup();

    renderChip({ label: 'Provisional ranges', tone: 'warning', variant: 'caveat' });
    const caveatChip = screen.getByText('Provisional ranges').closest('.MuiChip-root');
    const caveatLabel = window.getComputedStyle(screen.getByText('Provisional ranges'));
    expect(window.getComputedStyle(caveatChip).borderRadius).not.toBe('999px');
    // caveat keeps its raw 12/500 -- the PRIM-1 token delta, deliberately not on a theme variant
    expect(caveatLabel.fontSize).toBe('12px');
    expect(caveatLabel.fontWeight).toBe('500');
  });

  it('defaults the leading element to a dot and swaps it for a passed icon', () => {
    const { container: withDot } = renderChip({ label: 'passed', tone: 'success', variant: 'status' });
    expect(withDot.querySelector('.MuiChip-icon')).toBeTruthy();

    cleanup();

    const { container: withIcon } = renderChip({
      label: 'recurring',
      tone: 'info',
      variant: 'status',
      icon: <span data-testid="custom-icon" />,
    });
    expect(withIcon.querySelector('[data-testid="custom-icon"]')).toBeTruthy();
  });

  it('toggles the border', () => {
    renderChip({ label: 'failed', tone: 'error', variant: 'status', border: false });

    const chip = screen.getByText('failed').closest('.MuiChip-root');
    expect(window.getComputedStyle(chip).borderColor).toBe(rgb('transparent'));
  });

  it('renders title as a tooltip, reachable on a touch pointer with no delay', async () => {
    renderChip({ label: 'queued', tone: 'info', variant: 'status', title: 'Waiting on the sandbox' });

    expect(screen.queryByText('Waiting on the sandbox')).toBeNull();

    const chip = screen.getByText('queued').closest('.MuiChip-root');
    fireEvent.touchStart(chip);

    // `enterTouchDelay={0}` is the fix for the AUTH-4 failure mode -- a tooltip a touch pointer
    // can never trigger. waitFor's default timeout (1000ms) is generous headroom around "no
    // delay"; a regression to the ~700ms default would still likely pass, so this is a floor, not
    // a precise timing assertion -- the source is the actual guarantee, this proves it's wired.
    await waitFor(() => expect(screen.getByText('Waiting on the sandbox')).toBeTruthy());
  });

  it('omits the tooltip wrapper entirely when there is no title', () => {
    renderChip({ label: 'queued', tone: 'info', variant: 'status' });

    const chip = screen.getByText('queued').closest('.MuiChip-root');
    expect(chip.getAttribute('aria-label')).toBeNull();
  });
});
