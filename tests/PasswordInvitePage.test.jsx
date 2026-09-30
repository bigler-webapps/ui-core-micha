// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const authApi = vi.hoisted(() => ({
  verifyResetToken: vi.fn(),
  setNewPassword: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);
vi.mock('react-helmet', () => ({ Helmet: ({ children }) => <>{children}</> }));
vi.mock('react-i18next', () => {
  const KEYS = {
    'Auth.PAGE_INVITE_TITLE': 'Set password',
    'Auth.PAGE_INVITE_SUBTITLE': 'Choose a password.',
    'Auth.PAGE_RESET_PASSWORD_TITLE': 'Reset password',
    'Auth.PAGE_RESET_PASSWORD_SUBTITLE': 'Choose a new password.',
    'Auth.PAGE_CHECKING_LINK_TITLE': 'Checking link',
    'Auth.PAGE_CHECKING_LINK_TEXT': 'Checking…',
    'Auth.RESET_LINK_INVALID': 'The link is invalid or expired.',
    'Auth.RESET_PASSWORD_SUCCESS_INVITE': 'Password set successfully.',
    'Auth.RESET_PASSWORD_SUCCESS_RESET': 'Password changed successfully.',
    'Auth.SIGNUP_GO_TO_LOGIN': 'Go to login',
    'Auth.NEW_PASSWORD_LABEL': 'New password',
    'Auth.PASSWORD_CONFIRM_LABEL': 'Confirm password',
    'Auth.PASSWORD_RULES_HINT': 'Password rules',
    'Auth.PASSWORD_SET_BUTTON': 'Set password',
    'Auth.PASSWORD_SET_BUTTON_LOADING': 'Setting password…',
  };
  const t = (key, fallback) => KEYS[key] ?? (typeof fallback === 'string' ? fallback : key);
  return {
    useTranslation: () => ({
      t,
      // resolveErrorText (AUTH-10) reads i18n.exists/i18n.t off the object
      // useTranslation() returns — this mock must carry both, not just `t`.
      i18n: { exists: (key) => Object.hasOwn(KEYS, key), t },
    }),
  };
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="pathname">{location.pathname}</output>;
}

function renderPage(route = '/invite/uid/token') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <Routes>
        <Route path="/invite/:uid/:token" element={<PasswordInvitePage />} />
        <Route path="/reset/:uid/:token" element={<PasswordInvitePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

import { PasswordInvitePage } from '../src/pages/PasswordInvitePage';

describe('PasswordInvitePage auth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.verifyResetToken.mockResolvedValue({});
  });

  afterEach(() => cleanup());

  it('keeps the form and shows the server password reason so the person can retry', async () => {
    authApi.setNewPassword
      .mockRejectedValueOnce({
        response: {
          data: {
            code: 'Auth.RESET_PASSWORD_INVALID',
            messages: ['This password is too common.'],
          },
        },
      })
      .mockResolvedValueOnce({});

    renderPage();
    await waitFor(() => expect(screen.getByLabelText('New password')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));

    await waitFor(() => expect(screen.getByText('This password is too common.')).toBeTruthy());
    expect(screen.getByLabelText('New password')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    await waitFor(() => expect(screen.getByText('Password set successfully.')).toBeTruthy());
    expect(authApi.setNewPassword).toHaveBeenCalledTimes(2);
  });

  it('shows the invalid-link state, not a retryable form, when the link expires during submit', async () => {
    // The initial verifyResetToken check can pass and the token can still
    // expire before setNewPassword is called (a real race, not hypothetical)
    // -- told apart by the server's CODE, not by treating every submit
    // error as a password rejection.
    authApi.setNewPassword.mockRejectedValueOnce({ code: 'Auth.RESET_LINK_INVALID' });

    renderPage();
    await waitFor(() => expect(screen.getByLabelText('New password')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));

    await waitFor(() => expect(screen.getByText('The link is invalid or expired.')).toBeTruthy());
    expect(screen.queryByLabelText('New password')).toBeNull();
  });

  it('shows the invalid-link state without a password form when token verification fails', async () => {
    authApi.verifyResetToken.mockRejectedValue({ code: 'Auth.RESET_LINK_INVALID' });

    renderPage();

    await waitFor(() => expect(screen.getByText('The link is invalid or expired.')).toBeTruthy());
    expect(screen.queryByLabelText('New password')).toBeNull();
    expect(screen.queryByLabelText('Confirm password')).toBeNull();
  });

  it('shows confirmation and waits for an explicit login action after success', async () => {
    authApi.setNewPassword.mockResolvedValue({});

    renderPage('/reset/uid/token?next=/account');
    await waitFor(() => expect(screen.getByLabelText('New password')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));

    await waitFor(() => expect(screen.getByText('Password changed successfully.')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Go to login' })).toBeTruthy();
    expect(screen.getByTestId('pathname').textContent).toBe('/reset/uid/token');

    fireEvent.click(screen.getByRole('button', { name: 'Go to login' }));
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/login'));
  });
});
