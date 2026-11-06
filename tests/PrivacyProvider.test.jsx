// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PrivacyProvider, usePrivacy } from '../src/privacy/PrivacyProvider';
import { PrivacyBanner } from '../src/privacy/PrivacyBanner';
import { PrivacyNoticeLink } from '../src/privacy/PrivacyNoticeLink';
import { PrivacySettingsLink } from '../src/privacy/PrivacySettingsLink';
import { AuthContext } from '../src/auth/AuthContext';
import { resetPrivacyServicesForTests } from '../src/privacy/serviceRegistry';
import { makeChoices, makePrivacyManifest, makeTestI18n, TranslationRoot } from './privacyTestUtils';

function makeApi({ manifest = makePrivacyManifest(), choices, save } = {}) {
  let current = choices || makeChoices(manifest, {}, { seq: 3 });
  const api = {
    getManifest: vi.fn(async () => manifest),
    getChoices: vi.fn(async () => current),
    primeCsrf: vi.fn(async () => {}),
    saveChoices: vi.fn(async (body) => {
      const result = save
        ? await save(body, (next) => { current = next; })
        : makeChoices(manifest, body.choices, { seq: current.seq + 1 });
      if (result) current = result;
      return result;
    }),
  };
  return { api, getCurrent: () => current, setCurrent: (value) => { current = value; } };
}

function PrivacyProbe({ purposeId = 'display' }) {
  const privacy = usePrivacy();
  return (
    <>
      <output data-testid={`grant-${purposeId}`}>{String(privacy?.hasGrant(purposeId))}</output>
      {purposeId === 'display' && <output data-testid="save-state">{privacy?.saveState}</output>}
    </>
  );
}

async function renderPrivacy({ apiBundle = makeApi(), language = 'en', children } = {}) {
  const i18n = await makeTestI18n(language);
  const view = render(
    <TranslationRoot i18n={i18n}>
      <PrivacyProvider api={apiBundle.api}>
        {children || <><PrivacyProbe /><PrivacyProbe purposeId="visits" /><PrivacyBanner /><PrivacySettingsLink /><PrivacyNoticeLink /></>}
      </PrivacyProvider>
    </TranslationRoot>,
  );
  return { ...view, i18n, ...apiBundle };
}

afterEach(() => {
  cleanup();
  resetPrivacyServicesForTests();
  vi.restoreAllMocks();
});

