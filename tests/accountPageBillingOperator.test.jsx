// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values = {}) => ({
      'Billing.OP_ACCESS': 'Access',
      'Billing.OP_NO_SUBSCRIPTION': 'No subscription',
      'Billing.OP_OPERATOR': 'Operator',
      'Billing.OP_READ_ONLY': 'Read-only',
      'Billing.OP_FREE_ACCESS_FOR': 'Free access without a subscription – {{name}}',
      'Billing.OP_FREE_ACCESS_SHORT': 'Free access',
      'Billing.OP_GRANT': 'Grant',
      'Billing.OP_REVOKE': 'Revoke',
      'Billing.OP_REVOKE_TITLE': 'Revoke access?',
      'Billing.OP_REVOKE_BODY': 'Data stays; access becomes read-only.',
      'Billing.OP_CANCEL': 'Cancel',
      'Billing.OP_SAVE_ERROR': 'Save error',
      'Billing.OP_FORBIDDEN': 'Forbidden',
      'Billing.OP_LOAD_ERROR': 'Load error',
    }[key] ?? key).replace(/{{(\w+)}}/g, (_match, name) => String(values[name] ?? '')),
    i18n: { language: 'en' },
  }),
}));

vi.mock('../src/components/UserListComponent', () => ({
  UserListComponent: ({ extraColumns = [] }) => {
    const users = [
      { id: 1, email: 'admin@example.test', first_name: 'Admin', role: 'admin' },
      { id: 2, email: 'superuser@example.test', first_name: 'Superuser', is_superuser: true },
      { id: 3, email: 'reader@example.test', first_name: 'Reader' },
    ];
    return React.createElement('div', null, extraColumns.map((column) => React.createElement(
      'section',
      { key: column.key, 'data-testid': `column-${column.key}` },
      React.createElement('span', null, typeof column.label === 'function' ? column.label({}) : column.label),
      ...users.map((user) => React.createElement(
        'div',
        { key: user.id, 'data-testid': `cell-${column.key}-${user.id}` },
        column.renderCell?.({ user }) ?? '',
      )),
    )));
  },
}));

import { AuthContext } from '../src/auth/AuthContext';
import { AccountPage } from '../src/pages/AccountPage';

afterEach(cleanup);

const operatorAccounts = {
  count: 3,
  results: [
    { user_id: 1, access: { status: 'read_only', source: null } },
    { user_id: 2, access: { status: 'read_only', source: null } },
    { user_id: 3, access: { status: 'read_only', source: null } },
  ],
};

const makeApi = () => ({ listOperatorAccounts: vi.fn().mockResolvedValue(operatorAccounts) });

const renderPage = (props) => render(
  <MemoryRouter initialEntries={['/?tab=users']}>
    <AuthContext.Provider value={{
      user: { id: 4, available_roles: [], ui_permissions: { can_view_users: true } },
      login: vi.fn(),
      loading: false,
    }}>
      <AccountPage {...props} />
    </AuthContext.Provider>
  </MemoryRouter>,
);

const customOperatorRule = ({ user }) => user?.is_superuser === true || user?.role === 'admin';

describe('AccountPage billing operator rule', () => {
  it('uses the supplied rule for access status and free access switches', async () => {
    const api = makeApi();
    renderPage({ billingUsers: api, billingOperator: customOperatorRule });

    const adminAccess = await screen.findByTestId('cell-billing-access-1');
    const superuserAccess = screen.getByTestId('cell-billing-access-2');
    expect(within(adminAccess).getByText('Operator')).toBeTruthy();
    expect(within(superuserAccess).getByText('Operator')).toBeTruthy();
    expect(within(screen.getByTestId('cell-billing-free-access-1')).queryByRole('switch')).toBeNull();
    expect(within(screen.getByTestId('cell-billing-free-access-2')).queryByRole('switch')).toBeNull();
    expect(within(screen.getByTestId('cell-billing-free-access-3')).getByRole('switch')).toBeTruthy();
  });

  it('keeps the superuser-only default when no rule is passed', async () => {
    const api = makeApi();
    renderPage({ billingUsers: api });

    expect(await within(await screen.findByTestId('cell-billing-access-1')).findByText('Read-only')).toBeTruthy();
    expect(within(screen.getByTestId('cell-billing-access-2')).getByText('Operator')).toBeTruthy();
    expect(within(screen.getByTestId('cell-billing-free-access-1')).getByRole('switch')).toBeTruthy();
    expect(within(screen.getByTestId('cell-billing-free-access-2')).queryByRole('switch')).toBeNull();
    expect(within(screen.getByTestId('cell-billing-free-access-3')).getByRole('switch')).toBeTruthy();
  });

  it('ignores the rule while billing users are disabled', () => {
    const api = makeApi();
    renderPage({ billingUsers: false, billingOperator: customOperatorRule });

    expect(api.listOperatorAccounts).not.toHaveBeenCalled();
    expect(screen.queryByTestId('column-billing-access')).toBeNull();
    expect(screen.queryByTestId('column-billing-free-access')).toBeNull();
  });

  it('does not refetch operator accounts when the rule function identity changes', async () => {
    const api = makeApi();
    const { rerender } = renderPage({ billingUsers: api, billingOperator: customOperatorRule });
    await waitFor(() => expect(api.listOperatorAccounts).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter initialEntries={['/?tab=users']}>
        <AuthContext.Provider value={{
          user: { id: 4, available_roles: [], ui_permissions: { can_view_users: true } },
          login: vi.fn(),
          loading: false,
        }}>
          <AccountPage billingUsers={api} billingOperator={({ user }) => user?.role === 'admin'} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    // The new rule applies (admins only; the superuser is no longer an operator) without a second fetch.
    await waitFor(() => expect(within(screen.getByTestId('cell-billing-access-2')).queryByText('Operator')).toBeNull());
    expect(within(screen.getByTestId('cell-billing-access-1')).getByText('Operator')).toBeTruthy();
    expect(api.listOperatorAccounts).toHaveBeenCalledTimes(1);
  });
});
