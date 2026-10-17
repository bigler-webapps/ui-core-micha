import { describe, expect, it } from 'vitest';
import { billingTranslations } from '../src/i18n/billingTranslations';
import { createUiCoreTranslations } from '../src/i18n/uiCoreTranslations';

const placeholderNames = (text) => [...text.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map((match) => match[1]).sort();

describe('billing informal German translations', () => {
  it('provides non-empty informal German with matching placeholders for every billing key', () => {
    for (const [key, value] of Object.entries(billingTranslations)) {
      expect(value.de_informal, `${key}.de_informal`).toEqual(expect.any(String));
      expect(value.de_informal.trim(), `${key}.de_informal`).not.toBe('');
      expect(placeholderNames(value.de_informal), `${key} placeholders`).toEqual(placeholderNames(value.de));
      expect(value.de_informal, `${key} formal address`).not.toMatch(/\b(?:Sie|Ihr|Ihre|Ihren|Ihnen)\b/);
      expect(value.de, `${key}.de`).not.toContain('Sitz');
      expect(value.de_informal, `${key}.de_informal`).not.toContain('Sitz');
    }
  });

  it('uses the settled Platz wording and exposes the picker label in all five locales', () => {
    expect(billingTranslations['Billing.SEATS_one'].de).toBe('{{count}} Platz');
    expect(billingTranslations['Billing.SEATS_other'].de).toBe('{{count}} Plätze');
    expect(billingTranslations['Billing.SEATS_ADD'].de).toBe('Platz vergeben');
    expect(billingTranslations['Billing.ERROR_SEAT_LIMIT'].de).toBe('Alle Plätze sind belegt.');
    expect(billingTranslations['Billing.TEAM_SEATS'].de).toBe('Plätze im Team-Paket');
    expect(billingTranslations['Billing.SEAT_PICK']).toEqual({
      de: 'Teammitglied wählen', de_informal: 'Teammitglied wählen', en: 'Choose a team member',
      fr: 'Choisir un membre de l’équipe', sw: 'Chagua mwanatimu',
    });
  });

  it('changes every formal address to informal German and resolves the aggregate variant', () => {
    const withFormalAddress = Object.entries(billingTranslations)
      .filter(([, value]) => /\b(?:Sie|Ihr|Ihre|Ihren|Ihnen)\b/.test(value.de));
    expect(withFormalAddress.length).toBeGreaterThan(0);
    for (const [key, value] of withFormalAddress) expect(value.de_informal, key).not.toBe(value.de);

    const informal = createUiCoreTranslations({ germanVariant: 'informal' });
    const formal = createUiCoreTranslations();
    for (const key of ['Billing.ERROR_CHECKOUT', 'Billing.WITHDRAWAL_REFUND', 'Billing.OP_PLAN']) {
      expect(informal[key].de).toBe(billingTranslations[key].de_informal);
      expect(formal[key].de).toBe(billingTranslations[key].de);
    }
  });
});
