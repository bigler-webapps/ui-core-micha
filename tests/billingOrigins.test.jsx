// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key, values) => values ? `${key} ${Object.values(values).join(' ')}` : key,
  i18n: { language: 'en' },
}) }));

import { TokenOriginTable } from '../src/billing/TokenOriginTable';
import { SubscriptionSection } from '../src/billing/SubscriptionSection';

afterEach(cleanup);

const grant = (origin, amount, remaining, extra = {}) => ({ origin, source: origin, amount, remaining, expires_at: null, ...extra });
const mountAccount = (extra = {}) => render(<SubscriptionSection withdrawal={false} api={{
  getMe: vi.fn().mockResolvedValue({ access: { status: 'active', source: 'free', ends_at: null }, tokens: { balance: 10 }, plans: [], ...extra }),
}} />);

describe('token balance origins', () => {
  it('renders every origin in server order with amounts, remaining and both validity forms', () => {
    const { container } = render(<TokenOriginTable tokens={{ grants: [
      grant('credit', 20, 5, { expires_at: '2026-12-01T00:00:00Z' }),
      grant('trial', 10, 10), grant('plan', 100, 0), grant('package', 50, 25),
    ] }} />);
    const text = container.textContent;
    expect(text).toContain('Billing.ORIGIN_LINE Billing.ORIGIN_credit 20');
    expect(text).toContain('Billing.ORIGIN_LINE Billing.ORIGIN_trial 10');
    expect(text).toContain('Billing.ORIGIN_LINE Billing.OP_GRANT_PLAN 100');
    expect(text).toContain('Billing.ORIGIN_LINE Billing.OP_GRANT_PACKAGE 50');
    expect(text).toContain('Billing.EXPIRES_ON December 1, 2026');
    expect(text.match(/Billing.NEVER_EXPIRES/g)).toHaveLength(3);
    expect(text.indexOf('Billing.ORIGIN_credit')).toBeLessThan(text.indexOf('Billing.ORIGIN_trial'));
    expect(text.indexOf('Billing.ORIGIN_trial')).toBeLessThan(text.indexOf('Billing.OP_GRANT_PLAN'));
    const meter = container.querySelector('[aria-label="5 / 20"]');
    expect(meter.firstElementChild.style.width).toBe('25%');
    expect(container.querySelector('[aria-label="0 / 100"] .MuiBox-root')?.style.width).toBe('0%');
  });

  it('shows the team pool for payer and seat account payloads and renders the plan name as text', async () => {
    const pool = { plan_key: 'team5', plan_name: 'Team 5', amount: 1500, remaining: 1200, expires_at: '2027-04-17T00:00:00Z' };
    const payer = { access: { status: 'active', source: 'free', ends_at: null }, tokens: { balance: 0, grants: [], pool }, plans: [] };
    const { rerender } = render(<SubscriptionSection withdrawal={false} api={{ getMe: vi.fn().mockResolvedValue(payer) }} />);
    expect(await screen.findByText('Billing.ORIGIN_LINE Billing.ORIGIN_pool 1,500')).toBeTruthy();
    const seatHolder = { ...payer, seat: { ends_at: '2027-04-17T00:00:00Z', payer_name: 'Ada' } };
    rerender(<SubscriptionSection withdrawal={false} api={{ getMe: vi.fn().mockResolvedValue(seatHolder), listSeats: vi.fn().mockResolvedValue({ seats: [] }) }} />);
    expect(await screen.findByText('Billing.ORIGIN_LINE Billing.ORIGIN_pool 1,500')).toBeTruthy();
    expect(screen.getByText('Billing.SEAT_PAYER Ada')).toBeTruthy();
  });

  it('skips invalid numbers and unknown origins without undefined or NaN', () => {
    const { container } = render(<TokenOriginTable tokens={{ grants: [
      grant('credit', -1, 1), grant('mystery', 3, 2), grant('trial', 4, 2.5), grant('trial', 0, 0),
    ] }} />);
    expect(container.textContent).not.toMatch(/undefined|NaN|mystery/);
    expect(container.textContent).not.toContain('Billing.ORIGIN_HEADER');
    const zeroAmount = render(<TokenOriginTable tokens={{ grants: [grant('trial', 0, 0)] }} />);
    expect(zeroAmount.container.textContent).toContain('Billing.ORIGIN_trial 0');
    expect(zeroAmount.container.querySelector('[aria-label="0 / 0"]')).toBeNull();
  });

  it('falls back to the existing grants list when any origin is absent and hides the pool', () => {
    const { container } = render(<TokenOriginTable tokens={{ grants: [
      grant('plan', 20, 8), { source: 'package', amount: 10, remaining: 4 },
    ], pool: { plan_key: 'team', plan_name: 'Hidden pool', amount: 5, remaining: 5 } }} />);
    expect(container.textContent).toContain('Billing.OP_GRANT_PLAN: 20');
    expect(container.textContent).toContain('Billing.OP_GRANT_PACKAGE: 10');
    expect(container.textContent).not.toContain('Billing.ORIGIN_HEADER');
    expect(container.textContent).not.toContain('Hidden pool');
  });

  it('shows a valid pool alone, and nothing when both grants and pool are absent', () => {
    const { container, rerender } = render(<TokenOriginTable tokens={{ grants: [], pool: { plan_key: 'team', plan_name: '', amount: 2, remaining: 1, expires_at: null } }} />);
    expect(container.textContent).toContain('Billing.ORIGIN_pool');
    rerender(<TokenOriginTable tokens={{ grants: [], pool: null }} />);
    expect(container.textContent).toBe('');
  });
});

