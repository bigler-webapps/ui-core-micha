// @vitest-environment jsdom
// UCM-PRIV-4: the REAL AccountPage drives the REAL ProfileComponent. Only the network boundaries and the heavy
// sibling tabs are replaced, so a prop that AccountPage forgets to forward cannot produce a false pass.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

const authApi = vi.hoisted(() => ({
  fetchAuthPolicy: vi.fn(() => new Promise(() => {})),
  updateUserProfile: vi.fn(),
  fetchPrivacyStatement: vi.fn(),
  fetchCookieStatement: vi.fn(),
}));

vi.mock('react-i18next', () => {
  const t = (key, fallback) => fallback ?? key;
  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'en', exists: () => false, t },
    }),
  };
});

vi.mock('../src/auth/authApi', async (importOriginal) => ({
  ...(await importOriginal()),
  ...authApi,
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
import { AccountPage } from '../src/pages/AccountPage';
import { PrivacyProvider } from '../src/privacy/PrivacyProvider';
import { makeChoices, makePrivacyManifest } from './privacyTestUtils';

const theme = createTheme();

function user(overrides = {}) {
  return {
    id: 1,
    username: 'ada',
    email: 'ada@example.test',
    first_name: 'Ada',
    last_name: 'Lovelace',
    is_superuser: false,
    ui_permissions: {},
    available_roles: [],
    accepted_privacy_statement: false,
    accepted_convenience_cookies: false,
    ...overrides,
  };
}

function readyApi() {
  const manifest = makePrivacyManifest();
  return {
    getManifest: vi.fn(async () => manifest),
    getChoices: vi.fn(async () => makeChoices(manifest, {})),
    primeCsrf: vi.fn(async () => {}),
    saveChoices: vi.fn(async () => makeChoices(manifest, {})),
  };
}

function loadingApi() {
  return { ...readyApi(), getManifest: vi.fn(() => new Promise(() => {})) };
}

function errorApi() {
  return { ...readyApi(), getManifest: vi.fn(async () => { throw new Error('manifest unavailable'); }) };
}

function renderAccount({ accountUser = user(), api = readyApi(), pageProps = {} } = {}) {
  const login = vi.fn();
  authApi.updateUserProfile.mockImplementation(async (payload) => ({ ...accountUser, ...payload }));
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/account']}>
        <AuthContext.Provider value={{ user: accountUser, login, loading: false }}>
          <PrivacyProvider api={api}>
            <AccountPage {...pageProps} />
          </PrivacyProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
  return { login };
}

async function renameAndSave(newFirstName = 'Grace') {
  const field = await screen.findByLabelText('Profile.FIRST_NAME_LABEL');
  fireEvent.change(field, { target: { value: newFirstName } });
  fireEvent.click(screen.getByRole('button', { name: 'Profile.SAVE_BUTTON' }));
  await waitFor(() => expect(authApi.updateUserProfile).toHaveBeenCalledTimes(1));
}

beforeEach(() => {
  authApi.fetchPrivacyStatement.mockResolvedValue('privacy text');
  authApi.fetchCookieStatement.mockResolvedValue('cookie text');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AccountPage privacyMode="central"', () => {
  it.each([true, false])(
    'drops both legacy consent controls and fields while editing a name (historical booleans %s)',
    async (historical) => {
      const { login } = renderAccount({
        accountUser: user({
          accepted_privacy_statement: historical,
          accepted_convenience_cookies: historical,
        }),
        pageProps: { privacyMode: 'central' },
      });

      await renameAndSave('Grace');

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
      expect(authApi.updateUserProfile).toHaveBeenCalledWith({ first_name: 'Grace', last_name: 'Lovelace' });
      expect(login).toHaveBeenCalledTimes(1);
      expect(authApi.fetchPrivacyStatement).not.toHaveBeenCalled();
      expect(authApi.fetchCookieStatement).not.toHaveBeenCalled();
      const notice = await screen.findByRole('link', { name: 'Privacy.NOTICE_LINK' });
      expect(notice.getAttribute('href')).toBe('/privacy/en/');
    },
  );

  it.each([
    ['while the manifest loads', loadingApi],
    ['when the manifest fails', errorApi],
  ])('stays central %s and still saves a name', async (_label, makeApi) => {
    const api = makeApi();
    renderAccount({ api, pageProps: { privacyMode: 'central' } });

    // The provider really is in the state under test: it asked for the manifest, which never resolves (loading)
    // or has rejected (error), so no manifest-backed notice link exists yet.
    await waitFor(() => expect(api.getManifest).toHaveBeenCalled());
    await Promise.race([
      api.getManifest.mock.results[0].value.then(() => {}, () => {}),
      new Promise((resolve) => setTimeout(resolve, 25)),
    ]);
    expect(screen.queryByRole('link', { name: 'Privacy.NOTICE_LINK' })).toBeNull();

    await renameAndSave('Grace');
    expect(screen.queryByRole('link', { name: 'Privacy.NOTICE_LINK' })).toBeNull();

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(authApi.updateUserProfile).toHaveBeenCalledWith({ first_name: 'Grace', last_name: 'Lovelace' });
    expect(authApi.fetchPrivacyStatement).not.toHaveBeenCalled();
    expect(authApi.fetchCookieStatement).not.toHaveBeenCalled();
  });

  it('wins over showProfileStatements, which only ever hides statement text', async () => {
    renderAccount({ pageProps: { privacyMode: 'central', showProfileStatements: true } });
    await renameAndSave('Grace');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(authApi.updateUserProfile.mock.calls[0][0]).not.toHaveProperty('accepted_privacy_statement');
    expect(authApi.updateUserProfile.mock.calls[0][0]).not.toHaveProperty('accepted_convenience_cookies');
  });
});

describe('AccountPage without or with legacy privacyMode (positive controls)', () => {
  it.each([
    ['omitted', {}],
    ['explicit legacy', { privacyMode: 'legacy' }],
  ])('keeps the legacy checkboxes, statements and fields (%s)', async (_label, pageProps) => {
    renderAccount({
      accountUser: user({ accepted_privacy_statement: true, accepted_convenience_cookies: false }),
      pageProps,
    });

    await renameAndSave('Grace');

    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(authApi.fetchPrivacyStatement).toHaveBeenCalled();
    expect(authApi.fetchCookieStatement).toHaveBeenCalled();
    expect(authApi.updateUserProfile).toHaveBeenCalledWith({
      first_name: 'Grace',
      last_name: 'Lovelace',
      accepted_privacy_statement: true,
      accepted_convenience_cookies: false,
    });
  });

  it('showProfileStatements={false} only hides the statements, never the checkboxes', async () => {
    renderAccount({ pageProps: { showProfileStatements: false } });
    await screen.findByLabelText('Profile.FIRST_NAME_LABEL');
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(authApi.fetchPrivacyStatement).not.toHaveBeenCalled();
    expect(authApi.fetchCookieStatement).not.toHaveBeenCalled();
  });
});
