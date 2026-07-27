import apiClient from '../auth/apiClient';

export async function getNotificationFeed({ status } = {}) {
  const response = await apiClient.get('/api/notifications/feed/', {
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
