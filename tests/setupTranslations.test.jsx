// @vitest-environment jsdom
// The new setup labels and errors resolve through the real shared catalogue
// (createUiCoreTranslations + i18next), not through a mocked `t`.
import React from 'react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';

vi.mock('../src/auth/authApi', () => ({
  fetchPrivacyStatement: vi.fn().mockResolvedValue('Privacy'),
  updateUserProfile: vi.fn(),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { createUiCoreTranslations } from '../src/i18n/uiCoreTranslations';
import { ProfileStepContent } from '../src/components/ProfileStepContent';
import { SetupWizardShell } from '../src/onboarding/SetupWizardShell';

afterEach(() => cleanup());

const EXPECTED = {
  de: {
    terms: 'Nutzungsbedingungen',
    privacy: 'Datenschutzerklärung',
    statement: 'Ich akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.',
    cookies: 'Komfort-Cookies erlauben (optional)',
    required: 'Bitte akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.',
    counter: 'Schritt 2 von 6',
    back: 'Zurück',
  },
  en: {
    terms: 'terms of use',
    privacy: 'privacy statement',
    statement: 'I accept the terms of use and the privacy statement.',
    cookies: 'Allow convenience cookies (optional)',
    required: 'Please accept the terms of use and the privacy statement.',
    counter: 'Step 2 of 6',
    back: 'Back',
  },
};

async function renderInLanguage(language) {
  const messages = createUiCoreTranslations({ germanVariant: 'informal' });
  const instance = i18next.createInstance();
  await instance.init({
    lng: language,
    fallbackLng: language,
    resources: { [language]: { translation: Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, value[language]])) } },
    interpolation: { escapeValue: false },
  });
  const termsApi = {
    getAcceptance: vi.fn().mockResolvedValue({ document: { version: 'v1', url: 'https://example.test/terms' }, accepted: false }),
    accept: vi.fn(),
  };
  const steps = ['one', 'two', 'three', 'four', 'five', 'six'].map((id) => ({ id, label: id }));
  render(
    <I18nextProvider i18n={instance}>
      <AuthContext.Provider value={{ user: { id: 1, first_name: 'A', last_name: 'B' }, login: vi.fn() }}>
        <SetupWizardShell steps={steps} currentStepId="two" onBack={() => {}}>
          <ProfileStepContent termsEnabled termsApi={termsApi} privacyUrl="https://example.test/privacy" />
        </SetupWizardShell>
      </AuthContext.Provider>
    </I18nextProvider>,
  );
  await waitFor(() => expect(screen.getAllByRole('checkbox')[0].disabled).toBe(false));
}

describe('setup translations', () => {
  it.each(['de', 'en'])('renders the %s labels and the required-statement error', async (language) => {
    const copy = EXPECTED[language];
    await renderInLanguage(language);

    expect(screen.getByRole('link', { name: copy.terms })).toBeTruthy();
    expect(screen.getByRole('link', { name: copy.privacy })).toBeTruthy();
    // The statement is split around its two links; match the assembled label text.
    expect(screen.getAllByText((_, element) => element?.tagName === 'SPAN' && element.textContent === copy.statement).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.cookies)).toBeTruthy();
    expect(screen.getByText(copy.counter)).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.back })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: language === 'de' ? 'Speichern' : 'Save' }));
    await waitFor(() => expect(screen.getByText(copy.required)).toBeTruthy());
  });
});
