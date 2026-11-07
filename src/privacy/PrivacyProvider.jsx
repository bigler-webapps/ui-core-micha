import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { createPrivacyApi, defaultPrivacyApi } from './privacyApi';
import { setPrivacyState } from './serviceRegistry';

const PrivacyContext = createContext(null);
const OPTIONAL_STATES = new Set(['granted', 'refused']);

function errorCode(error) {
  const data = error?.response?.data;
  return data?.code || data?.detail?.code || (typeof data?.detail === 'string' ? data.detail : null);
}

function isNotConfigured(error) {
  return error?.response?.status === 404 && errorCode(error) === 'not_configured';
}

function makeUnsetChoices(manifest, source = {}) {
  const choices = {};
  (manifest?.purposes || []).filter((purpose) => !purpose.required).forEach((purpose) => {
    choices[purpose.id] = {
      state: 'unset',
      revision: purpose.revision,
      expires_at: null,
    };
  });
  return {
    receipt_state: source.receipt_state || 'unset',
    seq: Number.isFinite(source.seq) ? source.seq : 0,
    config_version: source.config_version || manifest?.config_version,
    notice_version: source.notice_version || manifest?.notice?.version,
    choices,
  };
}

export function normalizePrivacyChoices(manifest, source, now = Date.now()) {
  const normalized = makeUnsetChoices(manifest, source);
  if (!manifest || !source || source.receipt_state !== 'present') return normalized;
  if (source.config_version !== manifest.config_version
    || source.notice_version !== manifest.notice?.version
    || !Number.isInteger(source.seq) || source.seq < 0) return normalized;

  (manifest.purposes || []).filter((purpose) => !purpose.required).forEach((purpose) => {
    const choice = source.choices?.[purpose.id];
    const expiryText = choice?.expires_at;
    const expiry = typeof expiryText === 'string'
      && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(expiryText)
      ? Date.parse(expiryText)
      : NaN;
    if (!purpose.id || purpose.revision === undefined || purpose.revision === null
      || !choice || !OPTIONAL_STATES.has(choice.state) || choice.revision !== purpose.revision
      || !Number.isFinite(expiry) || expiry <= now) return;
    normalized.choices[purpose.id] = {
      state: choice.state,
      revision: purpose.revision,
      expires_at: choice.expires_at,
    };
  });
  return normalized;
}

function forceUnset(manifest, source) {
  const unset = makeUnsetChoices(manifest, source);
  return { ...unset, receipt_state: source?.receipt_state || 'unset' };
}

function localeForManifest(manifest, language = '') {
  const locales = Array.isArray(manifest?.locales) ? manifest.locales : [];
  if (!locales.length) return '';
  const normalized = String(language || '').replace('_', '-').toLowerCase();
  const exact = locales.find((locale) => String(locale).toLowerCase() === normalized);
  if (exact) return exact;
  const base = normalized.split('-')[0];
  return locales.find((locale) => String(locale).toLowerCase() === base)
    || locales.find((locale) => String(locale).toLowerCase().split('-')[0] === base)
    || locales[0];
}

function requestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toServerChoices(manifest, selections) {
  const result = {};
  (manifest?.purposes || []).filter((purpose) => !purpose.required).forEach((purpose) => {
    const selection = selections?.[purpose.id];
    const state = typeof selection === 'boolean' ? (selection ? 'granted' : 'refused') : selection;
    if (OPTIONAL_STATES.has(state)) result[purpose.id] = state;
  });
  return result;
}

function effectiveChoices(serverChoices, pendingChoices) {
  if (!serverChoices) return null;
  if (!pendingChoices) return serverChoices;
  const choices = { ...serverChoices.choices };
  Object.entries(pendingChoices).forEach(([purposeId, state]) => {
    if (state === 'refused' && choices[purposeId]) choices[purposeId] = { ...choices[purposeId], state: 'refused' };
  });
  return { ...serverChoices, choices };
}

/**
 * Loads the host's privacy manifest and server receipt before any app adapter
 * can observe a grant. This provider stores no choice in browser storage.
 */
