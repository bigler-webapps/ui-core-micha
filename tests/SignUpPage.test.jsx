// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authApi = vi.hoisted(() => ({
  submitRegistrationRequest: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
}));
vi.mock('react-helmet', () => ({ Helmet: ({ children }) => <>{children}</> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, fallback) => (typeof fallback === 'string' ? fallback : key) }),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { SignUpPage } from '../src/pages/SignUpPage';

function renderSignUp({ signupModes, siteKey }) {
  return render(
    <AuthContext.Provider value={{ authMethods: {
      signup: true,
      signup_modes: signupModes,
      turnstile_site_key: siteKey,
    } }}>
      <SignUpPage />
    </AuthContext.Provider>,
  );
}

describe('SignUpPage Turnstile integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.submitRegistrationRequest.mockResolvedValue({});
    window.turnstile = {
      render: vi.fn(() => 'widget-id'),
      remove: vi.fn(),
      reset: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    delete window.turnstile;
  });

  it('renders only for open and email-domain signup modes when the site key is present', async () => {
    renderSignUp({
      signupModes: ['self_signup_open', 'self_signup_access_code', 'self_signup_email_domain'],
      siteKey: 'site-key',
    });

    await waitFor(() => expect(screen.getByTestId('turnstile-widget')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'self_signup_access_code' }));
    expect(screen.queryByTestId('turnstile-widget')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'self_signup_email_domain' }));
    await waitFor(() => expect(screen.getByTestId('turnstile-widget')).toBeTruthy());
  });

  it('gates submission until verified and passes the Turnstile token to the registration API', async () => {
    renderSignUp({ signupModes: ['self_signup_open'], siteKey: 'site-key' });

    await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole('textbox', { name: /Auth\.EMAIL_LABEL/ }), {
      target: { value: 'ada@example.com' },
    });

    const submit = screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT' });
    expect(submit.disabled).toBe(true);

    await act(async () => {
      window.turnstile.render.mock.calls[0][1].callback('turnstile-token');
    });

    await waitFor(() => expect(submit.disabled).toBe(false));
    fireEvent.click(submit);

    await waitFor(() => expect(authApi.submitRegistrationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        mode: 'self_signup_open',
        turnstileToken: 'turnstile-token',
      }),
    ));
  });

  it('resets the widget after a failed protected signup submission', async () => {
    authApi.submitRegistrationRequest.mockRejectedValue({ code: 'Auth.INVITE_FAILED' });
    renderSignUp({ signupModes: ['self_signup_open'], siteKey: 'site-key' });

    await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole('textbox', { name: /Auth\.EMAIL_LABEL/ }), {
      target: { value: 'ada@example.com' },
    });
    await act(async () => {
      window.turnstile.render.mock.calls[0][1].callback('turnstile-token');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT' }));

    await waitFor(() => expect(window.turnstile.reset).toHaveBeenCalledWith('widget-id'));
    expect(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT' }).disabled).toBe(true);
  });

  it('resets the widget and gates submission when its token expires', async () => {
    renderSignUp({ signupModes: ['self_signup_open'], siteKey: 'site-key' });

    await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledOnce());
    await act(async () => {
      window.turnstile.render.mock.calls[0][1].callback('turnstile-token');
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT' }).disabled).toBe(false));

    await act(async () => {
      window.turnstile.render.mock.calls[0][1]['expired-callback']();
    });

    expect(window.turnstile.reset).toHaveBeenCalledWith('widget-id');
    expect(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT' }).disabled).toBe(true);
  });

  it.each([
    ['self_signup_access_code', 'site-key'],
    ['self_signup_qr', 'site-key'],
    ['self_signup_open', ''],
  ])('does not render for %s without an eligible key/mode combination', async (mode, siteKey) => {
    renderSignUp({ signupModes: [mode], siteKey });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT' })).toBeTruthy());
    expect(screen.queryByTestId('turnstile-widget')).toBeNull();
    expect(window.turnstile.render).not.toHaveBeenCalled();
  });
});
