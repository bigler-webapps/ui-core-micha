import { useSyncExternalStore } from 'react';

const registrations = new Set();
const listeners = new Set();
let grantedPurposes = new Map();
let generationByPurpose = new Map();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isGranted(purposeId, serviceId) {
  const services = grantedPurposes.get(purposeId);
  if (!services) return false;
  return serviceId === undefined || services.has(serviceId);
}

function bumpGeneration(purposeId) {
  generationByPurpose.set(purposeId, (generationByPurpose.get(purposeId) || 0) + 1);
}

function cleanupOwnedStorage(ownedStorage = {}) {
  const cookieNames = Array.isArray(ownedStorage.cookies) ? ownedStorage.cookies : [];
  if (typeof document !== 'undefined' && cookieNames.length) {
    const visibleNames = new Set((document.cookie || '').split(';').map((part) => part.trim().split('=')[0]));
    // A cookie is removed only on the path it was set with: try the root, every prefix of the current
    // path and any path the adapter declares in `ownedStorage.cookiePaths`.
    const segments = (typeof window !== 'undefined' ? window.location?.pathname || '/' : '/').split('/').filter(Boolean);
    const paths = new Set(['/']);
    segments.reduce((prefix, segment) => {
      const next = `${prefix}/${segment}`;
      paths.add(next);
      return next;
    }, '');
    (Array.isArray(ownedStorage.cookiePaths) ? ownedStorage.cookiePaths : []).forEach((path) => {
      if (typeof path === 'string' && path.startsWith('/') && !/[;\s]/.test(path)) paths.add(path);
    });
    cookieNames.forEach((name) => {
      if (typeof name !== 'string' || !name || !visibleNames.has(name)) return;
      paths.forEach((path) => {
        document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=${path}; SameSite=Lax`;
      });
    });
  }

  const removeKeys = (storageName, keys) => {
    if (!Array.isArray(keys) || typeof window === 'undefined') return;
    try {
      const storage = window[storageName];
      keys.forEach((key) => { if (typeof key === 'string' && key) storage?.removeItem(key); });
    } catch {
      // Storage can be disabled in private or restricted browser contexts.
    }
  };
  removeKeys('localStorage', ownedStorage.localStorage);
  removeKeys('sessionStorage', ownedStorage.sessionStorage);

  if (typeof window !== 'undefined' && Array.isArray(ownedStorage.caches) && window.caches?.delete) {
    ownedStorage.caches.forEach((name) => {
      if (typeof name === 'string' && name) Promise.resolve(window.caches.delete(name)).catch(() => {});
    });
  }
  if (typeof indexedDB !== 'undefined' && Array.isArray(ownedStorage.indexedDB)) {
    ownedStorage.indexedDB.forEach((name) => {
      if (typeof name === 'string' && name) {
        try { indexedDB.deleteDatabase(name); } catch { /* IndexedDB may be unavailable. */ }
      }
    });
  }
}

function deactivateEntry(entry) {
  if (!entry.active) return;
  entry.active = false;
  try { entry.deactivate?.(); } catch { /* A provider teardown must not prevent other cleanups. */ }
  cleanupOwnedStorage(entry.ownedStorage);
}

function finishRevokedActivation(entry) {
  entry.active = false;
  try { entry.deactivate?.(); } catch { /* Late activation cleanup is best effort. */ }
  cleanupOwnedStorage(entry.ownedStorage);
}

function activateEntry(entry) {
  if (entry.active || !isGranted(entry.purposeId, entry.serviceId)) return;
  entry.active = true;
  const epoch = generationByPurpose.get(entry.purposeId) || 0;
  // Each activation owns a token: a late completion of a superseded activation (refuse, then re-grant)
  // must never tear down the newer, currently granted activation of the same registration.
  const token = {};
  entry.token = token;
  const guard = createPrivacyGuard(entry.purposeId);
  let result;
  try { result = entry.activate?.(guard); } catch {
    deactivateEntry(entry);
    return;
  }
  if (result && typeof result.then === 'function') {
    Promise.resolve(result).then(() => {
      if (entry.token !== token) return;
      if (!entry.active || epoch !== (generationByPurpose.get(entry.purposeId) || 0)) {
        finishRevokedActivation(entry);
      }
    }).catch(() => {
      if (entry.token !== token) return;
      if (entry.active && epoch === (generationByPurpose.get(entry.purposeId) || 0)) deactivateEntry(entry);
      else finishRevokedActivation(entry);
    });
  }
}

/**
 * Update the registry from server-confirmed choices. `locallyDisabled` is an
 * in-memory deny list used while a refusal write is pending or failed.
 */
export function setPrivacyState(manifest, choices, locallyDisabled = new Set()) {
  const next = new Map();
  const disabled = locallyDisabled instanceof Set ? locallyDisabled : new Set(locallyDisabled || []);
  const purposes = Array.isArray(manifest?.purposes) ? manifest.purposes : [];
  purposes.forEach((purpose) => {
    if (purpose.required || disabled.has(purpose.id)) return;
    if (choices?.choices?.[purpose.id]?.state !== 'granted') return;
    next.set(purpose.id, new Set((purpose.services || []).map((service) => service.id)));
  });

  const changedPurposes = new Set([...grantedPurposes.keys(), ...next.keys()]);
  changedPurposes.forEach((purposeId) => {
    const wasGranted = grantedPurposes.has(purposeId);
    const nowGranted = next.has(purposeId);
    if (wasGranted !== nowGranted) bumpGeneration(purposeId);
  });
  grantedPurposes = next;
  registrations.forEach((entry) => {
    if (isGranted(entry.purposeId, entry.serviceId)) activateEntry(entry);
    else deactivateEntry(entry);
  });
  notify();
}

/** Register one app-owned adapter and the exact storage entries it owns. */
export function registerPrivacyService({
  purposeId,
  serviceId,
  activate,
  deactivate,
  ownedStorage = {},
} = {}) {
  if (typeof purposeId !== 'string' || !purposeId || typeof serviceId !== 'string' || !serviceId) {
    throw new TypeError('registerPrivacyService requires purposeId and serviceId strings');
  }
  const entry = { purposeId, serviceId, activate, deactivate, ownedStorage, active: false };
  registrations.add(entry);
  activateEntry(entry);
  return () => {
    if (!registrations.delete(entry)) return;
    deactivateEntry(entry);
  };
}

/** A callback guard becomes permanently stale after a purpose is withdrawn. */
export function createPrivacyGuard(purposeId) {
  const generation = generationByPurpose.get(purposeId) || 0;
  const isCurrent = () => isGranted(purposeId) && generation === (generationByPurpose.get(purposeId) || 0);
  return {
    isCurrent,
    run(fn) {
      if (typeof fn !== 'function' || !isCurrent()) return undefined;
      return fn();
    },
  };
}

/** Resolve an optional chunk only for a currently granted purpose. */
export async function guardedImport(purposeId, loader, serviceId) {
  if (typeof loader !== 'function' || !isGranted(purposeId, serviceId)) {
    throw new Error('privacy_choice_required');
  }
  const guard = createPrivacyGuard(purposeId);
  const module = await loader();
  if (!guard.isCurrent() || !isGranted(purposeId, serviceId)) throw new Error('privacy_choice_withdrawn');
  return module;
}

/** React hook for adapter code; it is false during loading, errors and refusal. */
export function useGrantedPurpose(purposeId, serviceId) {
  const snapshot = () => `${version}:${isGranted(purposeId, serviceId)}`;
  const value = useSyncExternalStore(subscribe, snapshot, () => '0:false');
  return value.endsWith(':true');
}

export function isPurposeGranted(purposeId, serviceId) {
  return isGranted(purposeId, serviceId);
}

export function resetPrivacyServicesForTests() {
  registrations.forEach(deactivateEntry);
  registrations.clear();
  grantedPurposes = new Map();
  generationByPurpose = new Map();
  notify();
}
