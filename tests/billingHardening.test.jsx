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

import { PlanPicker } from '../src/billing/PlanPicker';
import { SubscriptionSection } from '../src/billing/SubscriptionSection';
import { TokenBalanceBadge } from '../src/billing/TokenBalanceBadge';
import { TokenCostPreview } from '../src/billing/TokenCostPreview';
import { isTrustedPaymentUrl } from '../src/billing/safeUrl';

afterEach(cleanup);

const plans = [
  { key: 'monthly', kind: 'subscription', name: 'Monthly plan', amount_cents: 1200, interval: 'month', token_allowance: 100000 },
  { key: 'yearly', kind: 'subscription', name: 'Yearly plan', amount_cents: 12000, interval: 'year', token_allowance: 1200000 },
];
const goodMe = (overrides = {}) => ({
  access: { status: 'active', source: 'subscription', ends_at: '2026-12-15T00:00:00Z' },
  tokens: { balance: 1153 },
  plans: [{ key: 'pack', kind: 'token_package', name: 'Pack', amount_cents: 1000, tokens: 100000 }],
  ...overrides,
});

describe('payment link check', () => {
  it.each([
    ['https://checkout.stripe.com/c/pay/abc', true],
    ['https://billing.stripe.com/p/session/x', true],
    ['HTTPS://Checkout.Stripe.com/x', true],
    ['http://checkout.stripe.com/x', false],
    ['javascript:alert(1)', false],
    ['data:text/html,<b>x</b>', false],
    ['https://attacker.example/phishing', false],
    ['https://checkout.stripe.com.attacker.example/x', false],
    ['https://evilstripe.com/x', false],
    ['https://stripe.com/x', false],
    ['https://user:secret@checkout.stripe.com/x', false],
    ['//checkout.stripe.com/x', false],
    ['', false],
    [undefined, false],
    [{ href: 'https://checkout.stripe.com/x' }, false],
  ])('%s -> %s', (value, trusted) => {
    expect(isTrustedPaymentUrl(value)).toBe(trusted);
  });

  it('lets an app replace the allowed hosts', () => {
    expect(isTrustedPaymentUrl('https://pay.example.test/x', ['pay.example.test'])).toBe(true);
    expect(isTrustedPaymentUrl('https://checkout.stripe.com/x', ['pay.example.test'])).toBe(false);
    expect(isTrustedPaymentUrl('https://a.pay.example.test/x', ['*.pay.example.test'])).toBe(true);
  });
});

