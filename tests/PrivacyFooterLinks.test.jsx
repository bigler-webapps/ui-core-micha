// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';

import { PrivacyFooterLinks, buildLegalReaderUrl, legalDocumentLanguage } from '../src/privacy/PrivacyFooterLinks';
import { PrivacyProvider, usePrivacy } from '../src/privacy/PrivacyProvider';
import { PrivacyBanner } from '../src/privacy/PrivacyBanner';
import { uiCoreTranslations } from '../src/i18n/uiCoreTranslations';
import { makeChoices, makePrivacyManifest } from './privacyTestUtils';

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

function PrivacyStatus() {
  const privacy = usePrivacy();
  return <output data-testid="privacy-status">{privacy?.status}</output>;
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

  it('shows the settings entry only for optional purposes and reopens the choice banner', async () => {
    const i18n = i18nFor('en');
    const manifest = makePrivacyManifest();
    const api = {
      getManifest: vi.fn(async () => manifest),
      getChoices: vi.fn(async () => makeChoices(manifest, { display: 'refused', visits: 'refused' })),
      primeCsrf: vi.fn(async () => {}),
      saveChoices: vi.fn(),
    };
    render(
      <I18nextProvider i18n={i18n}>
        <PrivacyProvider api={api}>
          <PrivacyFooterLinks legalOrigin="https://www.bigler-consult.ch" appId="maana" />
          <PrivacyBanner />
        </PrivacyProvider>
      </I18nextProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    const banner = await screen.findByRole('region', { name: 'Privacy choices' });
    expect(banner.querySelectorAll('button')).toHaveLength(3);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.saveChoices).not.toHaveBeenCalled();
  });

  it('omits the settings entry for a necessary-only manifest and while loading or in error', async () => {
    const manifest = makePrivacyManifest();
    const necessaryOnly = { ...manifest, purposes: manifest.purposes.filter((purpose) => purpose.required) };
    const necessaryApi = {
      getManifest: async () => necessaryOnly,
      getChoices: async () => makeChoices(necessaryOnly, {}),
      primeCsrf: async () => {},
      saveChoices: vi.fn(),
    };
    const { unmount } = render(
      <I18nextProvider i18n={i18nFor('en')}>
        <PrivacyProvider api={necessaryApi}>
          <PrivacyFooterLinks legalOrigin="https://www.bigler-consult.ch" appId="maana" />
          <PrivacyBanner />
          <PrivacyStatus />
        </PrivacyProvider>
      </I18nextProvider>,
    );
    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull();
    unmount();

    const pendingApi = {
      getManifest: vi.fn(() => new Promise(() => {})),
      getChoices: vi.fn(), primeCsrf: vi.fn(), saveChoices: vi.fn(),
    };
    const pending = render(
      <I18nextProvider i18n={i18nFor('en')}>
        <PrivacyProvider api={pendingApi}><PrivacyFooterLinks legalOrigin="https://www.bigler-consult.ch" appId="maana" /><PrivacyStatus /></PrivacyProvider>
      </I18nextProvider>,
    );
    expect(screen.getByTestId('privacy-status').textContent).toBe('loading');
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
    pending.unmount();

    const failedApi = {
      getManifest: vi.fn(async () => { throw new Error('offline'); }),
      getChoices: vi.fn(), primeCsrf: vi.fn(), saveChoices: vi.fn(),
    };
    render(
      <I18nextProvider i18n={i18nFor('en')}>
        <PrivacyProvider api={failedApi}><PrivacyFooterLinks legalOrigin="https://www.bigler-consult.ch" appId="maana" /><PrivacyStatus /></PrivacyProvider>
      </I18nextProvider>,
    );
    expect(await screen.findByText('error')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
  });
});
