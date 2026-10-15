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
    expect(chatTranslations['Chat.driver.claude_cli'].en).toBe('Claude Code subscription');
    expect(chatTranslations['Chat.driver.anthropic_api'].en).toBe('Anthropic API');
    expect(chatTranslations['Chat.driver.openai_api'].en).toBe('OpenAI API');
    expect(chatTranslations['Chat.usageLimit'].en).toBe('Usage limit reached for {{model}}. Choose another model or try again later.');
    expect(chatTranslations['Chat.answerIncomplete'].en).toBe('The answer could not be completed.');
    expect(chatTranslations['Chat.unavailable'].en).toBe('Chat is not available');
    expect(chatTranslations['Chat.noModel'].en).toBe('No language model is configured on this server.');
    expect(chatTranslations['Chat.payPerUse'].en).toBe('pay per use');
    expect(chatTranslations['Chat.interrupted'].en).toBe('Interrupted');
    expect(chatTranslations['Chat.reconnecting'].en).toBe('Reconnecting');
    expect(chatTranslations['Chat.archived'].en).toBe('Archived');
  });

  it('includes non-empty driver names in every locale', () => {
    for (const id of ['claude_cli', 'anthropic_api', 'openai_api']) {
      const value = chatTranslations[`Chat.driver.${id}`];
      expect(value).toBeTruthy();
      for (const locale of LOCALES) expect(value[locale].trim(), `${id}.${locale}`).not.toBe('');
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
