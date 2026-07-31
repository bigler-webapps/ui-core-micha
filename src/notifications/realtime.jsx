import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

// Envelope discriminator for the notifications domain. A message with no
// `envelope` field (pre-NOTIF-13 dcm) is treated as this default so an
// un-bumped backend keeps working unchanged (backward-compat).
export const DEFAULT_ENVELOPE = 'notification';

const RealtimeContext = createContext(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a NotificationsProvider');
  }
  return context;
}

export { RealtimeContext };

/**
 * Owns the single WebSocket connection and an envelope-keyed subscriber
 * registry. Internal — consumed only by NotificationsProvider, which
 * re-exposes `subscribe` via RealtimeContext so useRealtime() works without
 * a separate provider apps have to mount.
 *
 * Backoff, reconnect, and cleanup semantics are unchanged from the prior
 * single-purpose socket owner. `active`/`wsUrl` are primitives, so the
 * effect does not re-run (and does not reconnect) on unrelated re-renders.
 */
export function useRealtimeCore({ active, wsUrl }) {
  const socketRef = useRef(null);
  const subscribersRef = useRef(new Map());
  const reconnectSubscribersRef = useRef(new Set());

  const subscribe = useCallback((envelope, handler) => {
    const subscribers = subscribersRef.current;
    if (!subscribers.has(envelope)) {
      subscribers.set(envelope, new Set());
    }
    subscribers.get(envelope).add(handler);
    return () => {
      const handlers = subscribers.get(envelope);
      if (!handlers) return;
      handlers.delete(handler);
      if (handlers.size === 0) {
        subscribers.delete(envelope);
      }
    };
  }, []);

  // Additive lifecycle signal for domains whose REST projections must be
  // refreshed after the one shared transport reconnects. It deliberately does
  // not alter the socket/backoff ownership or the envelope subscriber API.
  const onReconnect = useCallback((handler) => {
    reconnectSubscribersRef.current.add(handler);
    return () => reconnectSubscribersRef.current.delete(handler);
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    let isActive = true;
    let reconnectTimer = null;
    let backoffMs = INITIAL_BACKOFF_MS;
    let hasConnected = false;

    const handleMessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const envelope = data.envelope ?? DEFAULT_ENVELOPE;
      const handlers = subscribersRef.current.get(envelope);
      if (!handlers || handlers.size === 0) return;
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('Realtime subscriber error', error);
        }
      });
    };

    const connect = () => {
      if (!isActive || socketRef.current) return;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        backoffMs = INITIAL_BACKOFF_MS;
        if (hasConnected) {
          reconnectSubscribersRef.current.forEach((handler) => {
            try {
              handler();
            } catch (error) {
              console.error('Realtime reconnect subscriber error', error);
            }
          });
        }
        hasConnected = true;
      };
      socket.onmessage = handleMessage;
      socket.onerror = () => {
        socket.close();
      };
      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (!isActive || reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, backoffMs);
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
      };
    };

    connect();

    return () => {
      isActive = false;
      clearTimeout(reconnectTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) socket.close();
    };
  }, [active, wsUrl]);

  return { subscribe, onReconnect };
}
