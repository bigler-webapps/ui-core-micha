// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
    i18n: { language: 'en' },
  }),
}));

import { TokenOriginTable } from '../src/billing/TokenOriginTable';

afterEach(cleanup);

const tokens = {
  grants: [
    { source: 'plan', origin: 'plan', amount: 120, remaining: 73, expires_at: '2026-11-17T00:00:00Z' },
    { source: 'purchase', origin: 'package', amount: 500, remaining: 480, expires_at: null },
    { source: 'plan', origin: 'credit', amount: 250, remaining: 250, expires_at: null },
    { source: 'plan', origin: 'trial', amount: 30, remaining: 0, expires_at: null },
  ],
  pool: { plan_key: 'team5', plan_name: 'Team', amount: 1500, remaining: 1214, expires_at: '2027-04-17T00:00:00Z' },
};

describe('origin table as a table', () => {
  it('exposes the three column headers and one row per origin with its values', () => {
    render(<TokenOriginTable tokens={tokens} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Billing.ORIGIN_HEADER', 'Billing.OP_REMAINING', 'Billing.VALID_HEADER']);
    const rows = within(table).getAllByRole('row').slice(1);
    const cells = rows.map((row) => within(row).getAllByRole('cell').filter((cell) => cell.textContent).map((cell) => cell.textContent));
    expect(cells).toEqual([
      ['Billing.ORIGIN_LINE Billing.OP_GRANT_PLAN 120', '73', 'Billing.EXPIRES_ON November 17, 2026'],
      ['Billing.ORIGIN_LINE Billing.OP_GRANT_PACKAGE 500', '480', 'Billing.NEVER_EXPIRES'],
      ['Billing.ORIGIN_LINE Billing.ORIGIN_credit 250', '250', 'Billing.NEVER_EXPIRES'],
      ['Billing.ORIGIN_LINE Billing.ORIGIN_trial 30', '0', 'Billing.NEVER_EXPIRES'],
      ['Billing.ORIGIN_LINE Billing.ORIGIN_pool 1,500', '1,214', 'Billing.EXPIRES_ON April 17, 2027'],
    ]);
  });

  it('gives each bar its remaining and granted amount and a width that is the remaining share', () => {
    render(<TokenOriginTable tokens={tokens} />);
    const bars = screen.getAllByRole('img');
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual(['73 / 120', '480 / 500', '250 / 250', '0 / 30', '1,214 / 1,500']);
    expect(bars.map((bar) => bar.firstElementChild.style.width)).toEqual(['60.83333333333333%', '96%', '100%', '0%', '80.93333333333334%']);
  });
});
