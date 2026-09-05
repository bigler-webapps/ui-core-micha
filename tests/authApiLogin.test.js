import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
}));

vi.mock('../src/auth/apiClient', () => ({ default: client }));

import { loginWithPassword } from '../src/auth/authApi';

describe('loginWithPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current user when login reports an existing session', async () => {
    const user = { id: 1, email: 'ada@example.com' };
    client.post.mockRejectedValue({ response: { status: 409 } });
    client.get.mockResolvedValue({ data: user });

    await expect(loginWithPassword('ada@example.com', 'password')).resolves.toEqual({
      user,
      needsMfa: false,
    });
  });

  it('normalizes a failure while retrying the current user after a 409', async () => {
    const retryError = {
      response: { status: 429, data: { detail: 'Too many requests' } },
    };
    client.post.mockRejectedValue({ response: { status: 409 } });
    client.get.mockRejectedValue(retryError);

    await expect(loginWithPassword('ada@example.com', 'password')).rejects.toSatisfy((error) => {
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBeDefined();
      expect(error).not.toBe(retryError);
      return true;
    });
  });
});
