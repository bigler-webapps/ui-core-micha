import { describe, expect, it } from 'vitest';
import { resolveErrorText } from '../src/utils/resolveErrorText';

function makeI18n(values) {
  return {
    exists: (key) => Object.hasOwn(values, key),
    t: (key) => values[key] ?? `missing:${key}`,
  };
}

describe('resolveErrorText', () => {
  it('prefers an explicit backend i18nKey over every lower-priority source', () => {
    const i18n = makeI18n({
      'Auth.explicit': 'Explicit text',
      'Auth.field.email.invalid': 'Field text',
      invalid: 'Code text',
      'Auth.DEFAULT': 'Default text',
    });

    expect(resolveErrorText(i18n, {
      i18nKey: 'Auth.explicit',
      field: 'email',
      code: 'invalid',
      backendMessage: 'Backend text',
    }, 'Auth.DEFAULT')).toBe('Explicit text');
  });

  it('uses the allauth param as a field-specific key before the code', () => {
    const i18n = makeI18n({
      'Auth.field.email.invalid': 'Field text',
      invalid: 'Code text',
      'Auth.DEFAULT': 'Default text',
    });

    expect(resolveErrorText(i18n, {
      field: 'email',
      code: 'invalid',
      backendMessage: 'Backend text',
    }, 'Auth.DEFAULT')).toBe('Field text');
  });

  it('uses the code catalogue entry when no field entry exists', () => {
    const i18n = makeI18n({
      email_password_mismatch: 'Code text',
      'Auth.DEFAULT': 'Default text',
    });

    expect(resolveErrorText(i18n, {
      field: 'email',
      code: 'email_password_mismatch',
      backendMessage: 'Backend text',
    }, 'Auth.DEFAULT')).toBe('Code text');
  });

  it('uses the backend message before the caller default', () => {
    const i18n = makeI18n({ 'Auth.DEFAULT': 'Default text' });

    expect(resolveErrorText(i18n, {
      code: 'unknown_backend_code',
      backendMessage: 'Backend text',
    }, 'Auth.DEFAULT')).toBe('Backend text');
  });

  it('uses the caller default instead of ever returning an unknown raw code', () => {
    const i18n = makeI18n({ 'Auth.DEFAULT': 'Default text' });

    expect(resolveErrorText(i18n, {
      code: 'unknown_backend_code',
    }, 'Auth.DEFAULT')).toBe('Default text');
    expect(resolveErrorText(i18n, null, 'Auth.DEFAULT')).toBe('Default text');
  });
});
