// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';

const authApi = vi.hoisted(() => ({ fetchUsersList: vi.fn(), updateUserRole: vi.fn(), deleteUser: vi.fn() }));
vi.mock('../src/auth/authApi', () => authApi);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values = {}) => {
      const templates = {
        'Billing.OP_ACCESS': 'Access', 'Billing.OP_FREE_ACCESS': 'Access enabled without a subscription',
        'Billing.OP_FREE_ACCESS_SHORT': 'Free access', 'Billing.OP_FREE_ACCESS_FOR': 'Free access without a subscription – {{name}}',
        'Billing.OP_NO_SUBSCRIPTION': 'No subscription', 'Billing.OP_SUBSCRIPTION': 'Subscription',
        'Billing.OP_PLAN': 'Subscription {{plan}}', 'Billing.OP_TEAM': 'Team', 'Billing.OP_OPERATOR': 'Operator',
        'Billing.OP_READ_ONLY': 'Read-only', 'Billing.OP_UNTIL': 'until {{date}}', 'Billing.OP_REASON': 'Reason',
        'Billing.OP_GRANT': 'Grant', 'Billing.OP_REVOKE': 'Revoke', 'Billing.OP_REVOKE_TITLE': 'Revoke access?',
        'Billing.OP_REVOKE_BODY': 'Data stays; access becomes read-only.', 'Billing.OP_CANCEL': 'Cancel',
        'Billing.OP_SAVE_ERROR': 'Save error', 'Billing.OP_FORBIDDEN': 'Forbidden', 'Billing.OP_LOAD_ERROR': 'Load error',
        'Billing.RETRY': 'Retry', 'UserList.TITLE': 'All Users', 'UserList.SEARCH_PLACEHOLDER': 'Search users...',
        'UserList.NO_USERS': 'No users found.', 'UserList.DELETE_CONFIRM': 'Are you sure you want to delete this user?',
        'UserList.ROWS_PER_PAGE': 'Rows per page:', 'Common.SEARCH': 'Search', 'Common.ACTIONS': 'Actions',
        'Common.DELETE_FOR': 'Delete – {{name}}', 'Auth.EMAIL_LABEL': 'Email', 'Profile.NAME_LABEL': 'Name',
      };
      return Object.entries(values || {}).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), templates[key] ?? key);
    },
    i18n: { language: 'en' },
  }),
}));

import { accountAccessText } from '../src/billing/BillingAccessCell';
import { FreeAccessSwitch } from '../src/billing/FreeAccessSwitch';
import { useBillingUsersColumn } from '../src/billing/useBillingUsersColumn';
import { UserListComponent } from '../src/components/UserListComponent';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const t = (key, values = {}) => {
  const text = {
    'Billing.OP_FREE_ACCESS_SHORT': 'Free access', 'Billing.OP_SUBSCRIPTION': 'Subscription',
    'Billing.OP_TEAM': 'Team', 'Billing.OP_OPERATOR': 'Operator', 'Billing.OP_READ_ONLY': 'Read-only',
    'Billing.OP_UNTIL': 'until {{date}}',
  }[key] ?? key;
  return Object.entries(values).reduce((out, [name, value]) => out.replaceAll(`{{${name}}}`, String(value)), text);
};

const accounts = [
  { user_id: 1, access: { status: 'active', source: 'free' }, free_access: null },
  { user_id: 2, access: { status: 'active', source: 'subscription', ends_at: '2026-11-19T00:00:00Z' }, plan_key: 'monthly', term_ends_at: '2026-11-19T00:00:00Z' },
  { user_id: 3, access: { status: 'active', source: 'subscription', ends_at: '2026-11-19T00:00:00Z' }, plan_key: 'private-key' },
  { user_id: 4, access: { status: 'active', source: 'team', ends_at: '2026-11-19T00:00:00Z' } },
  { user_id: 5, access: { status: 'read_only', source: null } },
  { user_id: 6, access: { status: 'active', source: 'free' } },
];

