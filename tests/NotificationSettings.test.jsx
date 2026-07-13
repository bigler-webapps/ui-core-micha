// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const notificationsApi = vi.hoisted(() => ({
  getNotificationPreferences: vi.fn(),
  getVapidPublicKey: vi.fn(),
  patchNotificationPreferences: vi.fn(),
  removePushSubscription: vi.fn(),
  savePushSubscription: vi.fn(),
  urlBase64ToUint8Array: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

vi.mock('../src/notifications/api', () => notificationsApi);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

import { NotificationSettings } from '../src/notifications/NotificationSettings';

function installPushEnvironment(subscription) {
  const registration = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(subscription),
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

describe('NotificationSettings push toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: false, push_opt_in: false });
    notificationsApi.patchNotificationPreferences.mockResolvedValue({ email_opt_in: false, push_opt_in: true });
    notificationsApi.getVapidPublicKey.mockResolvedValue('AQID');
  });

  it('enables push on this device and opts in after saving the subscription', async () => {
    const registration = installPushEnvironment(null);
    const subscription = {
      toJSON: vi.fn(() => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/example' })),
    };
    registration.pushManager.subscribe.mockResolvedValue(subscription);
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });

    render(<NotificationSettings />);
    fireEvent.click(await screen.findByRole('button', { name: 'NotificationSettings.PUSH_ENABLE' }));

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
  });

  it('unsubscribes and removes only this device without changing push_opt_in', async () => {
    const subscription = {
      endpoint: 'https://updates.push.services.mozilla.com/example',
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    installPushEnvironment(subscription);

    render(<NotificationSettings />);
    fireEvent.click(await screen.findByRole('button', { name: 'NotificationSettings.PUSH_DISABLE' }));

    await waitFor(() => expect(subscription.unsubscribe).toHaveBeenCalledOnce());
    expect(notificationsApi.removePushSubscription).toHaveBeenCalledWith({ endpoint: subscription.endpoint });
    expect(notificationsApi.patchNotificationPreferences).not.toHaveBeenCalled();
  });
});
