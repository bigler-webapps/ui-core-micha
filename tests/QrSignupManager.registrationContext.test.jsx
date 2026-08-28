// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  createSignupQr: vi.fn().mockResolvedValue({
    signup_url: 'https://example.test/signup?rt=token',
    expires_at: '2026-09-01T12:00:00Z',
  }),
}));

vi.mock('../src/auth/authApi', () => ({
  createSignupQr: mockState.createSignupQr,
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => null,
}));

// A stable `t` reference matters here: it's an effect dependency in QrSignupManager, and
// the real react-i18next memoizes it across renders. A fresh function per render (a common
// shorthand mock elsewhere in this repo) would make that effect re-fire on every unrelated
// re-render (e.g. the setBusy(true) inside it), which is a mock artifact this test file must
// not reintroduce given it asserts exact createSignupQr call counts.
const stableT = (_key, fallback) => fallback;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: stableT }),
}));

import { QrSignupManager } from '../src/components/QrSignupManager';

describe('QrSignupManager registration context', () => {
  afterEach(() => {
    cleanup();
  });

  it('passes the department context and practical redemption default to the API', async () => {
    mockState.createSignupQr.mockClear();

    render(
      <QrSignupManager
        enabled
        expiryDays={365}
        registrationContext={{ group_ref: '42' }}
        defaultMaxRedemptions={5000}
      />,
    );

    await waitFor(() => expect(mockState.createSignupQr).toHaveBeenCalledWith({
      expires_minutes: 365 * 24 * 60,
      max_redemptions: 5000,
      registration_context: { group_ref: '42' },
    }));
  });

  it('behaves exactly as before when the new props are omitted (existing AccountPage-style call)', async () => {
    mockState.createSignupQr.mockClear();

    render(<QrSignupManager enabled expiryDays={90} />);

    await waitFor(() => expect(mockState.createSignupQr).toHaveBeenCalledWith({
      expires_minutes: 90 * 24 * 60,
      max_redemptions: 1,
    }));
    expect(mockState.createSignupQr).toHaveBeenCalledTimes(1);
  });

  it('fires exactly one create call when the context changes after a custom redemption count was set', async () => {
    mockState.createSignupQr.mockClear();

    const { rerender } = render(
      <QrSignupManager
        enabled
        expiryDays={90}
        registrationContext={{ group_ref: '1' }}
        defaultMaxRedemptions={5000}
      />,
    );
    await waitFor(() => expect(mockState.createSignupQr).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Max redemptions'), { target: { value: '250' } });

    mockState.createSignupQr.mockClear();
    rerender(
      <QrSignupManager
        enabled
        expiryDays={90}
        registrationContext={{ group_ref: '2' }}
        defaultMaxRedemptions={5000}
      />,
    );

    await waitFor(() => expect(mockState.createSignupQr).toHaveBeenCalledWith({
      expires_minutes: 90 * 24 * 60,
      max_redemptions: 5000,
      registration_context: { group_ref: '2' },
    }));
    expect(mockState.createSignupQr).toHaveBeenCalledTimes(1);
  });
});