export function PrivacyProvider({
  children,
  api: apiOverride,
  apiBase = '/api/privacy/',
  csrfUrl = '/api/csrf/',
}) {
  const { i18n } = useTranslation();
  const resolvedApi = useMemo(
    () => apiOverride || (apiBase === '/api/privacy/' && csrfUrl === '/api/csrf/'
      ? defaultPrivacyApi
      : createPrivacyApi({}, { apiBase, csrfUrl })),
    [apiOverride, apiBase, csrfUrl],
  );
  const [status, setStatus] = useState('loading');
  const [manifest, setManifest] = useState(null);
  const [serverChoices, setServerChoices] = useState(null);
  const [pendingChoices, setPendingChoices] = useState(null);
  const [pendingFailed, setPendingFailed] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [error, setError] = useState(null);
  const [reopened, setReopened] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const manifestRef = useRef(null);
  const choicesRef = useRef(null);
  const locallyDisabledRef = useRef(new Set());
  const forceDecisionRef = useRef(false);
  const pendingRef = useRef(null);
  const mountedRef = useRef(false);
  const loadSequenceRef = useRef(0);
  const localWriteRef = useRef(Promise.resolve());
  const channelRef = useRef(null);

  const setRegistry = useCallback((nextManifest, nextChoices) => {
    const source = forceDecisionRef.current && nextManifest
      ? forceUnset(nextManifest, nextChoices || {})
      : nextChoices;
    setPrivacyState(nextManifest, source, locallyDisabledRef.current);
  }, []);

  const applyManifestAndChoices = useCallback((nextManifest, source, { forceUnsetChoices = false } = {}) => {
    const nextChoices = forceUnsetChoices
      ? forceUnset(nextManifest, source)
      : normalizePrivacyChoices(nextManifest, source);
    manifestRef.current = nextManifest;
    choicesRef.current = nextChoices;
    if (mountedRef.current) {
      setManifest(nextManifest);
      setServerChoices(nextChoices);
      setStatus('ready');
    }
    setRegistry(nextManifest, nextChoices);
    return nextChoices;
  }, [setRegistry]);

  const load = useCallback(async ({ forceUnsetChoices = false } = {}) => {
    const sequence = ++loadSequenceRef.current;
    if (mountedRef.current) {
      setStatus((previous) => (previous === 'ready' ? previous : 'loading'));
      setError(null);
    }
    try {
      const nextManifest = await resolvedApi.getManifest();
      const source = await resolvedApi.getChoices();
      if (sequence !== loadSequenceRef.current) return null;
      const mustForceDecision = forceUnsetChoices || forceDecisionRef.current;
      forceDecisionRef.current = mustForceDecision;
      const nextChoices = applyManifestAndChoices(nextManifest, source, { forceUnsetChoices: mustForceDecision });
      if (mountedRef.current) setError(null);
      return { manifest: nextManifest, choices: nextChoices };
    } catch (loadError) {
      if (sequence !== loadSequenceRef.current) return null;
      if (isNotConfigured(loadError)) {
        manifestRef.current = null;
        choicesRef.current = null;
        if (mountedRef.current) {
          setManifest(null);
          setServerChoices(null);
          setStatus('unconfigured');
          setError(null);
        }
        setRegistry(null, null);
        return null;
      }
      manifestRef.current = null;
      choicesRef.current = null;
      if (mountedRef.current) {
        setManifest(null);
        setServerChoices(null);
        setStatus('error');
        setError(loadError);
      }
      setRegistry(null, null);
      return null;
    }
  }, [applyManifestAndChoices, resolvedApi, setRegistry]);

  const channelKey = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'server';
    return `privacy-state:${origin}:${apiBase}`;
  }, [apiBase]);

  const broadcastChanged = useCallback(() => {
    const channel = channelRef.current;
    if (channel) {
      try { channel.postMessage({ type: 'state-changed' }); } catch { /* A later GET still recovers state. */ }
      return;
    }
    if (typeof window === 'undefined') return;
    const key = `${channelKey}:signal`;
    try {
      window.localStorage.setItem(key, requestId());
      window.localStorage.removeItem(key);
    } catch {
      // Synchronisation is best effort when storage is unavailable.
    }
  }, [channelKey]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(channelKey);
        channel.onmessage = (event) => {
          if (event?.data?.type === 'state-changed') load();
        };
        channelRef.current = channel;
      } catch { channel = null; }
    }
    const handleStorage = (event) => {
      if (!channel && event.key === `${channelKey}:signal`) load();
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', handleStorage);
    return () => {
      mountedRef.current = false;
      loadSequenceRef.current += 1;
      if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorage);
      try { channel?.close(); } catch { /* no-op */ }
      channelRef.current = null;
      setPrivacyState(null, null);
    };
  }, [channelKey, load]);

  const save = useCallback(async (selections, channel = 'other') => {
    const activeManifest = manifestRef.current;
    if (!activeManifest || !Array.isArray(activeManifest.purposes)) return false;
    const decisions = toServerChoices(activeManifest, selections);
    if (!Object.keys(decisions).length) return false;
    // The state the person decided on. A grant is never re-based onto a newer server state (another tab may
    // have refused in between); a refusal is the safe direction and may be.
    const basisSeq = Number.isInteger(choicesRef.current?.seq) ? choicesRef.current.seq : 0;
    const hasGrantDecision = Object.values(decisions).includes('granted');

    Object.entries(decisions).forEach(([purposeId, state]) => {
      if (state === 'refused') locallyDisabledRef.current.add(purposeId);
    });
    pendingRef.current = decisions;
    // A refresh that started before this write may still be in flight with an older (possibly granted) state:
    // invalidate it so it cannot be applied after the user's later decision.
    loadSequenceRef.current += 1;
    if (mountedRef.current) {
      setPendingChoices(decisions);
      setPendingFailed(false);
      setSaveState('saving');
      setError(null);
      setBannerDismissed(false);
    }
    // Withdrawals stop services synchronously, before CSRF priming or network work.
    setRegistry(activeManifest, choicesRef.current);

    const execute = async () => {
      const freshSource = await resolvedApi.getChoices();
      if (!Number.isInteger(freshSource?.seq) || freshSource.seq < 0) throw new Error('privacy_state_invalid');
      const latestManifest = manifestRef.current;
      if (!latestManifest) throw new Error('privacy_manifest_unavailable');
      const freshChoices = normalizePrivacyChoices(latestManifest, freshSource);
      if (hasGrantDecision && freshChoices.seq !== basisSeq) {
        const staleError = new Error('stale');
        staleError.response = { data: { code: 'stale', state: freshSource } };
        throw staleError;
      }
      choicesRef.current = freshChoices;
      if (mountedRef.current) setServerChoices(freshChoices);
      setRegistry(latestManifest, freshChoices);

      await resolvedApi.primeCsrf();
      const body = {
        request_id: requestId(),
        expected_seq: freshChoices.seq,
        notice_version: latestManifest.notice.version,
        config_version: latestManifest.config_version,
        locale: localeForManifest(latestManifest, i18n.language),
        channel,
        choices: decisions,
      };
      const returned = await resolvedApi.saveChoices(body);
      const confirmedSource = await resolvedApi.getChoices();
      const saved = normalizePrivacyChoices(latestManifest, confirmedSource);
      const confirmedAll = Object.entries(decisions).every(([purposeId, choice]) => (
        saved.receipt_state === 'present' && saved.choices?.[purposeId]?.state === choice
      ));
      if (!confirmedAll) throw new Error('privacy_choice_not_persisted');
      // The POST response confirms the server handled the request; the follow-up
      // read also proves the host receipt is usable in this browser context.
      if (!returned || returned.receipt_state !== 'present') throw new Error('privacy_receipt_missing');
      Object.entries(decisions).forEach(([purposeId, choice]) => {
        if (choice === 'refused' || choice === 'granted') locallyDisabledRef.current.delete(purposeId);
      });
      pendingRef.current = null;
      forceDecisionRef.current = false;
      choicesRef.current = saved;
      loadSequenceRef.current += 1; // any refresh begun during the write read pre-write state
      if (mountedRef.current) {
        setServerChoices(saved);
        setPendingChoices(null);
        setPendingFailed(false);
        setSaveState('saved');
        setError(null);
      }
      setRegistry(latestManifest, saved);
      broadcastChanged();
      return true;
    };

    const runLocalSerial = () => {
      const task = localWriteRef.current.then(async () => {
        const locks = typeof navigator !== 'undefined' ? navigator.locks : null;
        const lockName = `${channelKey}:write`;
        if (locks?.request) return locks.request(lockName, { mode: 'exclusive' }, execute);
        return execute();
      });
      localWriteRef.current = task.catch(() => {});
      return task;
    };

    try {
      await runLocalSerial();
      return true;
    } catch (saveError) {
      const code = errorCode(saveError);
      if (code === 'stale' && saveError?.response?.data?.state) {
        const fresh = normalizePrivacyChoices(manifestRef.current, saveError.response.data.state);
        choicesRef.current = fresh;
        if (mountedRef.current) setServerChoices(fresh);
        setRegistry(manifestRef.current, fresh);
      } else if (code === 'stale_notice' || code === 'stale_config') {
        // Changed notice/configuration requires a fresh manifest and a new human decision.
        forceDecisionRef.current = true;
        setRegistry(manifestRef.current, choicesRef.current);
        pendingRef.current = null;
        if (mountedRef.current) setPendingChoices(null);
        await load({ forceUnsetChoices: true });
      }
      if (mountedRef.current) {
        setPendingFailed(true);
        setSaveState('error');
        setError(saveError);
      }
      return false;
    }
  }, [broadcastChanged, channelKey, i18n.language, load, resolvedApi, setRegistry]);

  // A grant that expires while the page stays open must stop optional processing at its expiry:
  // schedule one re-read at the earliest `expires_at`; the server answers "unset" and the registry follows
  // (a failed re-read also fails closed, because load errors clear the registry).
  useEffect(() => {
    const expiries = Object.values(serverChoices?.choices || {})
      .filter((choice) => choice?.state === 'granted' && choice.expires_at)
      .map((choice) => Date.parse(choice.expires_at))
      .filter(Number.isFinite);
    if (!expiries.length) return undefined;
    const delay = Math.min(Math.max(Math.min(...expiries) - Date.now(), 0) + 250, 2 ** 31 - 1);
    const timer = setTimeout(() => { load(); }, delay);
    return () => clearTimeout(timer);
  }, [serverChoices, load]);

  const retry = useCallback(() => {
    if (pendingRef.current && manifestRef.current) return save(pendingRef.current, 'settings');
    return load();
  }, [load, save]);

  const optionalPurposes = useMemo(
    () => manifest?.purposes?.filter((purpose) => !purpose.required) || [],
    [manifest],
  );
  const choices = useMemo(() => effectiveChoices(serverChoices, pendingChoices), [serverChoices, pendingChoices]);
  const needsDecision = status === 'ready' && optionalPurposes.some(
    (purpose) => choices?.choices?.[purpose.id]?.state === 'unset',
  );
  const hasPendingDecision = Boolean(pendingRef.current) && (saveState === 'saving' || pendingFailed);
  const bannerVisible = status === 'ready' && optionalPurposes.length > 0
    && (needsDecision || hasPendingDecision || reopened) && !bannerDismissed;

  useEffect(() => {
    if (saveState === 'saved') setReopened(false);
  }, [saveState]);

  const hasGrant = useCallback((purposeId, serviceId) => {
    if (status !== 'ready') return false;
    if (locallyDisabledRef.current.has(purposeId)) return false;
    const purpose = manifestRef.current?.purposes?.find((item) => item.id === purposeId);
    if (!purpose || purpose.required || choicesRef.current?.choices?.[purposeId]?.state !== 'granted') return false;
    return serviceId === undefined || purpose.services?.some((service) => service.id === serviceId) === true;
  }, [status]);

  const acceptAll = useCallback((channel = 'banner') => {
    const selections = Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, 'granted']));
    return save(selections, channel);
  }, [optionalPurposes, save]);
  const necessaryOnly = useCallback((channel = 'banner') => {
    const selections = Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, 'refused']));
    return save(selections, channel);
  }, [optionalPurposes, save]);
  const openSettings = useCallback(() => {
    setBannerDismissed(false);
    setReopened(true);
  }, []);
  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    setReopened(false);
  }, []);

  const value = useMemo(() => ({
    status,
    manifest,
    choices,
    hasOptionalPurposes: optionalPurposes.length > 0,
    needsDecision,
    bannerVisible,
    bannerReopened: reopened,
    saveState,
    error,
    hasGrant,
    save,
    acceptAll,
    necessaryOnly,
    retry,
    openSettings,
    dismissBanner,
  }), [
    status, manifest, choices, optionalPurposes.length, needsDecision, bannerVisible, reopened, saveState, error, hasGrant,
    save, acceptAll, necessaryOnly, retry, openSettings, dismissBanner,
  ]);

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export { localeForManifest };
