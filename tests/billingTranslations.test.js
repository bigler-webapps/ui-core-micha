import { describe, expect, it } from 'vitest';
import { billingTranslations } from '../src/i18n/billingTranslations';

const LOCALES = ['de', 'en', 'fr', 'sw'];

describe('billingTranslations', () => {
  it('has non-empty copy and matching interpolation placeholders in all locales', () => {
    for (const [key, value] of Object.entries(billingTranslations)) {
      const placeholders = [...value.de.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
      for (const locale of LOCALES) {
        expect(typeof value[locale], `${key}.${locale}`).toBe('string');
        expect(value[locale].trim(), `${key}.${locale}`).not.toBe('');
        expect([...value[locale].matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort(), `${key}.${locale}`).toEqual(placeholders);
      }
    }
  });
});
