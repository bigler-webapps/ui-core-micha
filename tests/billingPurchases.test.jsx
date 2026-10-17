// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key, values) => values ? `${key} ${Object.values(values).join(' ')}` : key,
  i18n: { language: 'en' },
}) }));

import { WithdrawalSection } from '../src/billing/WithdrawalSection';

afterEach(cleanup);

const purchase = (id, extra = {}) => ({
  id, kind: 'subscription', plan_key: 'month', purchased_at: '2026-01-01T12:00:00Z',
  amount_paid_cents: 1200, currency: 'usd', eligible: false, reason: 'not_active', withdrawn_at: null, ...extra,
});

describe('all purchases', () => {
  it('lists purchases in server order with plan, purchase date and price', async () => {
    const { container } = render(<WithdrawalSection api={{ listWithdrawals: vi.fn().mockResolvedValue({ purchases: [
      purchase('one', { plan_key: 'month', eligible: true }), purchase('two', { plan_key: 'package', reason: 'period_over' }),
    ] }) }} plans={[{ key: 'month', name: 'Monthly' }, { key: 'package', name: '500 tokens' }]} />);
    expect(await screen.findByText('Billing.PURCHASES')).toBeTruthy();
    expect(container.textContent.indexOf('Monthly')).toBeLessThan(container.textContent.indexOf('500 tokens'));
    expect(container.textContent).toContain('January 1, 2026 · $12.00');
    expect(screen.getByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toBeTruthy();
    expect(screen.getByText('Billing.WITHDRAWAL_UNTIL January 15, 2026')).toBeTruthy();
  });

  it('marks withdrawn first, and labels expired withdrawal periods without an action', async () => {
    render(<WithdrawalSection api={{ listWithdrawals: vi.fn().mockResolvedValue({ purchases: [
      purchase('withdrawn', { eligible: true, withdrawn_at: '2026-02-02T00:00:00Z' }),
      purchase('expired', { reason: 'period_over' }),
    ] }) }} />);
    expect(await screen.findByText('Billing.WITHDRAWN_ON February 2, 2026')).toBeTruthy();
    expect(screen.getByText('Billing.WITHDRAWAL_PERIOD_OVER')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toBeNull();
  });

  it.each(['not_active', 'country_not_eligible', 'business_purchase', 'withdrawal_disabled', 'payment_reference_missing', ''])('shows a purchase with reason %s without an action or reason text', async (reason) => {
    render(<WithdrawalSection api={{ listWithdrawals: vi.fn().mockResolvedValue({ purchases: [purchase('other', { reason })] }) }} plans={[]} />);
    expect(await screen.findByText('month')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toBeNull();
    expect(screen.queryByText('Billing.WITHDRAWAL_PERIOD_OVER')).toBeNull();
    expect(screen.queryByText('Billing.WITHDRAWN_ON')).toBeNull();
  });

  it('renders nothing for an empty list or a 404', async () => {
    const { container, rerender } = render(<WithdrawalSection api={{ listWithdrawals: vi.fn().mockResolvedValue({ purchases: [] }) }} />);
    await waitFor(() => expect(container.textContent).toBe(''));
    rerender(<WithdrawalSection api={{ listWithdrawals: vi.fn().mockRejectedValue({ response: { status: 404 } }) }} />);
    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('keeps the error alert and retry action after a failed load', async () => {
    const listWithdrawals = vi.fn().mockRejectedValueOnce({ response: { status: 503 } }).mockResolvedValueOnce({ purchases: [purchase('retry', { eligible: true, reason: '' })] });
    render(<WithdrawalSection api={{ listWithdrawals }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.RETRY' }));
    expect(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toBeTruthy();
    expect(listWithdrawals).toHaveBeenCalledTimes(2);
  });

  it('reloads after success and shows both the receipt and withdrawn state', async () => {
    const active = purchase('p1', { eligible: true, reason: '' });
    const withdrawn = { ...active, withdrawn_at: '2026-02-01T14:30:00Z' };
    const listWithdrawals = vi.fn().mockResolvedValueOnce({ purchases: [active] }).mockResolvedValue({ purchases: [withdrawn] });
    const api = {
      listWithdrawals,
      previewWithdrawal: vi.fn().mockResolvedValue({ eligible: true, refund_cents: 1200, currency: 'usd', amount_paid_cents: 1200, time_share_cents: 0, token_share_cents: 0, used_cents: 0 }),
      confirmWithdrawal: vi.fn().mockResolvedValue({ withdrawn_at: '2026-02-01T14:30:00Z' }),
    };
    render(<WithdrawalSection api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' }));
    expect(await screen.findByText('Billing.WITHDRAWAL_DONE')).toBeTruthy();
    expect(await screen.findByText('Billing.WITHDRAWN_ON February 1, 2026')).toBeTruthy();
    await waitFor(() => expect(listWithdrawals).toHaveBeenCalledTimes(2));
  });
});
