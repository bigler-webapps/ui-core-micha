// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => Object.entries(values || {}).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), key),
    i18n: { language: 'en' },
  }),
}));

import { SubscriptionSection } from '../src/billing/SubscriptionSection';
import { billingTranslations } from '../src/i18n/billingTranslations';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete HTMLElement.prototype.scrollIntoView;
});

const plans = [
  { key: 'monthly', name: 'Monthly', kind: 'subscription', interval: 'month', amount_cents: 1000 },
  { key: 'yearly', name: 'Yearly', kind: 'subscription', interval: 'year', amount_cents: 10000 },
];
const makeMe = (status = 'read_only', extra = {}) => ({
  access: { status, source: status === 'active' ? 'subscription' : null, ends_at: '2026-09-01T00:00:00Z' },
  tokens: { balance: 20 },
  plans,
  ...extra,
});
const renderSection = (me, props = {}) => {
  const api = { getMe: vi.fn().mockResolvedValue(me), startCheckout: vi.fn(), listSeats: vi.fn() };
  render(<SubscriptionSection api={api} withdrawal={false} {...props} />);
  return api;
};

describe('SubscriptionSection choose plan handoff', () => {
  it('replaces the inline picker even when plans are available and routes both actions to the callback', async () => {
    const onChoosePlan = vi.fn();
    const api = renderSection(makeMe('read_only', { plans }), { onChoosePlan }); // plans are available: the picker must still be hidden

    expect(await screen.findByText('Billing.ENDED_TITLE')).toBeTruthy();
    const chooseButton = screen.getByRole('button', { name: 'Billing.CHOOSE_PLAN' });
    expect(screen.queryByRole('radiogroup', { name: 'Billing.PLANS' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Billing.MONTHLY' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Billing.YEARLY' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Billing.CONTINUE_TO_PAYMENT' })).toBeNull();

    fireEvent.click(chooseButton);
    expect(onChoosePlan).toHaveBeenCalledOnce();
    expect(onChoosePlan).toHaveBeenCalledWith();
    fireEvent.click(screen.getByRole('button', { name: 'Billing.RENEW' }));
    expect(onChoosePlan).toHaveBeenCalledTimes(2);
    expect(onChoosePlan).toHaveBeenLastCalledWith();
    expect(api.startCheckout).not.toHaveBeenCalled();
  });

  it('prefers onChoosePlan over onRenew for the banner action', async () => {
    const onChoosePlan = vi.fn();
    const onRenew = vi.fn();
    renderSection(makeMe(), { onChoosePlan, onRenew });

    fireEvent.click(await screen.findByRole('button', { name: 'Billing.RENEW' }));
    expect(onChoosePlan).toHaveBeenCalledOnce();
    expect(onChoosePlan).toHaveBeenCalledWith();
    expect(onRenew).not.toHaveBeenCalled();
  });

  it.each([['absent', undefined], ['null', null], ['string', 'not-a-callback']])('keeps the inline picker when onChoosePlan is %s', async (_label, onChoosePlan) => {
    const api = renderSection(makeMe(), { onChoosePlan });
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    expect(await screen.findByRole('radiogroup', { name: 'Billing.PLANS' })).toBeTruthy();
    expect(screen.getByText('Monthly')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Billing.YEARLY' }));
    expect(screen.getByText('Yearly')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Billing.MONTHLY' }));
    expect(screen.getByRole('button', { name: 'Billing.CONTINUE_TO_PAYMENT' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Billing.CHOOSE_PLAN' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Billing.RENEW' }));
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(api.startCheckout).not.toHaveBeenCalled();
  });

  it('keeps the host onRenew override when no choose-plan callback is supplied', async () => {
    const onRenew = vi.fn();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderSection(makeMe(), { onRenew });

    fireEvent.click(await screen.findByRole('button', { name: 'Billing.RENEW' }));
    expect(onRenew).toHaveBeenCalledOnce();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not show or call the callback for an active account', async () => {
    const onChoosePlan = vi.fn();
    renderSection(makeMe('active'), { onChoosePlan });

    expect(await screen.findByText('Billing.HEADING')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Billing.CHOOSE_PLAN' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Billing.RENEW' })).toBeNull();
    expect(onChoosePlan).not.toHaveBeenCalled();
  });

  it('defines the choose-plan label in every supported language', () => {
    expect(billingTranslations['Billing.CHOOSE_PLAN']).toEqual({
      de: 'Abo wählen',
      de_informal: 'Abo wählen',
      en: 'Choose a plan',
      fr: 'Choisir un abonnement',
      sw: 'Chagua usajili',
    });
    expect(billingTranslations['Billing.CHOOSE_PLAN'].de).toBe(billingTranslations['Billing.CHOOSE_PLAN'].de_informal);
  });
});
