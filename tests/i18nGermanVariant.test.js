import { describe, expect, it } from 'vitest';

import { authTranslations } from '../src/i18n/authTranslations';
import {
  createUiCoreTranslations,
  uiCoreTranslations,
} from '../src/i18n/uiCoreTranslations';

const SIE_FORM = /\b(Sie|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b/;
const REQUIRED_LOCALES = ['de', 'en', 'fr', 'sw'];

describe('German translation variants', () => {
  it('keeps formal German by default and switches representative auth copy to du', () => {
    const key = 'Auth.PAGE_INVITE_SUBTITLE';
    const formal = createUiCoreTranslations();
    const informal = createUiCoreTranslations({ germanVariant: 'informal' });

    expect(formal[key].de).toBe(uiCoreTranslations[key].de);
    expect(formal[key]).not.toHaveProperty('de_informal');
    expect(informal[key].de).toBe('Bitte wähle ein Passwort, um auf dein Konto zuzugreifen.');
    expect(informal[key].de).not.toMatch(SIE_FORM);
    expect(informal['Auth.EMAIL_LABEL'].de).toBe(formal['Auth.EMAIL_LABEL'].de);
  });

  it('switches EVERY Sie-form key to its own rewritten de_informal, not one hardcoded example', () => {
    // Not just one representative key -- a factory hardcoded to a single
    // (key, value) pair would pass the test above but fail here the moment a
    // second Sie-form key is checked against ITS OWN de_informal value.
    const formalKeys = Object.entries(authTranslations)
      .filter(([, value]) => SIE_FORM.test(value.de))
      .map(([key]) => key);
    expect(formalKeys.length).toBeGreaterThan(1);

    const informal = createUiCoreTranslations({ germanVariant: 'informal' });
    const formal = createUiCoreTranslations();
    for (const key of formalKeys) {
      expect(informal[key].de, `${key} should switch to its own de_informal`).toBe(authTranslations[key].de_informal);
      expect(informal[key].de).not.toMatch(SIE_FORM);
      expect(formal[key].de, `${key} default must stay formal`).toBe(authTranslations[key].de);
    }
  });

  it('requires every Sie-form auth string to have a rewritten informal variant', () => {
    const formalKeys = Object.entries(authTranslations)
      .filter(([, value]) => SIE_FORM.test(value.de))
      .map(([key]) => key);

    expect(formalKeys.length).toBeGreaterThan(0);
    for (const key of formalKeys) {
      const informal = authTranslations[key].de_informal;
      expect(informal, `${key} needs de_informal`).toEqual(expect.any(String));
      expect(informal.trim(), `${key}.de_informal must not be empty`).not.toBe('');
      expect(informal, `${key}.de_informal must not retain Sie-form`).not.toMatch(SIE_FORM);
    }
  });

  it('preserves the four-locale shape for the aggregate after adding screen keys', () => {
    for (const [key, value] of Object.entries(uiCoreTranslations)) {
      for (const locale of REQUIRED_LOCALES) {
        expect(typeof value[locale], `${key}.${locale} must be a string`).toBe('string');
        expect(value[locale].trim(), `${key}.${locale} must not be empty`).not.toBe('');
      }
    }
  });
});
