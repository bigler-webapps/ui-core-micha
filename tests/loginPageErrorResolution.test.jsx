// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import { MemoryRouter } from 'react-router-dom';

const authApi = vi.hoisted(() => ({
  fetchRecoverySessionToken: vi.fn(),
  loginWithPassword: vi.fn(),
  loginWithRecoveryPassword: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);
vi.mock('../src/utils/authService', () => ({
  loginWithPasskey: vi.fn(),
  startSocialLogin: vi.fn(),
}));
vi.mock('react-helmet', () => ({ Helmet: ({ children }) => <>{children}</> }));

import { authTranslations } from '../src/i18n/authTranslations';
import { AuthContext } from '../src/auth/AuthContext';
import { LoginPage } from '../src/pages/LoginPage';

const translations = Object.fromEntries(
  Object.entries(authTranslations).map(([key, value]) => [key, value.en]),
);
const i18n = i18next.createInstance();

beforeAll(async () => {
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: translations } },
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
  });
});

beforeEach(() => {
  authApi.loginWithPassword.mockRejectedValue({
    response: {
      data: {
        errors: [{
          message: 'Gib eine gültige E-Mail Adresse an.',
          code: 'invalid',
          param: 'email',
        }],
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderLoginPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/login']}>
        <AuthContext.Provider value={{
          user: null,
          loading: false,
          login: vi.fn(),
          authMethods: {
            password_login: true,
            password_reset: false,
            signup: false,
            signup_modes: [],
            social_login: false,
            passkey_login: false,
          },
        }}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('LoginPage error resolution', () => {
  it('shows the email field translation for the exact allauth invalid-email response', async () => {
    renderLoginPage();

    fireEvent.change(screen.getByRole('textbox', { name: new RegExp(authTranslations['Auth.EMAIL_LABEL'].en) }), {
      target: { value: 'not-an-email@example.com' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(authTranslations['Auth.LOGIN_PASSWORD_LABEL'].en)), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: authTranslations['Auth.PAGE_LOGIN_TITLE'].en }));

    await waitFor(() => {
      expect(screen.getByText(authTranslations['Auth.field.email.invalid'].en)).toBeTruthy();
    });
    expect(screen.queryByText('invalid')).toBeNull();
  });
});
