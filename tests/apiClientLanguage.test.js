import { beforeEach, describe, expect, it } from 'vitest';
import i18next from 'i18next';

import apiClient from '../src/auth/apiClient';

function requestConfig() {
  const interceptor = apiClient.interceptors.request.handlers.find(Boolean);
  return interceptor.fulfilled({ headers: { Existing: 'value' } });
}

describe('apiClient Accept-Language interceptor', () => {
  let wasInitialized;

  beforeEach(() => {
    wasInitialized = i18next.isInitialized;
  });

  it('uses the active default i18next language and follows language changes', async () => {
    await i18next.init({ lng: 'de', fallbackLng: 'en', resources: {} });
    expect(requestConfig().headers['Accept-Language']).toBe('de');

    await i18next.changeLanguage('en');
    expect(requestConfig().headers['Accept-Language']).toBe('en');
  });

  it('sends no header when the default i18next instance is not initialized', () => {
    i18next.isInitialized = false;
    const config = requestConfig();
    expect(config.headers).not.toHaveProperty('Accept-Language');
    expect(config.headers.Existing).toBe('value');
    i18next.isInitialized = wasInitialized;
  });
});
