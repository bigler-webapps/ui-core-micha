import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

import { getUnreadCount, listConversations, listMessages } from './api';
import { useRealtime } from '../notifications/realtime';

const MessagingContext = createContext(null);
export const MESSAGING_ENVELOPE = 'messaging';
const EMPTY_CACHE = { conversations: {}, messages: {}, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } };
const DEFAULT_API = { listConversations, listMessages, getUnreadCount };

function idOf(item) { return item?.id ?? item?.conversation_id ?? item?.message_id ?? item?.poll_id; }
function mergeById(slice, item) { const id = idOf(item); return id == null ? slice : { ...slice, [id]: { ...slice[id], ...item } }; }
function resultsOf(response) { return response?.results || []; }

export function messagingReducer(state, action) {
  switch (action.type) {
    case 'conversationsLoaded': {
      const conversations = action.results.reduce((next, item) => mergeById(next, item), state.conversations);
      return { ...state, conversations, cursors: { ...state.cursors, conversations: action.nextCursor ?? null } };
    }
    case 'unreadLoaded': return { ...state, unread: action.unread || EMPTY_CACHE.unread };
    case 'messagesLoaded': {
      const messages = action.results.reduce((next, item) => mergeById(next, item), state.messages);
      return { ...state, messages, cursors: { ...state.cursors, messages: { ...state.cursors.messages, [action.conversationId]: action.nextCursor ?? null } } };
    }
    case 'frame': return applyFrame(state, action.frame);
    default: return state;
  }
}

export function applyFrame(state, frame) {
  const payload = frame.message || frame.conversation || frame.participant || frame;
  const conversationId = frame.conversation_id ?? payload.conversation_id;
  if (frame.type === 'message') {
    const message = { ...payload, conversation_id: conversationId };
    return { ...state, messages: mergeById(state.messages, message) };
  }
  if (frame.type === 'message_edited') return { ...state, messages: mergeById(state.messages, payload) };
  if (frame.type === 'message_deleted') {
    const previous = state.messages[frame.message_id] || {};
    return { ...state, messages: { ...state.messages, [frame.message_id]: { ...previous, id: frame.message_id, deleted_at: frame.deleted_at, deleted_by: frame.deleted_by, body: null, title: null, link_target: null } } };
  }
  if (frame.type === 'conversation_upsert') return { ...state, conversations: mergeById(state.conversations, payload) };
  // conversation_archived/participant_changed: the design doc names these frame
  // types but doesn't pin their exact payload shape. Treating them as merging
  // onto the conversation record (participant-local fields folded flat, an
  // `archived` flag set) is this chunk's best-effort reading, not a confirmed
  // contract — re-verify against dcm's actual WS payload once available, per
  // the WO's "shape fixtures from the design doc, not from imagination" caution.
  if (frame.type === 'conversation_archived') return { ...state, conversations: mergeById(state.conversations, { ...payload, id: conversationId, archived: true }) };
  if (frame.type === 'participant_changed') return { ...state, conversations: mergeById(state.conversations, { ...payload, id: conversationId }) };
  return state;
}

export function MessagingProvider({ children, filters = {}, activeConversationId = null, api = DEFAULT_API, active = true }) {
  const { subscribe, onReconnect } = useRealtime();
  const [cache, dispatch] = useReducer(messagingReducer, EMPTY_CACHE);
  const activeIdRef = useRef(activeConversationId);
  const seenEventsRef = useRef(new Set());
  const filtersRef = useRef(filters);
  activeIdRef.current = activeConversationId;
  filtersRef.current = filters;

  const refreshConversations = useCallback(async () => {
    const response = await api.listConversations(filtersRef.current);
    dispatch({ type: 'conversationsLoaded', results: resultsOf(response), nextCursor: response?.next_cursor });
    return response;
  }, [api]);
  const refreshUnread = useCallback(async () => {
    const unread = await api.getUnreadCount();
    dispatch({ type: 'unreadLoaded', unread });
    return unread;
  }, [api]);
  const refreshThread = useCallback(async (conversationId = activeIdRef.current) => {
    if (conversationId == null) return null;
    const response = await api.listMessages(conversationId);
    dispatch({ type: 'messagesLoaded', conversationId, results: resultsOf(response), nextCursor: response?.next_cursor });
    return response;
  }, [api]);
  const refresh = useCallback(async () => Promise.all([refreshConversations(), refreshUnread(), refreshThread()]), [refreshConversations, refreshThread, refreshUnread]);

  // `/api/messaging/` is authenticated-only (design §REST). Host apps mount
  // MessagingProvider inside NotificationsProvider, which itself renders its
  // children regardless of auth state — so without this gate a provider
  // mounted before login completes fires three REST calls that spuriously
  // 401. Defaults to true (matches chunk 1's existing tests/harness usage,
  // which don't pass it); a host app gates it with `active={authenticated}`.
  useEffect(() => { if (active) refresh().catch(() => {}); }, [active, refresh]);
  useEffect(() => subscribe(MESSAGING_ENVELOPE, (frame) => {
    if (frame.event_id && seenEventsRef.current.has(frame.event_id)) return;
    if (frame.event_id) {
      seenEventsRef.current.add(frame.event_id);
      if (seenEventsRef.current.size > 500) seenEventsRef.current.delete(seenEventsRef.current.values().next().value);
    }
    dispatch({ type: 'frame', frame });
  }), [subscribe]);
  useEffect(() => {
    if (!active || !onReconnect) return undefined;
    return onReconnect(() => { refresh().catch(() => {}); });
  }, [active, onReconnect, refresh]);

  const value = useMemo(() => ({ cache, refresh, refreshConversations, refreshUnread, refreshThread, activeConversationId }), [cache, refresh, refreshConversations, refreshUnread, refreshThread, activeConversationId]);
  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) throw new Error('useMessaging must be used within a MessagingProvider');
  return context;
}
