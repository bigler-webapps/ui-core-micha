// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { PrivacyProvider } from '../src/privacy/PrivacyProvider';
import { PrivacyBanner } from '../src/privacy/PrivacyBanner';
import { PrivacySettingsLink } from '../src/privacy/PrivacySettingsLink';
import { makeChoices, makePrivacyManifest, makeTestI18n, TranslationRoot } from './privacyTestUtils';

function apiFor(manifest, choices, onSave = async (body) => makeChoices(manifest, body.choices, { seq: 4 })) {
  let current = choices;
  return {
    getManifest: vi.fn(async () => manifest),
    getChoices: vi.fn(async () => current),
    primeCsrf: vi.fn(async () => {}),
    saveChoices: vi.fn(async (body) => {
      current = await onSave(body) || current;
      return current;
    }),
  };
}

function renderSettings({ language = 'en', manifest = makePrivacyManifest(), choices, save } = {}) {
  const i18nPromise = makeTestI18n(language);
  return i18nPromise.then((i18n) => {
    const api = apiFor(manifest, choices || makeChoices(manifest, {}), save);
    const view = render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <PrivacyBanner />
          <PrivacySettingsLink />
        </PrivacyProvider>
      </TranslationRoot>,
    );
    return { ...view, api, i18n };
  });
}

afterEach(cleanup);

describe('PrivacySettings', () => {
  it('shows each optional purpose independently and necessary functions as information only', async () => {
    await renderSettings();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Settings' }))[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Privacy settings' });
    const checkboxes = within(dialog).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes.every((checkbox) => !checkbox.checked)).toBe(true);
    expect(within(dialog).getByText('Always active')).toBeTruthy();
    expect(within(dialog).getByText('For sign-in, security and functions you explicitly request.')).toBeTruthy();
    expect(within(dialog).getByText('Necessary storage')).toBeTruthy();

    const accordions = dialog.querySelectorAll('.MuiAccordion-root');
    expect(accordions).toHaveLength(3);
    fireEvent.click(accordions[1].querySelector('button'));
    expect(accordions[1].querySelector('button').getAttribute('aria-expanded')).toBe('true');
    expect(within(dialog).getAllByText('Provider: Example operator. Storage types and duration are listed for the functions actually used.')).toHaveLength(3);
    expect(within(dialog).getAllByText(/display-mode/).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/Server retention: 90 days/).length).toBeGreaterThan(0);
  });

  it('shows saved current selections, saves a selective choice, and keeps the translated notice link', async () => {
    const manifest = makePrivacyManifest();
    const current = makeChoices(manifest, { display: 'granted', visits: 'refused' });
    let body;
    const { api } = await renderSettings({ language: 'fr', manifest, choices: current, save: async (next) => {
      body = next;
      return makeChoices(manifest, next.choices, { seq: 2 });
    } });
    fireEvent.click(await screen.findByRole('button', { name: 'Paramètres' }));
    const dialog = await screen.findByRole('dialog', { name: 'Paramètres de confidentialité' });
    const display = within(dialog).getByRole('checkbox', { name: 'Mémoriser l’affichage' });
    const visits = within(dialog).getByRole('checkbox', { name: 'Mesurer les visites' });
    expect(display.checked).toBe(true);
    expect(visits.checked).toBe(false);
    fireEvent.click(visits);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer le choix' }));
    await waitFor(() => expect(body?.choices).toEqual({ display: 'granted', visits: 'granted' }));
    expect(body.channel).toBe('settings');
    expect(within(dialog).getByRole('link', { name: 'Politique de confidentialité' }).getAttribute('href')).toBe('https://example.test/fr/privacy');
    expect(await within(dialog).findByRole('status')).toBeTruthy();
  });

  it('does not render an unsafe manifest document as a link', async () => {
    const manifest = makePrivacyManifest();
    manifest.notice.documents.privacy.en = 'javascript:alert(1)';
    await renderSettings({ manifest });
    fireEvent.click((await screen.findAllByRole('button', { name: 'Settings' }))[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Privacy settings' });
    expect(within(dialog).queryByRole('link', { name: 'Privacy notice' })).toBeNull();
    expect(within(dialog).getByText('Our privacy notice explains which data we use and why.')).toBeTruthy();
  });

  it('returns focus into a modal settings dialog and closes it without saving', async () => {
    const manifest = makePrivacyManifest();
    const { api } = await renderSettings({ manifest, choices: makeChoices(manifest, {}) });
    const open = (await screen.findAllByRole('button', { name: 'Settings' }))[0];
    fireEvent.click(open);
    const dialog = await screen.findByRole('dialog', { name: 'Privacy settings' });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.saveChoices).not.toHaveBeenCalled();
  });
});
