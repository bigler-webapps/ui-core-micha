import { describe, expect, it } from 'vitest';
import { billingTranslations } from '../src/i18n/billingTranslations';

const german = {
  'Billing.OP_OVERVIEW_TITLE':'Übersicht Abos','Billing.OP_ACTIVE_ACCOUNTS':'Aktive Konten','Billing.OP_PLAN':'Abo {{plan}}','Billing.OP_TEAM_SEAT':'Team-Platz','Billing.OP_FREE_ACCESS':'Ohne Abo freigeschaltet','Billing.OP_READ_ONLY':'Schreibgeschützt','Billing.OP_NEW_SUBSCRIPTIONS':'Neue Abos','Billing.OP_ENDED_SUBSCRIPTIONS':'Beendete Abos','Billing.OP_PACKAGES_SOLD':'Verkaufte Pakete','Billing.OP_TOKENS_GRANTED':'Token gewährt','Billing.OP_TOKENS_USED':'Token verbraucht','Billing.OP_TOKENS_EXPIRED':'Token verfallen','Billing.OP_AI_COST':'KI-Kosten','Billing.OP_COST_PER_TOKEN':'Kosten pro Token','Billing.OP_ACCESS':'Zugang','Billing.OP_REASON':'Grund','Billing.OP_REVOKE_TITLE':'Freischaltung aufheben?','Billing.OP_REVOKE_BODY':'Die Daten bleiben erhalten; ohne anderen Zugang sind sie danach schreibgeschützt.','Billing.OP_UNTIL':'bis {{date}}','Billing.OP_RENEWS':'verlängert sich','Billing.OP_ENDS':'endet','Billing.OP_GRANT_PLAN':'Kontingent','Billing.OP_GRANT_PACKAGE':'Paket','Billing.OP_REMAINING':'verbleibend','Billing.OP_VALID_UNTIL':'gültig bis {{date}}','Billing.OP_SEATS_USED':'{{n}} von {{m}} Plätzen belegt'
};
const added = ['Billing.OP_MONTH','Billing.OP_PROVIDER','Billing.OP_MODEL','Billing.OP_CALLS','Billing.OP_COST_USD','Billing.OP_CANCEL','Billing.OP_GRANT','Billing.OP_REVOKE','Billing.OP_SEAT_UNTIL','Billing.OP_LOAD_ERROR','Billing.OP_SAVE_ERROR','Billing.OP_FORBIDDEN','Billing.OP_NO_AI_COST'];
describe('operator billing translations',()=>it('contains complete de/en/fr/sw copy with matching interpolation names',()=>{
  for(const [key,de] of Object.entries(german)) expect(billingTranslations[key]?.de).toBe(de);
  for(const key of [...Object.keys(german),...added]) {
    const entry=billingTranslations[key]; expect(entry, key).toBeTruthy();
    for(const lang of ['de','en','fr','sw']) expect(typeof entry[lang]).toBe('string');
    const placeholders=(text)=>[...text.matchAll(/{{(\w+)}}/g)].map((match)=>match[1]).sort();
    expect(placeholders(entry.en)).toEqual(placeholders(entry.de)); expect(placeholders(entry.fr)).toEqual(placeholders(entry.de)); expect(placeholders(entry.sw)).toEqual(placeholders(entry.de));
  }
}));
