import { describe, expect, it } from 'vitest';
import { extractErrorInfo, normaliseApiError } from '../src/utils/auth-errors.js';

describe('auth error normalisation', () => {
  it('uses the caller default for generic detail errors while preserving the detail message', () => {
    const responseError = {
      response: { status: 429, data: { detail: 'Die Anfrage wurde gedrosselt...' } },
    };
    const info = extractErrorInfo(responseError);
    const error = normaliseApiError(responseError, 'Auth.LOGIN_FAILED');

    expect(info.code).toBeNull();
    expect(error.code).toBe('Auth.LOGIN_FAILED');
    expect(error.message).toBe('Die Anfrage wurde gedrosselt...');
    expect(error.status).toBe(429);
  });

  it('uses its namespaced default when no caller default is provided', () => {
    const error = normaliseApiError({
      response: { status: 429, data: { detail: 'Die Anfrage wurde gedrosselt...' } },
    });

    expect(error.code).toBe('Auth.GENERIC_ERROR');
  });

  it('preserves a backend code from the errors array', () => {
    const error = normaliseApiError(
      { response: { data: { errors: [{ code: 'enter_current_password', message: 'x' }] } } },
      'Auth.PROFILE_UPDATE_FAILED',
    );

    expect(error.code).toBe('enter_current_password');
  });

  it('preserves a backend code from the response data', () => {
    const error = normaliseApiError(
      { response: { data: { code: 'invalid_credentials' } } },
      'Auth.LOGIN_FAILED',
    );

    expect(error.code).toBe('invalid_credentials');
  });
});
