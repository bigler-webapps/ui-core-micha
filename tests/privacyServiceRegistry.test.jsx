// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

import {
  createPrivacyGuard,
  guardedImport,
  registerPrivacyService,
  resetPrivacyServicesForTests,
  setPrivacyState,
  useGrantedPurpose,
} from '../src/privacy/serviceRegistry';
import { makeChoices, makePrivacyManifest } from './privacyTestUtils';

function GrantProbe() {
  return <output data-testid="granted">{String(useGrantedPurpose('visits', 'visit-service'))}</output>;
}

afterEach(() => {
  cleanup();
  resetPrivacyServicesForTests();
  vi.restoreAllMocks();
  delete globalThis.indexedDB;
  delete window.caches;
});

describe('purpose-aware service lifecycle', () => {
  it('keeps a real adapter inert until grant, then deactivates and clears only registered storage', async () => {
    const manifest = makePrivacyManifest();
    const work = { imports: 0, requests: 0, iframes: 0, reads: 0, writes: 0, callbacks: 0 };
    const dynamicImport = vi.fn(async () => { work.imports += 1; return { default: 'optional-module' }; });
    const request = vi.fn(async () => { work.requests += 1; });
    localStorage.setItem('unrelated-draft', 'keep');
    localStorage.setItem('owned-display', 'old');
    sessionStorage.setItem('owned-session', 'old');
    document.cookie = 'unrelated=keep; Path=/';
    document.cookie = 'owned-visit=remove; Path=/';
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    const createElement = document.createElement.bind(document);
    const iframeCreate = vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
      if (String(tag).toLowerCase() === 'iframe') work.iframes += 1;
      return createElement(tag, options);
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function instrumentedGetItem(key) {
      work.reads += 1;
      return originalGetItem.call(this, key);
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function instrumentedSetItem(key, value) {
      work.writes += 1;
      return originalSetItem.call(this, key, value);
    });
    const cacheDelete = vi.fn(async () => true);
    Object.defineProperty(window, 'caches', { configurable: true, value: { delete: cacheDelete } });
    const databaseDelete = vi.fn(() => ({}));
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: { deleteDatabase: databaseDelete } });

    let iframe;
    let lateCallback;
    const deactivate = vi.fn(() => { iframe?.remove(); });
    const unregister = registerPrivacyService({
      purposeId: 'visits',
      serviceId: 'visit-service',
      activate: async (guard) => {
        work.imports += 1;
        await dynamicImport();
        await request();
        iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        localStorage.getItem('owned-display');
        localStorage.setItem('owned-display', 'active');
        lateCallback = () => guard.run(() => { work.callbacks += 1; });
      },
      deactivate,
      ownedStorage: {
        cookies: ['owned-visit'],
        localStorage: ['owned-display'],
        sessionStorage: ['owned-session'],
        caches: ['owned-cache'],
        indexedDB: ['owned-db'],
      },
    });

    render(<GrantProbe />);
    expect(screen.getByTestId('granted').textContent).toBe('false');
    expect(work).toEqual({ imports: 0, requests: 0, iframes: 0, reads: 0, writes: 0, callbacks: 0 });
    const deniedLoader = vi.fn(async () => ({ default: 'never-loaded' }));
    await expect(guardedImport('visits', deniedLoader, 'visit-service')).rejects.toThrow('privacy_choice_required');
    expect(deniedLoader).not.toHaveBeenCalled();

    await act(async () => {
      setPrivacyState(manifest, makeChoices(manifest, { visits: 'granted' }));
    });
    await waitFor(() => expect(work.requests).toBe(1));
    expect(screen.getByTestId('granted').textContent).toBe('true');
    expect(work.imports).toBe(2);
    expect(work.iframes).toBe(1);
    expect(work.reads).toBe(1);
    expect(work.writes).toBe(1);

    const workAtGrant = { ...work };
    const cookieDeleteBefore = document.cookie;
    expect(cookieDeleteBefore).toContain('owned-visit=remove');
    expect(cookieDeleteBefore).toContain('unrelated=keep');
    const late = createPrivacyGuard('visits');
    const afterWithdraw = vi.fn(() => { work.callbacks += 1; });
    lateCallback();
    await act(async () => {
      setPrivacyState(manifest, makeChoices(manifest, { visits: 'refused' }));
    });
    expect(screen.getByTestId('granted').textContent).toBe('false');
    expect(deactivate).toHaveBeenCalledOnce();
    expect(late.run(afterWithdraw)).toBeUndefined();
    expect(work.callbacks).toBe(1);
    expect(originalGetItem.call(localStorage, 'unrelated-draft')).toBe('keep');
    expect(originalGetItem.call(localStorage, 'owned-display')).toBeNull();
    expect(originalGetItem.call(sessionStorage, 'owned-session')).toBeNull();
    expect(document.cookie).toContain('unrelated=keep');
    expect(document.cookie).not.toContain('owned-visit=');
    await waitFor(() => expect(cacheDelete).toHaveBeenCalledWith('owned-cache'));
    expect(cacheDelete).toHaveBeenCalledTimes(1);
    expect(databaseDelete).toHaveBeenCalledTimes(1);
    expect(databaseDelete).toHaveBeenCalledWith('owned-db');
    expect(work.imports).toBe(workAtGrant.imports);
    expect(work.requests).toBe(workAtGrant.requests);
    expect(work.iframes).toBe(workAtGrant.iframes);
    expect(work.reads).toBe(workAtGrant.reads);
    expect(work.writes).toBe(workAtGrant.writes);
    expect(iframeCreate.mock.calls.filter(([tag]) => String(tag).toLowerCase() === 'iframe')).toHaveLength(1);
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('rejects an import and ignores a late callback after revocation', async () => {
    const manifest = makePrivacyManifest();
    const loader = vi.fn(() => new Promise((resolve) => { globalThis.finishPrivacyImport = resolve; }));
    let imported;
    await act(async () => setPrivacyState(manifest, makeChoices(manifest, { visits: 'granted' })));
    const importPromise = guardedImport('visits', loader, 'visit-service').then((value) => { imported = value; });
    expect(loader).toHaveBeenCalledOnce();
    await act(async () => setPrivacyState(manifest, makeChoices(manifest, { visits: 'refused' })));
    globalThis.finishPrivacyImport({ default: 'module' });
    await expect(importPromise).rejects.toThrow('privacy_choice_withdrawn');
    expect(imported).toBeUndefined();
    delete globalThis.finishPrivacyImport;
  });
});
