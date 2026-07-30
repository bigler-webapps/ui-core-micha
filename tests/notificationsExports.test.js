import { describe, expect, it } from 'vitest';

import {
  NotificationSettings,
  PopupSurface,
  getNotificationPreferences,
  getVapidPublicKey,
  listPushSubscriptions,
  notificationsTranslations,
  patchNotificationPreferences,
  removePushSubscription,
  savePushSubscription,
  urlBase64ToUint8Array,
} from '../src/index';

describe('notification barrel exports', () => {
  it('preserves legacy notification exports and translations', () => {
    [
      NotificationSettings,
      getNotificationPreferences,
      patchNotificationPreferences,
      getVapidPublicKey,
      listPushSubscriptions,
      savePushSubscription,
      removePushSubscription,
      urlBase64ToUint8Array,
      notificationsTranslations,
    ].forEach((value) => expect(value).toBeDefined());
  });

  it('additively exports the NOTIF-12 popup surface', () => {
    expect(PopupSurface).toBeDefined();
  });
});
