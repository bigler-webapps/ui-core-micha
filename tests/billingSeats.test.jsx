// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, values) => Object.entries(values || {}).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), key), i18n: { language: 'en' } }),
}));

import { SubscriptionSection } from '../src/billing/SubscriptionSection';

afterEach(cleanup);

const account = (team = {}) => ({
  access: { status: 'active', source: 'team', ends_at: null },
  tokens: { balance: 10 }, plans: [], team: { seat_holders: [], ...team },
});
const apiFor = (me, seats = [], extra = {}) => ({
  getMe: vi.fn().mockResolvedValue(me),
  listSeats: vi.fn().mockResolvedValue({ seats }),
  addSeat: vi.fn().mockResolvedValue({ added: true }),
  removeSeat: vi.fn().mockResolvedValue({ removed: true }),
  ...extra,
});
const openCandidates = () => fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Billing.SEAT_PICK' }));

describe('SubscriptionSection seat candidates', () => {
  it('filters holders from both seat sources using string ids and submits the original candidate id once', async () => {
    let finishAdd;
    const candidates = [
      { id: '10', name: 'From loaded seat' },
      { id: 20, name: 'From team holders' },
      { id: 30, name: 'A <b>Member</b>', email: 'member@example.test' },
      { name: 'Missing id' },
    ];
    const api = apiFor(account({ seat_holders: [{ user_id: '20', name: 'Existing' }] }), [{ user_id: 10 }], {
      addSeat: vi.fn(() => new Promise((resolve) => { finishAdd = resolve; })),
      listSeats: vi.fn().mockResolvedValueOnce({ seats: [{ user_id: 10 }] }).mockResolvedValueOnce({ seats: [{ user_id: 10 }, { user_id: 30 }] }),
    });
    render(<SubscriptionSection api={api} seatCandidates={candidates} withdrawal={false} />);

    await screen.findByRole('combobox', { name: 'Billing.SEAT_PICK' });
    expect(screen.getByRole('button', { name: 'Billing.SEATS_ADD' }).disabled).toBe(true);
    openCandidates();
    expect(screen.getByRole('option', { name: 'Billing.SEAT_PICK' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'From loaded seat' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'From team holders' })).toBeNull();
    expect(screen.getByRole('option', { name: /A <b>Member/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Missing id' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: /A <b>Member/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Billing.SEATS_ADD' }));
    fireEvent.click(screen.getByRole('button', { name: 'Billing.SEATS_ADD' }));
    expect(api.addSeat).toHaveBeenCalledOnce();
    expect(api.addSeat).toHaveBeenCalledWith({ userId: 30 });
    finishAdd({ added: true });
    await waitFor(() => expect(api.listSeats).toHaveBeenCalledTimes(2));
    openCandidates();
    expect(screen.queryByRole('option', { name: /A <b>Member/ })).toBeNull();
  });

  it('shows only the placeholder for an empty candidate list', async () => {
    render(<SubscriptionSection api={apiFor(account())} seatCandidates={[]} withdrawal={false} />);
    await screen.findByRole('combobox', { name: 'Billing.SEAT_PICK' });
    openCandidates();
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.click(screen.getByRole('option', { name: 'Billing.SEAT_PICK' }));
    expect(screen.getByRole('button', { name: 'Billing.SEATS_ADD' }).disabled).toBe(true);
  });

  it('keeps the email text field path when candidates are omitted', async () => {
    const api = apiFor(account(), [], { addSeat: vi.fn().mockResolvedValue({ added: true }) });
    render(<SubscriptionSection api={api} withdrawal={false} />);
    const input = await screen.findByRole('textbox', { name: 'Billing.SEAT_USER' });
    fireEvent.change(input, { target: { value: 'person@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Billing.SEATS_ADD' }));
    await waitFor(() => expect(api.addSeat).toHaveBeenCalledWith({ email: 'person@example.test' }));
  });

  it.each([
    { description: 'omitted', candidates: undefined },
    { description: 'empty', candidates: [] },
  ])('hides both assignment forms when the team has no free seats (candidates $description)', async ({ candidates }) => {
    const api = apiFor(account({ seats_used: 3, seats_total: 3 }));
    render(<SubscriptionSection api={api} seatCandidates={candidates} withdrawal={false} />);
    expect(await screen.findByText('Billing.ERROR_SEAT_LIMIT')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Billing.SEAT_PICK' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Billing.SEAT_USER' })).toBeNull();
  });

  it.each([[409, 'Billing.ERROR_SEAT_LIMIT'], [400, 'Billing.ERROR_SEAT_USER']])('maps add-seat HTTP %i to %s', async (status, errorKey) => {
    const api = apiFor(account(), [], { addSeat: vi.fn().mockRejectedValue({ response: { status } }) });
    render(<SubscriptionSection api={api} seatCandidates={[{ id: 1, name: 'One' }]} withdrawal={false} />);
    await screen.findByRole('combobox', { name: 'Billing.SEAT_PICK' });
    openCandidates();
    fireEvent.click(screen.getByRole('option', { name: 'One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Billing.SEATS_ADD' }));
    expect(await screen.findByText(errorKey)).toBeTruthy();
  });
});
