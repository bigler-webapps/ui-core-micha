import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import apiClient from '../src/auth/apiClient';
import { createTermsApi } from '../src/auth/termsApi';

describe('terms acceptance client', () => {
  beforeEach(() => { apiClient.get.mockReset().mockResolvedValue({ data: { accepted: false } }); apiClient.post.mockReset().mockResolvedValue({ data: { accepted: true } }); });
  it('uses the default prefix and unwraps GET and exact affirmative POST data', async () => {
    const api = createTermsApi();
    expect(await api.getAcceptance()).toEqual({ accepted: false });
    expect(apiClient.get).toHaveBeenCalledWith('/api/terms/');
    expect(await api.accept('v3')).toEqual({ accepted: true });
    expect(apiClient.post).toHaveBeenCalledWith('/api/terms/', { version: 'v3', accept: true });
  });
  it('supports an application prefix', async () => {
    await createTermsApi({}, { apiBase: '/v2/terms' }).getAcceptance();
    expect(apiClient.get).toHaveBeenCalledWith('/v2/terms/');
  });
});
