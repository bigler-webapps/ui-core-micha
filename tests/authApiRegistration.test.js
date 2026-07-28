import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../src/auth/apiClient', () => ({ default: client }));

import { submitRegistrationRequest } from '../src/auth/authApi';

describe('submitRegistrationRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes a Turnstile token in the registration payload', async () => {
    client.post.mockResolvedValue({ data: { ok: true } });

    await submitRegistrationRequest({
      email: 'ada@example.com',
      mode: 'self_signup_open',
      turnstileToken: 'turnstile-token',
    });

    expect(client.post).toHaveBeenCalledWith('/api/users/register-request/', {
      email: 'ada@example.com',
      mode: 'self_signup_open',
      turnstile_token: 'turnstile-token',
    });
  });
});
