import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
import apiClient from '../src/auth/apiClient';
import { createBillingApi } from '../src/billing/api';
import { billingApiUrls, BILLING_OPERATOR_ERROR_CODES } from '../src/billing/wire';
import { formatUsdMicros } from '../src/billing/format';

beforeEach(() => { for (const method of ['get', 'post', 'delete']) apiClient[method].mockReset().mockResolvedValue({ data: { ok: true } }); });
describe('operator billing wire and API', () => {
  it('builds operator URLs, params, mutations, and supports individual overrides', async () => {
    const urls = billingApiUrls('/v3/billing');
    expect(urls.operatorOverview).toBe('/v3/billing/operator/overview/');
    expect(urls.operatorAccounts).toBe('/v3/billing/operator/accounts/');
    expect(urls.operatorFreeAccess(12)).toBe('/v3/billing/operator/accounts/12/free-access/');
    expect(urls.operatorFreeAccess('a/b')).toContain('a%2Fb');
    const api = createBillingApi({}, { apiBase: '/v3/billing' });
    await api.getOperatorOverview(); expect(apiClient.get).toHaveBeenLastCalledWith('/v3/billing/operator/overview/');
    await api.getOperatorOverview({ month: '2026-10' }); expect(apiClient.get).toHaveBeenLastCalledWith('/v3/billing/operator/overview/', { params: { month: '2026-10' } });
    await api.listOperatorAccounts({ q: 'a', page: 2, pageSize: 50 }); expect(apiClient.get).toHaveBeenLastCalledWith('/v3/billing/operator/accounts/', { params: { q: 'a', page: 2, page_size: 50 } });
    await api.listOperatorAccounts(); expect(apiClient.get).toHaveBeenLastCalledWith('/v3/billing/operator/accounts/', { params: {} });
    await api.grantFreeAccess(12, 'reason'); expect(apiClient.post).toHaveBeenLastCalledWith('/v3/billing/operator/accounts/12/free-access/', { reason: 'reason' });
    await api.revokeFreeAccess(12); expect(apiClient.delete).toHaveBeenLastCalledWith('/v3/billing/operator/accounts/12/free-access/');
    const override = vi.fn(); expect(createBillingApi({ getMe: override }).getMe).toBe(override);
    expect(typeof createBillingApi({ getMe: override }).getOperatorOverview).toBe('function');
    expect(BILLING_OPERATOR_ERROR_CODES).toContain('forbidden');
  });
  it('formats integer USD micros with configurable precision', () => {
    expect(formatUsdMicros(1250000, 'en')).toBe('$1.25');
    expect(formatUsdMicros(1, 'en', { fractionDigits: 6 })).toContain('0.000001');
  });
});
