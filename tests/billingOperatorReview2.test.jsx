// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
    i18n: { language: 'en' },
  }),
}));

import { SubscriptionSection } from '../src/billing/SubscriptionSection';
import { OperatorOverview } from '../src/billing/OperatorOverview';
import { useBillingUsersColumn } from '../src/billing/useBillingUsersColumn';

afterEach(cleanup);

function Column({ api }) {
  const { extraColumns } = useBillingUsersColumn({ api });
  return extraColumns[0] ? extraColumns[0].renderCell({ user: { id: 1 } }) : <span>no column</span>;
}

const account = { user_id: 1, email: 'ada@example.test', name: 'Ada', access: { status: 'read_only', source: null, ends_at: null }, plan_key: null, term_ends_at: null, token_balance: 0, free_access: null };

describe('Users column', () => {
  it('names each switch by the account it changes', async () => {
    render(<Column api={{ listOperatorAccounts: vi.fn().mockResolvedValue({ count: 1, results: [account] }) }} />);
    expect(await screen.findByRole('switch', { name: 'Billing.OP_FREE_ACCESS – Ada' })).toBeTruthy();
  });

  it('shows the switch on and the access text from the server answer after a grant', async () => {
    const answer = { user_id: 1, free_access: { reason: 'Pilot', granted_by: 'op', granted_at: '2026-10-17T00:00:00Z' }, access: { status: 'active', source: 'free', ends_at: null } };
    const api = { listOperatorAccounts: vi.fn().mockResolvedValue({ count: 1, results: [account] }), grantFreeAccess: vi.fn().mockResolvedValue(answer) };
    render(<Column api={api} />);
    fireEvent.click(await screen.findByRole('switch'));
    fireEvent.change(screen.getByLabelText(/Billing.OP_REASON/), { target: { value: ' Pilot ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Billing.OP_GRANT' }));
    await waitFor(() => expect(api.grantFreeAccess).toHaveBeenCalledWith(1, 'Pilot'));
    await waitFor(() => expect(screen.getByRole('switch').checked).toBe(true));
    expect(screen.getAllByText('Billing.OP_FREE_ACCESS').length).toBe(2);
  });

  it('keeps a column with an error and a retry when loading fails for another reason', async () => {
    const failure = Object.assign(new Error('down'), { response: { status: 500 } });
    const api = { listOperatorAccounts: vi.fn().mockRejectedValueOnce(failure).mockResolvedValue({ count: 1, results: [account] }) };
    render(<Column api={api} />);
    expect(await screen.findByText('Billing.OP_LOAD_ERROR')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Billing.RETRY' }));
    expect(await screen.findByRole('switch')).toBeTruthy();
  });
});

describe('Abo section numbers', () => {
  const base = { tokens: { balance: 20 }, plans: [] };

  it('shows the used and total seats of a team payer', async () => {
    const me = { ...base, access: { status: 'active', source: 'team', ends_at: '2027-04-01T00:00:00Z' }, team: { seats_total: 4, seats_used: 2, seat_holders: [] } };
    render(<SubscriptionSection api={{ getMe: vi.fn().mockResolvedValue(me), listSeats: vi.fn().mockResolvedValue({ seats: [] }) }} withdrawal={false} />);
    expect(await screen.findByText('Billing.OP_SEATS_USED 2 4')).toBeTruthy();
  });

  it('shows the ended banner and no source line for a read-only account', async () => {
    const me = { ...base, access: { status: 'read_only', source: null, ends_at: '2026-09-01T00:00:00Z' }, subscription: { plan_key: 'pro', plan_name: 'Pro', current_period_end: '2026-09-01T00:00:00Z', renews: false } };
    render(<SubscriptionSection api={{ getMe: vi.fn().mockResolvedValue(me), listSeats: vi.fn() }} withdrawal={false} />);
    expect(await screen.findByText('Billing.ENDED_TITLE')).toBeTruthy();
    expect(screen.queryByText('Billing.SOURCE_SUBSCRIPTION')).toBeNull();
    expect(screen.queryByText('Billing.OP_RENEWS')).toBeNull();
  });
});

describe('overview model table', () => {
  it('shows provider, model, calls and cost per row', async () => {
    const data = { app: 'x', month: '2026-10', accounts: { active: 1, by_source: { subscription: {}, team_seat: 0, free_access: 0 } }, subscriptions: { new: 0, ended: 0 }, team: { packages_active: 0, packages_sold: 0, seats_total: 0, seats_used: 0 }, token_packages: { sold: 0, tokens: 0 }, tokens: { granted: 0, used: 0, expired: 0 }, ai_cost: { calls: 1830, usd_micros: 21450000, by_model: [{ provider: 'openai', model: 'gpt-6', calls: 1200, usd_micros: 15000000, input_tokens: 1, output_tokens: 1, cache_tokens: 0 }, { provider: 'anthropic', model: 'sonnet', calls: 630, usd_micros: 6450000, input_tokens: 1, output_tokens: 1, cache_tokens: 0 }], usd_micros_per_used_token: null } };
    render(<OperatorOverview api={{ getOperatorOverview: vi.fn().mockResolvedValue(data) }} />);
    const rows = (await screen.findAllByRole('row')).slice(1).map((row) => row.textContent);
    expect(rows).toEqual(['openaigpt-61,200$15.00', 'anthropicsonnet630$6.45']);
  });
});

describe('Abo values', () => {
  const base = { tokens: { balance: 20 }, plans: [] };

  it('pins plan, period and the grant amounts, remaining tokens and expiry as rendered text', async () => {
    const me = { ...base, access: { status: 'active', source: 'subscription', ends_at: '2027-04-01T00:00:00Z' }, subscription: { plan_key: 'pro', plan_name: 'Professional', current_period_start: '2026-01-01T00:00:00Z', current_period_end: '2026-12-15T00:00:00Z', renews: true }, tokens: { balance: 20, grants: [{ source: 'plan', amount: 100, remaining: 40, expires_at: '2026-11-01T00:00:00Z' }, { source: 'package', amount: 50, remaining: 10, expires_at: null }] } };
    const { container } = render(<SubscriptionSection api={{ getMe: vi.fn().mockResolvedValue(me), listSeats: vi.fn() }} withdrawal={false} />);
    await screen.findByText('Billing.OP_PLAN Professional');
    const text = container.textContent;
    expect(text).toContain('January 1, 2026 – December 15, 2026');
    expect(text).toContain('Billing.OP_GRANT_PLAN: 100');
    expect(text).toContain('Billing.OP_REMAINING');
    expect(text).toContain('Billing.OP_VALID_UNTIL November 1, 2026');
    expect(text).toContain('Billing.OP_GRANT_PACKAGE: 50');
    expect(text.split('Billing.OP_VALID_UNTIL').length).toBe(2);
    expect(text).toContain('40 Billing.OP_REMAINING');
    expect(text).toContain('10 Billing.OP_REMAINING');
    expect(text).toContain('Billing.OP_RENEWS');
    expect(text).not.toContain('Billing.OP_ENDS');
  });

  it('shows "ends" and other grant numbers when the data says so', async () => {
    const me = { ...base, access: { status: 'active', source: 'subscription', ends_at: '2027-04-01T00:00:00Z' }, subscription: { plan_key: 'pro', plan_name: 'Plus', current_period_start: '2026-02-01T00:00:00Z', current_period_end: '2026-03-01T00:00:00Z', renews: false }, tokens: { balance: 7, grants: [{ source: 'package', amount: 70, remaining: 7, expires_at: null }] } };
    const { container } = render(<SubscriptionSection api={{ getMe: vi.fn().mockResolvedValue(me), listSeats: vi.fn() }} withdrawal={false} />);
    await screen.findByText('Billing.OP_PLAN Plus');
    const text = container.textContent;
    expect(text).toContain('February 1, 2026 – March 1, 2026');
    expect(text).toContain('Billing.OP_ENDS');
    expect(text).not.toContain('Billing.OP_RENEWS');
    expect(text).toContain('Billing.OP_GRANT_PACKAGE: 70');
    expect(text).toContain('7 Billing.OP_REMAINING');
    expect(text).not.toContain('Billing.OP_VALID_UNTIL');
  });

  it('pins the end date of a seat holder', async () => {
    const me = { ...base, access: { status: 'active', source: 'team', ends_at: null }, seat: { plan_key: 'team', plan_name: '', ends_at: '2026-11-01T00:00:00Z' } };
    render(<SubscriptionSection api={{ getMe: vi.fn().mockResolvedValue(me), listSeats: vi.fn().mockResolvedValue({ seats: [] }) }} withdrawal={false} />);
    expect(await screen.findByText('Billing.OP_SEAT_UNTIL November 1, 2026')).toBeTruthy();
  });
});
