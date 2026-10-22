// @vitest-environment jsdom
// The pages keep their behaviour after the shared content extraction (UCM-AUTH-14).
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  loginWithPassword: vi.fn(),
  confirmRegistration: vi.fn(),
  submitRegistrationRequest: vi.fn(),
  startSocialLogin: vi.fn(),
  navigate: vi.fn(),
  location: { search: '', hash: '' },
}));

vi.mock('../src/auth/authApi', () => ({
  fetchRecoverySessionToken: vi.fn(),
  loginWithPassword: mocks.loginWithPassword,
  loginWithRecoveryPassword: vi.fn(),
  confirmRegistration: mocks.confirmRegistration,
  submitRegistrationRequest: mocks.submitRegistrationRequest,
}));
vi.mock('../src/utils/authService', () => ({
  loginWithPasskey: vi.fn(),
  startSocialLogin: mocks.startSocialLogin,
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.location,
}));
vi.mock('react-i18next', () => {
  const t = (key, fallback) => (typeof fallback === 'string' ? fallback : key);
  return { useTranslation: () => ({ t, i18n: { exists: () => false, t } }) };
});
vi.mock('../src/components/LoginForm', () => ({
  LoginForm: (props) => (
    <div>
      <button type="button" onClick={() => props.onSubmit({ identifier: 'a@example.test', password: 'secret' })}>
        submit-login
      </button>
      {props.onSocialLogin && <button type="button" onClick={() => props.onSocialLogin('google')}>provider-google</button>}
      {props.onSignUp && <button type="button" onClick={props.onSignUp}>sign-up</button>}
    </div>
  ),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { LoginPage } from '../src/pages/LoginPage';
import { SignUpPage } from '../src/pages/SignUpPage';
import { SignupConfirmPage } from '../src/pages/SignupConfirmPage';

const AUTH_METHODS = {
  password_login: true,
  social_login: true,
  social_providers: ['google'],
  signup_modes: ['self_signup_open'],
};

function withAuth(node, value = {}) {
  return (
    <AuthContext.Provider value={{ user: null, loading: false, login: vi.fn(), authMethods: AUTH_METHODS, ...value }}>
      {node}
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.location.search = '';
  mocks.location.hash = '';
  mocks.loginWithPassword.mockResolvedValue({ user: { id: 1 }, needsMfa: false });
});

afterEach(() => cleanup());

describe('LoginPage', () => {
  it.each([
    ['', '/'],
    ['?next=%2Fprojects%3Fview%3Dlist', '/projects?view=list'],
    ['?next=https%3A%2F%2Fevil.test%2F', '/'],
    ['?next=%2F%2Fevil.test', '/'],
    ['?next=%2F%5Cevil.test', '/'],
  ])('navigates to the validated next target for %j', async (search, expected) => {
    mocks.location.search = search;
    render(withAuth(<LoginPage />));
    fireEvent.click(screen.getByText('submit-login'));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(expected));
  });

  it('sends a user who needs additional security to the security page before next', async () => {
    mocks.location.search = '?next=%2Fprojects';
    mocks.loginWithPassword.mockResolvedValueOnce({
      user: { id: 2, security_state: { requires_additional_security: true } },
      needsMfa: false,
    });
    render(withAuth(<LoginPage />));
    fireEvent.click(screen.getByText('submit-login'));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/account?tab=security&from=weak_login'));
  });

  it('keeps the page title, its sign-up route and its provider call without a callback URL', () => {
    render(withAuth(<LoginPage />));
    expect(document.querySelector('title').textContent).toContain('Auth.PAGE_LOGIN_TITLE');
    fireEvent.click(screen.getByText('sign-up'));
    expect(mocks.navigate).toHaveBeenCalledWith('/signup');
    fireEvent.click(screen.getByText('provider-google'));
    expect(mocks.startSocialLogin).toHaveBeenCalledWith('google');
  });

  it('redirects an already signed-in user with replace', async () => {
    mocks.location.search = '?next=%2Fprojects';
    render(withAuth(<LoginPage />, { user: { id: 3 } }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/projects', { replace: true }));
  });
});

describe('SignupConfirmPage', () => {
  it('confirms with the URL token and sends the person to the separate login with replace', async () => {
    mocks.location.search = '?token=confirm-token';
    mocks.confirmRegistration.mockResolvedValue({});
    render(<SignupConfirmPage />);

    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: 'StrongPass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/login', { replace: true }));
    expect(mocks.confirmRegistration).toHaveBeenCalledWith({ token: 'confirm-token', password: 'StrongPass123' });
  });

  it('offers a new invitation and the login without a token', () => {
    render(<SignupConfirmPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Request a new invitation' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/signup');
    fireEvent.click(screen.getByRole('button', { name: 'Go to login' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
  });
});

describe('SignUpPage', () => {
  it('keeps the success message on the page and the login link', async () => {
    mocks.submitRegistrationRequest.mockResolvedValue({ code: 'Auth.INVITE_SENT' });
    render(withAuth(<SignUpPage />));

    fireEvent.change(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ }), { target: { value: 'a@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT_OPEN' }));

    await waitFor(() => expect(screen.getByText('Auth.INVITE_SENT')).toBeTruthy());
    expect(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ })).toBeTruthy();
    expect(screen.queryByText('Auth.CONFIRMATION_EMAIL_INSTRUCTION')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_GO_TO_LOGIN' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
  });

  it('passes the QR token from the URL into the registration request', async () => {
    mocks.location.search = '?rt=qr-token';
    mocks.submitRegistrationRequest.mockResolvedValue({ code: 'Auth.INVITE_SENT' });
    render(withAuth(<SignUpPage />, { authMethods: { signup_modes: ['self_signup_qr'] } }));

    fireEvent.change(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ }), { target: { value: 'a@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT' }));

    await waitFor(() => expect(mocks.submitRegistrationRequest).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'self_signup_qr', registrationContextToken: 'qr-token' }),
    ));
  });
});
