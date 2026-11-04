// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key, values = {}) => {
    const labels = {
      'Billing.CONTRACT_PHASE_INITIAL': 'Initial contract period', 'Billing.CONTRACT_PHASE_CONTINUATION': 'Continuation period', 'Billing.CONTRACT_PHASE_NONE': 'No current contract period',
      'Billing.CONTRACT_STATUS_ACTIVE': 'Active', 'Billing.CONTRACT_STATUS_CANCELLATION_SCHEDULED': 'Cancellation scheduled', 'Billing.CONTRACT_STATUS_ENDED': 'Ended', 'Billing.CONTRACT_STATUS_WITHDRAWN': 'Withdrawn',
      'Billing.CONTRACT_DECLARATION': '{{kind}} · {{status}}', 'Billing.CONTRACT_STARTED_AT': 'Started: {{date}}', 'Billing.CONTRACT_PAID_THROUGH': 'Paid through {{date}}', 'Billing.CONTRACT_NEXT_CHARGE': 'Next charge: {{amount}}', 'Billing.CONTRACT_NEXT_CHARGE_DATE': 'Due on {{date}}', 'Billing.CONTRACT_NEXT_ALLOWANCE': 'Allowance after renewal: {{tokens}} tokens', 'Billing.CONTRACT_CANCEL_EFFECTIVE': 'Cancellation effective on {{date}}', 'Billing.CONTRACT_REFUND_DUE': 'Expected by {{date}}',
      'Billing.CANCEL_OPEN': 'Cancel contracts here', 'Billing.CANCEL_TITLE': 'Cancel contract', 'Billing.CANCEL_TYPE_LABEL': 'Cancellation type', 'Billing.CANCEL_ORDINARY': 'Ordinary cancellation', 'Billing.CANCEL_EXTRAORDINARY': 'Extraordinary cancellation', 'Billing.CANCEL_REQUESTED_END_DATE': 'Requested contract end date', 'Billing.CANCEL_REASON': 'Reason', 'Billing.CANCEL_REASON_REQUIRED': 'Enter a reason', 'Billing.CANCEL_SUBMIT': 'Confirm cancellation', 'Billing.CANCEL_SUCCESS': 'Cancellation submitted', 'Billing.CANCEL_SUCCESS_EFFECTIVE': 'The contract ends on {{date}}', 'Billing.CANCEL_PENDING_REVIEW': 'Cancellation pending review', 'Billing.CANCEL_ERROR': 'Could not submit cancellation',
      'Billing.REFUND_STATUS_PENDING': 'Refund pending', 'Billing.REFUND_STATUS_REQUESTED': 'Refund requested', 'Billing.REFUND_STATUS_SUCCEEDED': 'Refund paid', 'Billing.REFUND_STATUS_FAILED': 'Refund failed', 'Billing.REFUND_STATUS_REQUIRES_ACTION': 'Refund requires action', 'Billing.REFUND_STATUS_CANCELLED': 'Refund cancelled', 'Billing.REFUND_STATUS_UNKNOWN': 'Refund status unknown',
      'Billing.PLAN_CONTINUATION': 'Then {{amount}} monthly for {{tokens}} tokens; cancellable monthly', 'Billing.TOKENS_INCLUDED': '{{tokens}} tokens included', 'Billing.PER_YEAR': '/ year', 'Billing.LOADING': 'Loading', 'Billing.WITHDRAWAL_CANCEL': 'Cancel', 'Billing.WITHDRAWAL_CLOSE': 'Close', 'Billing.ERROR_LOAD': 'Load error', 'Billing.HEADING': 'Billing', 'Billing.SOURCE_FREE': 'Free access', 'Billing.BALANCE_LABEL': 'Token balance', 'Billing.BALANCE': 'Balance {{tokens}} tokens', 'Billing.BUY_PACKAGE': 'Buy token package',
    };
    let result = labels[key] || key;
    for (const [name, value] of Object.entries(values || {})) result = result.replaceAll(`{{${name}}}`, String(value));
    return result;
  },
  i18n: { language: 'en' },
}) }));

vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import apiClient from '../src/auth/apiClient';
import { createBillingApi } from '../src/billing/api';
import { billingApiUrls } from '../src/billing/wire';
import { ContractSummary } from '../src/billing/ContractSummary';
import { CancellationDialog } from '../src/billing/CancellationDialog';
import { SubscriptionSection } from '../src/billing/SubscriptionSection';
import { PlanPicker } from '../src/billing/PlanPicker';
import { billingTranslations } from '../src/i18n/billingTranslations';
import * as kit from '../src/index';

