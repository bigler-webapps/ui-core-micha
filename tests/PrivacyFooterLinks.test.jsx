// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';

import { PrivacyFooterLinks, buildLegalReaderUrl, legalDocumentLanguage } from '../src/privacy/PrivacyFooterLinks';
import { uiCoreTranslations } from '../src/i18n/uiCoreTranslations';

afterEach(() => cleanup());

function i18nFor(language) {
  const instance = i18next.createInstance();
  const resources = {};
  for (const [key, value] of Object.entries(uiCoreTranslations)) {
    for (const [lng, text] of Object.entries(value)) {
      resources[lng] = resources[lng] || { translation: {} };
      resources[lng].translation[key] = text;
    }
  }
  instance.init({ lng: language, fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  return instance;
}

describe('buildLegalReaderUrl', () => {
  it('builds the stable reader contract link', () => {
    expect(buildLegalReaderUrl({ origin: 'https://www.bigler-consult.ch', slug: 'privacy', appId: 'maana', lang: 'de' }))
      .toBe('https://www.bigler-consult.ch/legal/privacy?app=maana&lang=de');
  });

  it('rejects unsafe origins, unknown slugs and malformed app ids, and never carries extra data', () => {
    expect(buildLegalReaderUrl({ origin: 'javascript:alert(1)', slug: 'privacy', appId: 'maana', lang: 'de' })).toBeNull();
    expect(buildLegalReaderUrl({ origin: 'https://user:pw@x.test', slug: 'privacy', appId: 'maana', lang: 'de' })).toBeNull();
    expect(buildLegalReaderUrl({ origin: 'https://x.test', slug: 'imprint', appId: 'maana', lang: 'de' })).toBeNull();
    expect(buildLegalReaderUrl({ origin: 'https://x.test', slug: 'privacy', appId: 'Maana?x=1', lang: 'de' })).toBeNull();
    expect(buildLegalReaderUrl({ origin: 'https://x.test/path?q=1#h', slug: 'terms', appId: 'hram', lang: 'fr' }))
      .toBe('https://x.test/legal/terms?app=hram&lang=en');
  });

  it('maps UI languages to verified document languages with an explicit fallback', () => {
    expect(legalDocumentLanguage('de-CH')).toBe('de');
    expect(legalDocumentLanguage('en-GB')).toBe('en');
    expect(legalDocumentLanguage('fr')).toBe('en');
    expect(legalDocumentLanguage('sw', 'de')).toBe('de');
  });
});

describe('PrivacyFooterLinks', () => {
  it('renders translated legal links without any privacy provider (API failure cannot hide them)', () => {
    render(
      <I18nextProvider i18n={i18nFor('de')}>
        <PrivacyFooterLinks legalOrigin="https://www.bigler-consult.ch" appId="maana" />
      </I18nextProvider>,
    );
    const privacy = screen.getByRole('link', { name: 'Datenschutzerklärung' });
    expect(privacy.getAttribute('href')).toBe('https://www.bigler-consult.ch/legal/privacy?app=maana&lang=de');
    expect(screen.getByRole('link', { name: 'Nutzungsbedingungen' }).getAttribute('href'))
      .toBe('https://www.bigler-consult.ch/legal/terms?app=maana&lang=de');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('omits links whose contract inputs are invalid instead of rendering a broken target', () => {
    render(
      <I18nextProvider i18n={i18nFor('en')}>
        <PrivacyFooterLinks legalOrigin="not a url" appId="maana" />
      </I18nextProvider>,
    );
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