describe('seat payer', () => {
  it('shows payer name only when it is a non-empty string', async () => {
    const base = { access: { status: 'active', source: 'free', ends_at: null }, tokens: { balance: 0 }, plans: [], seat: { ends_at: '2027-04-17T00:00:00Z', payer_name: 'Ada Lovelace' } };
    const { rerender } = render(<SubscriptionSection withdrawal={false} api={{ getMe: vi.fn().mockResolvedValue(base) }} />);
    expect(await screen.findByText('Billing.SEAT_PAYER Ada Lovelace')).toBeTruthy();
    const noPayer = { ...base, seat: { ends_at: base.seat.ends_at } };
    rerender(<SubscriptionSection withdrawal={false} api={{ getMe: vi.fn().mockResolvedValue(noPayer) }} />);
    await waitFor(() => expect(screen.queryByText('Billing.SEAT_PAYER')).toBeNull());
    expect(screen.getByText('Billing.OP_SEAT_UNTIL April 17, 2027')).toBeTruthy();
  });

  it('keeps today’s display for a blank payer and for legacy payloads', async () => {
    const base = { access: { status: 'active', source: 'free', ends_at: null }, tokens: { balance: 0 }, plans: [], seat: { ends_at: '2027-04-17T00:00:00Z', payer_name: ' ' } };
    const { rerender } = render(<SubscriptionSection withdrawal={false} api={{ getMe: vi.fn().mockResolvedValue(base) }} />);
    expect(await screen.findByText('Billing.OP_SEAT_UNTIL April 17, 2027')).toBeTruthy();
    expect(screen.queryByText('Billing.SEAT_PAYER')).toBeNull();
    rerender(<SubscriptionSection withdrawal={false} api={{ getMe: vi.fn().mockResolvedValue({ ...base, seat: { ends_at: base.seat.ends_at } }) }} />);
    await waitFor(() => expect(screen.queryByText('Billing.SEAT_PAYER')).toBeNull());
  });
});

describe('pure legacy payload', () => {
  it('keeps every value of an older dcm payload (no origin, no pool) in today\'s list', () => {
    const { container } = render(<TokenOriginTable tokens={{ grants: [
      { source: 'plan', amount: 120, remaining: 73, expires_at: '2026-11-17T00:00:00Z' },
      { source: 'package', amount: 500, remaining: 480, expires_at: null },
    ] }} />);
    expect(screen.queryByRole('table')).toBeNull();
    const text = container.textContent;
    expect(text).toContain('Billing.OP_GRANT_PLAN: 120');
    expect(text).toContain('73 Billing.OP_REMAINING');
    expect(text).toContain('Billing.OP_VALID_UNTIL November 17, 2026');
    expect(text).toContain('Billing.OP_GRANT_PACKAGE: 500');
    expect(text).toContain('480 Billing.OP_REMAINING');
    expect(text).not.toMatch(/undefined|NaN/);
  });
});