describe('PlanPicker hardening', () => {
  it('shows price, interval and the included tokens of each plan', () => {
    render(<PlanPicker plans={plans} api={{ startCheckout: vi.fn() }} />);
    expect(screen.getByText(/\$12\.00/)).toBeTruthy();
    expect(screen.getByText(/Billing\.PER_MONTH/)).toBeTruthy();
    expect(screen.getByText('Billing.TOKENS_INCLUDED 100,000')).toBeTruthy();
  });

  it('does not follow a link to another host', async () => {
    const redirect = vi.fn();
    const api = { startCheckout: vi.fn().mockResolvedValue({ url: 'https://attacker.example/phishing' }) };
    render(<PlanPicker plans={plans} api={api} redirect={redirect} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Billing.CONTINUE_TO_PAYMENT' }));
    expect(await screen.findByText('Billing.ERROR_CHECKOUT')).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('follows a link to a host the app allowed', async () => {
    const redirect = vi.fn();
    const api = { startCheckout: vi.fn().mockResolvedValue({ url: 'https://pay.example.test/session' }) };
    render(<PlanPicker plans={plans} api={api} redirect={redirect} allowedHosts={['pay.example.test']} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Billing.CONTINUE_TO_PAYMENT' }));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://pay.example.test/session'));
  });

  it('forgets a selected plan that the interval switch hides, so it cannot be checked out', () => {
    const api = { startCheckout: vi.fn() };
    render(<PlanPicker plans={plans} api={api} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    expect(screen.getByRole('button', { name: 'Billing.CONTINUE_TO_PAYMENT' }).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Billing.YEARLY' }));
    expect(screen.queryByRole('radio', { name: /Monthly plan/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Billing.CONTINUE_TO_PAYMENT' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Billing.CONTINUE_TO_PAYMENT' }));
    expect(api.startCheckout).not.toHaveBeenCalled();
  });

  it('forgets the choice for good when the interval is switched away and back', () => {
    render(<PlanPicker plans={plans} api={{ startCheckout: vi.fn() }} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Billing.YEARLY' }));
    fireEvent.click(screen.getByRole('button', { name: 'Billing.MONTHLY' }));
    expect(screen.getByRole('radio', { name: /Monthly plan/ }).checked).toBe(false);
    expect(screen.getByRole('button', { name: 'Billing.CONTINUE_TO_PAYMENT' }).disabled).toBe(true);
  });

  it('keeps exactly one plan checked', () => {
    const teamPlan = { key: 'team', kind: 'team_package', name: 'Team plan', amount_cents: 5000, seats: 5, term_months: 3, token_allowance: 0 };
    render(<PlanPicker plans={[plans[0], teamPlan]} api={{ startCheckout: vi.fn() }} />);
    fireEvent.click(screen.getByRole('radio', { name: /Monthly plan/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Team plan/ }));
    expect(screen.getByRole('radio', { name: /Monthly plan/ }).checked).toBe(false);
    expect(screen.getByRole('radio', { name: /Team plan/ }).checked).toBe(true);
  });

  it('is a labelled radio group', () => {
    render(<PlanPicker plans={plans} api={{ startCheckout: vi.fn() }} />);
    expect(screen.getByRole('radiogroup', { name: 'Billing.PLANS' })).toBeTruthy();
  });
});

describe('SubscriptionSection hardening', () => {
  it('does not follow an untrusted portal or package link', async () => {
    const redirect = vi.fn();
    const api = {
      getMe: vi.fn().mockResolvedValue(goodMe()),
      openPortal: vi.fn().mockResolvedValue({ url: 'https://attacker.example/portal' }),
      startCheckout: vi.fn().mockResolvedValue({ url: 'http://checkout.stripe.com/insecure' }),
      listSeats: vi.fn(),
    };
    render(<SubscriptionSection api={api} redirect={redirect} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Billing.MANAGE' }));
    expect(await screen.findByText('Billing.ERROR_PORTAL')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Billing.PACKAGE_BUY' }));
    expect(await screen.findByText('Billing.ERROR_CHECKOUT')).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ['an invalid end date', goodMe({ access: { status: 'active', source: 'subscription', ends_at: 'not-a-date' } })],
    ['a negative balance', goodMe({ tokens: { balance: -1 } })],
    ['a balance that is a string', goodMe({ tokens: { balance: '1153' } })],
    ['a fractional balance', goodMe({ tokens: { balance: 1.5 } })],
    ['no tokens object', goodMe({ tokens: undefined })],
    ['an unknown source', goodMe({ access: { status: 'active', source: 'gift', ends_at: null } })],
  ])('treats %s as an error and never shows an active account', async (_name, me) => {
    render(<SubscriptionSection api={{ getMe: vi.fn().mockResolvedValue(me), listSeats: vi.fn() }} />);
    expect(await screen.findByText('Billing.ERROR_LOAD')).toBeTruthy();
    expect(screen.queryByText('Billing.SOURCE_SUBSCRIPTION')).toBeNull();
    expect(screen.queryByText(/Billing\.BALANCE/)).toBeNull();
  });
});

describe('seat loading', () => {
  it('explains a failed seat load for a team payer instead of showing nothing', async () => {
    const api = {
      getMe: vi.fn().mockResolvedValue(goodMe({ access: { status: 'active', source: 'team', ends_at: '2026-12-15T00:00:00Z' } })),
      listSeats: vi.fn().mockRejectedValue({ response: { status: 500 } }),
    };
    render(<SubscriptionSection api={api} />);
    expect(await screen.findByText('Billing.SOURCE_TEAM')).toBeTruthy();
    expect(await screen.findByText('Billing.ERROR_LOAD')).toBeTruthy();
  });
});

describe('token numbers', () => {
  it('shows no badge for a negative or fractional balance', () => {
    const { container } = render(<><TokenBalanceBadge balance={-5} /><TokenBalanceBadge balance={2.5} /></>);
    expect(container.textContent).toBe('');
  });

  it('shows no cost preview for a negative or fractional alternative', () => {
    const { container } = render(<>
      <TokenCostPreview cost={3} balance={10} alternatives={[{ label: 'with translation', cost: -2 }]} />
      <TokenCostPreview cost={3} balance={10} alternatives={[{ label: 'with translation', cost: 2.5 }]} />
    </>);
    expect(container.textContent).toBe('');
  });

  it('shows no cost preview for a negative or fractional number', () => {
    const { container } = render(<><TokenCostPreview cost={-1} balance={10} /><TokenCostPreview cost={3} balance={-10} /><TokenCostPreview cost={2.5} balance={10} /></>);
    expect(container.textContent).toBe('');
  });
});
