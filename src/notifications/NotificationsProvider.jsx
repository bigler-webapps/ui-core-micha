import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AuthContext } from '../auth/AuthContext';
import { getNotificationFeed, getUnreadCount, markNotifications } from './feedApi';
import { DEFAULT_ENVELOPE, RealtimeContext, useRealtimeCore } from './realtime';

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

  // Seeded gates the socket connect, not just `authenticated`: the prior single-purpose
  // socket owner awaited the initial REST feed/unread-count fetch before opening the
  // WebSocket, so a live push could never race an empty/incomplete `notificationsRef`.
  // Preserved here rather than connecting immediately, since `refresh()`'s
  // `replaceNotifications(...)` is unconditional and would silently drop a message that
  // arrived and patched state before the initial REST response landed.
  const [seeded, setSeeded] = useState(false);

  const { subscribe } = useRealtimeCore({
    active: authenticated && seeded,
    wsUrl: getWebSocketUrl(wsUrlBase),
  });

  const handleRealtimeMessage = useCallback((data) => {
    if (data.type === 'notification.status') {
      let unreadDelta = 0;
      const nextNotifications = notificationsRef.current.map((notification) => {
        if (notification.notification_id !== data.notification_id) return notification;

        const wasUnread = !notification.seen && !notification.dismissed;
        const patched = patchStatus(notification, data.status || {});
        const isUnread = !patched.seen && !patched.dismissed;
        if (wasUnread !== isUnread) {
          unreadDelta += isUnread ? 1 : -1;
        }
        return patched;
      });
      replaceNotifications(nextNotifications);
      if (unreadDelta) {
        setUnreadCount((count) => Math.max(0, count + unreadDelta));
      }
      return;
    }

    const pushedNotification = normalizeNotificationPush(data);

    // NOTIF-12 D2: a notification routed to more than one channel (e.g. chip
    // + popup) arrives as multiple WS messages sharing one notification_id.
    // Fold repeats into the existing feed entry (last-write-wins on content)
    // instead of appending a duplicate and double-incrementing the badge.
    const existingIndex = pushedNotification.notification_id == null
      ? -1
      : notificationsRef.current.findIndex(
        (notification) => notification.notification_id === pushedNotification.notification_id,
      );

    if (existingIndex !== -1) {
      const nextNotifications = notificationsRef.current.map((notification, index) => (
        index === existingIndex
          ? { ...notification, notification_type: pushedNotification.notification_type, content: pushedNotification.content }
          : notification
      ));
      replaceNotifications(nextNotifications);
      return;
    }

    replaceNotifications([pushedNotification, ...notificationsRef.current]);
    setUnreadCount((count) => count + 1);
  }, [replaceNotifications]);

  useEffect(() => {
    if (!authenticated) return undefined;
    return subscribe(DEFAULT_ENVELOPE, handleRealtimeMessage);
  }, [authenticated, subscribe, handleRealtimeMessage]);

  useEffect(() => {
    if (!authenticated) {
      replaceNotifications([]);
      setUnreadCount(0);
      setSeeded(false);
      return undefined;
    }

    let cancelled = false;
    refresh()
      .catch(() => {
        // The live stream remains useful if the initial REST request is temporarily unavailable.
      })
      .finally(() => {
        if (!cancelled) setSeeded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, refresh, replaceNotifications]);

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
    <RealtimeContext.Provider value={{ subscribe }}>
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
    </RealtimeContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
