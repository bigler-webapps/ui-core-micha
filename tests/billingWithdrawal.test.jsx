// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key, values) => values ? `${key} ${Object.values(values).join(' ')}` : key,
  i18n: { language: 'en' },
}) }));

import { WithdrawalDialog, describeCalculation } from '../src/billing/WithdrawalDialog';
import { WithdrawalSection } from '../src/billing/WithdrawalSection';
import { SubscriptionSection } from '../src/billing/SubscriptionSection';
import { billingTranslations } from '../src/i18n/billingTranslations';
import { formatDate, formatDateTime, formatPrice } from '../src/billing/format';
import * as kit from '../src/index';

afterEach(cleanup);

const purchase = (id, extra = {}) => ({ id, kind: 'subscription', plan_key: 'month', purchased_at: '2026-01-01T12:00:00Z', amount_paid_cents: 1200, currency: 'usd', eligible: true, reason: '', withdrawn_at: null, ...extra });
const preview = (extra = {}) => ({ eligible: true, amount_paid_cents: 1200, currency: 'usd', time_share_cents: 300, token_share_cents: 500, used_cents: 500, refund_cents: 700, ...extra });
const labels = (amount = 1200) => ({ purchases: [purchase('p1', { amount_paid_cents: amount })] });

describe('withdrawal section', () => {
  it('shows only eligible active purchases with plan, purchase date, deadline and one button each', async () => {
    const api = { listWithdrawals: vi.fn().mockResolvedValue({ purchases: [purchase('one'), purchase('two', { plan_key: 'team' }), purchase('no', { eligible: false }), purchase('done', { withdrawn_at: '2026-01-02T00:00:00Z' })] }) };
    render(<WithdrawalSection api={api} plans={[{ key: 'month', name: 'Monthly' }, { key: 'team', name: 'Team package' }]} />);
    expect(await screen.findAllByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toHaveLength(2);
    expect(screen.getByText('Monthly')).toBeTruthy(); expect(screen.getByText('Team package')).toBeTruthy();
    expect(screen.getAllByText('Billing.WITHDRAWAL_UNTIL January 15, 2026')).toHaveLength(2);
    expect(screen.getAllByText('January 1, 2026')).toHaveLength(2);
    expect(screen.queryByText('no')).toBeNull(); expect(screen.queryByText('done')).toBeNull();
  });
  it('renders nothing without eligible purchases, for a legacy 404, or without the feature method', async () => {
    const { container, rerender } = render(<WithdrawalSection api={{ listWithdrawals: vi.fn().mockResolvedValue({ purchases: [purchase('x', { eligible: false })] }) }} />);
    await waitFor(() => expect(container.textContent).toBe(''));
    rerender(<WithdrawalSection api={{ listWithdrawals: vi.fn().mockRejectedValue({ response: { status: 404 } }) }} />);
    await waitFor(() => expect(container.textContent).toBe(''));
    rerender(<WithdrawalSection api={{}} />);
    expect(container.textContent).toBe('');
  });
  it('shows a retry notice after other list failures', async () => {
    const listWithdrawals = vi.fn().mockRejectedValueOnce({ response: { status: 503 } }).mockResolvedValueOnce(labels());
    render(<WithdrawalSection api={{ listWithdrawals }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.RETRY' }));
    expect(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toBeTruthy();
    expect(listWithdrawals).toHaveBeenCalledTimes(2);
  });
});

describe('withdrawal dialog', () => {
  const openDialog = (api, props = {}) => render(<WithdrawalDialog open purchase={purchase('p1')} api={api} onClose={vi.fn()} {...props} />);
  it('previews once, shows server refund and composed shares, and requires confirmation', async () => {
    const api = { previewWithdrawal: vi.fn().mockResolvedValue(preview()), confirmWithdrawal: vi.fn() };
    openDialog(api);
    expect(await screen.findByText('Billing.WITHDRAWAL_REFUND $7.00')).toBeTruthy();
    const calculation = screen.getByText(/Billing.WITHDRAWAL_CALCULATION/).textContent;
    expect(calculation).toContain('Billing.WITHDRAWAL_PAID $12.00'); expect(calculation).toContain('Billing.WITHDRAWAL_TIME_SHARE $3.00');
    expect(calculation).toContain('Billing.WITHDRAWAL_TOKEN_SHARE $5.00'); expect(calculation).toContain('Billing.WITHDRAWAL_USED $5.00'); expect(calculation).toContain('Billing.WITHDRAWAL_REFUND $7.00');
    expect(api.previewWithdrawal).toHaveBeenCalledOnce(); expect(api.confirmWithdrawal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' }));
    await waitFor(() => expect(api.confirmWithdrawal).toHaveBeenCalledOnce());
  });
  it('uses only token share for token packages and handles zero refunds', () => {
    const translate = (key, values = {}) => `${key} ${Object.values(values).join(' ')}`;
    const desc = describeCalculation({ ...preview({ time_share_cents: 0, token_share_cents: 500, refund_cents: 0 }), kind: 'token_package' }, translate, 'en');
    expect(desc).not.toContain('TIME_SHARE'); expect(desc).toContain('TOKEN_SHARE $5.00'); expect(desc).toContain('USED $5.00');
    const api = { previewWithdrawal: vi.fn().mockResolvedValue(preview({ refund_cents: 0, time_share_cents: 0, token_share_cents: 0 })) };
    openDialog(api);
    return screen.findByText(/Billing.WITHDRAWAL_REFUND_NONE/);
  });
  it('guards double confirmation and shows the success receipt once', async () => {
    let finish;
    const result = { refund_cents: 700, currency: 'usd', withdrawn_at: '2026-02-01T14:30:00Z' };
    const onWithdrawn = vi.fn();
    const api = { previewWithdrawal: vi.fn().mockResolvedValue(preview()), confirmWithdrawal: vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve; })) };
    openDialog(api, { onWithdrawn });
    const confirm = await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(api.confirmWithdrawal).toHaveBeenCalledOnce();
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    finish(result);
    expect(await screen.findByText('Billing.WITHDRAWAL_DONE')).toBeTruthy();
    expect(screen.getByText(/Billing.WITHDRAWAL_DONE_DETAIL February 1, 2026.*\d{1,2}:\d{2}/)).toBeTruthy();
    expect(onWithdrawn).toHaveBeenCalledOnce();
  });
  it('preview-ineligible purchases cannot be confirmed', async () => {
    const api = { previewWithdrawal: vi.fn().mockResolvedValue({ ...preview(), eligible: false }), confirmWithdrawal: vi.fn() };
    const onClose = vi.fn();
    openDialog(api, { onClose });
    expect(await screen.findByText('Billing.WITHDRAWAL_NOT_POSSIBLE')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Billing.WITHDRAWAL_CLOSE' }));
    expect(onClose).toHaveBeenCalledOnce(); expect(api.confirmWithdrawal).not.toHaveBeenCalled();
  });
  it('cancel closes a ready dialog without sending a confirmation', async () => {
    const api = { previewWithdrawal: vi.fn().mockResolvedValue(preview()), confirmWithdrawal: vi.fn() };
    const onClose = vi.fn(); openDialog(api, { onClose });
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_CANCEL' }));
    expect(onClose).toHaveBeenCalledOnce(); expect(api.confirmWithdrawal).not.toHaveBeenCalled();
  });
  it('maps a 409 confirmation to not possible and shows stored already-withdrawn results as success', async () => {
    const api = { previewWithdrawal: vi.fn().mockResolvedValue(preview()), confirmWithdrawal: vi.fn().mockRejectedValue({ response: { status: 409 } }) };
    openDialog(api);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' }));
    expect(await screen.findByText('Billing.WITHDRAWAL_NOT_POSSIBLE')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' })).toBeNull();

    cleanup();
    const successApi = { previewWithdrawal: vi.fn().mockResolvedValue(preview()), confirmWithdrawal: vi.fn().mockResolvedValue({ already_withdrawn: true, withdrawn_at: '2026-02-01T14:30:00Z' }) };
    openDialog(successApi);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' }));
    expect(await screen.findByText('Billing.WITHDRAWAL_DONE')).toBeTruthy();
  });
  it('retries preview and allows a failed confirmation to be retried', async () => {
    const api = { previewWithdrawal: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(preview()), confirmWithdrawal: vi.fn().mockRejectedValueOnce({ response: { status: 502 } }).mockResolvedValue({ withdrawn_at: '2026-02-01T14:30:00Z' }) };
    openDialog(api);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.RETRY' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' }));
    expect(await screen.findByText('Billing.WITHDRAWAL_ERROR')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' }));
    expect(await screen.findByText('Billing.WITHDRAWAL_DONE')).toBeTruthy();
    expect(api.confirmWithdrawal).toHaveBeenCalledTimes(2);
  });
});

describe('withdrawal integration and helpers', () => {
  const me = { access: { status: 'active', source: 'free', ends_at: null }, tokens: { balance: 1 }, plans: [{ key: 'month', kind: 'subscription', name: 'Monthly' }] };
  it.each(['active', 'read_only'])('shows the eligible withdrawal control in %s state', async (status) => {
    const api = { getMe: vi.fn().mockResolvedValue({ ...me, access: { ...me.access, status } }), listSeats: vi.fn(), listWithdrawals: vi.fn().mockResolvedValue(labels()) };
    render(<SubscriptionSection api={api} />);
    expect(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toBeTruthy();
  });
  it('supports disabling the feature and reloads billing after success', async () => {
    const api = { getMe: vi.fn().mockResolvedValue(me), listSeats: vi.fn(), listWithdrawals: vi.fn().mockResolvedValue(labels()), previewWithdrawal: vi.fn().mockResolvedValue(preview()), confirmWithdrawal: vi.fn().mockResolvedValue({ withdrawn_at: '2026-02-01T14:30:00Z' }) };
    const { rerender } = render(<SubscriptionSection api={api} withdrawal={false} />);
    expect(await screen.findAllByText('Billing.BALANCE 1')).toHaveLength(2); expect(api.listWithdrawals).not.toHaveBeenCalled();
    rerender(<SubscriptionSection api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' }));
    await waitFor(() => expect(api.getMe).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Billing.WITHDRAWAL_DONE')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toBeNull();
  });
  it('formats currency, currency fallbacks, viewer-local date/time and validates date values', () => {
    expect(formatPrice(1234, 'en', 'eur')).toContain('€'); expect(formatPrice(1234, 'en', 'bad-code')).toContain('$');
    expect(formatDate('2026-01-01T12:00:00Z', 'en')).toBe('January 1, 2026');
    expect(formatDateTime('bad', 'en')).toBe(''); expect(formatDateTime('2026-01-01T12:00:00Z', 'en')).toContain('2026');
  });
  it('includes all withdrawal translation keys and identical placeholders in every language', () => {
    const keys = Object.keys(billingTranslations).filter((key) => key.startsWith('Billing.WITHDRAWAL_'));
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) {
      const row = billingTranslations[key];
      for (const language of ['de', 'en', 'fr', 'sw']) expect(row[language]).toBeTruthy();
      const placeholders = (value) => [...value.matchAll(/{{(.*?)}}/g)].map((match) => match[1]).sort();
      expect(placeholders(row.de)).toEqual(placeholders(row.en)); expect(placeholders(row.de)).toEqual(placeholders(row.fr)); expect(placeholders(row.de)).toEqual(placeholders(row.sw));
    }
    expect(kit.WithdrawalSection).toBeTypeOf('function'); expect(kit.WithdrawalDialog).toBeTypeOf('function');
  });
});
