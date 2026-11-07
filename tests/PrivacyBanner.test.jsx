// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PrivacyProvider } from '../src/privacy/PrivacyProvider';
import { PrivacyBanner } from '../src/privacy/PrivacyBanner';
import { PrivacySettingsLink } from '../src/privacy/PrivacySettingsLink';
import { PrivacyNoticeLink } from '../src/privacy/PrivacyNoticeLink';
import { makeChoices, makePrivacyManifest, makeTestI18n, TranslationRoot } from './privacyTestUtils';

function apiFor(manifest = makePrivacyManifest()) {
  return {
    getManifest: vi.fn(async () => manifest),
    getChoices: vi.fn(async () => makeChoices(manifest, {})),
    primeCsrf: vi.fn(async () => {}),
    saveChoices: vi.fn(async () => makeChoices(manifest, { display: 'refused', visits: 'refused' })),
  };
}

afterEach(cleanup);

describe('PrivacyBanner', () => {
  it.each([
    ['en', 'Necessary only', 'Allow all', '/privacy/en/'],
    ['de', 'Nur notwendige Funktionen', 'Alle erlauben', '/privacy/de/'],
    ['fr', 'Fonctions nécessaires uniquement', 'Tout autoriser', 'https://example.test/fr/privacy'],
  ])('provides translated first choices and document links in %s', async (language, refuse, accept, href) => {
    const i18n = await makeTestI18n(language);
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={apiFor()}>
          <PrivacyBanner />
          <PrivacySettingsLink />
          <PrivacyNoticeLink />
        </PrivacyProvider>
      </TranslationRoot>,
    );
    const heading = await screen.findByRole('heading', { name: language === 'de' ? 'Datenschutzauswahl' : language === 'fr' ? 'Choix de confidentialité' : 'Privacy choices' });
    // The nonmodal banner never takes focus on its own (no focus ring on the title at first load).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).not.toBe(heading);
    expect(heading.getAttribute('tabindex')).toBeNull();
    const refuseButton = screen.getByRole('button', { name: refuse });
    const acceptButton = screen.getByRole('button', { name: accept });
    expect(refuseButton.classList.contains('MuiButton-contained')).toBe(true);
    expect(acceptButton.classList.contains('MuiButton-contained')).toBe(true);
    expect(refuseButton.classList.contains('MuiButton-sizeMedium')).toBe(true);
    expect(acceptButton.classList.contains('MuiButton-sizeMedium')).toBe(true);
    expect(screen.getByRole('link', { name: language === 'de' ? 'Datenschutzerklärung' : language === 'fr' ? 'Politique de confidentialité' : 'Privacy notice' }).getAttribute('href')).toBe(href);
  });

  it.each([375, 1280])('keeps all first-layer choices available at %i px', async (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    const i18n = await makeTestI18n('en');
    render(<TranslationRoot i18n={i18n}><PrivacyProvider api={apiFor()}><PrivacyBanner /></PrivacyProvider></TranslationRoot>);
    const region = await screen.findByRole('region', { name: 'Privacy choices' });
    expect(region).toBeTruthy();
    expect(getComputedStyle(region).position).toBe('fixed');
    expect(screen.getByRole('button', { name: 'Necessary only' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Allow all' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Privacy choices' })).toBeTruthy());
  });

  it('lets keyboard users close without granting and leaves settings reachable', async () => {
    const i18n = await makeTestI18n('en');
    const api = apiFor();
    render(<TranslationRoot i18n={i18n}><PrivacyProvider api={api}><PrivacyBanner /><PrivacySettingsLink /></PrivacyProvider></TranslationRoot>);
    const heading = await screen.findByRole('heading', { name: 'Privacy choices' });
    fireEvent.keyDown(heading, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(api.saveChoices).not.toHaveBeenCalled();
  });
});

describe('PrivacyBanner while settings are open', () => {
  it('steps aside so the fixed banner cannot cover the settings dialog actions', async () => {
    const i18n = await makeTestI18n('en');
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={apiFor()}>
          <PrivacyBanner />
          <PrivacySettingsLink />
        </PrivacyProvider>
      </TranslationRoot>,
    );
    expect(await screen.findByRole('region', { name: 'Privacy choices' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Settings' }).at(-1));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull());
  });
});
