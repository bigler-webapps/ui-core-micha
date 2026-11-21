import apiClient from '../auth/apiClient';

export async function getNotificationFeed({ status, next } = {}) {
  let url = '/api/notifications/feed/';
  if (next) {
    const base = new URL(apiClient.defaults?.baseURL || window.location.origin, window.location.origin);
    const continuation = new URL(next, base);
    if (continuation.origin !== base.origin) throw new Error('Invalid notification continuation origin');
    url = continuation.href;
  }
  const response = await apiClient.get(url, {
    params: status ? { status } : undefined,
  });
  return response.data;
}

export async function getUnreadCount() {
  const response = await apiClient.get('/api/notifications/feed/unread-count/');
  return response.data;
}

export async function markNotifications({ action, ids }) {
  const response = await apiClient.post('/api/notifications/feed/mark/', { action, ids });
  return response.data;
}

export async function markAllNotificationsSeen() {
  const response = await apiClient.post('/api/notifications/feed/mark-all-seen/', {});
  return response.data;
}
