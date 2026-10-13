// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('react-i18next', () => {
  const KEYS = {
    'Account.TITLE': 'Account & Administration',
    'Account.PAGE_TITLE': 'Account',
    'Account.TAB_PROFILE': 'Profile',
    'Account.TAB_SECURITY': 'Security',
    'Account.GROUP_MY_ACCOUNT': 'My account',
    'Profile.ACCEPT_PRIVACY_LABEL': 'Accept privacy statement',
    'Profile.ACCEPT_COOKIES_LABEL': 'Accept convenience cookies',
    'Profile.PRIVACY_STATEMENT_TITLE': 'Privacy statement',
    'Profile.COOKIES_STATEMENT_TITLE': 'Cookie statement',
    'Profile.SAVE_BUTTON': 'Save',
    'Profile.PRIVACY_SECTION_TITLE': 'Privacy and cookies',
    'Profile.USERNAME_LABEL': 'Username',
    'Profile.EMAIL_LABEL': 'Email',
    'Profile.FIRST_NAME_LABEL': 'First name',
    'Profile.LAST_NAME_LABEL': 'Last name',
  };
  const t = (key, fallback) => KEYS[key] ?? fallback ?? key;
  return {
    useTranslation: () => ({
      t,
      i18n: { exists: (key) => Object.hasOwn(KEYS, key), t },
    }),
  };
});

vi.mock('../src/auth/authApi', () => ({
  fetchAuthPolicy: vi.fn(),
  fetchPrivacyStatement: vi.fn(),
  fetchCookieStatement: vi.fn(),
  updateUserProfile: vi.fn(),
}));

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

import { AuthContext } from '../src/auth/AuthContext';
import {
  fetchCookieStatement,
  fetchPrivacyStatement,
  updateUserProfile,
} from '../src/auth/authApi';
import { AccountPage } from '../src/pages/AccountPage';

const theme = createTheme();
const user = {
  email: 'person@example.com',
  username: 'person',
  first_name: 'Pat',
  last_name: 'Example',
  accepted_privacy_statement: false,
  accepted_convenience_cookies: true,
  is_superuser: false,
  ui_permissions: {},
  available_roles: [],
};

function setViewportWidth(width) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('max-width') ? width <= 900 : width > 900,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderAccount({ showProfileStatements } = {}) {
  const login = vi.fn();
  return {
    login,
    ...render(
      <ThemeProvider theme={theme}>
        <AuthContext.Provider value={{ user, login, loading: false }}>
          <MemoryRouter initialEntries={['/account']}>
            <Routes>
              <Route
                path="/account"
                element={<AccountPage showProfileStatements={showProfileStatements} />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>,
    ),
  };
}

describe('AccountPage profile statements', () => {
  beforeEach(() => {
    setViewportWidth(1280);
    vi.mocked(fetchPrivacyStatement).mockResolvedValue('Privacy text');
    vi.mocked(fetchCookieStatement).mockResolvedValue('Cookie text');
    vi.mocked(updateUserProfile).mockResolvedValue({ ...user, accepted_privacy_statement: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('fetches and presents both statement panels when the prop is omitted', async () => {
    renderAccount();

    expect(await screen.findByText('Privacy statement')).toBeTruthy();
    expect(screen.getByText('Cookie statement')).toBeTruthy();
    await waitFor(() => {
      expect(fetchPrivacyStatement).toHaveBeenCalledOnce();
      expect(fetchCookieStatement).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText('Privacy text')).toBeTruthy();
    expect(screen.getByText('Cookie text')).toBeTruthy();
  });

  it('hides statements and skips requests while retaining editable consent submission', async () => {
    const { login } = renderAccount({ showProfileStatements: false });

    expect(screen.queryByText('Privacy statement')).toBeNull();
    expect(screen.queryByText('Cookie statement')).toBeNull();
    expect(fetchPrivacyStatement).not.toHaveBeenCalled();
    expect(fetchCookieStatement).not.toHaveBeenCalled();

    const privacyConsent = screen.getByRole('checkbox', { name: 'Accept privacy statement' });
    const cookieConsent = screen.getByRole('checkbox', { name: 'Accept convenience cookies' });
    expect(privacyConsent.checked).toBe(false);
    expect(cookieConsent.checked).toBe(true);
    fireEvent.click(privacyConsent);
    fireEvent.click(cookieConsent);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith({
        first_name: 'Pat',
        last_name: 'Example',
        accepted_privacy_statement: true,
        accepted_convenience_cookies: false,
      });
    });
    expect(login).toHaveBeenCalledOnce();
  });
});
