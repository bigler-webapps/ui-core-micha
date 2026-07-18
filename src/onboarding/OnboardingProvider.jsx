import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AuthContext } from '../auth/AuthContext';
import { getNotificationPreferences } from '../notifications/api';
import { getOnboardingStepConfig } from './api';
import { selectActiveSteps } from './stepSelection';
import CookieConsentStep from './steps/CookieConsentStep';
import CompleteNameStep from './steps/CompleteNameStep';
import BrowserPushStep from './steps/BrowserPushStep';
import PwaInstallStep from './steps/PwaInstallStep';

export const UNIVERSAL_STEP_DESCRIPTORS = [
  {
    id: 'cookie_consent',
    condition: (ctx) => Boolean(ctx.user && !ctx.user.accepted_privacy_statement),
    blocking: true,
    skipable: false,
    persistDismissed: false,
    titleKey: 'Onboarding.PRIVACY_COOKIES_TITLE',
    Component: CookieConsentStep,
  },
  {
    id: 'complete_name',
    condition: (ctx) => Boolean(ctx.user && (!ctx.user.first_name?.trim() || !ctx.user.last_name?.trim())),
    blocking: true,
    skipable: false,
    persistDismissed: false,
    titleKey: 'Onboarding.COMPLETE_NAME_TITLE',
    Component: CompleteNameStep,
  },
  {
    id: 'browser_push',
    condition: (ctx) => {
      const { nagUntil = 'any-channel', showOnce = false } = ctx.browserPush || {};
      if (showOnce && ctx.seenSteps?.has('browser_push')) return false;
      if (nagUntil === 'off') return false;
      const supported = ctx.pushState?.supported;
      if (!supported) return !ctx.emailOptedIn;
      if (nagUntil === 'all-channels') return !ctx.pushState.subscribed || !ctx.emailOptedIn;
      return !ctx.pushState.subscribed && !ctx.emailOptedIn; // 'any-channel' (default)
    },
    blocking: false,
    skipable: true,
    persistDismissed: true,
    titleKey: 'Onboarding.NOTIFICATIONS_TITLE',
    Component: BrowserPushStep,
  },
  {
    id: 'pwa_install',
    // App-level opt-in (ctx.pwaInstallEnabled) gates this on top of device
    // capability — a step being "universal" in the library means available
    // to every app, not automatically shown by every app. Apps that haven't
    // verified their PWA manifest/icons are actually installable must not
    // pass pwaInstallEnabled, or this would show an iOS "Add to Home Screen"
    // hint for an app that isn't really installable.
    condition: (ctx) => Boolean(
      ctx.pwaInstallEnabled
      && !ctx.pwaInstall?.isStandalone
      && (Boolean(ctx.pwaInstall?.deferredPrompt) || Boolean(ctx.pwaInstall?.isIos)),
    ),
    blocking: false,
    skipable: true,
    persistDismissed: true,
    titleKey: 'Onboarding.PWA_INSTALL_TITLE',
    Component: PwaInstallStep,
  },
];

export const OnboardingContext = createContext(null);

export function useOnboarding() {
  return useContext(OnboardingContext);
}

function loadDismissedSteps() {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem('onboarding_dismissed')) || []);
  } catch {
    return new Set();
  }
}

function loadSeenSteps() {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem('onboarding_seen')) || []);
  } catch {
    return new Set();
  }
}

function persistSeenStep(id) {
  if (typeof window === 'undefined') return;
  try {
    const seenSteps = loadSeenSteps();
    seenSteps.add(id);
    window.localStorage.setItem('onboarding_seen', JSON.stringify([...seenSteps]));
  } catch {
    // Persistence is optional; the current session remains unaffected.
  }
}

function getInitialPushState() {
  const supported = typeof navigator !== 'undefined'
    && typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
  return supported ? null : { supported: false, subscribed: false };
}

function getInitialPwaInstallState() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isStandalone: false, isIos: false, deferredPrompt: null };
  }
  const isStandalone = Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone,
  );
  // iPadOS 13+ reports a desktop Safari/Mac user agent by default, so the
  // classic /ipad/i UA sniff misses it — the standard workaround is
  // detecting touch support on a reported Mac platform (real Macs report
  // maxTouchPoints 0).
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || '')
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return { isStandalone, isIos, deferredPrompt: null };
}

// Stable empty-object default — an inline `{}` default would create a new
// reference every render, invalidating the `ctx` memo below for every
// consumer even when no extraContext is passed.
const EMPTY_EXTRA_CONTEXT = {};
const EMPTY_BROWSER_PUSH = {};

