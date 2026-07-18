// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const onboardingApi = vi.hoisted(() => ({
  getOnboardingStepConfig: vi.fn(),
}));
const notificationsApi = vi.hoisted(() => ({
  getNotificationPreferences: vi.fn(),
}));

vi.mock('../src/onboarding/api', () => onboardingApi);
vi.mock('../src/notifications/api', () => notificationsApi);

import { AuthContext } from '../src/auth/AuthContext';
import { OnboardingProvider, useOnboarding } from '../src/onboarding/OnboardingProvider';

function Probe() {
  const onboarding = useOnboarding();
  return <span data-testid="email-opted-in">{String(onboarding?.ctx.emailOptedIn)}</span>;
}

function ActiveStepsProbe() {
  const onboarding = useOnboarding();
  return (
    <>
      <span data-testid="active-steps">{onboarding?.activeSteps.map((step) => step.id).join(',')}</span>
      <span data-testid="push-subscribed">{String(onboarding?.ctx.pushState?.subscribed)}</span>
    </>
  );
}

function MarkStepSeenProbe() {
  const onboarding = useOnboarding();
  return (
    <>
      <ActiveStepsProbe />
      <button type="button" onClick={() => onboarding.markStepSeen('browser_push')}>Mark browser push seen</button>
    </>
  );
}

function renderProvider({ browserPush, extraContext, extraSteps, pwaInstallEnabled, children = <Probe /> } = {}) {
  return render(
    <AuthContext.Provider value={{
      user: {
        id: 1,
        accepted_privacy_statement: true,
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
    }}>
      <OnboardingProvider
        extraContext={extraContext}
        extraSteps={extraSteps}
        pwaInstallEnabled={pwaInstallEnabled}
        browserPush={browserPush}
      >
        {children}
      </OnboardingProvider>
    </AuthContext.Provider>,
  );
}

describe('OnboardingProvider notification preferences', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    onboardingApi.getOnboardingStepConfig.mockResolvedValue([]);
  });

  it('populates emailOptedIn from notification preferences', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: true });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('email-opted-in').textContent).toBe('true'));
    expect(notificationsApi.getNotificationPreferences).toHaveBeenCalledOnce();
  });

  it('defaults emailOptedIn to false when notification preferences cannot be loaded', async () => {
    notificationsApi.getNotificationPreferences.mockRejectedValue(new Error('unavailable'));

    renderProvider();

    await waitFor(() => expect(notificationsApi.getNotificationPreferences).toHaveBeenCalledOnce());
    expect(screen.getByTestId('email-opted-in').textContent).toBe('false');
  });
});

describe('OnboardingProvider extra context', () => {
  const unreadMessagesCondition = vi.fn((ctx) => (ctx.unreadCount || 0) > 0);
  const unreadMessagesStep = {
    id: 'unread_messages',
    condition: unreadMessagesCondition,
    persistDismissed: false,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    onboardingApi.getOnboardingStepConfig.mockResolvedValue([]);
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: true });
  });

  it('shows an app step when its extra context condition is met', async () => {
    renderProvider({
      extraContext: { unreadCount: 2 },
      extraSteps: [unreadMessagesStep],
      children: <ActiveStepsProbe />,
    });

    await waitFor(() => expect(screen.getByTestId('active-steps').textContent).toContain('unread_messages'));
  });

  it.each([
    ['zero', { unreadCount: 0 }],
    ['omitted', undefined],
  ])('does not show an app step when unreadCount is %s', async (_label, extraContext) => {
    renderProvider({
      extraContext,
      extraSteps: [unreadMessagesStep],
      children: <ActiveStepsProbe />,
    });

    await waitFor(() => expect(unreadMessagesCondition).toHaveBeenCalled());
    expect(screen.getByTestId('active-steps').textContent).not.toContain('unread_messages');
  });
});

