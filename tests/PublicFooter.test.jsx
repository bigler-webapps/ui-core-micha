// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { PrivacyProvider } from '../src/privacy/PrivacyProvider';
import { PublicFooter } from '../src/privacy/PublicFooter';
import { makeChoices, makePrivacyManifest, makeTestI18n, TranslationRoot } from './privacyTestUtils';

const LEGAL_ORIGIN = 'https://bigler-consult.ch';

function apiFor(manifest = makePrivacyManifest(), values = {}) {
  return {
    getManifest: vi.fn(async () => manifest),
    getChoices: vi.fn(async () => makeChoices(manifest, values)),
    primeCsrf: vi.fn(async () => {}),
    saveChoices: vi.fn(async () => makeChoices(manifest, {})),
  };
}

afterEach(cleanup);

describe('PublicFooter', () => {
  it('renders ordered central and host destinations for Maana and an inheriting hram app without a provider', async () => {
    const i18n = await makeTestI18n('de');
    render(
      <TranslationRoot i18n={i18n}>
        <PublicFooter
          data-testid="maana-footer"
          brand="Maana"
          copyright="© 2026 Maana"
          legalOrigin={LEGAL_ORIGIN}
          appId="maana"
          documents={['privacy', 'terms', 'data-processing', 'cancellation']}
          extraLinks={[{ id: 'contract-cancel', label: 'Verträge hier kündigen', href: '/contracts/cancel' }]}
        />
        <PublicFooter
          data-testid="imara-footer"
          brand="Imara"
          copyright="© 2026 Imara"
          legalOrigin={LEGAL_ORIGIN}
          appId="hram"
          extraLinks={[{ id: 'imprint', label: 'Impressum', href: '/imprint' }]}
        />
      </TranslationRoot>,
    );

    expect(screen.getByText('Maana')).toBeTruthy();
    expect(screen.getByText('© 2026 Maana')).toBeTruthy();
    const maanaNav = within(screen.getByTestId('maana-footer')).getByRole('navigation', { name: 'Rechtliches und Datenschutz' });
    expect(within(maanaNav).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Datenschutz', `${LEGAL_ORIGIN}/legal/privacy?app=maana&lang=de`],
      ['Nutzungsbedingungen', `${LEGAL_ORIGIN}/legal/terms?app=maana&lang=de`],
      ['Auftragsverarbeitung', `${LEGAL_ORIGIN}/legal/data-processing?app=maana&lang=de`],
      ['Widerruf und Erstattung', `${LEGAL_ORIGIN}/legal/cancellation?app=maana&lang=de`],
      ['Verträge hier kündigen', '/contracts/cancel'],
    ]);

    const imaraNav = within(screen.getByTestId('imara-footer')).getByRole('navigation', { name: 'Rechtliches und Datenschutz' });
    expect(within(imaraNav).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Datenschutz', `${LEGAL_ORIGIN}/legal/privacy?app=hram&lang=de`],
      ['Nutzungsbedingungen', `${LEGAL_ORIGIN}/legal/terms?app=hram&lang=de`],
      ['Auftragsverarbeitung', `${LEGAL_ORIGIN}/legal/data-processing?app=hram&lang=de`],
      ['Impressum', '/imprint'],
    ]);
    expect(screen.queryByRole('button', { name: 'Datenschutzeinstellungen' })).toBeNull();
  });

  it('keeps legal links usable when the settings API fails', async () => {
    const i18n = await makeTestI18n('de');
    const api = {
      getManifest: vi.fn(async () => { throw new Error('offline'); }),
      getChoices: vi.fn(async () => { throw new Error('offline'); }),
      primeCsrf: vi.fn(async () => {}),
      saveChoices: vi.fn(),
    };
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <PublicFooter brand="Spesix" legalOrigin={LEGAL_ORIGIN} appId="spesix" />
        </PrivacyProvider>
      </TranslationRoot>,
    );

    expect(screen.getByRole('link', { name: 'Datenschutz' }).getAttribute('href')).toBe(`${LEGAL_ORIGIN}/legal/privacy?app=spesix&lang=de`);
    expect(screen.getByRole('link', { name: 'Nutzungsbedingungen' })).toBeTruthy();
    const open = await screen.findByRole('button', { name: 'Datenschutzeinstellungen' });
    fireEvent.click(open);
    expect(await screen.findByRole('dialog', { name: 'Datenschutzeinstellungen' })).toBeTruthy();
    expect(api.saveChoices).not.toHaveBeenCalled();
  });

  it('opens necessary-only settings without writing a choice and returns focus after Escape', async () => {
    const i18n = await makeTestI18n('de');
    const fullManifest = makePrivacyManifest();
    const manifest = { ...fullManifest, purposes: fullManifest.purposes.filter((purpose) => purpose.required) };
    const api = apiFor(manifest);
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <PublicFooter brand="Maana" legalOrigin={LEGAL_ORIGIN} appId="maana" />
        </PrivacyProvider>
      </TranslationRoot>,
    );

    const trigger = await screen.findByRole('button', { name: 'Datenschutzeinstellungen' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Datenschutzeinstellungen' });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(within(dialog).getByText('Sicherheit')).toBeTruthy();
    expect(within(dialog).queryAllByRole('checkbox')).toHaveLength(0);
    expect(api.saveChoices).not.toHaveBeenCalled();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(api.saveChoices).not.toHaveBeenCalled();
  });

  it('reopens settings after optional services were refused', async () => {
    const i18n = await makeTestI18n('de');
    const manifest = makePrivacyManifest();
    const api = apiFor(manifest, { display: 'refused', visits: 'refused' });
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <PublicFooter brand="Maana" legalOrigin={LEGAL_ORIGIN} appId="maana" />
        </PrivacyProvider>
      </TranslationRoot>,
    );

    const trigger = await screen.findByRole('button', { name: 'Datenschutzeinstellungen' });
    fireEvent.click(trigger);
    const firstDialog = await screen.findByRole('dialog', { name: 'Datenschutzeinstellungen' });
    expect(within(firstDialog).getAllByRole('checkbox').every((checkbox) => !checkbox.checked)).toBe(true);
    fireEvent.click(within(firstDialog).getByRole('button', { name: 'Schliessen' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Datenschutzeinstellungen' })).toBeTruthy();
    expect(api.saveChoices).not.toHaveBeenCalled();
  });

  it('drops unsafe origins and extra links while retaining safe local links', async () => {
    const i18n = await makeTestI18n('de');
    render(
      <TranslationRoot i18n={i18n}>
        <PublicFooter
          brand="Maana"
          legalOrigin="javascript:alert(1)"
          appId="maana"
          extraLinks={[
            { id: 'unsafe', label: 'Unsafe', href: 'javascript:alert(1)' },
            { id: 'backslash', label: 'Backslash', href: '/\\attacker.example/path' },
            { id: 'protocol-relative', label: 'Protocol relative', href: '//attacker.example' },
            { id: 'safe', label: 'Safe local link', href: '/local/legal' },
          ]}
        />
      </TranslationRoot>,
    );

    expect(screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Safe local link', '/local/legal'],
    ]);
  });

  it('uses supported document-language fallbacks for Swahili and French UI languages', async () => {
    const swahili = await makeTestI18n('sw');
    const { unmount } = render(
      <TranslationRoot i18n={swahili}>
        <PublicFooter brand="Maana" legalOrigin={LEGAL_ORIGIN} appId="maana" fallbackLanguage="en" />
      </TranslationRoot>,
    );
    expect(screen.getByRole('link', { name: 'Faragha' }).getAttribute('href')).toBe(`${LEGAL_ORIGIN}/legal/privacy?app=maana&lang=en`);
    unmount();

    const french = await makeTestI18n('fr');
    render(
      <TranslationRoot i18n={french}>
        <PublicFooter brand="Imara" legalOrigin={LEGAL_ORIGIN} appId="hram" fallbackLanguage="de" />
      </TranslationRoot>,
    );
    expect(screen.getByRole('link', { name: 'Confidentialité' }).getAttribute('href')).toBe(`${LEGAL_ORIGIN}/legal/privacy?app=hram&lang=de`);
  });
});
