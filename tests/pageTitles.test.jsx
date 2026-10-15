// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../src/auth/AuthContext';
import { AccountPage } from '../src/pages/AccountPage';
import { LoginPage } from '../src/pages/LoginPage';
import { PasswordChangePage } from '../src/pages/PasswordChangePage';
import { PasswordInvitePage } from '../src/pages/PasswordInvitePage';
import { PasswordResetRequestPage } from '../src/pages/PasswordResetRequestPage';
import { SignUpPage } from '../src/pages/SignUpPage';
import { SignupConfirmPage } from '../src/pages/SignupConfirmPage';
import { ThemeProvider, createTheme } from '@mui/material/styles';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => ({
      'App.NAME': 'My App',
      'Account.PAGE_TITLE': 'Account',
      'Auth.PAGE_LOGIN_TITLE': 'Log in',
      'Auth.CHANGE_PASSWORD_BUTTON': 'Change password',
      'Auth.PAGE_INVITE_TITLE': 'Set password',
      'Auth.PAGE_RESET_PASSWORD_TITLE': 'Reset password',
      'Auth.LOGIN_SIGNUP_BUTTON': 'Sign up',
      'Auth.SIGNUP_CONFIRM_TITLE': 'Confirm registration',
    }[key] ?? fallback ?? key),
    i18n: { exists: () => false, t: (key) => key },
  }),
}));
vi.mock('../src/auth/authApi', () => new Proxy({}, { get: () => vi.fn(() => Promise.resolve({})) }));
vi.mock('../src/utils/authService', () => ({ loginWithPasskey: vi.fn(), startSocialLogin: vi.fn() }));
vi.mock('../src/layout/PageLayout', () => ({
  NarrowPage: ({ children }) => <>{children}</>,
  WidePage: ({ children }) => <>{children}</>,
}));
vi.mock('../src/components/LoginForm', () => ({ LoginForm: () => null }));
vi.mock('../src/components/MfaLoginComponent', () => ({ MfaLoginComponent: () => null }));
vi.mock('../src/components/PasswordChangeForm', () => ({ PasswordChangeForm: () => null }));
vi.mock('../src/components/PasswordResetRequestForm', () => ({ PasswordResetRequestForm: () => null }));
vi.mock('../src/components/PasswordSetForm', () => ({ PasswordSetForm: () => null }));
vi.mock('../src/components/TurnstileWidget', () => ({ TurnstileWidget: () => null }));
vi.mock('../src/components/ProfileComponent', () => ({ ProfileComponent: () => null }));
vi.mock('../src/components/SecurityComponent', () => ({ SecurityComponent: () => null }));
vi.mock('../src/components/UserListComponent', () => ({ UserListComponent: () => null }));
vi.mock('../src/components/UserInviteComponent', () => ({ UserInviteComponent: () => null }));
vi.mock('../src/components/AccessCodeManager', () => ({ AccessCodeManager: () => null }));
vi.mock('../src/components/AllowedEmailDomainsManager', () => ({ AllowedEmailDomainsManager: () => null }));
vi.mock('../src/components/RegistrationMethodsManager', () => ({ RegistrationMethodsManager: () => null }));
vi.mock('../src/components/AuthFactorRequirementCard', () => ({ AuthFactorRequirementCard: () => null }));
vi.mock('../src/components/AccessCodeSingleUseToggle', () => ({ AccessCodeSingleUseToggle: () => null }));
vi.mock('../src/components/QrSignupManager', () => ({ QrSignupManager: () => null }));
vi.mock('../src/components/QrSignupValidityManager', () => ({ QrSignupValidityManager: () => null }));
vi.mock('../src/components/SupportRecoveryRequestsTab', () => ({ SupportRecoveryRequestsTab: () => null }));
vi.mock('../src/components/BulkInviteCsvTab', () => ({ BulkInviteCsvTab: () => null }));
vi.mock('../src/layout/SectionNav', () => ({ SectionNav: ({ children }) => <>{children}</> }));

const authValue = {
  user: { email: 'ada@example.com', available_roles: [], ui_permissions: {} },
  loading: false,
  login: vi.fn(),
  authMethods: { signup: false, signup_modes: [] },
};
const theme = createTheme();
function renderPage(element, route = '/') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={authValue}>{element}</AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}
async function expectTitle(element, expected, route) {
  cleanup();
  renderPage(element, route);
  await waitFor(() => expect(document.querySelector('title')?.textContent).toBe(expected));
}

afterEach(cleanup);

describe('native page titles', () => {
  it.each([
    ['AccountPage', <AccountPage />, 'Account – ada@example.com', '/account'],
    ['LoginPage', <LoginPage />, 'My App – Log in', '/login'],
    ['PasswordChangePage', <PasswordChangePage />, 'My App – Change password', '/password/change'],
    ['PasswordInvitePage', <Routes><Route path="/invite/:uid/:token" element={<PasswordInvitePage />} /></Routes>, 'My App – Set password', '/invite/uid/token'],
    ['PasswordResetRequestPage', <PasswordResetRequestPage />, 'My App – Reset password', '/password/reset'],
    ['SignUpPage', <SignUpPage />, 'My App – Sign up', '/signup'],
    ['SignupConfirmPage', <SignupConfirmPage />, 'My App – Confirm registration', '/signup/confirm'],
  ])('renders the existing title for %s', async (_name, element, expected, route) => {
    await expectTitle(element, expected, route);
  });
});