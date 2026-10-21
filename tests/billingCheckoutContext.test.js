import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
import apiClient from '../src/auth/apiClient';
import { createBillingApi, createCheckoutIdempotencyKey } from '../src/billing/api';

describe('contextual checkout client', () => {
  beforeEach(() => { apiClient.get.mockReset().mockResolvedValue({ data: { status: 'open' } }); apiClient.post.mockReset().mockResolvedValue({ data: { url: '/checkout', attempt: { status: 'open' } } }); });
  it('preserves the old payload and allowlists contextual fields', async () => {
    const api = createBillingApi();
    await api.startCheckout('basic');
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/billing/checkout/', { plan_key: 'basic' });
    await api.startCheckout('basic', { context: null, idempotencyKey: 'ignored' });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/billing/checkout/', { plan_key: 'basic' });
    await api.startCheckout('basic', { context: 'setup', idempotencyKey: 'a'.repeat(16), returnUrl: 'https://evil.test', other: 1 });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/billing/checkout/', { plan_key: 'basic', context: 'setup', idempotency_key: 'a'.repeat(16) });
  });
  it('rejects malformed inputs before any request and URL-encodes attempt references', async () => {
    const api = createBillingApi();
    await expect(api.startCheckout('p', { context: 'setup' })).rejects.toThrow();
    await expect(api.resolveCheckoutAttempt('bad!')).rejects.toThrow();
    expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.get).not.toHaveBeenCalled();
    const attemptBody = { url: null, attempt: { reference: 'a_b-123456789012', context: 'setup', status: 'paid' } };
    apiClient.get.mockResolvedValueOnce({ data: attemptBody });
    await expect(api.resolveCheckoutAttempt('a_b-123456789012')).resolves.toEqual(attemptBody);
    expect(apiClient.get).toHaveBeenCalledWith('/api/billing/checkout/attempts/a_b-123456789012/');
  });
  it('does not retry failures and creates fresh cryptographic-format keys', async () => {
    apiClient.post.mockRejectedValueOnce({ response: { status: 502 } });
    await expect(createBillingApi().startCheckout('p', { context: 'setup', idempotencyKey: 'b'.repeat(16) })).rejects.toMatchObject({ response: { status: 502 } });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const first = createCheckoutIdempotencyKey(); const second = createCheckoutIdempotencyKey();
    expect(first).toMatch(/^[A-Za-z0-9_-]{16,64}$/); expect(second).toMatch(/^[A-Za-z0-9_-]{16,64}$/); expect(first).not.toBe(second);
  });
});
