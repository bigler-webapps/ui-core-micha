// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installChunkLoadRecovery, isChunkLoadError } from '../src/utils/chunkLoadRecovery';

const GUARD_WINDOW_MS = 60_000;
const failedImport = () => new TypeError('Failed to fetch dynamically imported module');

function viteFailure(error) {
  const event = new Event('vite:preloadError', { cancelable: true });
  event.payload = error;
  window.dispatchEvent(event);
  return event;
}

function rejectionFailure(reason) {
  const event = new Event('unhandledrejection', { cancelable: true });
  Object.defineProperty(event, 'reason', { configurable: true, value: reason });
  window.dispatchEvent(event);
  return event;
}

describe('chunk load recovery', () => {
  let uninstall;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
    window.sessionStorage.clear();
    uninstall = undefined;
  });

  afterEach(() => {
    uninstall?.();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it('reloads once for a failed Vite preload and a failed dynamic import rejection', () => {
    const reload = vi.fn();
    uninstall = installChunkLoadRecovery({ reload });

    const viteEvent = viteFailure(failedImport());
    expect(reload).toHaveBeenCalledTimes(1);
    expect(viteEvent.defaultPrevented).toBe(true);

    uninstall();
    window.sessionStorage.clear();
    uninstall = installChunkLoadRecovery({ reload });
    const rejectionEvent = rejectionFailure(failedImport());
    expect(reload).toHaveBeenCalledTimes(2);
    expect(rejectionEvent.defaultPrevented).toBe(true);
  });

  it('does not reload or prevent the event again within the guard window after reinstalling', () => {
    const reload = vi.fn();
    uninstall = installChunkLoadRecovery({ reload });
    expect(viteFailure(failedImport()).defaultPrevented).toBe(true);

    uninstall();
    uninstall = installChunkLoadRecovery({ reload });
    const retryEvent = viteFailure(failedImport());

    expect(reload).toHaveBeenCalledTimes(1);
    expect(retryEvent.defaultPrevented).toBe(false);
  });

  it('reloads again after the guard window has passed', () => {
    const reload = vi.fn();
    uninstall = installChunkLoadRecovery({ guardWindowMs: GUARD_WINDOW_MS, reload });

    viteFailure(failedImport());
    vi.setSystemTime(Date.now() + GUARD_WINDOW_MS + 1);
    const laterEvent = viteFailure(failedImport());

    expect(reload).toHaveBeenCalledTimes(2);
    expect(laterEvent.defaultPrevented).toBe(true);
  });

  it.each([0, -1, Number.NaN, '60000'])('keeps the default guard for an invalid window %s', (guardWindowMs) => {
    const reload = vi.fn();
    uninstall = installChunkLoadRecovery({ guardWindowMs, reload });
    viteFailure(failedImport());
    uninstall();
    uninstall = installChunkLoadRecovery({ guardWindowMs, reload });
    vi.setSystemTime(Date.now() + 1000);
    viteFailure(failedImport());

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('recognizes chunk fetch failures and ignores evaluation, API, and plain rejection errors', () => {
    expect(isChunkLoadError(failedImport())).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/page.css'))).toBe(true);
    expect(isChunkLoadError(Object.assign(new Error('missing'), { name: 'ChunkLoadError' }))).toBe(true);

    const reload = vi.fn();
    uninstall = installChunkLoadRecovery({ reload });
    viteFailure(new TypeError('An error occurred while evaluating the module'));
    viteFailure(new Error('Request failed with status code 503'));
    rejectionFailure(new Error('ordinary rejection'));

    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload or throw when session storage cannot be read or written', () => {
    const reload = vi.fn();
    uninstall = installChunkLoadRecovery({ reload });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(() => viteFailure(failedImport())).not.toThrow();
    expect(reload).not.toHaveBeenCalled();
    getItem.mockRestore();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage quota');
    });
    expect(() => rejectionFailure(failedImport())).not.toThrow();
    expect(reload).not.toHaveBeenCalled();
  });

  it('registers one listener pair when installed twice and removes them on uninstall', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const reload = vi.fn();
    uninstall = installChunkLoadRecovery({ reload });
    const secondUninstall = installChunkLoadRecovery({ reload: vi.fn() });

    expect(addListener.mock.calls.filter(([type]) => type === 'vite:preloadError')).toHaveLength(1);
    expect(addListener.mock.calls.filter(([type]) => type === 'unhandledrejection')).toHaveLength(1);
    expect(secondUninstall).toBe(uninstall);

    uninstall();
    uninstall = undefined;
    expect(removeListener.mock.calls.filter(([type]) => type === 'vite:preloadError')).toHaveLength(1);
    expect(removeListener.mock.calls.filter(([type]) => type === 'unhandledrejection')).toHaveLength(1);
  });
});
