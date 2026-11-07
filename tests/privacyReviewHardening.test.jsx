// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import * as publicApi from '../src/index';
import { PrivacyProvider, usePrivacy } from '../src/privacy/PrivacyProvider';
import {
  registerPrivacyService,
  resetPrivacyServicesForTests,
  setPrivacyState,
} from '../src/privacy/serviceRegistry';
import { makeChoices, makePrivacyManifest, makeTestI18n, TranslationRoot } from './privacyTestUtils';

afterEach(() => {
  cleanup();
  resetPrivacyServicesForTests();
  vi.restoreAllMocks();
});

describe('public package surface', () => {
  it('still exports the legacy CookieConsentStep and the new footer composition from the package root', () => {
    expect(typeof publicApi.CookieConsentStep).toBe('function');
    expect(typeof publicApi.PrivacyFooterLinks).toBe('function');
    expect(typeof publicApi.buildLegalReaderUrl).toBe('function');
    expect(publicApi).not.toHaveProperty('PrivacySettingsDialog');
    expect(publicApi).not.toHaveProperty('PrivacySettingsPanel');
  });
});

describe('service registry hardening', () => {
  it('a superseded late activation cannot tear down the newer activation of the same registration', async () => {
    const manifest = makePrivacyManifest();
    const visitsGrant = makeChoices(manifest, { visits: 'granted' });
    const refused = makeChoices(manifest, { visits: 'refused' });
    const releases = [];
    const deactivate = vi.fn();
    registerPrivacyService({
      purposeId: 'visits',
      serviceId: 'visit-service',
      activate: () => new Promise((resolve) => { releases.push(resolve); }),
      deactivate,
    });
    setPrivacyState(manifest, visitsGrant);
    setPrivacyState(manifest, refused);
    deactivate.mockClear();
    setPrivacyState(manifest, visitsGrant);
    expect(releases).toHaveLength(2);
    await act(async () => { releases[0](); });
    expect(deactivate).not.toHaveBeenCalled();
    await act(async () => { releases[1](); });
    expect(deactivate).not.toHaveBeenCalled();
  });

  it('withdrawal expires an owned cookie on the root and on the paths the adapter declares', () => {
    const manifest = makePrivacyManifest();
    const writes = [];
    const cookieSpy = vi.spyOn(document, 'cookie', 'set').mockImplementation((value) => { writes.push(value); });
    vi.spyOn(document, 'cookie', 'get').mockReturnValue('visit_id=abc; unrelated=keep');
    registerPrivacyService({
      purposeId: 'visits',
      serviceId: 'visit-service',
      activate: () => {},
      ownedStorage: { cookies: ['visit_id'], cookiePaths: ['/gallery'] },
    });
    setPrivacyState(manifest, makeChoices(manifest, { visits: 'granted' }));
    writes.length = 0;
    setPrivacyState(manifest, makeChoices(manifest, { visits: 'refused' }));
    expect(writes.some((value) => value.includes('visit_id=') && value.includes('Path=/;'))).toBe(true);
    expect(writes.some((value) => value.includes('visit_id=') && value.includes('Path=/gallery;'))).toBe(true);
    expect(writes.some((value) => value.startsWith('unrelated='))).toBe(false);
    cookieSpy.mockRestore();
  });
});

describe('provider ordering hardening', () => {
  it('a cross-tab refresh that started before a local refusal cannot restore the old grant', async () => {
    const NativeBroadcastChannel = globalThis.BroadcastChannel;
    const channels = [];
    class FakeBroadcastChannel {
      constructor(name) { this.name = name; channels.push(this); }
      postMessage() {}
      close() {}
      send(data) { this.onmessage?.({ data }); }
    }
    globalThis.BroadcastChannel = FakeBroadcastChannel;
    try {
      const manifest = makePrivacyManifest();
      let current = makeChoices(manifest, { display: 'granted' }, { seq: 3 });
      let releaseOldRead;
      let reads = 0;
      const api = {
        getManifest: vi.fn(async () => manifest),
        getChoices: vi.fn(async () => {
          reads += 1;
          if (reads === 2) {
            const stale = current;
            return new Promise((resolve) => { releaseOldRead = () => resolve(stale); });
          }
          return current;
        }),
        primeCsrf: vi.fn(async () => {}),
        saveChoices: vi.fn(async (body) => {
          current = makeChoices(manifest, body.choices, { seq: current.seq + 1 });
          return current;
        }),
      };
      function Probe() {
        const privacy = usePrivacy();
        return (
          <>
            <output data-testid="grant">{String(privacy?.hasGrant('display'))}</output>
            <button type="button" onClick={() => privacy.save({ display: 'refused' }, 'settings')}>refuse</button>
          </>
        );
      }
      const i18n = await makeTestI18n('en');
      render(
        <TranslationRoot i18n={i18n}>
          <PrivacyProvider api={api}><Probe /></PrivacyProvider>
        </TranslationRoot>,
      );
      await waitFor(() => expect(screen.getByTestId('grant').textContent).toBe('true'));
      await act(async () => { channels[0].send({ type: 'state-changed' }); });
      await waitFor(() => expect(typeof releaseOldRead).toBe('function'));
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'refuse' })); });
      await waitFor(() => expect(api.saveChoices).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByTestId('grant').textContent).toBe('false'));
      await act(async () => { releaseOldRead(); });
      expect(screen.getByTestId('grant').textContent).toBe('false');
    } finally {
      globalThis.BroadcastChannel = NativeBroadcastChannel;
    }
  });
});

describe('grant expiry while the page stays open', () => {
  it('turns the service off at expires_at by re-reading the server state', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const manifest = makePrivacyManifest();
      const expiresAt = new Date(Date.now() + 60_000).toISOString();
      const granted = makeChoices(manifest, { display: 'granted' }, { seq: 4 });
      granted.choices.display.expires_at = expiresAt;
      const expired = makeChoices(manifest, {}, { seq: 4 });
      let phase = 'granted';
      const api = {
        getManifest: vi.fn(async () => manifest),
        getChoices: vi.fn(async () => (phase === 'granted' ? granted : expired)),
        primeCsrf: vi.fn(async () => {}),
        saveChoices: vi.fn(),
      };
      function Probe() {
        const privacy = usePrivacy();
        return <output data-testid="grant">{String(privacy?.hasGrant('display'))}</output>;
      }
      const i18n = await makeTestI18n('en');
      render(
        <TranslationRoot i18n={i18n}>
          <PrivacyProvider api={api}><Probe /></PrivacyProvider>
        </TranslationRoot>,
      );
      await waitFor(() => expect(screen.getByTestId('grant').textContent).toBe('true'));
      phase = 'expired';
      await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
      await waitFor(() => expect(screen.getByTestId('grant').textContent).toBe('false'));
    } finally {
      vi.useRealTimers();
    }
  });
});
