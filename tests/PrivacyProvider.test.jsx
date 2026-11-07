// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

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
      {purposeId === 'display' && <>
        <output data-testid="save-state">{privacy?.saveState}</output>
        <output data-testid="privacy-status">{privacy?.status}</output>
      </>}
    </>
  );
}

function PrivacyActions() {
  const privacy = usePrivacy();
  return (
    <>
      <button type="button" onClick={privacy.openSettings}>Open choices</button>
      <button type="button" onClick={privacy.retry}>Retry privacy</button>
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

  it('reopens the banner after saved choices, saves all purposes together, and closes a reopened banner', async () => {
    const manifest = makePrivacyManifest();
    const bundle = makeApi({ manifest, choices: makeChoices(manifest, { display: 'refused', visits: 'refused' }) });
    await renderPrivacy({ apiBundle: bundle, children: <><PrivacyProbe /><PrivacyBanner /><PrivacySettingsLink /><PrivacyNoticeLink /><PrivacyActions /></> });
    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open choices' }));
    const region = await screen.findByRole('region', { name: 'Privacy choices' });
    expect(within(region).getByRole('button', { name: 'Necessary only' })).toBeTruthy();
    expect(within(region).getByRole('button', { name: 'Allow all' })).toBeTruthy();
    // Reopened by the user: focus moves to the first choice (the banner precedes the page content in the DOM).
    await waitFor(() => expect(document.activeElement).toBe(within(region).getByRole('button', { name: 'Necessary only' })));
    fireEvent.click(within(region).getByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(bundle.getCurrent().choices.display.state).toBe('granted'));
    expect(bundle.getCurrent().choices.visits.state).toBe('granted');
    expect(bundle.api.saveChoices).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'banner',
      choices: { display: 'granted', visits: 'granted' },
    }));
    // The banner stays up while the write is in flight and hides once the saved state reaches the UI.
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Open choices' }));
    const reopenedRegion = await screen.findByRole('region', { name: 'Privacy choices' });
    fireEvent.click(within(reopenedRegion).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).toBeNull();
    expect(bundle.api.saveChoices).toHaveBeenCalledOnce();
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

  it('hides both the banner and settings entry when no optional purposes are configured', async () => {
    const manifest = makePrivacyManifest({ purposes: [makePrivacyManifest().purposes[0]] });
    const bundle = makeApi({ manifest, choices: makeChoices(manifest, {}) });
    await renderPrivacy({ apiBundle: bundle });
    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.getByTestId('grant-display')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Privacy choices' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Privacy notice' }).getAttribute('href')).toBe('/privacy/en/');
    expect(bundle.api.saveChoices).not.toHaveBeenCalled();
  });

  it('renders no privacy surfaces when the host returns not_configured', async () => {
    const api = {
      getManifest: vi.fn().mockRejectedValue({ response: { status: 404, data: { code: 'not_configured' } } }),
      getChoices: vi.fn(), primeCsrf: vi.fn(), saveChoices: vi.fn(),
    };
    await renderPrivacy({ apiBundle: { api } });
    expect(await screen.findByText('unconfigured')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
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
    const region = await screen.findByRole('region', { name: 'Privacy choices' });
    fireEvent.click(within(region).getByRole('button', { name: 'Necessary only' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('error'));
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    expect(screen.getByTestId('grant-visits').textContent).toBe('false');
    expect(screen.getByRole('alert').textContent).toContain('Optional services remain off');
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

  it('fails closed when CSRF priming fails and permits a provider retry after the manifest becomes ready', async () => {
    const manifest = makePrivacyManifest();
    let available = false;
    let current = makeChoices(manifest, {});
    const api = {
      getManifest: vi.fn(async () => {
        if (!available) throw new Error('offline');
        return manifest;
      }),
      getChoices: vi.fn(async () => current),
      primeCsrf: vi.fn().mockRejectedValueOnce(new Error('csrf unavailable')).mockResolvedValue(undefined),
      saveChoices: vi.fn(async (body) => {
        current = makeChoices(manifest, body.choices, { seq: current.seq + 1 });
        return current;
      }),
    };
    await renderPrivacy({
      apiBundle: { api },
      children: <><PrivacyProbe /><PrivacyBanner /><PrivacySettingsLink /><PrivacyNoticeLink /><PrivacyActions /></>,
    });
    expect(screen.getByTestId('privacy-status').textContent).toBe('loading');
    await waitFor(() => expect(api.getManifest).toHaveBeenCalledOnce());
    expect(await screen.findByText('error')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    available = true;
    fireEvent.click(screen.getByRole('button', { name: 'Retry privacy' }));
    await waitFor(() => expect(api.getManifest).toHaveBeenCalledTimes(2));
    const region = await screen.findByRole('region', { name: 'Privacy choices' });
    fireEvent.click(within(region).getByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toBe('error'));
    expect(api.saveChoices).not.toHaveBeenCalled();
    expect(screen.getByTestId('grant-display').textContent).toBe('false');
    fireEvent.click(within(region).getByRole('button', { name: 'Allow all' }));
    await waitFor(() => expect(screen.getByTestId('grant-display').textContent).toBe('true'));
    expect(api.saveChoices).toHaveBeenCalledOnce();
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
