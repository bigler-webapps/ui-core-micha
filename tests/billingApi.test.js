import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import apiClient from '../src/auth/apiClient';
import { createBillingApi } from '../src/billing/api';
import { billingApiUrls } from '../src/billing/wire';

beforeEach(() => {
  for (const method of ['get', 'post', 'delete']) apiClient[method].mockReset().mockResolvedValue({ data: { method } });
});

describe('billing API client', () => {
  it('builds URLs and unwraps each contract response', async () => {
    const urls = billingApiUrls('/v2/billing');
    expect(urls).toMatchObject({ me: '/v2/billing/me/', checkout: '/v2/billing/checkout/', portal: '/v2/billing/portal/', seats: '/v2/billing/team/seats/', withdrawals: '/v2/billing/withdrawal/' });
    expect(urls.withdrawalPreview(7)).toBe('/v2/billing/withdrawal/7/preview/');
    expect(urls.withdrawalConfirm(7)).toBe('/v2/billing/withdrawal/7/');
    const api = createBillingApi();
    expect(await api.getMe()).toEqual({ method: 'get' });
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/billing/me/');
    await api.startCheckout('annual');
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/billing/checkout/', { plan_key: 'annual' });
    await api.openPortal();
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/billing/portal/');
    await api.listSeats();
    expect(apiClient.get).toHaveBeenLastCalledWith('/api/billing/team/seats/');
    await api.addSeat({ userId: 12 });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/billing/team/seats/', { user_id: 12 });
    await api.addSeat({ email: 'person@example.test' });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/billing/team/seats/', { email: 'person@example.test' });
    await api.removeSeat({ userId: 12 });
    expect(apiClient.delete).toHaveBeenLastCalledWith('/api/billing/team/seats/', { data: { user_id: 12 } });
    await api.removeSeat({ email: 'person@example.test' });
    expect(apiClient.delete).toHaveBeenLastCalledWith('/api/billing/team/seats/', { data: { email: 'person@example.test' } });
  });

  it('keeps every other default when one API function is overridden', async () => {
    const defaults = createBillingApi({}, { apiBase: '/v2/billing' });
    for (const name of ['getMe', 'startCheckout', 'openPortal', 'listSeats', 'addSeat', 'removeSeat']) {
      const replacement = vi.fn();
      const api = createBillingApi({ [name]: replacement }, { apiBase: '/v2/billing' });
      expect(api[name]).toBe(replacement);
      for (const other of Object.keys(defaults).filter((key) => key !== name)) expect(String(api[other])).toBe(String(defaults[other]));
    }
    const api = createBillingApi({ getMe: vi.fn() }, { apiBase: '/v2/billing' });
    await api.startCheckout('p');
    expect(apiClient.post).toHaveBeenLastCalledWith('/v2/billing/checkout/', { plan_key: 'p' });
  });
});
