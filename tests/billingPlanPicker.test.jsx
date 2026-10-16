// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => {
  const labels = { 'Billing.MONTHLY': 'Monthly', 'Billing.YEARLY': 'Yearly', 'Billing.CONTINUE_TO_PAYMENT': 'Continue', 'Billing.ERROR_CHECKOUT': 'Checkout error', 'Billing.PER_MONTH': '/ month', 'Billing.PER_YEAR': '/ year', 'Billing.TOKENS_INCLUDED': '{{tokens}} tokens included', 'Billing.SEATS': '{{count}} seats', 'Billing.TERM_MONTHS': '{{count}} months' };
  return Object.entries(values || {}).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), labels[key] || key);
}, i18n: { language: 'en' } }) }));

import { PlanPicker } from '../src/billing/PlanPicker';

afterEach(cleanup);
const plans = [
  { key: 'monthly', kind: 'subscription', name: 'Monthly plan', amount_cents: 1200, interval: 'month', token_allowance: 100 },
  { key: 'yearly', kind: 'subscription', name: 'Yearly plan', amount_cents: 12000, interval: 'year', token_allowance: 1200 },
  { key: 'team', kind: 'team_package', name: 'Team', amount_cents: 5000, seats: 5, term_months: 3, token_allowance: 0 },
  { key: 'tokens', kind: 'token_package', name: 'Tokens', amount_cents: 1000, tokens: 100 },
];

describe('PlanPicker catalogue variants', () => {
  it('omits the interval switch for one interval and excludes token packages by default', () => {
    render(<PlanPicker plans={[plans[0]]} api={{ startCheckout: vi.fn() }} />);
    expect(screen.getByText('Monthly plan')).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' }).disabled).toBe(true);
  });
  it('filters subscriptions by month and year and supports selection', () => {
    render(<PlanPicker plans={plans} api={{ startCheckout: vi.fn() }} />);
    expect(screen.getByText('Monthly plan')).toBeTruthy();
    expect(screen.queryByText('Yearly plan')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Yearly' }));
    expect(screen.getByText('Yearly plan')).toBeTruthy();
    expect(screen.queryByText('Monthly plan')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /Yearly plan/ }));
    expect(screen.getByRole('radio', { name: /Yearly plan/ }).checked).toBe(true);
    expect(screen.getByRole('button', { name: 'Continue' }).disabled).toBe(false);
  });
  it('shows team seats and term and includes token packages only when requested', () => {
    render(<PlanPicker plans={plans.slice(2)} kinds={['team_package', 'token_package']} api={{ startCheckout: vi.fn() }} />);
    expect(screen.getByText('5 seats · 3 months')).toBeTruthy();
    expect(screen.getByText('Tokens')).toBeTruthy();
  });
});

describe('PlanPicker checkout', () => {
  it('starts checkout once and redirects only to a secure URL', async () => {
    const api = { startCheckout: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session' }) };
    const redirect = vi.fn();
    render(<PlanPicker plans={[plans[0]]} api={api} redirect={redirect} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.com/session'));
    expect(api.startCheckout).toHaveBeenCalledOnce();
    expect(api.startCheckout).toHaveBeenCalledWith('monthly');
  });
  it.each(['javascript:alert(1)', 'http://example.test'])('refuses unsafe URL %s and keeps selection', async (url) => {
    const api = { startCheckout: vi.fn().mockResolvedValue({ url }) };
    const redirect = vi.fn();
    render(<PlanPicker plans={[plans[0]]} api={api} redirect={redirect} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Checkout error')).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: /Monthly plan/ }).checked).toBe(true);
  });
  it('shows failures and prevents a second click while checkout is pending', async () => {
    let finish;
    const api = { startCheckout: vi.fn(() => new Promise((resolve) => { finish = resolve; })) };
    render(<PlanPicker plans={[plans[0]]} api={api} redirect={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    const button = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(button); fireEvent.click(button);
    expect(api.startCheckout).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    finish({ url: 'http://unsafe.test' });
    expect(await screen.findByText('Checkout error')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Monthly plan/ }).checked).toBe(true);
  });
  it('shows rejected checkout errors without clearing the choice', async () => {
    render(<PlanPicker plans={[plans[0]]} api={{ startCheckout: vi.fn().mockRejectedValue(new Error('no')) }} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Checkout error')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Monthly plan/ }).checked).toBe(true);
  });
});