describe('OnboardingProvider pwa_install capture', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    onboardingApi.getOnboardingStepConfig.mockResolvedValue([]);
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: true });
  });

  function dispatchBeforeInstallPrompt() {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = vi.fn();
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
    return event;
  }

  it('does not show pwa_install without the app opt-in prop, and does not suppress the browser default install UI', async () => {
    renderProvider({ pwaInstallEnabled: false, children: <ActiveStepsProbe /> });
    await waitFor(() => expect(onboardingApi.getOnboardingStepConfig).toHaveBeenCalled());

    const event = dispatchBeforeInstallPrompt();

    await waitFor(() => expect(screen.getByTestId('active-steps').textContent).not.toContain('pwa_install'));
    // Regression guard: a non-opted-in app must keep the browser's own
    // native install UI, since it has no replacement to show instead.
    expect(event.defaultPrevented).toBe(false);
  });

  it('shows pwa_install once opted in and a beforeinstallprompt event is captured', async () => {
    renderProvider({ pwaInstallEnabled: true, children: <ActiveStepsProbe /> });
    await waitFor(() => expect(onboardingApi.getOnboardingStepConfig).toHaveBeenCalled());

    const event = dispatchBeforeInstallPrompt();

    await waitFor(() => expect(screen.getByTestId('active-steps').textContent).toContain('pwa_install'));
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not show pwa_install when opted in but no prompt was ever captured (non-iOS)', async () => {
    renderProvider({ pwaInstallEnabled: true, children: <ActiveStepsProbe /> });
    await waitFor(() => expect(onboardingApi.getOnboardingStepConfig).toHaveBeenCalled());

    expect(screen.getByTestId('active-steps').textContent).not.toContain('pwa_install');
  });
});

describe('OnboardingProvider browser_push configuration', () => {
  const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  const pushManagerDescriptor = Object.getOwnPropertyDescriptor(window, 'PushManager');
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const localStorageItems = new Map();

  function installLocalStorage() {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => localStorageItems.get(key) || null,
        setItem: (key, value) => localStorageItems.set(key, String(value)),
        clear: () => localStorageItems.clear(),
      },
    });
  }

  function installPushState(subscribed) {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: { getSubscription: () => Promise.resolve(subscribed ? {} : null) },
        }),
      },
    });
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: window.PushManager || function PushManager() {},
    });
  }

  function restorePushSupport() {
    if (serviceWorkerDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', serviceWorkerDescriptor);
    } else {
      delete navigator.serviceWorker;
    }
    if (pushManagerDescriptor) {
      Object.defineProperty(window, 'PushManager', pushManagerDescriptor);
    } else {
      delete window.PushManager;
    }
  }

  function restoreLocalStorage() {
    if (localStorageDescriptor) {
      Object.defineProperty(window, 'localStorage', localStorageDescriptor);
    } else {
      delete window.localStorage;
    }
  }

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    installLocalStorage();
    window.localStorage.clear();
    onboardingApi.getOnboardingStepConfig.mockResolvedValue([]);
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: false });
    installPushState(true);
  });

  afterEach(() => {
    restorePushSupport();
    restoreLocalStorage();
  });

  it('uses any-channel by default and all-channels when explicitly configured', async () => {
    const defaultRender = renderProvider({ children: <ActiveStepsProbe /> });

    await waitFor(() => expect(screen.getByTestId('push-subscribed').textContent).toBe('true'));
    expect(screen.getByTestId('active-steps').textContent).not.toContain('browser_push');

    defaultRender.unmount();
    renderProvider({
      browserPush: { nagUntil: 'all-channels' },
      children: <ActiveStepsProbe />,
    });

    await waitFor(() => expect(screen.getByTestId('push-subscribed').textContent).toBe('true'));
    expect(screen.getByTestId('active-steps').textContent).toContain('browser_push');
  });

  it('never shows browser_push when nagUntil is off', async () => {
    renderProvider({ browserPush: { nagUntil: 'off' }, children: <ActiveStepsProbe /> });

    await waitFor(() => expect(screen.getByTestId('push-subscribed').textContent).toBe('true'));
    expect(screen.getByTestId('active-steps').textContent).not.toContain('browser_push');
  });

  it('persists showOnce for the next provider session without hiding the current session step', async () => {
    installPushState(false);
    const firstRender = renderProvider({
      browserPush: { showOnce: true },
      children: <MarkStepSeenProbe />,
    });

    await waitFor(() => expect(screen.getByTestId('push-subscribed').textContent).toBe('false'));
    await waitFor(() => expect(screen.getByTestId('active-steps').textContent).toContain('browser_push'));

    fireEvent.click(screen.getByRole('button', { name: 'Mark browser push seen' }));

    expect(screen.getByTestId('active-steps').textContent).toContain('browser_push');
    expect(JSON.parse(window.localStorage.getItem('onboarding_seen'))).toContain('browser_push');

    firstRender.unmount();
    renderProvider({
      browserPush: { showOnce: true },
      extraSteps: [{ id: 'provider_loaded', condition: () => true, persistDismissed: false }],
      children: <ActiveStepsProbe />,
    });

    await waitFor(() => expect(screen.getByTestId('active-steps').textContent).toContain('provider_loaded'));
    expect(screen.getByTestId('active-steps').textContent).not.toContain('browser_push');
  });
});
