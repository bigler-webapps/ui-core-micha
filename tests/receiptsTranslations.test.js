import { describe, expect, it } from 'vitest';
import { receiptsTranslations } from '../src/i18n/receiptsTranslations';

describe('receipt translations', () => {
  it('has every new string in the four supported locales with matching placeholders', () => {
    const locales = ['de', 'en', 'fr', 'sw'];
    for (const [key, value] of Object.entries(receiptsTranslations)) {
      expect(key.startsWith('Receipts.')).toBe(true);
      for (const locale of locales) expect(typeof value[locale], `${key} ${locale}`).toBe('string');
      const placeholders = (s) => [...s.matchAll(/{{\s*([^}\s]+)\s*}}/g)].map((m) => m[1]).sort();
      for (const locale of locales.slice(1)) expect(placeholders(value[locale])).toEqual(placeholders(value.de));
    }
  });
});
