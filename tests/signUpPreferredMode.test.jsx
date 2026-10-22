// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';

vi.mock('../src/auth/authApi', () => ({ submitRegistrationRequest: vi.fn() }));
vi.mock('../src/utils/authService', () => ({ startSocialLogin: vi.fn() }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { SignUpContent } from '../src/components/SignUpContent';
import { SignUpPage } from '../src/pages/SignUpPage';
import { uiCoreTranslations } from '../src/i18n/uiCoreTranslations';

afterEach(cleanup);

const authMethods = {
  signup_modes: ['self_signup_access_code', 'self_signup_open'],
};

function createI18n(language) {
  const resources = Object.fromEntries(
    Object.entries(uiCoreTranslations).map(([key, value]) => [key, value[language]]),
  );
  const instance = i18next.createInstance();
  instance.init({
    lng: language,
    fallbackLng: language,
    resources: { [language]: { translation: resources } },
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
  });
  return instance;
}

function renderContent(props = {}, language = 'en') {
  const i18n = createI18n(language);
  return render(
    <I18nextProvider i18n={i18n}>
      <AuthContext.Provider value={{ authMethods }}>
        <SignUpContent {...props} />
      </AuthContext.Provider>
    </I18nextProvider>,
  );
}

function renderPage(props = {}) {
  const i18n = createI18n('en');
  return render(
    <I18nextProvider i18n={i18n}>
      <AuthContext.Provider value={{ authMethods }}>
        <SignUpPage {...props} />
      </AuthContext.Provider>
    </I18nextProvider>,
  );
}

describe('signup preferred mode and submit labels', () => {
  it('puts an available preferred mode first and selects it', () => {
    renderContent({ preferredSignupMode: 'self_signup_open' });

    const buttons = screen.getAllByRole('button');
    expect(buttons[0].textContent).toBe('Direct sign-up');
    expect(buttons[0].className).toContain('contained');
    expect(screen.queryByLabelText('With access code')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  it('ignores a preferred mode the server does not offer', () => {
    renderContent({ preferredSignupMode: 'self_signup_qr' });

    const buttons = screen.getAllByRole('button');
    expect(buttons[0].textContent).toBe('With access code');
    expect(buttons[0].className).toContain('contained');
    expect(screen.queryByRole('button', { name: 'QR registration' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Request invitation' })).toBeTruthy();
  });

  it('keeps server order without the preferred mode prop', () => {
    renderContent();

    expect(screen.getAllByRole('button')[0].textContent).toBe('With access code');
    expect(screen.getByRole('button', { name: 'Request invitation' })).toBeTruthy();
  });

  it('uses the invitation label for access-code signup', () => {
    renderContent();

    expect(screen.getByRole('button', { name: 'Request invitation' })).toBeTruthy();
  });

  it.each([
    ['de', 'Konto anlegen'],
    ['en', 'Create account'],
  ])('resolves the open signup label from shared i18n in %s', (language, label) => {
    renderContent({ preferredSignupMode: 'self_signup_open' }, language);

    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  });

  it('passes the preferred mode through SignUpPage and shows its matching subtitle initially', () => {
    renderPage({ preferredSignupMode: 'self_signup_open' });

    expect(screen.getAllByRole('button')[0].textContent).toBe('Direct sign-up');
    expect(screen.getByText('Enter your email address to sign up directly.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });
});
