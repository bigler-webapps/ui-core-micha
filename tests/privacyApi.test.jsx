import { afterEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../src/auth/apiClient', () => ({ default: client }));
vi.mock('../src/auth/authConfig', () => ({ CSRF_URL: '/api/csrf/' }));

import { createPrivacyApi } from '../src/privacy/privacyApi';

afterEach(() => vi.clearAllMocks());

describe('createPrivacyApi', () => {
  it('uses the configured privacy prefix and returns response data', async () => {
    client.get.mockResolvedValue({ data: { app: 'app' } });
    client.post.mockResolvedValue({ data: { seq: 1 } });
    const api = createPrivacyApi({}, { apiBase: '/mounted/privacy', csrfUrl: '/host/csrf/' });
    expect(await api.getManifest()).toEqual({ app: 'app' });
    expect(await api.getChoices()).toEqual({ app: 'app' });
    expect(await api.saveChoices({ request_id: 'uuid' })).toEqual({ seq: 1 });
    expect(client.get.mock.calls.map(([url]) => url)).toEqual([
      '/mounted/privacy/manifest/',
      '/mounted/privacy/choices/',
    ]);
    expect(client.post).toHaveBeenCalledWith('/mounted/privacy/choices/', { request_id: 'uuid' });
  });

  it('deduplicates CSRF priming and retries after a failed prime', async () => {
    client.get.mockResolvedValue({ data: {} });
    const api = createPrivacyApi({}, { csrfUrl: '/host/csrf/' });
    await Promise.all([api.primeCsrf(), api.primeCsrf(), api.primeCsrf()]);
    expect(client.get).toHaveBeenCalledOnce();
    expect(client.get).toHaveBeenCalledWith('/host/csrf/');

    client.get.mockRejectedValueOnce(new Error('offline'));
    const retryApi = createPrivacyApi({}, { csrfUrl: '/host/csrf/' });
    await expect(retryApi.primeCsrf()).rejects.toThrow('offline');
    client.get.mockResolvedValueOnce({ data: {} });
    await retryApi.primeCsrf();
    expect(client.get).toHaveBeenCalledTimes(3);
  });
});
