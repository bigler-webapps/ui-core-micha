// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const notificationsApi = vi.hoisted(() => ({
  getVapidPublicKey: vi.fn(),
  patchNotificationPreferences: vi.fn(),
  savePushSubscription: vi.fn(),
  urlBase64ToUint8Array: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

vi.mock('../src/notifications/api', () => notificationsApi);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

import { BrowserPushStep } from '../src/onboarding/steps/BrowserPushStep';

function renderStep(ctx, props = {}) {
  return render(
    <BrowserPushStep
      ctx={ctx}
      onComplete={vi.fn()}
      onDismiss={vi.fn()}
      {...props}
    />,
  );
}

function installPushEnvironment(subscription) {
  const registration = {
    pushManager: {
      subscribe: vi.fn(),
    },
  };
  vi.stubGlobal('navigator', {
    serviceWorker: { ready: Promise.resolve(registration) },
    userAgent: 'Unit Test Browser',
  });
  Object.defineProperty(window, 'PushManager', { value: class PushManager {}, configurable: true });
  return registration;
}

describe('BrowserPushStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.patchNotificationPreferences.mockResolvedValue({});
    notificationsApi.getVapidPublicKey.mockResolvedValue('AQID');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    [false, true],
    [true, false],
  ])('saves the selected email notification preference', async (emailOptedIn, expectedEmailOptIn) => {
    renderStep({ emailOptedIn, pushState: { supported: false, subscribed: false } });

    fireEvent.click(screen.getByRole('switch', { name: /Onboarding.EMAIL_NOTIFICATIONS_LABEL/ }));

    await waitFor(() => expect(notificationsApi.patchNotificationPreferences).toHaveBeenCalledWith({ email_opt_in: expectedEmailOptIn }));
  });

  it('reverts the email toggle when saving the preference fails', async () => {
    notificationsApi.patchNotificationPreferences.mockRejectedValue(new Error('unavailable'));
    renderStep({ emailOptedIn: false, pushState: { supported: false, subscribed: false } });

    const toggle = screen.getByRole('switch', { name: /Onboarding.EMAIL_NOTIFICATIONS_LABEL/ });
    fireEvent.click(toggle);

    await waitFor(() => expect(toggle.checked).toBe(false));
    expect(screen.getByRole('alert').textContent).toBe('NotificationSettings.SAVE_ERROR');
  });

  it('subscribes to push and opts in after saving the subscription', async () => {
    const registration = installPushEnvironment();
    const subscription = {
      toJSON: vi.fn(() => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/example' })),
    };
    const onComplete = vi.fn();
    registration.pushManager.subscribe.mockResolvedValue(subscription);
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });

    renderStep({ emailOptedIn: false, pushState: { supported: true, subscribed: false } }, { onComplete });
    fireEvent.click(screen.getByRole('button', { name: 'NotificationSettings.PUSH_ENABLE' }));

    await waitFor(() => expect(notificationsApi.patchNotificationPreferences).toHaveBeenCalledWith({ push_opt_in: true }));
    expect(Notification.requestPermission).toHaveBeenCalledOnce();
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(notificationsApi.savePushSubscription).toHaveBeenCalledWith(
      { endpoint: 'https://fcm.googleapis.com/fcm/send/example' },
      'Unit Test Browser',
    );
    expect(notificationsApi.savePushSubscription.mock.invocationCallOrder[0])
      .toBeLessThan(notificationsApi.patchNotificationPreferences.mock.invocationCallOrder[0]);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('shows an enabled state instead of a redundant push enable action', () => {
    renderStep({ emailOptedIn: false, pushState: { supported: true, subscribed: true } });

    expect(screen.getByText('Onboarding.PUSH_ENABLED')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'NotificationSettings.PUSH_ENABLE' })).toBeNull();
  });
});
