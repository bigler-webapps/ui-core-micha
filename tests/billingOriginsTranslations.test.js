import { describe, expect, it } from 'vitest';
import { billingTranslations } from '../src/i18n/billingTranslations';

const required = {
  'Billing.ORIGIN_HEADER': { de: 'Herkunft', placeholders: [] },
  'Billing.VALID_HEADER': { de: 'gültig', placeholders: [] },
  'Billing.ORIGIN_credit': { de: 'Gutschrift', placeholders: [] },
  'Billing.ORIGIN_trial': { de: 'Test-Guthaben', placeholders: [] },
  'Billing.ORIGIN_pool': { de: 'Team-Pool', placeholders: [] },
  'Billing.EXPIRES_ON': { de: 'verfällt am {{date}}', placeholders: ['date'] },
  'Billing.NEVER_EXPIRES': { de: 'verfällt nicht', placeholders: [] },
  'Billing.ORIGIN_LINE': { de: '{{name}} · {{amount}} Token', placeholders: ['name', 'amount'] },
  'Billing.SEAT_PAYER': { de: 'Platz im Team-Paket von {{name}}', placeholders: ['name'] },
  'Billing.PURCHASES': { de: 'Käufe', placeholders: [] },
  'Billing.WITHDRAWN_ON': { de: 'Widerrufen am {{date}}', placeholders: ['date'] },
  'Billing.WITHDRAWAL_PERIOD_OVER': { de: 'Widerrufsfrist abgelaufen', placeholders: [] },
};
const locales = ['de', 'de_informal', 'en', 'fr', 'sw'];

const placeholders = (text) => [...text.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map((match) => match[1]).sort();

describe('billing origin and purchase translations', () => {
  it('provides every new key in all locales with identical placeholders and exact German copy', () => {
    for (const [key, spec] of Object.entries(required)) {
      const value = billingTranslations[key];
      expect(value, key).toBeTruthy();
      for (const locale of locales) {
        expect(typeof value[locale], `${key}.${locale}`).toBe('string');
        expect(placeholders(value[locale]), `${key}.${locale} placeholders`).toEqual([...spec.placeholders].sort());
      }
      expect(value.de).toBe(spec.de);
      expect(value.de_informal).toBe(value.de);
    }
  });

  it('uses no German wording containing Sitz', () => {
    for (const value of Object.values(billingTranslations)) {
      expect(`${value.de} ${value.de_informal}`).not.toMatch(/Sitz/i);
    }
  });
});
