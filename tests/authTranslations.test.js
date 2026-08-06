// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { authTranslations } from '../src/i18n/authTranslations';

const REQUIRED_LOCALES = ['de', 'fr', 'en'];

const AUTH1_KEYS = [
  'Auth.PASSWORD_RULES_HINT',
  'Auth.PASSWORD_TOO_SHORT_LOCAL',
  'Auth.PASSWORD_NUMERIC_LOCAL',
];

// Raw backend error codes (allauth-headless + Django password validators), keyed
// verbatim so the existing `t(err.code)` call sites resolve as a drop-in. See AUTH-2.
const AUTH2_CODE_KEYS = [
  'email_password_mismatch',
  'username_password_mismatch',
  'phone_password_mismatch',
  'too_many_login_attempts',
  'invalid_login',
  'account_inactive',
  'enter_current_password',
  'password_too_short',
  'password_too_common',
  'password_entirely_numeric',
  'password_too_similar',
  'incorrect_code',
];

describe('authTranslations — AUTH-1 password-rules keys', () => {
  it.each(AUTH1_KEYS)('%s has de/fr/en entries', (key) => {
    expect(authTranslations[key]).toBeDefined();
    for (const locale of REQUIRED_LOCALES) {
      expect(authTranslations[key][locale]).toBeTruthy();
    }
  });
});

describe('authTranslations — AUTH-2 raw backend error codes', () => {
  it.each(AUTH2_CODE_KEYS)('%s has de/fr/en entries', (code) => {
    expect(authTranslations[code]).toBeDefined();
    for (const locale of REQUIRED_LOCALES) {
      expect(authTranslations[code][locale]).toBeTruthy();
    }
  });

  it('does not shadow the existing generic Auth.*_FAILED fallbacks', () => {
    expect(authTranslations['Auth.PASSWORD_CHANGE_FAILED']).toBeDefined();
    expect(authTranslations['Auth.LOGIN_FAILED']).toBeDefined();
    expect(authTranslations['Auth.MFA_AUTHENTICATE_FAILED']).toBeDefined();
  });
});
