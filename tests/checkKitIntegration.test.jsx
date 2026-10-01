// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';

import apiClient from '../src/auth/apiClient';
import { AuthContext } from '../src/auth/AuthContext';
import { checkKitIntegration } from '../src/testing/checkKitIntegration';
import { uiCoreTranslations } from '../src/i18n/uiCoreTranslations';
import { LoginPage } from '../src/pages/LoginPage';

const languages = ['de', 'en', 'fr', 'sw'];
const authMethods = {
  password_login: true,
  password_reset: false,
  signup: false,
  signup_modes: [],
  social_login: false,
  passkey_login: false,
};

function resources() {
  return Object.fromEntries(languages.map((language) => [language, {
    translation: Object.fromEntries(
      Object.entries(uiCoreTranslations).map(([key, values]) => [key, values[language]]),
    ),
  }]));
}

function makeWrapper(instance, authMethodsOverride = authMethods) {
  return function FixtureWrapper({ children }) {
    return (
      <I18nextProvider i18n={instance}>
        <AuthContext.Provider value={{
          user: null,
          loading: false,
          login: vi.fn(),
          authMethods: authMethodsOverride,
        }}>
          {children}
        </AuthContext.Provider>
      </I18nextProvider>
    );
  };
}

beforeAll(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  await i18next.init({
    lng: 'en',
    fallbackLng: false,
    supportedLngs: languages,
    resources: resources(),
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
  });
});

afterEach(async () => {
  await i18next.changeLanguage('en');
  for (const language of languages) {
    i18next.removeResourceBundle(language, 'translation');
    i18next.addResourceBundle(language, 'translation', resources()[language].translation, true, true);
  }
});

describe('checkKitIntegration', () => {
  it('passes for a correctly wired app fixture', async () => {
    const { findings } = await checkKitIntegration({
      i18n: i18next,
      wrapper: makeWrapper(i18next),
      pages: [LoginPage],
    });

    expect(findings).toEqual([]);
  });

  it('does not flag a legitimate short lowercase translated word as a raw backend code', async () => {
    // Auth.LOGIN_OR's German value is literally "oder" -- all-lowercase, no
    // spaces, length 4 -- the exact shape a naive raw-code heuristic would
    // false-positive on. Render LoginForm's sign-up/forgot-password divider
    // (onSignUp truthy) in German to actually exercise that rendered text.
    await i18next.changeLanguage('de');
    const { findings } = await checkKitIntegration({
      i18n: i18next,
      wrapper: makeWrapper(i18next, { ...authMethods, signup: true, signup_modes: ['self_signup_open'] }),
      pages: [LoginPage],
    });

    expect(findings).toEqual([]);
  });

  it('reports one catalogue finding for one missing language key', async () => {
    const key = 'Auth.field.email.invalid';
    const french = { ...resources().fr.translation };
    delete french[key];
    i18next.removeResourceBundle('fr', 'translation');
    i18next.addResourceBundle('fr', 'translation', french, true, true);

    const { findings } = await checkKitIntegration({
      i18n: i18next,
      wrapper: makeWrapper(i18next),
      pages: [],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ check: 'catalogue' });
    expect(findings[0].reason).toContain(`${key} for language fr`);
  });

  it('still reports a missing key when the consumer app configures a fallback language', async () => {
    // A consumer typically sets fallbackLng (e.g. "en"), not "false" like the
    // fixture above. Without forcing fallbackLng: false per-call, i18next's
    // exists() would resolve the missing "fr" key through the fallback and
    // read as present, masking the real gap this check exists to catch.
    const key = 'Auth.field.email.invalid';
    const french = { ...resources().fr.translation };
    delete french[key];
    i18next.removeResourceBundle('fr', 'translation');
    i18next.addResourceBundle('fr', 'translation', french, true, true);
    i18next.options.fallbackLng = 'en';

    try {
      const { findings } = await checkKitIntegration({
        i18n: i18next,
        wrapper: makeWrapper(i18next),
        pages: [],
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ check: 'catalogue' });
      expect(findings[0].reason).toContain(`${key} for language fr`);
    } finally {
      i18next.options.fallbackLng = false;
    }
  });

  it('reports when the app passes a separate i18next instance', async () => {
    const separate = i18next.createInstance();
    await separate.init({
      lng: 'en',
      fallbackLng: false,
      supportedLngs: languages,
      resources: resources(),
      keySeparator: false,
      nsSeparator: false,
    });

    const { findings } = await checkKitIntegration({
      i18n: separate,
      wrapper: makeWrapper(separate),
      pages: [],
    });

    expect(findings.some(({ check }) => check === 'instance')).toBe(true);
  });

  it('reports a page when the consumer wrapper throws', async () => {
    function ThrowingWrapper() {
      throw new Error('provider exploded');
    }

    const before = apiClient.defaults.adapter;
    const { findings } = await checkKitIntegration({
      i18n: i18next,
      wrapper: ThrowingWrapper,
      pages: [LoginPage],
    });

    expect(findings.some(({ check, reason }) => check === 'render' && reason.includes('LoginPage'))).toBe(true);
    expect(apiClient.defaults.adapter).toBe(before);
  });

  it('passes the exact invalid-email resolver regression through the real login page', async () => {
    const { findings } = await checkKitIntegration({
      i18n: i18next,
      wrapper: makeWrapper(i18next),
      pages: [],
    });

    expect(findings).toEqual([]);
  });

  it('restores the transport adapter after a successful check', async () => {
    const before = apiClient.defaults.adapter;
    await checkKitIntegration({
      i18n: i18next,
      wrapper: makeWrapper(i18next),
      pages: [],
    });
    expect(apiClient.defaults.adapter).toBe(before);
  });

  it('no longer intercepts a real request once the check has finished', async () => {
    // Proves the restore is functional, not just reference-equal: a request
    // made AFTER the check completes must reach the app's own adapter, not
    // the check's stub (which would reject it as "blocked" or fake a login
    // failure for the allauth login path).
    const sentinel = vi.fn().mockResolvedValue({ data: 'real-response', status: 200, headers: {}, config: {} });
    const before = apiClient.defaults.adapter;
    apiClient.defaults.adapter = sentinel;

    try {
      await checkKitIntegration({
        i18n: i18next,
        wrapper: makeWrapper(i18next),
        pages: [],
      });

      const response = await apiClient.get('/api/some/path');
      expect(sentinel).toHaveBeenCalled();
      expect(response.data).toBe('real-response');
    } finally {
      apiClient.defaults.adapter = before;
    }
  });
});
