// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, fallback) => fallback,
    i18n: { language: 'en' },
  }),
}));

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
vi.mock('../src/auth/authApi', () => ({
  fetchAuthPolicy: vi.fn(),
  updateUserProfile: vi.fn(),
}));
vi.mock('../src/billing/api', () => ({ defaultBillingApi: {} }));
vi.mock('../src/billing/useBillingUsersColumn', () => ({
  useBillingUsersColumn: () => ({ extraColumns: [] }),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { AccountPage } from '../src/pages/AccountPage';

afterEach(cleanup);

const appGroups = [
  { key: 'personal', label: 'Persönlich', order: 0, tabs: ['profile', 'security'] },
  { key: 'collaboration', label: 'Zusammenarbeit', order: 1, tabs: ['invite'] },
  { key: 'help', label: 'Hilfe', order: 2, tabs: ['support'] },
  {
    key: 'operations',
    label: 'Betrieb',
    order: 3,
    tabs: ['users'],
    visible: ({ isSuperUser }) => isSuperUser,
  },
  { key: 'empty', label: 'Leer', order: 4, tabs: ['support'] },
];

const extraTabs = [
  { value: 'teams', label: 'Teams', group: 'collaboration', render: () => null },
  {
    value: 'projects',
    label: 'Alle Projekte',
    group: 'operations',
    render: () => null,
  },
];

function renderPage({ groups, tabs = extraTabs, user = {}, initialEntry = '/?tab=profile' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider value={{
        user: {
          id: 1,
          email: 'person@example.test',
          available_roles: [],
          ui_permissions: { can_view_invite: true, can_view_support: true },
          ...user,
        },
        login: vi.fn(),
        loading: false,
      }}>
        <AccountPage {...(groups === undefined ? {} : { groups })} extraTabs={tabs} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function getNav() {
  return screen.getByRole('navigation');
}

function getGroup(nav, label) {
  return within(nav).getByText(label).parentElement.parentElement;
}

describe('AccountPage app-defined groups', () => {
  it('renders declared groups in order with app labels and places built-in and extra tabs', () => {
    const unorderedGroups = appGroups.map((group) => ({
      ...group,
      order: ({ personal: 10, collaboration: 20, help: 30, operations: 40, empty: 50 })[group.key],
    })).reverse();
    renderPage({ groups: unorderedGroups, user: { is_superuser: true } });

    const nav = getNav();
    const headers = within(nav).getAllByText(/^(Persönlich|Zusammenarbeit|Hilfe|Betrieb)$/);
    expect(headers.map((header) => header.textContent)).toEqual([
      'Persönlich', 'Zusammenarbeit', 'Hilfe', 'Betrieb',
    ]);
    expect(within(getGroup(nav, 'Persönlich')).getByRole('button', { name: 'Profile' })).toBeTruthy();
    expect(within(getGroup(nav, 'Persönlich')).getByRole('button', { name: 'Security' })).toBeTruthy();
    expect(within(getGroup(nav, 'Zusammenarbeit')).getByRole('button', { name: 'Invite' })).toBeTruthy();
    expect(within(getGroup(nav, 'Zusammenarbeit')).getByRole('button', { name: 'Teams' })).toBeTruthy();
    expect(within(getGroup(nav, 'Hilfe')).getByRole('button', { name: 'Support' })).toBeTruthy();
    expect(within(getGroup(nav, 'Betrieb')).getByRole('button', { name: 'Users' })).toBeTruthy();
    expect(within(getGroup(nav, 'Betrieb')).getByRole('button', { name: 'Alle Projekte' })).toBeTruthy();
  });

  it('hides operator groups and their tabs for non-operators, including deep links', () => {
    renderPage({
      groups: appGroups,
      initialEntry: '/?tab=users',
      user: { ui_permissions: { can_view_invite: true } },
    });

    const nav = getNav();
    expect(within(nav).queryByText('Betrieb')).toBeNull();
    expect(within(nav).queryByRole('button', { name: 'Users' })).toBeNull();
    expect(within(nav).queryByRole('button', { name: 'Alle Projekte' })).toBeNull();
    expect(within(nav).getByRole('button', { name: 'Profile' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).queryByText('Leer')).toBeNull();
  });

  it('selects an invite tab moved into an app-defined group from ?tab=', () => {
    renderPage({ groups: appGroups, initialEntry: '/?tab=invite' });

    expect(within(getNav()).getByRole('button', { name: 'Invite' }).getAttribute('aria-current')).toBe('page');
  });

  it('keeps the default groups, labels, and more placement when groups are omitted', () => {
    renderPage({
      tabs: [{ value: 'unknown-group-tab', label: 'Extra', group: 'custom', render: () => null }],
      user: {
        ui_permissions: {
          can_view_users: true,
          can_view_invite: true,
          can_view_support: true,
        },
      },
    });

    const nav = getNav();
    expect(within(nav).getByText('My account')).toBeTruthy();
    expect(within(nav).getByText('Management')).toBeTruthy();
    expect(within(nav).getByText('Help')).toBeTruthy();
    expect(within(nav).getByText('More')).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'Extra' })).toBeTruthy();
  });
});
