// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';

import ModelPicker from '../src/chat/ModelPicker';
import { chatTranslations } from '../src/i18n/chatTranslations';

// The real translations through a real i18next instance (the picker tests with a mocked t only see keys).
function makeI18n(language) {
  const resources = {};
  for (const [key, value] of Object.entries(chatTranslations)) {
    for (const [locale, text] of Object.entries(value)) {
      resources[locale] = resources[locale] || { translation: {} };
      resources[locale].translation[key] = text;
    }
  }
  const instance = i18next.createInstance();
  instance.init({ lng: language, fallbackLng: 'en', resources, keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false } });
  return instance;
}

const entries = [
  { id: 'cli', driver: 'claude_cli', model: 'sonnet', label: 'Sonnet', efforts: ['high'], billing: 'subscription' },
  { id: 'anth', driver: 'anthropic_api', model: 'claude', label: 'Claude API', efforts: ['high'], billing: 'pay_per_use' },
  { id: 'oa', driver: 'openai_api', model: 'gpt', label: 'GPT', efforts: ['high'], billing: 'pay_per_use' },
  { id: 'x', driver: 'mystery_driver', model: 'x', label: 'Mystery', efforts: ['high'], billing: 'subscription' },
];

function open(language) {
  render(
    <I18nextProvider i18n={makeI18n(language)}>
      <ModelPicker entries={entries} selection={{ entry: 'cli', effort: 'high' }} />
    </I18nextProvider>,
  );
  const bar = screen.getByRole('button', { name: /Sonnet/ });
  const label = bar.textContent;
  fireEvent.click(bar);
  return label;
}

afterEach(cleanup);

describe('ModelPicker with the real chat translations', () => {
  it('shows readable English driver names as heading and accessible name, and the raw id for an unknown driver', () => {
    open('en');
    for (const name of ['Claude Code subscription', 'Anthropic API', 'OpenAI API', 'mystery_driver']) {
      expect(screen.getByRole('group', { name })).toBeTruthy();
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.queryByRole('group', { name: 'claude_cli' })).toBeNull();
  });

  it('shows the German names and translates the effort in the bar label', () => {
    const label = open('de');
    expect(label).toBe('Sonnet · Hoch');
    expect(screen.getByRole('group', { name: 'Claude Code (Abo)' })).toBeTruthy();
  });

  it('shows the French and Swahili names', () => {
    open('fr');
    expect(screen.getByRole('group', { name: 'API Anthropic' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Claude Code (abonnement)' })).toBeTruthy();
    cleanup();
    open('sw');
    expect(screen.getByRole('group', { name: 'API ya OpenAI' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Claude Code (usajili)' })).toBeTruthy();
  });
});
