// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => {
      const templates = {
        'Billing.BALANCE': 'Guthaben {{tokens}} Token',
        'Billing.COST': '{{tokens}} Token',
        'Billing.NOT_ENOUGH': 'Guthaben reicht nicht aus',
        'Billing.ENDED_TITLE': 'Abo beendet – Projekte sind schreibgeschützt. Export bleibt möglich.',
        'Billing.ENDED_ON': 'Beendet am {{date}}',
        'Billing.DELETION_ON': 'Löschung am {{date}}',
        'Billing.RENEW': 'Abo erneuern',
      };
      return Object.entries(values || {}).reduce((text, [name, value]) => text.replace(`{{${name}}}`, value), templates[key] || key);
    },
    i18n: { language: 'de-CH' },
  }),
}));

import { TokenBalanceBadge } from '../src/billing/TokenBalanceBadge';
import { TokenCostPreview } from '../src/billing/TokenCostPreview';
import { AccessEndedBanner } from '../src/billing/AccessEndedBanner';

afterEach(cleanup);

describe('token surfaces', () => {
  it('shows a formatted balance and marks a low balance as warning', () => {
    render(<TokenBalanceBadge balance={1153} lowBelow={1200} />);
    const chip = screen.getByLabelText(/Guthaben .* Token/);
    expect(chip).toBeTruthy();
    expect(chip.className).toContain('MuiChip-colorWarning');
  });

  it('renders nothing for a non-finite balance', () => {
    const { container } = render(<TokenBalanceBadge balance={Infinity} />);
    expect(container.firstChild).toBeNull();
  });

  it('previews a cost, alternatives, and balance; flags insufficient balance', () => {
    const { rerender } = render(<TokenCostPreview cost={47} alternatives={[{ label: 'with translation', cost: 71 }]} balance={1153} />);
    expect(screen.getByText(/47 Token, with translation 71 · Guthaben .* Token/)).toBeTruthy();
    expect(screen.queryByText('Guthaben reicht nicht aus')).toBeNull();
    rerender(<TokenCostPreview cost={47} balance={10} />);
    expect(screen.getByText('Guthaben reicht nicht aus')).toBeTruthy();
    expect(screen.getByText(/47 Token · Guthaben 10 Token/)).toBeTruthy();
  });

  it('renders no preview for non-finite values and handles an empty alternative list', () => {
    const { container, rerender } = render(<TokenCostPreview cost={NaN} balance={10} />);
    expect(container.firstChild).toBeNull();
    rerender(<TokenCostPreview cost={4} balance={10} alternatives={[]} />);
    expect(screen.getByText(/4 Token · Guthaben 10 Token/)).toBeTruthy();
  });
});

describe('access ended banner', () => {
  it('shows the ended copy and date, omits deletion by default, and renews on click', () => {
    const onRenew = vi.fn();
    render(<AccessEndedBanner endedAt="2026-10-15T00:00:00Z" onRenew={onRenew} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Abo beendet – Projekte sind schreibgeschützt. Export bleibt möglich.')).toBeTruthy();
    expect(screen.getByText(/Beendet am .*15/)).toBeTruthy();
    expect(screen.queryByText(/Löschung am/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abo erneuern' }));
    expect(onRenew).toHaveBeenCalledOnce();
  });

  it('shows a deletion date only when a host supplies it', () => {
    render(<AccessEndedBanner deletionDate="2026-12-01T00:00:00Z" />);
    expect(screen.getByText(/Löschung am/)).toBeTruthy();
  });
});
