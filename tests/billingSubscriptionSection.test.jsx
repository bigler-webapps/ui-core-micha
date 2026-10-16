// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => {
  const labels = { 'Billing.ERROR_LOAD': 'Load error', 'Billing.RETRY': 'Retry', 'Billing.LOADING': 'Loading', 'Billing.HEADING': 'Abo', 'Billing.SOURCE_SUBSCRIPTION': 'Personal plan', 'Billing.SOURCE_TEAM': 'Team seat', 'Billing.SOURCE_FREE': 'Free access', 'Billing.ACTIVE_UNTIL': 'Active until {{date}}', 'Billing.MANAGE': 'Manage', 'Billing.MANAGE_DETAILS': 'Cancel, payment method, receipts', 'Billing.ERROR_PORTAL': 'Portal error', 'Billing.BALANCE_LABEL': 'Token balance', 'Billing.BALANCE': 'Balance {{tokens}} tokens', 'Billing.BUY_PACKAGE': 'Buy token package', 'Billing.PACKAGE_BUY': 'Buy package', 'Billing.PACKAGE_TOKENS': '{{tokens}} tokens', 'Billing.SEATS_ADD': 'Add seat', 'Billing.SEAT_USER': 'Email address or user ID', 'Billing.SEAT_REMOVE': 'Remove', 'Billing.ERROR_SEAT_LIMIT': 'Seat limit', 'Billing.ERROR_SEAT_USER': 'Invalid user', 'Billing.TEAM_SEATS': 'Team seats', 'Billing.ERROR_CHECKOUT': 'Checkout error', 'Billing.CONTINUE_TO_PAYMENT': 'Continue', 'Billing.MONTHLY': 'Monthly', 'Billing.YEARLY': 'Yearly', 'Billing.PER_MONTH': '/ month', 'Billing.PER_YEAR': '/ year', 'Billing.TOKENS_INCLUDED': '{{tokens}} tokens included', 'Billing.ENDED_TITLE': 'Ended; read only', 'Billing.ENDED_ON': 'Ended on {{date}}', 'Billing.RENEW': 'Renew' };
  return Object.entries(values || {}).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), labels[key] || key);
}, i18n: { language: 'en' } }) }));

import { SubscriptionSection } from '../src/billing/SubscriptionSection';

afterEach(cleanup);
const me = (status = 'active', source = 'subscription', extra = {}) => ({ access: { status, source, ends_at: '2026-12-15T00:00:00Z' }, tokens: { balance: 1153 }, plans: [], ...extra });
const apiFor = (result, extra = {}) => ({ getMe: vi.fn().mockResolvedValue(result), openPortal: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/session' }), listSeats: vi.fn().mockRejectedValue({ response: { status: 404 } }), addSeat: vi.fn(), removeSeat: vi.fn(), startCheckout: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session' }), ...extra });

describe('SubscriptionSection state rendering', () => {
  it('shows loading then a retryable error and retries getMe', async () => {
    let finish;
    const api = apiFor(null, { getMe: vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockRejectedValueOnce(new Error('offline')) });
    render(<SubscriptionSection api={api} />);
    expect(screen.getByText('Loading')).toBeTruthy();
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    finish(null);
    expect(await screen.findByText('Load error')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.getMe).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Load error')).toBeTruthy();
  });
  it('renders subscription end date and safely opens the portal', async () => {
    const api = apiFor(me()); const redirect = vi.fn();
    render(<SubscriptionSection api={api} redirect={redirect} />);
    expect(await screen.findByText('Personal plan')).toBeTruthy();
    expect(screen.getByText(/Active until/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://billing.stripe.com/session'));
    expect(api.openPortal).toHaveBeenCalledOnce();
  });
  it('shows portal failure when the account has no Stripe customer', async () => {
    render(<SubscriptionSection api={apiFor(me(), { openPortal: vi.fn().mockRejectedValue({ response: { status: 404, data: { detail: 'no_customer' } } }) })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Manage' }));
    expect(await screen.findByText('Portal error')).toBeTruthy();
  });
  it('shows the team payer seat list and supports add/remove plus server errors', async () => {
    const api = apiFor(me('active', 'team'), { listSeats: vi.fn().mockResolvedValue({ seats: [{ user_id: 22 }] }), addSeat: vi.fn().mockRejectedValueOnce({ response: { status: 409 } }).mockRejectedValueOnce({ response: { status: 400 } }), removeSeat: vi.fn().mockResolvedValue({ removed: true }) });
    render(<SubscriptionSection api={api} />);
    expect(await screen.findByText('22')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address or user ID' }), { target: { value: 'a@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add seat' }));
    expect(await screen.findByText('Seat limit')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address or user ID' }), { target: { value: 'bad@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add seat' }));
    expect(await screen.findByText('Invalid user')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(api.removeSeat).toHaveBeenCalledWith({ userId: 22 }));
  });
  it('renders a team member on 404 without payer controls', async () => {
    render(<SubscriptionSection api={apiFor(me('active', 'team'))} />);
    expect(await screen.findByText('Team seat')).toBeTruthy();
    expect(screen.getByText('Active until December 15, 2026')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add seat' })).toBeNull();
  });
  it('renders free access without an end date or portal action', async () => {
    render(<SubscriptionSection api={apiFor(me('active', 'free', { access: { status: 'active', source: 'free', ends_at: null } }))} />);
    expect(await screen.findByText('Free access')).toBeTruthy();
    expect(screen.queryByText(/Active until/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
  });
  it('renders ended access with a renewal picker and calls onRenew when supplied', async () => {
    const onRenew = vi.fn();
    const ended = me('read_only', null, { plans: [{ key: 'renew', kind: 'subscription', interval: 'month', name: 'Renewal plan', amount_cents: 1000 }] });
    render(<SubscriptionSection api={apiFor(ended)} onRenew={onRenew} />);
    expect(await screen.findByText('Ended; read only')).toBeTruthy();
    expect(screen.getByText(/Ended on/)).toBeTruthy();
    expect(screen.getByText('Renewal plan')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Renew' }));
    expect(onRenew).toHaveBeenCalledOnce();
  });
  it('treats missing or unknown access as an error state', async () => {
    const { rerender } = render(<SubscriptionSection api={apiFor({ tokens: { balance: 2 } })} />);
    expect(await screen.findByText('Load error')).toBeTruthy();
    rerender(<SubscriptionSection api={apiFor({ access: { status: 'mystery', source: 'free', ends_at: null }, tokens: { balance: 2 } })} />);
    expect(await screen.findByText('Load error')).toBeTruthy();
    expect(screen.queryByText('Free access')).toBeNull();
  });
  it('buys token packages through guarded checkout', async () => {
    const api = apiFor(me('active', 'free', { access: { status: 'active', source: 'free', ends_at: null }, plans: [{ key: 'pack', kind: 'token_package', amount_cents: 900, tokens: 500 }] }));
    const redirect = vi.fn();
    render(<SubscriptionSection api={api} redirect={redirect} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Buy package' }));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.com/session'));
    expect(api.startCheckout).toHaveBeenCalledWith('pack');
  });
});