describe('compact billing access column', () => {
  it('formats free, named and unnamed subscription, team, read-only, and operator statuses', () => {
    const planNames = { monthly: 'Personal monthly' };
    expect(accountAccessText(accounts[0], t, 'en', { planNames })).toBe('Free access');
    expect(accountAccessText(accounts[1], t, 'en', { planNames })).toBe('Personal monthly · until 11/19/2026');
    expect(accountAccessText(accounts[2], t, 'en', { planNames })).toBe('Subscription · until 11/19/2026');
    expect(accountAccessText(accounts[2], t, 'en', { planNames })).not.toContain('private-key');
    expect(accountAccessText(accounts[3], t, 'en', { planNames })).toBe('Team · until 11/19/2026');
    expect(accountAccessText(accounts[4], t, 'en', { planNames })).toBe('Read-only');
    expect(accountAccessText(accounts[5], t, 'en', { planNames, isOperator: true })).toBe('Operator');
  });

  it('offers the switch only for free and read-only accounts and names it accessibly', async () => {
    const api = {
      listOperatorAccounts: vi.fn().mockResolvedValue({ count: accounts.length, results: accounts }),
      getMe: vi.fn().mockResolvedValue({ plans: [{ key: 'monthly', name: 'Personal monthly' }] }),
      grantFreeAccess: vi.fn().mockResolvedValue({ free_access: { reason: 'ok' }, access: { source: 'free', status: 'active' } }),
      revokeFreeAccess: vi.fn(),
    };
    const hook = renderHook(() => useBillingUsersColumn({ api, isOperator: ({ user }) => user?.id === 6 }));
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await waitFor(() => expect(api.getMe).toHaveBeenCalledOnce());
    const [accessColumn, switchColumn] = hook.result.current.extraColumns;
    expect(accessColumn.key).toBe('billing-access');
    expect(switchColumn.key).toBe('billing-free-access');
    const userFor = (id, extra = {}) => ({ id, first_name: `User${id}`, ...extra });
    for (const id of [1, 5]) {
      const view = render(<>{switchColumn.renderCell({ user: userFor(id) })}</>);
      expect(screen.getByRole('switch', { name: `Free access without a subscription – User${id}` })).toBeTruthy();
      view.unmount();
    }
    for (const id of [2, 3, 4, 6]) {
      const view = render(<>{switchColumn.renderCell({ user: userFor(id, { is_superuser: id === 6 }) })}</>);
      expect(screen.getByText('–')).toBeTruthy();
      view.unmount();
    }
  });

  it('shows the plan name from getMe().plans and loads it once per activation', async () => {
    const getMe = vi.fn().mockResolvedValue({ plans: [{ key: 'personal_monthly', name: 'Persönlich monatlich' }] });
    const accounts = { count: 1, results: [{ user_id: 2, access: { status: 'active', source: 'subscription', ends_at: '2026-11-19T00:00:00Z' }, plan_key: 'personal_monthly', term_ends_at: '2026-11-19T00:00:00Z' }] };
    // A stable api object: the existing useOperatorAccounts refetches when the api identity changes.
    const api = { getMe, listOperatorAccounts: vi.fn().mockResolvedValue(accounts) };
    const { result, rerender } = renderHook(() => useBillingUsersColumn({ api }));
    await waitFor(() => expect(result.current.extraColumns[0]?.getSortValue({ user: { id: 2 } })).toContain('Persönlich monatlich'));
    expect(result.current.extraColumns[0].getSortValue({ user: { id: 2 } })).not.toContain('personal_monthly');
    rerender();
    rerender();
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  it('keeps the grant reason required and confirms delete with an icon button named for the user', async () => {
    const switchApi = { grantFreeAccess: vi.fn(), revokeFreeAccess: vi.fn() };
    const { unmount } = render(<FreeAccessSwitch account={{ user_id: 1, email: 'free@example.test', free_access: null }} api={switchApi} hideLabel name="Free User" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Free access without a subscription – Free User' }));
    const grant = screen.getByRole('button', { name: 'Grant' });
    expect(grant.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason' }), { target: { value: '  ' } });
    expect(grant.disabled).toBe(true);
    unmount();

    authApi.fetchUsersList.mockResolvedValue([
      { id: 99, email: 'admin@example.test', first_name: 'Admin', last_name: 'User' },
      { id: 1, email: 'free@example.test', first_name: 'Free', last_name: 'User' },
    ]);
    authApi.deleteUser.mockResolvedValue({});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<UserListComponent currentUser={{ id: 99, is_superuser: true }} showNewColumn={false} showSuccessfulLoginColumn={false} showRoleColumn={false} />);
    const deleteButton = await screen.findByRole('button', { name: 'Delete – Free User' });
    expect(deleteButton.querySelector('svg')).toBeTruthy();
    expect(deleteButton.className).toContain('MuiIconButton-root');
    expect(deleteButton.textContent.trim()).toBe('');
    expect(within(screen.getByRole('row', { name: /Admin User/ })).getByRole('button', { name: 'Delete – Admin User' }).disabled).toBe(true);
    fireEvent.click(deleteButton);
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this user?'));
    await waitFor(() => expect(authApi.deleteUser).toHaveBeenCalledWith(1));
  });
});
