import { describe, expect, it } from 'vitest';
import { chatTranslations } from '../src/i18n/chatTranslations';

const LOCALES = ['de', 'en', 'fr', 'sw'];

describe('chatTranslations', () => {
  it('has every key in all four languages', () => {
    for (const [key, value] of Object.entries(chatTranslations)) {
      for (const locale of LOCALES) {
        expect(typeof value[locale], `${key}.${locale}`).toBe('string');
        expect(value[locale].trim(), `${key}.${locale}`).not.toBe('');
      }
    }
  });

  it('uses the Envelope copy verbatim in English', () => {
    expect(chatTranslations['Chat.usageLimit'].en).toBe('Usage limit reached for {{model}}. Choose another model or try again later.');
    expect(chatTranslations['Chat.answerIncomplete'].en).toBe('The answer could not be completed.');
    expect(chatTranslations['Chat.unavailable'].en).toBe('Chat is not available');
    expect(chatTranslations['Chat.noModel'].en).toBe('No language model is configured on this server.');
    expect(chatTranslations['Chat.interrupted'].en).toBe('Interrupted');
    expect(chatTranslations['Chat.reconnecting'].en).toBe('Reconnecting');
    expect(chatTranslations['Chat.archived'].en).toBe('Archived');
    expect(chatTranslations['Chat.notAvailableHere'].en).toBe('The assistant is not available here.');
    expect(chatTranslations['Chat.historyTrimmed_one'].en).toBe('{{count}} earlier message left out');
    expect(chatTranslations['Chat.historyTrimmed_other'].en).toBe('{{count}} earlier messages left out');
    expect(chatTranslations['Chat.sidePanel'].en).toBe('Details');
  });

  it('includes the redesigned picker copy in all locales', () => {
    for (const key of ['Chat.pickerTitle', 'Chat.level.top', 'Chat.level.best', 'Chat.level.balanced', 'Chat.level.fast', 'Chat.longChat', 'Chat.summaryUntilHere', 'Chat.replyTokens']) {
      for (const locale of LOCALES) expect(chatTranslations[key][locale].trim(), `${key}.${locale}`).not.toBe('');
    }
  });

  it('keeps interpolation placeholders in every language', () => {
    for (const [key, value] of Object.entries(chatTranslations)) {
      const wanted = [...value.en.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
      for (const locale of LOCALES) {
        const found = [...value[locale].matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
        expect(found, `${key}.${locale}`).toEqual(wanted);
      }
    }
  });
});
