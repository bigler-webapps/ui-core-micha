// @vitest-environment jsdom

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/authApi', () => ({
  createSignupQr: vi.fn().mockResolvedValue({
    signup_url: 'https://example.test/signup?rt=token',
    expires_at: '2026-09-01T12:00:00Z',
  }),
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => null,
}));

const stableT = (_key, fallback) => fallback;
const stableI18n = { exists: () => false, t: stableT };
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: stableT, i18n: stableI18n }),
}));

import { QrSignupManager } from '../src/components/QrSignupManager';
import { createAppTheme } from '../src/theme';

// jsdom serialises the resolved colour as rgb(), so compare against the theme's own value in that form.
function toRgb(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

describe('QrSignupManager info box', () => {
  afterEach(cleanup);

  it.each(['light', 'dark'])('paints background.subtle of the %s theme', async (mode) => {
    const theme = createAppTheme({ palette: { mode, primary: { main: '#468AB2' } } });
    render(
      <ThemeProvider theme={theme}>
        <QrSignupManager enabled expiryDays={90} />
      </ThemeProvider>,
    );

    const title = await screen.findByText('Signup Access');
    const box = title.parentElement;
    expect(getComputedStyle(box).backgroundColor).toBe(toRgb(theme.palette.background.subtle));
  });
});
