// @vitest-environment jsdom
// UCM-PRIV-6: legal links and the privacy entry are NOT part of the account menu (operator decision 2026-11-07);
// they live in the one-line footer and in the privacy section of the account page.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { AuthContext } from '../src/auth/AuthContext';
import { UserMenu } from '../src/auth/UserMenu';
import { PrivacyProvider } from '../src/privacy/PrivacyProvider';
import { makeChoices, makePrivacyManifest, makeTestI18n, TranslationRoot } from './privacyTestUtils';

afterEach(cleanup);

function menuTexts() {
  return within(screen.getByRole('menu')).getAllByRole('menuitem').map((item) => item.textContent);
}

describe('UserMenu has no legal or privacy entries', () => {
  it('shows only profile, custom items and logout', async () => {
    const i18n = await makeTestI18n('de');
    render(
      <TranslationRoot i18n={i18n}>
        <AuthContext.Provider value={{ user: { username: 'ada' }, logout: vi.fn() }}>
          <UserMenu items={[{ id: 'billing', label: 'Billing', onSelect: vi.fn() }]} />
        </AuthContext.Provider>
      </TranslationRoot>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'UserMenu.TITLE' }));
    expect(menuTexts()).toEqual(['UserMenu.PROFILE', 'Billing', 'UserMenu.LOGOUT']);
  });

  it('ignores a legacy legal prop and stays free of privacy entries even with a ready provider', async () => {
    const i18n = await makeTestI18n('de');
    const manifest = makePrivacyManifest();
    const api = {
      getManifest: vi.fn(async () => manifest),
      getChoices: vi.fn(async () => makeChoices(manifest, { display: 'refused', visits: 'refused' })),
      primeCsrf: vi.fn(async () => {}),
      saveChoices: vi.fn(async () => makeChoices(manifest, {})),
    };
    render(
      <TranslationRoot i18n={i18n}>
        <PrivacyProvider api={api}>
          <AuthContext.Provider value={{ user: { username: 'ada' }, logout: vi.fn() }}>
            <UserMenu legal={{ legalOrigin: 'https://bigler-consult.ch', appId: 'maana', documents: ['privacy'] }} />
          </AuthContext.Provider>
        </PrivacyProvider>
      </TranslationRoot>,
    );
    await vi.waitFor(() => expect(api.getChoices).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'UserMenu.TITLE' }));
    expect(menuTexts()).toEqual(['UserMenu.PROFILE', 'UserMenu.LOGOUT']);
    expect(api.saveChoices).not.toHaveBeenCalled();
  });
});