afterEach(cleanup);
beforeEach(() => {
  apiClient.get.mockReset().mockResolvedValue({ data: {} });
  apiClient.post.mockReset().mockResolvedValue({ data: {} });
});

const contract = (extra = {}) => ({
  reference: 'contract-1', kind: 'subscription', plan_key: 'annual', plan_name: 'Annual plan', phase: 'initial', status: 'active',
  started_at: '2026-01-01T00:00:00Z', initial_term_end: '2027-01-01T00:00:00Z', current_period_end: '2026-04-01T00:00:00Z',
  next_charge: { amount_cents: 1200, currency: 'usd', date: '2027-01-01T00:00:00Z', token_allowance: 100 }, cancel_effective_at: null, refunds: [], ...extra,
});

describe('contract summary', () => {
  it('shows initial phase, paid-through date, and continuation charge details', () => {
    render(<ContractSummary contract={contract()} />);
    expect(screen.getByText('Initial contract period')).toBeTruthy();
    expect(screen.getByText('Paid through January 1, 2027')).toBeTruthy();
    expect(screen.getByText('Next charge: $12.00')).toBeTruthy();
    expect(screen.getByText('Due on January 1, 2027')).toBeTruthy();
    expect(screen.getByText('Allowance after renewal: 100 tokens')).toBeTruthy();
  });

  it('shows continuation phase and current paid-through date', () => {
    render(<ContractSummary contract={contract({ phase: 'continuation', current_period_end: '2026-04-01T00:00:00Z' })} />);
    expect(screen.getByText('Continuation period')).toBeTruthy();
    expect(screen.getByText('Paid through April 1, 2026')).toBeTruthy();
  });

  it('shows scheduled cancellation and each refund status without treating pending as paid', () => {
    const refunds = ['pending', 'requested', 'succeeded', 'failed', 'requires_action', 'cancelled'].map((status) => ({ status, amount_cents: 1200, currency: 'usd', due_by: '2026-02-01T00:00:00Z' }));
    render(<ContractSummary contract={contract({ status: 'cancellation_scheduled', cancel_effective_at: '2026-12-31T00:00:00Z', refunds })} />);
    expect(screen.getByText('Cancellation scheduled')).toBeTruthy();
    expect(screen.getByText('Cancellation effective on December 31, 2026')).toBeTruthy();
    for (const status of ['Refund pending', 'Refund requested', 'Refund paid', 'Refund failed', 'Refund requires action', 'Refund cancelled']) expect(screen.getByText(status)).toBeTruthy();
    expect(screen.queryByText('Refund paid', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText('Refund pending').textContent).not.toContain('paid');
  });

  it('labels each refund by its own status and never shows a pending refund as paid', () => {
    render(<ContractSummary contract={contract({ refunds: [{ status: 'pending', amount_cents: 1200, currency: 'usd' }] })} />);
    expect(screen.getByText('Refund pending')).toBeTruthy();
    expect(screen.queryByText('Refund paid')).toBeNull();
    expect(screen.queryByText('Refund requested')).toBeNull();
  });

  it('translates declaration kind and status instead of showing server values', () => {
    render(<ContractSummary contract={contract({ declarations: [{ reference: 'D-1', kind: 'cancellation', status: 'awaiting_confirmation' }] })} />);
    expect(screen.queryByText(/awaiting_confirmation/)).toBeNull();
    expect(screen.getByText('Billing.DECLARATION_CANCELLATION · Billing.DECLARATION_STATUS_AWAITING_CONFIRMATION')).toBeTruthy();
  });

  it('lists every contract from the contract endpoint even when me names one', async () => {
    const second = contract({ reference: 'contract-2', plan_name: 'Second plan' });
    const api = {
      getMe: vi.fn().mockResolvedValue({ access: { status: 'active', source: 'free', ends_at: null }, tokens: { balance: 1 }, contract: contract() }),
      listContracts: vi.fn().mockResolvedValue({ contracts: [contract(), second] }),
      listWithdrawals: vi.fn().mockResolvedValue({ purchases: [] }),
    };
    render(<SubscriptionSection api={api} withdrawal={false} />);
    expect(await screen.findByText('Second plan')).toBeTruthy();
    expect(screen.getByText('Annual plan')).toBeTruthy();
  });
});

describe('cancellation dialog and contract integration', () => {
  const sectionApi = (extra = {}) => ({
    getMe: vi.fn().mockResolvedValue({ access: { status: 'active', source: 'free', ends_at: null }, tokens: { balance: 1 }, contract: contract() }),
    ...extra,
  });

  it('opens from the contract action and an ordinary cancellation without a date sends no date', async () => {
    const api = sectionApi({ cancelContract: vi.fn().mockResolvedValue({ declaration: { reference: 'dec-1', effective_at: '2026-12-31T00:00:00Z' } }) });
    render(<SubscriptionSection api={api} withdrawal={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel contracts here' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    await waitFor(() => expect(api.cancelContract).toHaveBeenCalledOnce());
    expect(api.cancelContract).toHaveBeenCalledWith('contract-1', { cancellation_type: 'ordinary' });
    expect(await screen.findByText('The contract ends on December 31, 2026')).toBeTruthy();
  });

  it('sends an optional requested date and the required extraordinary reason', async () => {
    const api = { cancelContract: vi.fn().mockResolvedValue({ declaration: { effective_at: null } }) };
    render(<CancellationDialog open contract={contract()} api={api} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Requested contract end date'), { target: { value: '2026-11-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    await waitFor(() => expect(api.cancelContract).toHaveBeenCalledWith('contract-1', { cancellation_type: 'ordinary', requested_end_date: '2026-11-30' }));
    expect(await screen.findByText('Cancellation pending review')).toBeTruthy();

    cleanup();
    render(<CancellationDialog open contract={contract()} api={api} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Extraordinary cancellation'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByText('Enter a reason')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: /Reason/ }), { target: { value: 'Material breach' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    await waitFor(() => expect(api.cancelContract).toHaveBeenLastCalledWith('contract-1', { cancellation_type: 'extraordinary', reason: 'Material breach' }));
  });

  it('guards double submit and allows a failed cancellation to retry', async () => {
    let finish;
    const api = { cancelContract: vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ declaration: { effective_at: null } }) };
    render(<CancellationDialog open contract={contract()} api={api} onClose={vi.fn()} />);
    const submit = screen.getByRole('button', { name: 'Confirm cancellation' });
    fireEvent.click(submit); fireEvent.click(submit);
    expect(api.cancelContract).toHaveBeenCalledOnce();
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    finish({ declaration: { effective_at: null } });
    expect(await screen.findByText('Cancellation pending review')).toBeTruthy();

    cleanup();
    render(<CancellationDialog open contract={contract()} api={api} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByText('Could not submit cancellation')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    await waitFor(() => expect(api.cancelContract).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('Cancellation pending review')).toBeTruthy();
  });

  it('loads contracts from contracts/ when me has no contract field and treats a 404 as unsupported', async () => {
    const fromList = contract({ phase: 'continuation' });
    const api = { getMe: vi.fn().mockResolvedValue({ access: { status: 'active', source: 'free', ends_at: null }, tokens: { balance: 1 } }), listContracts: vi.fn().mockResolvedValue({ contracts: [fromList] }) };
    render(<SubscriptionSection api={api} withdrawal={false} />);
    expect(await screen.findByText('Continuation period')).toBeTruthy();
    expect(api.listContracts).toHaveBeenCalledOnce();

    cleanup();
    const noSupport = { ...api, listContracts: vi.fn().mockRejectedValue({ response: { status: 404 } }) };
    const { container } = render(<SubscriptionSection api={noSupport} withdrawal={false} />);
    await waitFor(() => expect(noSupport.listContracts).toHaveBeenCalledOnce());
    expect(container.textContent).not.toContain('Contract details could not be loaded');
  });
});

describe('billing API contract endpoints', () => {
  it('encodes contract references and exposes public declaration calls', async () => {
    const urls = billingApiUrls('/v2/billing');
    expect(urls.contracts).toBe('/v2/billing/contracts/');
    expect(urls.contractCancel('a/b')).toBe('/v2/billing/contracts/a%2Fb/cancel/');
    expect(urls.contractWithdraw('a/b')).toBe('/v2/billing/contracts/a%2Fb/withdraw/');
    const api = createBillingApi({}, { apiBase: '/v2/billing' });
    await api.listContracts(); expect(apiClient.get).toHaveBeenLastCalledWith('/v2/billing/contracts/');
    await api.cancelContract('a/b', { cancellation_type: 'ordinary' }); expect(apiClient.post).toHaveBeenLastCalledWith('/v2/billing/contracts/a%2Fb/cancel/', { cancellation_type: 'ordinary' });
    await api.withdrawContract('a/b'); expect(apiClient.post).toHaveBeenLastCalledWith('/v2/billing/contracts/a%2Fb/withdraw/', { confirm: true });
    await api.primeDeclarationCsrf(); expect(apiClient.get).toHaveBeenLastCalledWith('/v2/billing/public/declarations/csrf/');
    await api.submitDeclaration({ kind: 'withdrawal' }); expect(apiClient.post).toHaveBeenLastCalledWith('/v2/billing/public/declarations/', { kind: 'withdrawal' });
    await api.confirmDeclaration('token'); expect(apiClient.post).toHaveBeenLastCalledWith('/v2/billing/public/declarations/confirm/', { token: 'token' });
  });
});

describe('annual continuation plans and translations', () => {
  it('shows the first-year price and allowance plus monthly continuation price, allowance and cancellation cadence', () => {
    render(<PlanPicker plans={[{ key: 'annual', kind: 'subscription', name: 'Annual plan', interval: 'year', amount_cents: 12000, token_allowance: 1200, continuation: { amount_cents: 1200, interval: 'month', token_allowance: 100 } }]} api={{ startCheckout: vi.fn() }} />);
    expect(screen.getByText('Annual plan')).toBeTruthy();
    expect(screen.getByText('$120.00/ year')).toBeTruthy();
    expect(screen.getByText('1,200 tokens included')).toBeTruthy();
    expect(screen.getByText('Then $12.00 monthly for 100 tokens; cancellable monthly')).toBeTruthy();
  });

  it('shows no continuation line for a plan without continuation and uses each plan\'s own values', () => {
    render(<PlanPicker plans={[
      { key: 'monthly', kind: 'subscription', name: 'Monthly plan', interval: 'month', amount_cents: 600, token_allowance: 120 },
      { key: 'annual', kind: 'subscription', name: 'Annual plan', interval: 'year', amount_cents: 5000, token_allowance: 1200, continuation: { amount_cents: 500, interval: 'month', token_allowance: 100 } },
    ]} kinds={['subscription']} api={{ startCheckout: vi.fn() }} />);
    expect(screen.queryAllByText(/^Then /)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Billing.YEARLY|yearly/i }));
    expect(screen.getAllByText(/^Then /)).toHaveLength(1);
    expect(screen.getByText('Then $5.00 monthly for 100 tokens; cancellable monthly')).toBeTruthy();
  });

  it('carries the required action labels and tax disclosure verbatim in German and English', () => {
    expect(billingTranslations['Billing.CANCEL_OPEN']).toMatchObject({ de: 'Verträge hier kündigen', en: 'Cancel contracts here' });
    expect(billingTranslations['Billing.CANCEL_SUBMIT']).toMatchObject({ de: 'Jetzt kündigen', en: 'Confirm cancellation' });
    expect(billingTranslations['Billing.WITHDRAW_CONTRACT']).toMatchObject({ de: 'Vertrag widerrufen', en: 'Withdraw from contract' });
    expect(billingTranslations['Billing.WITHDRAWAL_CONFIRM']).toMatchObject({ de: 'Widerruf bestätigen', en: 'Confirm withdrawal' });
    expect(billingTranslations['Billing.PLAN_CONTINUATION'].de).toContain('zuzüglich anfallender Steuern');
    expect(billingTranslations['Billing.PLAN_CONTINUATION'].en).toContain('plus applicable taxes');
  });

  it('gives every new key all five locales with matching placeholders and exports the opt-in components', () => {
    const prefixes = ['Billing.CONTRACT_', 'Billing.CANCEL_', 'Billing.DECLARATION_', 'Billing.REFUND_STATUS_'];
    const direct = ['Billing.WITHDRAW_CONTRACT', 'Billing.WITHDRAWAL_PAID_TOTAL', 'Billing.WITHDRAWAL_REFUNDED_BEFORE', 'Billing.PLAN_CONTINUATION'];
    const keys = [...new Set([...Object.keys(billingTranslations).filter((key) => prefixes.some((prefix) => key.startsWith(prefix))), ...direct])];
    const placeholders = (value) => [...value.matchAll(/{{(.*?)}}/g)].map((match) => match[1]).sort();
    expect(keys.length).toBeGreaterThan(35);
    for (const key of keys) {
      const row = billingTranslations[key];
      for (const locale of ['de', 'de_informal', 'en', 'fr', 'sw']) {
        expect(row[locale], `${key}.${locale}`).toBeTruthy();
        expect(placeholders(row[locale]), `${key}.${locale}`).toEqual(placeholders(row.de));
      }
    }
    expect(kit.ContractSummary).toBeTypeOf('function');
    expect(kit.CancellationDialog).toBeTypeOf('function');
    expect(kit.DeclarationForm).toBeTypeOf('function');
    expect(kit.DeclarationConfirm).toBeTypeOf('function');
  });
});
