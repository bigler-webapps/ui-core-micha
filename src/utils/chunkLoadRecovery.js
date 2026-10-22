const LAST_RELOAD_KEY = 'ucm:chunk-load-recovery:last-reload';
const DEFAULT_GUARD_WINDOW_MS = 60_000;

let activeInstallation = null;

/**
 * Returns whether an error indicates that a JavaScript or CSS module chunk could not be fetched.
 * Errors thrown while evaluating a successfully fetched module do not count.
 */
export function isChunkLoadError(error) {
  if (!error || (typeof error !== 'object' && typeof error !== 'function')) return false;

  if (error.name === 'ChunkLoadError') return true;
  if (typeof error.message !== 'string') return false;

  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css/i.test(error.message);
}

/**
 * Installs one-shot recovery for failed Vite or unhandled dynamic module loads.
 * The session storage guard defaults to 60 seconds and survives a page reload; storage failures
 * leave the error untouched. Options accept `guardWindowMs` and an injected `reload` function.
 * Returns an uninstall function, or a no-op when called without `window`.
 */
export function installChunkLoadRecovery({ guardWindowMs = DEFAULT_GUARD_WINDOW_MS, reload = () => window.location.reload() } = {}) {
  if (typeof window === 'undefined') return () => {};
  if (activeInstallation) return activeInstallation.uninstall;
  // A zero, negative or non-numeric window would disable the loop guard; use the default instead.
  const windowMs = Number.isFinite(guardWindowMs) && guardWindowMs > 0 ? guardWindowMs : DEFAULT_GUARD_WINDOW_MS;

  const tryRecover = (error, event) => {
    if (!isChunkLoadError(error)) return;

    let storage;
    try {
      storage = window.sessionStorage;
      const previousValue = storage.getItem(LAST_RELOAD_KEY);
      const previousReload = Number(previousValue);
      const now = Date.now();
      if (previousValue !== null && Number.isFinite(previousReload) && now - previousReload < windowMs) return;

      const storedTime = String(now);
      storage.setItem(LAST_RELOAD_KEY, storedTime);
      if (storage.getItem(LAST_RELOAD_KEY) !== storedTime) return;
    } catch {
      return;
    }

    event?.preventDefault();
    reload();
  };

  const onVitePreloadError = (event) => tryRecover(event.payload, event);
  const onUnhandledRejection = (event) => tryRecover(event.reason, event);
  window.addEventListener('vite:preloadError', onVitePreloadError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  const uninstall = () => {
    if (activeInstallation?.uninstall !== uninstall) return;
    window.removeEventListener('vite:preloadError', onVitePreloadError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    activeInstallation = null;
  };
  activeInstallation = { uninstall };
  return uninstall;
}