describe('PrivacyProvider server choices', () => {
  it('loads unset purposes and only enables them after a successful allow-all write', async () => {
    const bundle = makeApi();
    await renderPrivacy({ apiBundle: bundle });
    expect(await screen.findByRole('heading', { name: 'Privacy choices' })).toBeTruthy();
    expect(screen.getByTestId('grant-display').textContent).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('grant-display').textContent).toBe('true'));
    expect(bundle.api.primeCsrf).toHaveBeenCalledOnce();
    expect(bundle.api.saveChoices).toHaveBeenCalledWith(expect.objectContaining({
      expected_seq: 3,
      notice_version: 'notice-v1',
      config_version: 'config-v1',
      locale: 'en',
      channel: 'banner',
      choices: { display: 'granted', visits: 'granted' },
    }));
    expect(screen.queryByRole('heading', { name: 'Privacy choices' })).toBeNull();
  });

  it('refuses all optional purposes without activating any adapter', async () => {
    const bundle = makeApi();
    await renderPrivacy({ apiBundle: bundle });
    fireEvent.click(await screen.findByRole('button', { name: 'Necessary only' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('saved'));
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    expect(bundle.getCurrent().choices.display.state).toBe('refused');
  });

  it('saves a selective choice, reopens current selections, and changes them later', async () => {
    const bundle = makeApi();
    await renderPrivacy({ apiBundle: bundle });
    fireEvent.click((await screen.findAllByRole('button', { name: 'Settings' }))[0]);
    const display = await screen.findByRole('checkbox', { name: 'Remember display' });
    const visits = screen.getByRole('checkbox', { name: 'Measure visits' });
    expect(display.checked).toBe(false);
    expect(visits.checked).toBe(false);
    fireEvent.click(display);
    fireEvent.click(screen.getByRole('button', { name: 'Save selection' }));
    await waitFor(() => expect(bundle.getCurrent().choices.display.state).toBe('granted'));
    expect(bundle.getCurrent().choices.visits.state).toBe('refused');
    expect(screen.getByTestId('grant-display').textContent).toBe('true');
    expect(screen.getByTestId('grant-visits').textContent).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const reopenedDisplay = await screen.findByRole('checkbox', { name: 'Remember display' });
    const reopenedVisits = screen.getByRole('checkbox', { name: 'Measure visits' });
    expect(reopenedDisplay.checked).toBe(true);
    expect(reopenedVisits.checked).toBe(false);
    fireEvent.click(reopenedDisplay);
    fireEvent.click(reopenedVisits);
    fireEvent.click(screen.getByRole('button', { name: 'Save selection' }));
    await waitFor(() => expect(bundle.getCurrent().choices.display.state).toBe('refused'));
    expect(bundle.getCurrent().choices.visits.state).toBe('granted');
  });

  it('keeps expired and old-revision grants unset', async () => {
    const expiredManifest = makePrivacyManifest();
    const expired = makeChoices(expiredManifest, { display: 'granted' });
    expired.choices.display.expires_at = new Date(Date.now() - 1000).toISOString();
    await renderPrivacy({ apiBundle: makeApi({ manifest: expiredManifest, choices: expired }) });
    await screen.findByRole('heading', { name: 'Privacy choices' });
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    cleanup();
    resetPrivacyServicesForTests();

    const newManifest = makePrivacyManifest();
    newManifest.purposes.find((purpose) => purpose.id === 'display').revision = 'r2';
    const oldRevision = makeChoices(makePrivacyManifest(), { display: 'granted' });
    await renderPrivacy({ apiBundle: makeApi({ manifest: newManifest, choices: oldRevision }) });
    await screen.findByRole('heading', { name: 'Privacy choices' });
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
  });

  it('shows notice/settings without a banner when no optional purposes are configured', async () => {
    const manifest = makePrivacyManifest({ purposes: [makePrivacyManifest().purposes[0]] });
    const bundle = makeApi({ manifest, choices: makeChoices(manifest, {}) });
    await renderPrivacy({ apiBundle: bundle });
    expect(await screen.findByTestId('grant-display')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Privacy choices' })).toBeNull();
    const settingsButton = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(settingsButton);
    expect(await screen.findByText('This app uses only necessary functions.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Privacy notice' }).getAttribute('href')).toBe('/privacy/en/');
    expect(bundle.api.saveChoices).not.toHaveBeenCalled();
  });

  it('renders no privacy surfaces when the host returns not_configured', async () => {
    const api = {
      getManifest: vi.fn().mockRejectedValue({ response: { status: 404, data: { code: 'not_configured' } } }),
      getChoices: vi.fn(), primeCsrf: vi.fn(), saveChoices: vi.fn(),
    };
    await renderPrivacy({ apiBundle: { api } });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull());
    expect(screen.queryByRole('link', { name: 'Privacy notice' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull();
    expect(api.getChoices).not.toHaveBeenCalled();
  });

  it('closing, Escape and scrolling never record a choice', async () => {
    const bundle = makeApi();
    await renderPrivacy({ apiBundle: bundle });
    const heading = await screen.findByRole('heading', { name: 'Privacy choices' });
    fireEvent.keyDown(heading, { key: 'Escape' });
    fireEvent.scroll(window);
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull();
    expect(bundle.api.saveChoices).not.toHaveBeenCalled();
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
  });

  it.each(['stale', 'stale_notice', 'stale_config'])('applies fresh state after %s without granting the requested choice', async (code) => {
    const bundle = makeApi({ save: async (_body) => {
      const fresh = makeChoices(makePrivacyManifest(), { display: 'refused' }, { seq: 8 });
      throw { response: { status: 409, data: { code, state: fresh } } };
    } });
    await renderPrivacy({ apiBundle: bundle });
    fireEvent.click(await screen.findByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('error'));
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    expect(bundle.api.saveChoices).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert').textContent).toContain('Unable to save right now');
  });

  it.each([
    ['429 throttled', { response: { status: 429, data: { code: 'throttled', retryable: true } } }],
    ['503 unavailable', { response: { status: 503, data: { code: 'unavailable', retryable: true } } }],
    ['network failure', new Error('offline')],
  ])('leaves optional processing off and permits retry after %s', async (_label, failure) => {
    const manifest = makePrivacyManifest();
    const bundle = makeApi({ save: vi.fn()
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(async (body, setCurrent) => {
        const next = makeChoices(manifest, body.choices, { seq: 4 });
        setCurrent(next);
        return next;
      }) });
    await renderPrivacy({ apiBundle: bundle });
    fireEvent.click(await screen.findByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('error'));
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('grant-display').textContent).toBe('true'));
  });

  it('keeps a refused purpose off locally when the refusal write fails', async () => {
    const manifest = makePrivacyManifest();
    const granted = makeChoices(manifest, { display: 'granted', visits: 'granted' });
    const bundle = makeApi({ manifest, choices: granted, save: async () => {
      throw { response: { status: 503, data: { code: 'unavailable', retryable: true } } };
    } });
    await renderPrivacy({ apiBundle: bundle });
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    const checkbox = await screen.findByRole('checkbox', { name: 'Remember display' });
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save selection' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('error'));
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    expect(screen.getByTestId('grant-visits').textContent).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('withdrawn services remain off');
  });

  it('does not activate a grant when the browser cannot retain the receipt cookie', async () => {
    const manifest = makePrivacyManifest();
    const unset = makeChoices(manifest, {}, { seq: 0 });
    const api = {
      getManifest: vi.fn(async () => manifest),
      getChoices: vi.fn(async () => unset),
      primeCsrf: vi.fn(async () => {}),
      saveChoices: vi.fn(async (body) => makeChoices(manifest, body.choices, { seq: 1 })),
    };
    await renderPrivacy({ apiBundle: { api } });
    fireEvent.click(await screen.findByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('error'));
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    expect(api.getChoices).toHaveBeenCalledTimes(3);
    expect(api.saveChoices).toHaveBeenCalledOnce();
  });

  it('fails closed when CSRF priming fails and retries through the settings surface', async () => {
    const manifest = makePrivacyManifest();
    let available = false;
    const api = {
      getManifest: vi.fn(async () => {
        if (!available) throw new Error('offline');
        return manifest;
      }),
      getChoices: vi.fn(async () => makeChoices(manifest, {})),
      primeCsrf: vi.fn().mockRejectedValueOnce(new Error('csrf unavailable')).mockResolvedValue(undefined),
      saveChoices: vi.fn(async (body) => makeChoices(manifest, body.choices, { seq: 2 })),
    };
    await renderPrivacy({ apiBundle: { api } });
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    available = true;
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.getManifest).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await screen.findByRole('heading', { name: 'Privacy choices' });
    fireEvent.click(screen.getByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('error'));
    expect(api.saveChoices).not.toHaveBeenCalled();
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
  });

  it('does not bind server choices to a login or account switch', async () => {
    const manifest = makePrivacyManifest();
    const bundle = makeApi({ manifest, choices: makeChoices(manifest, { display: 'granted' }) });
    const i18n = await makeTestI18n('en');
    function Host() {
      const [user, setUser] = useState({ id: 1 });
      return (
        <TranslationRoot i18n={i18n}>
          <AuthContext.Provider value={{ user, login: (next) => setUser(next) }}>
            <button type="button" onClick={() => setUser(null)}>Log out</button>
            <button type="button" onClick={() => setUser({ id: 2 })}>Switch account</button>
            <PrivacyProvider api={bundle.api}><PrivacyProbe /></PrivacyProvider>
          </AuthContext.Provider>
        </TranslationRoot>
      );
    }
    render(<Host />);
    await screen.findByTestId('grant-display');
    expect(screen.getByTestId('grant-display').textContent).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch account' }));
    expect(screen.getByTestId('grant-display').textContent).toBe('true');
    expect(bundle.api.getManifest).toHaveBeenCalledOnce();
    expect(bundle.api.getChoices).toHaveBeenCalledOnce();
  });

  it('re-reads on a cross-tab signal and ignores message payload choices', async () => {
    const NativeBroadcastChannel = globalThis.BroadcastChannel;
    const channels = [];
    class FakeBroadcastChannel {
      constructor(name) { this.name = name; channels.push(this); }
      postMessage() {}
      close() {}
      send(data) { this.onmessage?.({ data }); }
    }
    globalThis.BroadcastChannel = FakeBroadcastChannel;
    const bundle = makeApi();
    await renderPrivacy({ apiBundle: bundle });
    await screen.findByRole('heading', { name: 'Privacy choices' });
    const channel = channels[0];
    await act(async () => { channel.send({ type: 'state-changed', choices: { display: 'granted' } }); });
    await waitFor(() => expect(bundle.api.getChoices).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    globalThis.BroadcastChannel = NativeBroadcastChannel;
  });

  it('re-reads seq inside a Web Lock before writing', async () => {
    const manifest = makePrivacyManifest();
    let reads = 0;
    const fresh = makeChoices(manifest, {}, { seq: 15 });
    const api = {
      getManifest: vi.fn(async () => manifest),
      getChoices: vi.fn(async () => { reads += 1; return reads === 1 ? makeChoices(manifest, {}, { seq: 2 }) : fresh; }),
      primeCsrf: vi.fn(async () => {}),
      saveChoices: vi.fn(async (body) => makeChoices(manifest, body.choices, { seq: 16 })),
    };
    const originalLocks = navigator.locks;
    const request = vi.fn(async (_name, _options, callback) => callback());
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    await renderPrivacy({ apiBundle: { api } });
    fireEvent.click(await screen.findByRole('button', { name: 'Necessary only' }));
    await waitFor(() => expect(api.saveChoices).toHaveBeenCalled());
    expect(request).toHaveBeenCalledOnce();
    // A refusal is the safe direction: it is re-based onto the fresh server sequence.
    expect(api.saveChoices.mock.calls[0][0].expected_seq).toBe(15);
    Object.defineProperty(navigator, 'locks', { configurable: true, value: originalLocks });
  });

  it('never re-bases a grant onto a newer server state (another tab changed it meanwhile)', async () => {
    const manifest = makePrivacyManifest();
    let reads = 0;
    const fresh = makeChoices(manifest, { display: 'refused', visits: 'refused' }, { seq: 15 });
    const api = {
      getManifest: vi.fn(async () => manifest),
      getChoices: vi.fn(async () => { reads += 1; return reads === 1 ? makeChoices(manifest, {}, { seq: 2 }) : fresh; }),
      primeCsrf: vi.fn(async () => {}),
      saveChoices: vi.fn(async (body) => makeChoices(manifest, body.choices, { seq: 16 })),
    };
    await renderPrivacy({ apiBundle: { api } });
    fireEvent.click(await screen.findByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('error'));
    expect(api.saveChoices).not.toHaveBeenCalled();
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
  });
});
