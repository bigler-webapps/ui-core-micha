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

  it('adds nonempty app fields without allowing them to replace registration fields', async () => {
    client.post.mockResolvedValue({ data: { ok: true } });

    await submitRegistrationRequest({
      email: 'ada@example.com',
      mode: 'self_signup_open',
      accessCode: 'real-access-code',
      registrationContextToken: 'real-qr-token',
      turnstileToken: 'real-turnstile-token',
      additionalRegistrationData: {
        display_name: 'Ada',
        optional_note: '',
        email: 'overwritten@example.test',
        mode: 'self_signup_access_code',
        access_code: 'overwritten-access-code',
        registration_context_token: 'overwritten-qr-token',
        turnstile_token: 'overwritten-turnstile-token',
      },
    });

    expect(client.post).toHaveBeenCalledWith('/api/users/register-request/', {
      email: 'ada@example.com',
      mode: 'self_signup_open',
      access_code: 'real-access-code',
      registration_context_token: 'real-qr-token',
      turnstile_token: 'real-turnstile-token',
      display_name: 'Ada',
    });
  });

  it('omits absent and empty extension values from the wire payload', async () => {
    client.post.mockResolvedValue({ data: { ok: true } });
    await submitRegistrationRequest({ email: 'ada@example.com', mode: 'self_signup_open' });
    await submitRegistrationRequest({
      email: 'ada@example.com', mode: 'self_signup_open',
      additionalRegistrationData: { empty: '', missing: undefined, null_value: null },
    });
    expect(client.post).toHaveBeenCalledTimes(2);
    for (const call of client.post.mock.calls) {
      expect(call).toEqual(['/api/users/register-request/', { email: 'ada@example.com', mode: 'self_signup_open' }]);
    }
  });
});
