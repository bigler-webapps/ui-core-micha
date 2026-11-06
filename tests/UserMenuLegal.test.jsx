// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AuthContext } from '../src/auth/AuthContext';
import { UserMenu } from '../src/auth/UserMenu';
import { PrivacyProvider } from '../src/privacy/PrivacyProvider';
import { makeChoices, makePrivacyManifest, makeTestI18n, TranslationRoot } from './privacyTestUtils';

const LEGAL_ORIGIN = 'https://bigler-consult.ch';
const legal = {
  legalOrigin: LEGAL_ORIGIN,
  appId: 'maana',
  documents: ['privacy', 'terms', 'data-processing'],
  extraLinks: [{ id: 'imprint', label: 'Impressum', href: '/imprint' }],
};

function apiFor({ fail = false } = {}) {
  const manifest = makePrivacyManifest();
  return {
    getManifest: vi.fn(async () => {
      if (fail) throw new Error('offline');
      return manifest;
    }),
    getChoices: vi.fn(async () => {
      if (fail) throw new Error('offline');
      return makeChoices(manifest, {});
    }),
    primeCsrf: vi.fn(async () => {}),
    saveChoices: vi.fn(async () => makeChoices(manifest, {})),
  };
}

function menuContents() {
  return within(screen.getByRole('menu')).getAllByRole('menuitem');
}

afterEach(cleanup);

describe('UserMenu legal entries', () => {
  it('keeps the existing menu contents when legal is omitted', async () => {
    const i18n = await makeTestI18n('de');
    render(
      <TranslationRoot i18n={i18n}>
        <AuthContext.Provider value={{ user: { username: 'ada' }, logout: vi.fn() }}>
          <UserMenu />
        </AuthContext.Provider>
      </TranslationRoot>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'UserMenu.TITLE' }));
    expect(menuContents().map((item) => item.textContent)).toEqual(['UserMenu.PROFILE', 'UserMenu.LOGOUT']);
    expect(screen.queryByRole('menuitem', { name: 'Datenschutzeinstellungen' })).toBeNull();
  });

  it('renders legal anchors in order without a provider and omits the settings item', async () => {
    const i18n = await makeTestI18n('de');
    render(
      <TranslationRoot i18n={i18n}>
        <AuthContext.Provider value={{ user: { username: 'ada' }, logout: vi.fn() }}>
          <UserMenu legal={legal} />
        </AuthContext.Provider>
      </TranslationRoot>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'UserMenu.TITLE' }));
    const items = menuContents();
    expect(items.map((item) => item.textContent)).toEqual([
      'UserMenu.PROFILE', 'Datenschutz', 'Nutzungsbedingungen', 'Auftragsverarbeitung', 'Impressum', 'UserMenu.LOGOUT',
    ]);
    const anchors = items.filter((item) => item.tagName === 'A');
    expect(anchors.map((item) => [item.textContent, item.getAttribute('href'), item.getAttribute('target')])).toEqual([
      ['Datenschutz', `${LEGAL_ORIGIN}/legal/privacy?app=maana&lang=de`, null],
      ['Nutzungsbedingungen', `${LEGAL_ORIGIN}/legal/terms?app=maana&lang=de`, null],
      ['Auftragsverarbeitung', `${LEGAL_ORIGIN}/legal/data-processing?app=maana&lang=de`, null],
      ['Impressum', '/imprint', null],
    ]);
    expect(screen.queryByRole('menuitem', { name: 'Datenschutzeinstellungen' })).toBeNull();
  });

  it('opens this app settings from the menu without saving a choice', async () => {
    const i18n = await makeTestI18n('de');
    const api = apiFor();
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <AuthContext.Provider value={{ user: { username: 'ada' }, logout: vi.fn() }}>
            <UserMenu legal={legal} />
          </AuthContext.Provider>
        </PrivacyProvider>
      </TranslationRoot>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'UserMenu.TITLE' }));
    const settingsItem = await screen.findByRole('menuitem', { name: 'Datenschutzeinstellungen' });
    expect(menuContents().map((item) => item.textContent)).toEqual([
      'UserMenu.PROFILE', 'Datenschutz', 'Nutzungsbedingungen', 'Auftragsverarbeitung', 'Impressum',
      'Datenschutzeinstellungen', 'UserMenu.LOGOUT',
    ]);
    fireEvent.click(settingsItem);
    expect(await screen.findByRole('dialog', { name: 'Datenschutzeinstellungen' })).toBeTruthy();
    expect(api.saveChoices).not.toHaveBeenCalled();
  });

  it('closes after legal-link selection without writing a privacy choice', async () => {
    const i18n = await makeTestI18n('de');
    const api = apiFor();
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <AuthContext.Provider value={{ user: { username: 'ada' }, logout: vi.fn() }}>
            <UserMenu legal={legal} />
          </AuthContext.Provider>
        </PrivacyProvider>
      </TranslationRoot>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'UserMenu.TITLE' }));
    const privacyLink = await screen.findByRole('menuitem', { name: 'Datenschutz' });
    privacyLink.addEventListener('click', (event) => event.preventDefault(), { once: true });
    fireEvent.click(privacyLink);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(api.saveChoices).not.toHaveBeenCalled();
  });

  it('keeps legal entries when the settings API is unavailable', async () => {
    const i18n = await makeTestI18n('de');
    const api = apiFor({ fail: true });
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <AuthContext.Provider value={{ user: { username: 'ada' }, logout: vi.fn() }}>
            <UserMenu legal={legal} />
          </AuthContext.Provider>
        </PrivacyProvider>
      </TranslationRoot>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'UserMenu.TITLE' }));
    expect(await screen.findByRole('menuitem', { name: 'Datenschutzeinstellungen' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Datenschutz' }).getAttribute('href')).toBe(`${LEGAL_ORIGIN}/legal/privacy?app=maana&lang=de`);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Datenschutzeinstellungen' }));
    expect(await screen.findByText('Datenschutzeinstellungen sind derzeit nicht verfügbar. Optionale Dienste bleiben ausgeschaltet.')).toBeTruthy();
    expect(api.saveChoices).not.toHaveBeenCalled();
  });
});
