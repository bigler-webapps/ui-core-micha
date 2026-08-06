// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';

const authApi = vi.hoisted(() => ({
  changePassword: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);
vi.mock('../src/utils/authService', () => ({ startSocialLogin: vi.fn() }));

import { authTranslations } from '../src/i18n/authTranslations';
import { AuthContext } from '../src/auth/AuthContext';
import { SecurityComponent } from '../src/components/SecurityComponent';

const translations = Object.fromEntries(
  Object.entries(authTranslations).map(([key, value]) => [key, value.en]),
);

const i18n = i18next.createInstance();
i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: translations } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

function renderSecurity() {
  return render(
    <I18nextProvider i18n={i18n}>
      <AuthContext.Provider value={{ authMethods: { password_change: true } }}>
        <SecurityComponent />
      </AuthContext.Provider>
    </I18nextProvider>,
  );
}

function submitPasswordChange() {
  fireEvent.change(screen.getByLabelText(/Current password/), { target: { value: 'currentpw' } });
  fireEvent.change(screen.getByLabelText(/New password/), { target: { value: 'a-fine-new-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
}

afterEach(() => {
  cleanup();
  authApi.changePassword.mockReset();
});

describe('SecurityComponent — backend auth error code rendering', () => {
  it('shows translated human text, not the raw code, for a mapped error', async () => {
    authApi.changePassword.mockRejectedValue({ code: 'enter_current_password' });
    renderSecurity();

    submitPasswordChange();

    await waitFor(() => {
      expect(screen.getByText('The current password is incorrect.')).toBeTruthy();
    });
    expect(screen.queryByText('enter_current_password')).toBeNull();
  });

  it('falls back to the generic failure message when the backend sends no code at all', async () => {
    authApi.changePassword.mockRejectedValue(new Error('network failure'));
    renderSecurity();

    submitPasswordChange();

    await waitFor(() => {
      expect(screen.getByText('The password could not be changed.')).toBeTruthy();
    });
  });
});
