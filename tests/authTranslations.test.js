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

describe('authTranslations — UserList pagination labels', () => {
  it.each(['UserList.DISPLAYED_ROWS', 'UserList.DISPLAYED_ROWS_MORE_THAN'])('%s has all supported locale entries', (key) => {
    expect(authTranslations[key]).toBeDefined();
    for (const locale of ['de', 'fr', 'en', 'sw']) {
      expect(authTranslations[key][locale]).toEqual(expect.any(String));
      expect(authTranslations[key][locale].trim()).not.toBe('');
    }
  });

  // A nonempty string isn't enough -- a locale missing an interpolation placeholder the
  // others carry would silently render the literal "{{count}}" to a real user (UCM-I18N-5 review).
  it.each(['de', 'fr', 'en', 'sw'])('%s has {{from}} and {{to}} in both pagination keys, and {{count}} only in the exact-count one', (locale) => {
    expect(authTranslations['UserList.DISPLAYED_ROWS'][locale]).toContain('{{from}}');
    expect(authTranslations['UserList.DISPLAYED_ROWS'][locale]).toContain('{{to}}');
    expect(authTranslations['UserList.DISPLAYED_ROWS'][locale]).toContain('{{count}}');

    expect(authTranslations['UserList.DISPLAYED_ROWS_MORE_THAN'][locale]).toContain('{{from}}');
    expect(authTranslations['UserList.DISPLAYED_ROWS_MORE_THAN'][locale]).toContain('{{to}}');
    expect(authTranslations['UserList.DISPLAYED_ROWS_MORE_THAN'][locale]).not.toContain('{{count}}');
  });
});


describe('authTranslations — password-too-short wording', () => {
  it('uses the same nonempty text for every locale across all three keys', () => {
    const approvedTexts = {
      de: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
      en: 'The password must be at least 8 characters long.',
      fr: 'Le mot de passe doit contenir au moins 8 caractères.',
      sw: 'Nenosiri linahitajika kuwa na angalau herufi 8.',
    };
    const messages = [
      authTranslations['Auth.PASSWORD_TOO_SHORT'],
      authTranslations['Auth.PASSWORD_TOO_SHORT_LOCAL'],
      authTranslations.password_too_short,
    ];
    const locales = new Set([
      ...Object.keys(approvedTexts),
      ...messages.flatMap((message) => Object.keys(message)),
    ]);

    for (const locale of locales) {
      expect(messages[0][locale]).toEqual(expect.any(String));
      expect(messages[0][locale].trim()).not.toBe('');
      expect(messages[1][locale]).toBe(messages[0][locale]);
      expect(messages[2][locale]).toBe(messages[0][locale]);
      if (Object.hasOwn(approvedTexts, locale)) {
        expect(messages[0][locale]).toBe(approvedTexts[locale]);
      }
    }
  });
});
