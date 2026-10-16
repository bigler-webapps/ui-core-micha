// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
    i18n: { language: 'de_informal' },
  }),
}));
vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import apiClient from '../src/auth/apiClient';
import { createBillingApi } from '../src/billing/api';
import { WithdrawalDialog, describeCalculation } from '../src/billing/WithdrawalDialog';
import { WithdrawalSection } from '../src/billing/WithdrawalSection';
import { billingTranslations } from '../src/i18n/billingTranslations';
import { formatDate, formatDateTime, formatPrice, formatTokens } from '../src/billing/format';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const REQUIRED_KEYS = ['BUTTON', 'UNTIL', 'TITLE', 'EFFECT', 'REFUND', 'REFUND_NONE', 'CALCULATION', 'CONFIRM', 'CANCEL', 'DONE', 'DONE_DETAIL', 'PREVIEW_ERROR', 'NOT_POSSIBLE', 'ERROR', 'LOAD_ERROR', 'PAID', 'TIME_SHARE', 'TOKEN_SHARE', 'USED', 'CLOSE'];

describe('withdrawal review fixes', () => {
  it('ships every required key with all four languages and a du copy', () => {
    for (const name of REQUIRED_KEYS) {
      const row = billingTranslations[`Billing.WITHDRAWAL_${name}`];
      expect(row, name).toBeTruthy();
      for (const language of ['de', 'en', 'fr', 'sw']) expect(row[language], `${name} ${language}`).toBeTruthy();
    }
  });

  it('the API methods call the right endpoints and confirm with confirm:true', async () => {
    apiClient.get.mockResolvedValue({ data: { ok: 1 } });
    apiClient.post.mockResolvedValue({ data: { ok: 2 } });
    const api = createBillingApi({}, { apiBase: '/v2/billing' });
    await api.listWithdrawals();
    expect(apiClient.get).toHaveBeenLastCalledWith('/v2/billing/withdrawal/');
    await api.previewWithdrawal('a/b');
    expect(apiClient.get).toHaveBeenLastCalledWith('/v2/billing/withdrawal/a%2Fb/preview/');
    expect(await api.confirmWithdrawal(7)).toEqual({ ok: 2 });
    expect(apiClient.post).toHaveBeenLastCalledWith('/v2/billing/withdrawal/7/', { confirm: true });
  });

  it('shows the used amount the server reports', () => {
    const text = describeCalculation({ currency: 'usd', amount_paid_cents: 1200, time_share_cents: 300, token_share_cents: 500, used_cents: 100, refund_cents: 1100 }, (key, values) => `${key}=${values?.amount}`, 'en');
    expect(text).toContain('Billing.WITHDRAWAL_USED=$1.00');
  });

  it('offers no confirmation unless the server says eligible is exactly true', async () => {
    const api = { previewWithdrawal: vi.fn().mockResolvedValue({ eligible: 'false', refund_cents: 100, currency: 'usd' }), confirmWithdrawal: vi.fn() };
    render(<WithdrawalDialog open purchase={{ id: 1, kind: 'subscription' }} api={api} onClose={() => {}} />);
    expect(await screen.findByText('Billing.WITHDRAWAL_NOT_POSSIBLE')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Billing.WITHDRAWAL_CONFIRM' })).toBeNull();
  });

  it('renders for the kit language code de_informal without a locale error', async () => {
    expect(formatDate('2026-01-01T12:00:00Z', 'de_informal')).toContain('2026');
    expect(formatDateTime('2026-01-01T12:00:00Z', 'de_informal')).toContain('2026');
    expect(formatPrice(1234, 'de_informal', 'eur')).toContain('€');
    expect(formatTokens(1234567, 'de_informal')).toContain('1');
    const api = { listWithdrawals: vi.fn().mockResolvedValue({ purchases: [{ id: 'p1', kind: 'subscription', plan_key: 'm', purchased_at: '2026-01-01T12:00:00Z', amount_paid_cents: 1200, currency: 'usd', eligible: true, reason: '', withdrawn_at: null }] }) };
    render(<WithdrawalSection api={api} plans={[]} />);
    expect(await screen.findByRole('button', { name: 'Billing.WITHDRAWAL_BUTTON' })).toBeTruthy();
  });
});

describe('token package wording', () => {
  it('says the unused tokens are removed for a token package and keeps the renewal sentence otherwise', async () => {
    const api = { previewWithdrawal: vi.fn().mockResolvedValue({ eligible: true, amount_paid_cents: 1000, currency: 'usd', time_share_cents: 0, token_share_cents: 200, used_cents: 200, refund_cents: 800 }), confirmWithdrawal: vi.fn() };
    const { rerender } = render(<WithdrawalDialog open purchase={{ id: 1, kind: 'token_package' }} api={api} onClose={() => {}} />);
    expect(await screen.findByText('Billing.WITHDRAWAL_EFFECT_TOKENS')).toBeTruthy();
    expect(screen.queryByText('Billing.WITHDRAWAL_EFFECT')).toBeNull();
    rerender(<WithdrawalDialog open purchase={{ id: 2, kind: 'subscription' }} api={api} onClose={() => {}} />);
    expect(await screen.findByText('Billing.WITHDRAWAL_EFFECT')).toBeTruthy();
  });
});

describe('token package copy', () => {
  it('pins the sentence in every language and keeps the renewal sentence for other purchases', () => {
    const row = billingTranslations['Billing.WITHDRAWAL_EFFECT_TOKENS'];
    expect(row.de).toBe('Mit dem Widerruf werden die noch nicht verbrauchten Token aus diesem Kauf entfernt.');
    expect(row.de_informal).toBe(row.de);
    expect(row.en).toBe('Withdrawing removes the unused tokens from this purchase.');
    expect(row.fr).toBeTruthy();
    expect(row.sw).toBeTruthy();
    for (const language of ['de', 'en', 'fr', 'sw']) expect(row[language]).not.toMatch(/renew|verläng|renouvel|sasish/i);
    expect(billingTranslations['Billing.WITHDRAWAL_EFFECT'].en).toMatch(/not renew/);
  });
});
