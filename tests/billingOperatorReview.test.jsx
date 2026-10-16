// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => Object.entries(values || {}).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), key),
    i18n: { language: 'en' },
  }),
}));
vi.mock('../src/components/UserListComponent', () => ({
  UserListComponent: ({ extraColumns = [] }) => <div>{extraColumns.map((column) => <span key={column.key}>{column.label}</span>)}</div>,
}));

import { AuthContext } from '../src/auth/AuthContext';
import { AccountPage } from '../src/pages/AccountPage';
import { SubscriptionSection } from '../src/billing/SubscriptionSection';
import { OperatorOverview } from '../src/billing/OperatorOverview';
import { accountAccessText } from '../src/billing/BillingAccessCell';

afterEach(cleanup);

const me = (extra = {}) => ({ access: { status: 'active', source: 'subscription', ends_at: '2027-04-01T00:00:00Z' }, tokens: { balance: 20 }, plans: [], ...extra });

describe('Abo section details', () => {
  it('shows the plan name and the period from start to end', async () => {
    const api = { getMe: vi.fn().mockResolvedValue(me({ subscription: { plan_key: 'pro', plan_name: 'Professional', current_period_start: '2026-01-01T00:00:00Z', current_period_end: '2026-12-01T00:00:00Z', renews: false } })), listSeats: vi.fn() };
    render(<SubscriptionSection api={api} withdrawal={false} />);
    expect(await screen.findByText('January 1, 2026 – December 1, 2026')).toBeTruthy();
    expect(screen.getByText('Billing.OP_ENDS')).toBeTruthy();
  });

  it('names a known holder in the assignment list and keeps the id for an unknown one', async () => {
    const team = me({ access: { status: 'active', source: 'team', ends_at: '2027-04-01T00:00:00Z' }, team: { seats_total: 4, seats_used: 2, seat_holders: [{ user_id: 12, name: 'Ada', email: 'ada@example.test' }] } });
    const api = { getMe: vi.fn().mockResolvedValue(team), listSeats: vi.fn().mockResolvedValue({ seats: [{ user_id: 12 }, { user_id: 99 }] }) };
    render(<SubscriptionSection api={api} withdrawal={false} />);
    expect(await screen.findByText('99')).toBeTruthy();
    expect(screen.queryByText('12')).toBeNull();
    expect(screen.getAllByText('Ada').length).toBeGreaterThan(0);
  });
});

describe('access text', () => {
  it('says read-only for a person whose access ended and nothing for an unknown person', () => {
    const t = (key) => key;
    expect(accountAccessText({ access: { status: 'read_only', source: null, ends_at: null } }, t, 'en')).toBe('Billing.OP_READ_ONLY');
    expect(accountAccessText(undefined, t, 'en')).toBe('–');
  });
});

describe('overview months and empty data', () => {
  const zero = { app: 'x', month: '2026-09', accounts: { active: 0, by_source: { subscription: {}, team_seat: 0, free_access: 0 } }, subscriptions: { new: 0, ended: 0 }, team: { packages_active: 0, packages_sold: 0, seats_total: 0, seats_used: 0 }, token_packages: { sold: 0, tokens: 0 }, tokens: { granted: 0, used: 0, expired: 0 }, ai_cost: { calls: 0, usd_micros: 0, by_model: [], usd_micros_per_used_token: null } };

  it('requests the selected month and shows zeros for an empty month', async () => {
    const api = { getOperatorOverview: vi.fn().mockResolvedValue(zero) };
    render(<OperatorOverview api={api} />);
    const input = await screen.findByLabelText('Billing.OP_MONTH');
    fireEvent.change(input, { target: { value: '2026-09' } });
    await waitFor(() => expect(api.getOperatorOverview).toHaveBeenLastCalledWith({ month: '2026-09' }));
    await waitFor(() => expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(7));
    expect(screen.getByText('–')).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });
});

describe('Users column without operator right', () => {
  it('shows no billing column when the server answers 403', async () => {
    const forbidden = Object.assign(new Error('x'), { response: { status: 403, data: { detail: 'forbidden' } } });
    const api = { listOperatorAccounts: vi.fn().mockRejectedValue(forbidden) };
    render(
      <MemoryRouter initialEntries={['/?tab=users']}>
        <AuthContext.Provider value={{ user: { id: 4, available_roles: [], ui_permissions: { can_view_users: true } }, login: vi.fn(), loading: false }}>
          <AccountPage billingUsers={api} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.listOperatorAccounts).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByText('Billing.OP_ACCESS')).toBeNull();
  });
});
