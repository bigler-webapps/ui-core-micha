// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { PrivacyProvider } from '../src/privacy/PrivacyProvider';
import { PrivacyBanner } from '../src/privacy/PrivacyBanner';
import { PrivacySettingsLink } from '../src/privacy/PrivacySettingsLink';
import { makeChoices, makePrivacyManifest, makeTestI18n, TranslationRoot } from './privacyTestUtils';

function apiFor(manifest = makePrivacyManifest()) {
  return {
    getManifest: vi.fn(async () => manifest),
    getChoices: vi.fn(async () => makeChoices(manifest, {})),
    primeCsrf: vi.fn(async () => {}),
    saveChoices: vi.fn(async (body) => makeChoices(manifest, body.choices, { seq: 2 })),
  };
}

afterEach(cleanup);

describe('PrivacyBanner', () => {
  it.each([
    ['en', 'Privacy choices', 'Necessary only', 'Allow all', 'Close', 'Privacy notice', '/privacy/en/', 'Necessary functions are always active. You can change your choice here at any time.'],
    ['de', 'Datenschutzauswahl', 'Nur notwendige Funktionen', 'Alle erlauben', 'Schliessen', 'Datenschutzerklärung', '/privacy/de/', 'Notwendige Funktionen sind immer aktiv. Sie können Ihre Auswahl jederzeit hier ändern.'],
    ['fr', 'Choix de confidentialité', 'Fonctions nécessaires uniquement', 'Tout autoriser', 'Fermer', 'Politique de confidentialité', 'https://example.test/fr/privacy', 'Les fonctions nécessaires sont toujours actives. Vous pouvez modifier votre choix ici à tout moment.'],
  ])('shows the translated two-button choice and notice in %s', async (language, title, refuse, accept, close, notice, href, shortText) => {
    const i18n = await makeTestI18n(language);
    render(<TranslationRoot i18n={i18n}><PrivacyProvider api={apiFor()}><PrivacyBanner /></PrivacyProvider></TranslationRoot>);

    const region = await screen.findByRole('region', { name: title });
    const heading = within(region).getByRole('heading', { name: title });
    expect(within(region).getByText(shortText)).toBeTruthy();
    expect(within(region).getByRole('link', { name: notice }).getAttribute('href')).toBe(href);
    expect(within(region).getByRole('button', { name: refuse })).toBeTruthy();
    expect(within(region).getByRole('button', { name: accept })).toBeTruthy();
    expect(within(region).getByRole('button', { name: close })).toBeTruthy();
    expect(within(region).getAllByRole('button')).toHaveLength(3);
    expect(within(region).queryByRole('button', { name: 'Settings' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).not.toBe(heading);
    expect(heading.getAttribute('tabindex')).toBeNull();
  });

  it.each([375, 1280])('keeps both choices and the close button available at %i px', async (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    const i18n = await makeTestI18n('en');
    render(<TranslationRoot i18n={i18n}><PrivacyProvider api={apiFor()}><PrivacyBanner /></PrivacyProvider></TranslationRoot>);
    const region = await screen.findByRole('region', { name: 'Privacy choices' });
    expect(getComputedStyle(region).position).toBe('fixed');
    expect(within(region).getAllByRole('button')).toHaveLength(3);
    expect(within(region).getByRole('button', { name: 'Necessary only' })).toBeTruthy();
    expect(within(region).getByRole('button', { name: 'Allow all' })).toBeTruthy();
    expect(within(region).getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(within(region).queryByRole('button', { name: 'Settings' })).toBeNull();
  });

  it('lets a settings entry reopen the banner and dismisses it with the close button', async () => {
    const i18n = await makeTestI18n('en');
    const api = apiFor();
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <PrivacySettingsLink />
          <PrivacyBanner />
        </PrivacyProvider>
      </TranslationRoot>,
    );

    let region = await screen.findByRole('region', { name: 'Privacy choices' });
    fireEvent.click(within(region).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    region = await screen.findByRole('region', { name: 'Privacy choices' });
    expect(within(region).getAllByRole('button')).toHaveLength(3);
    fireEvent.click(within(region).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull();
    expect(api.saveChoices).not.toHaveBeenCalled();
  });
});