export function OnboardingProvider({
  children,
  extraSteps = [],
  extraContext = EMPTY_EXTRA_CONTEXT,
  pwaInstallEnabled = false,
  browserPush = EMPTY_BROWSER_PUSH,
}) {
  const { user } = useContext(AuthContext);
  const [configMap, setConfigMap] = useState({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const [pushState, setPushState] = useState(getInitialPushState);
  const [emailOptedIn, setEmailOptedIn] = useState(false);
  const [pwaInstall, setPwaInstall] = useState(getInitialPwaInstallState);
  const [dismissedSet, setDismissedSet] = useState(loadDismissedSteps);
  const seenAtMountRef = useRef(loadSeenSteps());

  const resolvedBrowserPush = useMemo(
    () => ({ nagUntil: 'any-channel', showOnce: false, ...browserPush }),
    [browserPush],
  );

  const descriptors = useMemo(
    () => [...UNIVERSAL_STEP_DESCRIPTORS, ...extraSteps],
    [extraSteps],
  );

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setConfigMap({});
      setConfigLoaded(false);
      return undefined;
    }

    getOnboardingStepConfig()
      .then((data) => {
        if (cancelled) return;
        const nextConfigMap = {};
        (data || []).forEach((item) => { nextConfigMap[item.key] = item.enabled; });
        setConfigMap(nextConfigMap);
      })
      .catch(() => {
        if (!cancelled) setConfigMap({});
      })
      .finally(() => {
        if (!cancelled) setConfigLoaded(true);
      });

    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === 'undefined' || typeof window === 'undefined'
      || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState({ supported: false, subscribed: false });
      return undefined;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setPushState({ supported: true, subscribed: Boolean(subscription) });
      })
      .catch(() => {
        if (!cancelled) setPushState({ supported: true, subscribed: false });
      });

    return () => { cancelled = true; };
  }, []);

  // Capture beforeinstallprompt as early as possible (at provider mount, not
  // when the wizard step happens to render) — Chrome fires it once, early,
  // and calling preventDefault() late means losing the deferred prompt
  // reference for good. Gated behind pwaInstallEnabled: calling
  // preventDefault() unconditionally would suppress the browser's own native
  // install UI for every app using this library, even ones that never opted
  // in and have no replacement UI to show instead.
  useEffect(() => {
    if (typeof window === 'undefined' || !pwaInstallEnabled) return undefined;

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');

    const handleDisplayModeChange = (event) => {
      if (event.matches) setPwaInstall((prev) => ({ ...prev, isStandalone: true }));
    };
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPwaInstall((prev) => ({ ...prev, deferredPrompt: event }));
    };
    const handleAppInstalled = () => {
      setPwaInstall((prev) => ({ ...prev, isStandalone: true, deferredPrompt: null }));
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(handleDisplayModeChange);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else if (mediaQuery?.removeListener) {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [pwaInstallEnabled]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setEmailOptedIn(false);
      return undefined;
    }

    setEmailOptedIn(false);
    getNotificationPreferences()
      .then((data) => {
        if (!cancelled) setEmailOptedIn(Boolean(data?.email_opt_in));
      })
      .catch(() => {
        if (!cancelled) setEmailOptedIn(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  const dismissStep = useCallback((id) => {
    setDismissedSet((previous) => {
      const next = new Set(previous);
      next.add(id);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('onboarding_dismissed', JSON.stringify([...next]));
        } catch {
          // Persistence is optional; the in-memory dismissal still applies.
        }
      }
      return next;
    });
  }, []);

  const markStepSeen = useCallback((id) => {
    persistSeenStep(id);
  }, []);

  // extraContext is spread last: duplicate core keys intentionally override core values, so apps should use distinct names.
  const ctx = useMemo(
    () => ({
      user,
      pushState,
      emailOptedIn,
      pwaInstall,
      pwaInstallEnabled,
      browserPush: resolvedBrowserPush,
      seenSteps: seenAtMountRef.current,
      ...extraContext,
    }),
    [
      user,
      pushState,
      emailOptedIn,
      pwaInstall,
      pwaInstallEnabled,
      resolvedBrowserPush,
      seenAtMountRef.current,
      extraContext,
    ],
  );
  const activeSteps = useMemo(() => {
    if (!configLoaded || !user) return [];
    return selectActiveSteps(descriptors, configMap, ctx, dismissedSet);
  }, [configLoaded, user, descriptors, configMap, ctx, dismissedSet]);

  const value = useMemo(
    () => ({ activeSteps, dismissStep, markStepSeen, ctx, configMap, setConfigMap }),
    [activeSteps, dismissStep, markStepSeen, ctx, configMap],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
