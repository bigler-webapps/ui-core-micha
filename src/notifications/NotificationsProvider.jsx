import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AuthContext } from '../auth/AuthContext';
import { getNotificationFeed, getUnreadCount, markNotifications } from './feedApi';

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

const NotificationsContext = createContext(null);

function normalizeNotification(notification) {
  return {
    ...notification,
    content: notification.content || {},
    seen: Boolean(notification.seen ?? notification.seen_at),
    dismissed: Boolean(notification.dismissed ?? notification.dismissed_at),
    done: Boolean(notification.done ?? notification.done_at),
  };
}

function normalizeNotificationPush(data) {
  return normalizeNotification({
    id: data.id ?? data.recipient_id ?? data.notification_id,
    notification_id: data.notification_id,
    notification_type: data.type,
    content: data.content || {},
    created_at: data.created_at,
    seen_at: null,
    dismissed_at: null,
    done_at: null,
  });
}

function getWebSocketUrl(wsUrlBase) {
  if (wsUrlBase) {
    return new URL('/ws/notifications/', wsUrlBase).toString();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/notifications/`;
}

function patchStatus(notification, status) {
  const seen = Boolean(status.seen);
  const dismissed = Boolean(status.dismissed);
  const done = Boolean(status.done);

  return {
    ...notification,
    seen,
    dismissed,
    done,
    seen_at: seen ? notification.seen_at || true : null,
    dismissed_at: dismissed ? notification.dismissed_at || true : null,
    done_at: done ? notification.done_at || true : null,
  };
}

export function NotificationsProvider({ children, wsUrlBase }) {
  const auth = useContext(AuthContext);
  const authenticated = Boolean(auth?.user);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef([]);
  const socketRef = useRef(null);

  const replaceNotifications = useCallback((nextNotifications) => {
    notificationsRef.current = nextNotifications;
    setNotifications(nextNotifications);
  }, []);

  const refresh = useCallback(async () => {
    if (!authenticated) {
      replaceNotifications([]);
      setUnreadCount(0);
      return { notifications: [], unreadCount: 0 };
    }

    const [feed, unread] = await Promise.all([getNotificationFeed(), getUnreadCount()]);
    const nextNotifications = (feed.results || []).map(normalizeNotification);
    const nextUnreadCount = unread.count || 0;
    replaceNotifications(nextNotifications);
    setUnreadCount(nextUnreadCount);
    return { notifications: nextNotifications, unreadCount: nextUnreadCount };
  }, [authenticated, replaceNotifications]);

  useEffect(() => {
    if (!authenticated) {
      replaceNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    let active = true;
    let reconnectTimer = null;
    let backoffMs = INITIAL_BACKOFF_MS;

    const patchNotifications = (updater) => {
      const nextNotifications = updater(notificationsRef.current);
      replaceNotifications(nextNotifications);
    };

    const handleMessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === 'notification.status') {
        let unreadDelta = 0;
        patchNotifications((current) => current.map((notification) => {
          if (notification.notification_id !== data.notification_id) return notification;

          const wasUnread = !notification.seen && !notification.dismissed;
          const patched = patchStatus(notification, data.status || {});
          const isUnread = !patched.seen && !patched.dismissed;
          if (wasUnread !== isUnread) {
            unreadDelta += isUnread ? 1 : -1;
          }
          return patched;
        }));
        if (unreadDelta) {
          setUnreadCount((count) => Math.max(0, count + unreadDelta));
        }
        return;
      }

      const pushedNotification = normalizeNotificationPush(data);
      patchNotifications((current) => [pushedNotification, ...current]);
      setUnreadCount((count) => count + 1);
    };

    const connect = () => {
      if (!active || socketRef.current) return;

      const socket = new WebSocket(getWebSocketUrl(wsUrlBase));
      socketRef.current = socket;

      socket.onopen = () => {
        backoffMs = INITIAL_BACKOFF_MS;
      };
      socket.onmessage = handleMessage;
      socket.onerror = () => {
        socket.close();
      };
      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (!active || reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, backoffMs);
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
      };
    };

    const seedAndConnect = async () => {
      try {
        await refresh();
      } catch {
        // The live stream remains useful if the initial REST request is temporarily unavailable.
      }
      if (active) connect();
    };

    seedAndConnect();

    return () => {
      active = false;
      clearTimeout(reconnectTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) socket.close();
    };
  }, [authenticated, refresh, replaceNotifications, wsUrlBase]);

  const mark = useCallback((action, ids) => {
    const selectedIds = Array.isArray(ids) ? ids : [];
    const selected = new Set(selectedIds);
    const current = notificationsRef.current;
    let unreadDelta = 0;
    const nextNotifications = current.map((notification) => {
      if (!selected.has(notification.id)) return notification;

      const wasUnread = !notification.seen && !notification.dismissed;
      if ((action === 'seen' || action === 'dismissed') && wasUnread) {
        unreadDelta += 1;
      }

      return patchStatus(notification, {
        seen: action === 'seen' ? true : notification.seen,
        dismissed: action === 'dismissed' ? true : notification.dismissed,
        done: action === 'done' ? true : notification.done,
      });
    });

    replaceNotifications(nextNotifications);
    if (unreadDelta) {
      setUnreadCount((count) => Math.max(0, count - unreadDelta));
    }
    return markNotifications({ action, ids: selectedIds });
  }, [replaceNotifications]);

  const markSeen = useCallback((ids) => mark('seen', ids), [mark]);
  const markDismissed = useCallback((ids) => mark('dismissed', ids), [mark]);
  const markDone = useCallback((ids) => mark('done', ids), [mark]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      markSeen,
      markDismissed,
      markDone,
      refresh,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
