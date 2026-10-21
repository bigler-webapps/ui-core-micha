// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  confirmRegistration: vi.fn(),
  loginWithPassword: vi.fn(),
  loginWithRecoveryPassword: vi.fn(),
  fetchRecoverySessionToken: vi.fn(),
  loginWithPasskey: vi.fn(),
  startSocialLogin: vi.fn(),
  navigate: vi.fn(),
  location: { search: '', hash: '' },
}));

vi.mock('../src/auth/authApi', () => ({
  confirmRegistration: mocks.confirmRegistration,
  fetchRecoverySessionToken: mocks.fetchRecoverySessionToken,
  loginWithPassword: mocks.loginWithPassword,
  loginWithRecoveryPassword: mocks.loginWithRecoveryPassword,
}));
vi.mock('../src/utils/authService', () => ({
  loginWithPasskey: mocks.loginWithPasskey,
  startSocialLogin: mocks.startSocialLogin,
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.location,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params?.provider ? `${key}:${params.provider}` : key),
    i18n: { exists: () => false, t: (key) => key },
  }),
}));
vi.mock('../src/components/LoginForm', () => ({
  LoginForm: (props) => (
    <div>
      {props.onSubmit && (
        <button type="button" onClick={() => props.onSubmit({ identifier: 'a@example.test', password: 'secret' })}>
          submit-login
        </button>
      )}
      {props.onSocialLogin && (
        <button type="button" onClick={() => props.onSocialLogin('google')}>provider-google</button>
      )}
      {props.onSignUp && <button type="button" onClick={props.onSignUp}>sign-up</button>}
    </div>
  ),
}));
vi.mock('../src/components/MfaLoginComponent', () => ({
  MfaLoginComponent: ({ onSuccess }) => (
    <button type="button" onClick={() => onSuccess({ user: { id: 8 }, method: 'totp' })}>complete-mfa</button>
  ),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { LoginContent } from '../src/components/LoginContent';
import { SignupConfirmContent } from '../src/components/SignupConfirmContent';

const AUTH_METHODS = { password_login: true, social_login: true, social_providers: ['google'], signup_modes: ['self_signup_open'] };

function renderLogin({ continuation = '/setup?step=profile', user = null, onSuccess = vi.fn(), ...props } = {}) {
  const login = vi.fn();
  const view = render(
    <AuthContext.Provider value={{ user, loading: false, login, authMethods: AUTH_METHODS }}>
      <LoginContent continuation={continuation} onSuccess={onSuccess} {...props} />
    </AuthContext.Provider>,
  );
  return { ...view, login, onSuccess };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.location.search = '';
  mocks.location.hash = '';
  mocks.loginWithPassword.mockResolvedValue({ user: { id: 2 }, needsMfa: false });
  mocks.startSocialLogin.mockResolvedValue(undefined);
});

afterEach(() => cleanup());

describe('LoginContent continuation', () => {
  it.each([
    ['/setup?step=profile#top', '/setup?step=profile#top'],
    ['https://outside.test/path', '/'],
    ['//outside.test', '/'],
    ['/\\outside.test', '/'],
    ['/\t/outside.test', '/'],
    ['setup', '/'],
  ])('reports the target for continuation %j as %j after a password sign-in', async (continuation, expected) => {
    const { onSuccess, login } = renderLogin({ continuation });
    fireEvent.click(screen.getByText('submit-login'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ user: { id: 2 }, target: expected }));
    expect(login).toHaveBeenCalledWith({ id: 2 });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('navigates to the security page itself when additional security is required', async () => {
    const securityUser = { id: 4, security_state: { requires_additional_security: true } };
    mocks.loginWithPassword.mockResolvedValueOnce({ user: securityUser, needsMfa: false });
    const { onSuccess } = renderLogin();

    fireEvent.click(screen.getByText('submit-login'));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/account?tab=security&from=weak_login'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('keeps the MFA step inline and continues only after it', async () => {
    mocks.loginWithPassword.mockResolvedValueOnce({ needsMfa: true, availableTypes: ['totp'] });
    const { onSuccess } = renderLogin();

    fireEvent.click(screen.getByText('submit-login'));
    await waitFor(() => expect(screen.getByText('complete-mfa')).toBeTruthy());
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('complete-mfa'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ user: { id: 8 }, target: '/setup?step=profile' }));
  });

  it('passes the validated continuation as the provider callback and falls back to the default without one', async () => {
    renderLogin({ continuation: '/setup' });
    fireEvent.click(screen.getByText('provider-google'));
    await waitFor(() => expect(mocks.startSocialLogin).toHaveBeenCalledWith('google', { callbackUrl: '/setup' }));
    expect(screen.getByText('Auth.PROVIDER_TRANSITION:Google')).toBeTruthy();
    cleanup();

    renderLogin({ continuation: 'https://outside.test/' });
    fireEvent.click(screen.getByText('provider-google'));
    await waitFor(() => expect(mocks.startSocialLogin).toHaveBeenLastCalledWith('google', {}));
  });

  it('shows a provider cancellation from the callback and offers the providers again', async () => {
    mocks.location.search = '?error=access_denied';
    const { onSuccess } = renderLogin();

    await waitFor(() => expect(screen.getByText('Auth.SOCIAL_LOGIN_FAILED')).toBeTruthy());
    expect(onSuccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('provider-google'));
    await waitFor(() => expect(mocks.startSocialLogin).toHaveBeenCalledTimes(1));
  });

  it('shows a failed provider start and returns to the choice', async () => {
    mocks.startSocialLogin.mockRejectedValueOnce(new Error('csrf'));
    renderLogin();
    fireEvent.click(screen.getByText('provider-google'));
    await waitFor(() => expect(screen.getByText('Auth.SOCIAL_LOGIN_FAILED')).toBeTruthy());
    expect(screen.queryByText('Auth.PROVIDER_TRANSITION:Google')).toBeNull();
  });

  it('reports a person who arrives signed in once, through the same precedence', async () => {
    const user = { id: 9 };
    const { onSuccess, login, rerender } = renderLogin({ continuation: '//evil.test', user });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ user, target: '/' }));
    expect(login).not.toHaveBeenCalled();

    rerender(
      <AuthContext.Provider value={{ user: { id: 9, first_name: 'Refreshed' }, loading: false, login, authMethods: AUTH_METHODS }}>
        <LoginContent continuation="//evil.test" onSuccess={onSuccess} />
      </AuthContext.Provider>,
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('sends a signed-in arrival that needs additional security to the security page', async () => {
    const user = { id: 11, security_state: { requires_additional_security: true } };
    const { onSuccess } = renderLogin({ user });
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/account?tab=security&from=weak_login', { replace: true }));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('keeps the host continuation across email confirmation and the separate login', async () => {
    // The emailed link carries no continuation; the host route that renders the
    // confirmation supplies it to the login that follows.
    mocks.confirmRegistration.mockResolvedValue({});
    function SetupAccountStep({ onSuccess }) {
      const [confirmed, setConfirmed] = React.useState(false);
      return confirmed
        ? <LoginContent continuation="/setup" onSuccess={onSuccess} />
        : <SignupConfirmContent token="emailed-token" onSuccess={() => setConfirmed(true)} />;
    }
    const onSuccess = vi.fn();
    const login = vi.fn();
    render(
      <AuthContext.Provider value={{ user: null, loading: false, login, authMethods: AUTH_METHODS }}>
        <SetupAccountStep onSuccess={onSuccess} />
      </AuthContext.Provider>,
    );

    fireEvent.change(screen.getByLabelText(/Auth.NEW_PASSWORD_LABEL/), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByLabelText(/Auth.PASSWORD_CONFIRM_LABEL/), { target: { value: 'StrongPass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_CONFIRM_SUBMIT' }));
    await waitFor(() => expect(screen.getByText('submit-login')).toBeTruthy());
    expect(login).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('submit-login'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ user: { id: 2 }, target: '/setup' }));
  });

  it('ignores the recovery sentinel and offers sign-up only with a host handler', async () => {
    mocks.location.hash = '#recovery=ok';
    renderLogin();
    expect(mocks.fetchRecoverySessionToken).not.toHaveBeenCalled();
    expect(screen.queryByText('sign-up')).toBeNull();
    cleanup();

    const onSignUp = vi.fn();
    renderLogin({ onSignUp });
    fireEvent.click(screen.getByText('sign-up'));
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });
});
