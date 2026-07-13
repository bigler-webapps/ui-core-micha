import apiClient from '../auth/apiClient';

const PREFERENCES_URL = '/api/notifications/preferences/';
const PUSH_SUBSCRIPTION_URL = `${PREFERENCES_URL}push-subscription/`;

export async function getNotificationPreferences() {
  const response = await apiClient.get(PREFERENCES_URL);
  return response.data;
}

export async function patchNotificationPreferences(patch) {
  const response = await apiClient.patch(PREFERENCES_URL, patch);
  return response.data;
}

export async function getVapidPublicKey() {
  const response = await apiClient.get(`${PREFERENCES_URL}vapid-public-key/`);
  return response.data?.vapidPublicKey;
}

export async function listPushSubscriptions() {
  const response = await apiClient.get(PUSH_SUBSCRIPTION_URL);
  return response.data;
}

export async function savePushSubscription(subscription, ua) {
  const response = await apiClient.post(PUSH_SUBSCRIPTION_URL, { subscription, ua });
  return response.data;
}

export async function removePushSubscription(subscriptionIdentifier) {
  const response = await apiClient.delete(PUSH_SUBSCRIPTION_URL, { data: subscriptionIdentifier });
  return response.data;
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const decoder = typeof window !== 'undefined' && typeof window.atob === 'function'
    ? window.atob
    : typeof atob === 'function'
      ? atob
      : null;

  if (!decoder) throw new Error('Base64 decoding is unavailable in this environment.');

  const raw = decoder(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
