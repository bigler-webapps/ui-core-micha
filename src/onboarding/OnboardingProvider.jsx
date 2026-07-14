import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AuthContext } from '../auth/AuthContext';
import { getNotificationPreferences } from '../notifications/api';
import { getOnboardingStepConfig } from './api';
import { selectActiveSteps } from './stepSelection';
import CookieConsentStep from './steps/CookieConsentStep';
import CompleteNameStep from './steps/CompleteNameStep';
import BrowserPushStep from './steps/BrowserPushStep';

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
    condition: (ctx) => Boolean(
      (ctx.pushState?.supported && (!ctx.pushState.subscribed || !ctx.emailOptedIn))
      || (!ctx.pushState?.supported && !ctx.emailOptedIn),
    ),
    blocking: false,
    skipable: true,
    persistDismissed: true,
    titleKey: 'Onboarding.NOTIFICATIONS_TITLE',
    Component: BrowserPushStep,
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

function getInitialPushState() {
  const supported = typeof navigator !== 'undefined'
    && typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
  return supported ? null : { supported: false, subscribed: false };
}

// Stable empty-object default — an inline `{}` default would create a new
// reference every render, invalidating the `ctx` memo below for every
// consumer even when no extraContext is passed.
const EMPTY_EXTRA_CONTEXT = {};

export function OnboardingProvider({ children, extraSteps = [], extraContext = EMPTY_EXTRA_CONTEXT }) {
  const { user } = useContext(AuthContext);
  const [configMap, setConfigMap] = useState({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const [pushState, setPushState] = useState(getInitialPushState);
  const [emailOptedIn, setEmailOptedIn] = useState(false);
  const [dismissedSet, setDismissedSet] = useState(loadDismissedSteps);

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

  // extraContext is spread last: duplicate core keys intentionally override core values, so apps should use distinct names.
  const ctx = useMemo(
    () => ({ user, pushState, emailOptedIn, ...extraContext }),
    [user, pushState, emailOptedIn, extraContext],
  );
  const activeSteps = useMemo(() => {
    if (!configLoaded || !user) return [];
    return selectActiveSteps(descriptors, configMap, ctx, dismissedSet);
  }, [configLoaded, user, descriptors, configMap, ctx, dismissedSet]);

  const value = useMemo(
    () => ({ activeSteps, dismissStep, ctx, configMap, setConfigMap }),
    [activeSteps, dismissStep, ctx, configMap],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
