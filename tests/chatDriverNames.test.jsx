// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import ModelPicker from '../src/chat/ModelPicker';
import { chatTranslations } from '../src/i18n/chatTranslations';
afterEach(cleanup);
it('uses localized effort labels and provider names without driver groups', async () => {
  const resources = {};
  Object.entries(chatTranslations).forEach(([key, value]) => Object.entries(value).forEach(([locale, text]) => { resources[locale] ||= { translation: {} }; resources[locale].translation[key] = text; }));
  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'de', resources, keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false } });
  render(<I18nextProvider i18n={i18n}><ModelPicker entries={[{ id: 'a', label: 'Sonnet 4.5', provider: 'anthropic', level: 'balanced', efforts: ['high'] }]} selection={{ entry: 'a', effort: 'high' }} /></I18nextProvider>);
  expect(screen.getByRole('button', { name: 'Sonnet · Sehr gründlich ▾' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Sonnet · Sehr gründlich ▾' }));
  expect(screen.getByText('von Anthropic')).toBeTruthy();
  expect(screen.queryByRole('group', { name: /driver/i })).toBeNull();
});
