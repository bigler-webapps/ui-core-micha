import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AuthContext } from '../auth/AuthContext';
import { getNotificationFeed, getUnreadCount, markNotifications, markAllNotificationsSeen } from './feedApi';
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
  return <NotificationsScope wsUrlBase={wsUrlBase}>{children}</NotificationsScope>;
}

function NotificationsScope({ children, wsUrlBase }) {
  const auth = useContext(AuthContext);
  const authenticated = Boolean(auth?.user);
  const accountKey = auth?.user ? `user:${auth.user.id}` : 'logged-out';
  const accountRef = useRef(accountKey);
  const generation = useRef(0);
  if (accountRef.current !== accountKey) {
    accountRef.current = accountKey;
    generation.current += 1;
  }
  const accountGeneration = generation.current;
  const isCurrent = () => alive.current && generation.current === accountGeneration;
  const bootstrapSeed = auth?.bootstrapNotificationSeed;
  const consumeBootstrapSeed = auth?.consumeBootstrapNotificationSeed;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef([]);
  const alive = useRef(true);
  const nextRef = useRef(null);
  const loadingRef = useRef(false);
  const liveVersion = useRef(0);
  const pageCount = useRef(1);
  const pageVersion = useRef(0);
  const pageEpoch = useRef(0);
  const [next, setNext] = useState(null);
  const [capable, setCapable] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [markError, setMarkError] = useState(false);
  const [marking, setMarking] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const setContinuation = (value) => { nextRef.current = value || null; setNext(value || null); };

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

    const version = liveVersion.current;
    const pagesVersion = pageVersion.current;
    const targetPages = pageCount.current;
    const [feed, unread] = await Promise.all([getNotificationFeed(), getUnreadCount()]);
    let continuation = feed.next;
    const rows = [...(feed.results || [])];
    for (let page = 1; page < targetPages && continuation; page += 1) {
      const result = await getNotificationFeed({ next: continuation });
      rows.push(...(result.results || []));
      continuation = result.next;
    }
    if (!isCurrent()) return;
    if (version !== liveVersion.current || pagesVersion !== pageVersion.current) return refresh();
    const nextNotifications = [];
    for (const row of rows.map(normalizeNotification)) {
      const index = nextNotifications.findIndex((item) => item.id === row.id || (row.notification_id != null && item.notification_id === row.notification_id));
      if (index < 0) nextNotifications.push(row);
    }
    const nextUnreadCount = unread.count || 0;
    replaceNotifications(nextNotifications);
    setContinuation(continuation);
    setCapable(feed.capabilities?.mark_all_seen === true);
    setFeedError(false);
    setUnreadCount(nextUnreadCount);
    return { notifications: nextNotifications, unreadCount: nextUnreadCount };
  }, [authenticated, accountGeneration, replaceNotifications]);

  // Seeded gates the socket connect, not just `authenticated`: the prior single-purpose
  // socket owner awaited the initial REST feed/unread-count fetch before opening the
  // WebSocket, so a live push could never race an empty/incomplete `notificationsRef`.
  // Preserved here rather than connecting immediately, since `refresh()`'s
  // `replaceNotifications(...)` is unconditional and would silently drop a message that
  // arrived and patched state before the initial REST response landed.
  const [seeded, setSeeded] = useState(false);

  const { subscribe, onReconnect } = useRealtimeCore({
    active: authenticated && seeded,
    wsUrl: getWebSocketUrl(wsUrlBase),
  });

  const handleRealtimeMessage = useCallback((data) => {
    if (!isCurrent()) return;
    liveVersion.current += 1;
    if (data.type === 'notification.inbox_changed') { refresh().catch(() => { if (isCurrent()) setFeedError(true); }); return; }
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
  }, [replaceNotifications, refresh, accountGeneration]);

  useEffect(() => {
    if (!authenticated) return undefined;
    return subscribe(DEFAULT_ENVELOPE, handleRealtimeMessage);
  }, [authenticated, subscribe, handleRealtimeMessage]);

  useEffect(() => {
    replaceNotifications([]);
    setUnreadCount(0);
    setContinuation(null);
    setCapable(false);
    setFeedError(false);
    setMarkError(false);
    setMarking(false);
    setLoadingMore(false);
    setSeeded(false);
    pageCount.current = 1;
    pageVersion.current += 1;
    pageEpoch.current += 1;
    loadingRef.current = false;
    if (!authenticated) {
      replaceNotifications([]);
      setUnreadCount(0);
      setSeeded(false);
      return undefined;
    }

    if (bootstrapSeed && bootstrapSeed.userId === auth?.user?.id) {
      const feed = bootstrapSeed.notifications?.feed;
      const unread = bootstrapSeed.notifications?.unread_count;
      const nextNotifications = (feed?.results || []).map(normalizeNotification);
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      setUnreadCount(unread?.count || 0);
      setContinuation(feed?.next);
      setCapable(feed?.capabilities?.mark_all_seen === true);
      setSeeded(true);
      consumeBootstrapSeed?.();
      return undefined;
    }

    let cancelled = false;
    refresh()
      .catch(() => {
        if (isCurrent()) setFeedError(true);
      })
      .finally(() => {
        if (!cancelled && isCurrent()) setSeeded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, accountGeneration, refresh, replaceNotifications, consumeBootstrapSeed]);

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
    setMarkError(false);
    return markNotifications({ action, ids: selectedIds }).catch(async (error) => {
      if (isCurrent()) {
        setMarkError(true);
        try { await refresh(); } catch {
          if (isCurrent()) {
            let restoredUnread = 0;
            const restored = notificationsRef.current.map((row) => {
              const original = current.find((item) => item.id === row.id && selected.has(item.id));
              if (!original) return row;
              const wasUnread = !row.seen && !row.dismissed;
              const isUnread = !original.seen && !original.dismissed;
              restoredUnread += Number(isUnread) - Number(wasUnread);
              return { ...row, seen: original.seen, seen_at: original.seen_at, dismissed: original.dismissed, dismissed_at: original.dismissed_at, done: original.done, done_at: original.done_at };
            });
            replaceNotifications(restored);
            setUnreadCount((count) => Math.max(0, count + restoredUnread));
          }
        }
      }
      throw error;
    });
  }, [replaceNotifications, refresh, accountGeneration]);

  const markSeen = useCallback((ids) => mark('seen', ids), [mark]);
  const markDismissed = useCallback((ids) => mark('dismissed', ids), [mark]);
  const markDone = useCallback((ids) => mark('done', ids), [mark]);

  const loadMore = useCallback(async () => {
    if (!nextRef.current || loadingRef.current) return;
    loadingRef.current = true; setLoadingMore(true); setFeedError(false);
    const epoch = pageEpoch.current;
    try {
      const page = await getNotificationFeed({ next: nextRef.current });
      if (!isCurrent() || epoch !== pageEpoch.current) return;
      const merged = [...notificationsRef.current];
      for (const row of (page.results || []).map(normalizeNotification)) {
        const index = merged.findIndex((item) => item.id === row.id || (row.notification_id != null && item.notification_id === row.notification_id));
        if (index < 0) merged.push(row);
        else merged[index] = { ...row, ...merged[index], id: row.id };
      }
      replaceNotifications(merged); pageCount.current += 1; pageVersion.current += 1; setContinuation(page.next);
    } catch { if (isCurrent() && epoch === pageEpoch.current) setFeedError(true); }
    finally { if (isCurrent() && epoch === pageEpoch.current) { loadingRef.current = false; setLoadingMore(false); } }
  }, [replaceNotifications, accountGeneration]);

  const markAllSeen = useCallback(async () => {
    if (!capable || marking) return;
    setMarking(true); setMarkError(false);
    try {
      await markAllNotificationsSeen();
      if (isCurrent()) {
        pageEpoch.current += 1;
        loadingRef.current = false;
        setLoadingMore(false);
        await refresh();
      }
    } catch { if (isCurrent()) { setMarkError(true); try { await refresh(); } catch { /* retain current state */ } } }
    finally { if (isCurrent()) setMarking(false); }
  }, [capable, marking, refresh, accountGeneration]);

  return (
    <RealtimeContext.Provider value={{ subscribe, onReconnect }}>
      <NotificationsContext.Provider value={{
        notifications,
        unreadCount,
        markSeen,
        markDismissed,
        markDone,
        refresh, loadMore, hasMore: Boolean(next), loadingMore, feedError, markError, marking, markAllSeen, canMarkAll: capable,
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
