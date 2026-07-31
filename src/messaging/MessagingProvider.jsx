import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

import { AuthContext } from '../auth/AuthContext';
import {
  archiveConversation,
  createBroadcastConversation,
  createGroupConversation,
  getReadStatus,
  getUnreadCount,
  listConversations,
  listMessages,
  listThread,
  patchConversationPreferences,
  createMessage,
  uploadAttachments,
  getAttachment,
  getAttachmentThumbnail,
} from './api';
import { useRealtime } from '../notifications/realtime';

const MessagingContext = createContext(null);
export const MESSAGING_ENVELOPE = 'messaging';
const EMPTY_CACHE = { conversations: {}, messages: {}, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } };
const DEFAULT_API = {
  listConversations, listMessages, listThread, getReadStatus, getUnreadCount, archiveConversation,
  patchConversationPreferences, createGroupConversation, createBroadcastConversation,
  createMessage, uploadAttachments, getAttachment, getAttachmentThumbnail,
};

function idOf(item) { return item?.id ?? item?.conversation_id ?? item?.message_id ?? item?.poll_id; }
function mergeById(slice, item) { const id = idOf(item); return id == null ? slice : { ...slice, [id]: { ...slice[id], ...item } }; }
function resultsOf(response) { return response?.results || []; }
function clientRequestIdOf(message) { return message?.client_request_id; }

/**
 * dcm's DRF validation errors aren't always {detail}: ConversationAttachmentView
 * translates a rejected upload into a field-keyed {"files": [...]} body (the
 * MSG-2 chunk-4 fix — see django-core-micha messaging/views.py), while other
 * endpoints use {detail}. Check every shape a caller might actually receive
 * before falling back to the generic axios error message.
 */
export function extractApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.message === 'string') return data.message;
  if (Array.isArray(data?.files)) return data.files.join(' ');
  if (data && typeof data === 'object') {
    const firstArray = Object.values(data).find((value) => Array.isArray(value) && value.length);
    if (firstArray) return firstArray.join(' ');
  }
  return error?.message;
}

function reconcileMessage(messages, message) {
  const requestId = clientRequestIdOf(message);
  const matchingEntry = requestId && Object.entries(messages).find(([, item]) => clientRequestIdOf(item) === requestId);
  if (!matchingEntry) return mergeById(messages, message);
  const [previousKey, previous] = matchingEntry;
  const next = { ...messages };
  delete next[previousKey];
  const id = idOf(message) ?? previousKey;
  next[id] = { ...previous, ...message, id: idOf(message) ?? previous.id, status: message.status || 'sent', error: null };
  return next;
}

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
    case 'threadLoaded': {
      const messages = action.results.reduce((next, item) => mergeById(next, item), state.messages);
      return { ...state, messages, cursors: { ...state.cursors, threads: { ...state.cursors.threads, [action.rootId]: action.nextCursor ?? null } } };
    }
    case 'conversationUpsert': return { ...state, conversations: mergeById(state.conversations, action.conversation) };
    case 'messageOptimistic': return { ...state, messages: mergeById(state.messages, action.message) };
    case 'messageReconciled': return { ...state, messages: reconcileMessage(state.messages, action.message) };
    case 'messageFailed': {
      const matching = Object.entries(state.messages).find(([, item]) => clientRequestIdOf(item) === action.clientRequestId);
      if (!matching) return state;
      const [key, message] = matching;
      return { ...state, messages: { ...state.messages, [key]: { ...message, status: 'error', error: action.error } } };
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
    return { ...state, messages: reconcileMessage(state.messages, message) };
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
  const { user } = useContext(AuthContext) || {};
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
  const refreshThread = useCallback(async (conversationId = activeIdRef.current, { cursor } = {}) => {
    if (conversationId == null) return null;
    const response = await api.listMessages(conversationId, ...(cursor ? [{ cursor }] : []));
    dispatch({ type: 'messagesLoaded', conversationId, results: resultsOf(response), nextCursor: response?.next_cursor });
    return response;
  }, [api]);
  const loadMoreMessages = useCallback((conversationId = activeIdRef.current) => {
    const cursor = cache.cursors.messages[conversationId];
    return cursor ? refreshThread(conversationId, { cursor }) : Promise.resolve(null);
  }, [cache.cursors.messages, refreshThread]);
  const loadThreadReplies = useCallback(async (rootId, { cursor } = {}) => {
    const response = await api.listThread(rootId, { cursor });
    dispatch({ type: 'threadLoaded', rootId, results: resultsOf(response), nextCursor: response?.next_cursor });
    return response;
  }, [api]);
  const getMessageReadStatus = useCallback((messageId) => api.getReadStatus(messageId), [api]);
  const loadMoreConversations = useCallback(async () => {
    const cursor = cache.cursors.conversations;
    if (!cursor) return null;
    const response = await api.listConversations({ ...filtersRef.current, cursor });
    dispatch({ type: 'conversationsLoaded', results: resultsOf(response), nextCursor: response?.next_cursor });
    return response;
  }, [api, cache.cursors.conversations]);
  const updateConversation = useCallback((conversation) => {
    dispatch({ type: 'conversationUpsert', conversation });
    return conversation;
  }, []);
  const setConversationArchived = useCallback(async (conversationId, archived) => {
    const conversation = await api.archiveConversation(conversationId, archived);
    return updateConversation({ ...conversation, id: conversation?.id ?? conversationId, archived: Boolean(archived) });
  }, [api, updateConversation]);
  const setConversationPreferences = useCallback(async (conversationId, patch) => {
    const conversation = await api.patchConversationPreferences(conversationId, patch);
    return updateConversation({ ...conversation, id: conversation?.id ?? conversationId, ...patch });
  }, [api, updateConversation]);
  const openGroupConversation = useCallback(async (payload) => {
    const conversation = await api.createGroupConversation(payload);
    return updateConversation(conversation);
  }, [api, updateConversation]);
  const openBroadcastConversation = useCallback(async (payload) => {
    const conversation = await api.createBroadcastConversation(payload);
    return updateConversation(conversation);
  }, [api, updateConversation]);
  const sendMessage = useCallback(async (conversationId, payload, { clientRequestId, retry = false } = {}) => {
    const requestId = clientRequestId || payload.client_request_id;
    const optimistic = {
      id: `local-${requestId}`,
      conversation_id: conversationId,
      kind: payload.kind || 'chat',
      body: payload.body || '',
      reply_to: payload.reply_to || null,
      client_request_id: requestId,
      created_at: new Date().toISOString(),
      status: 'pending',
      sender: user ? { id: user.id, display_name: user.display_name || user.username } : undefined,
      ...(retry ? {} : {}),
    };
    if (!retry) dispatch({ type: 'messageOptimistic', message: optimistic });
    else dispatch({ type: 'messageReconciled', message: { ...optimistic, status: 'pending', error: null } });
    try {
      const message = await api.createMessage(conversationId, { ...payload, client_request_id: requestId }, { idempotencyKey: requestId });
      dispatch({ type: 'messageReconciled', message: { ...message, conversation_id: message?.conversation_id ?? conversationId, client_request_id: message?.client_request_id ?? requestId } });
      return message;
    } catch (error) {
      dispatch({ type: 'messageFailed', clientRequestId: requestId, error: extractApiErrorMessage(error) });
      throw error;
    }
  }, [api, user]);
  const sendAttachments = useCallback(async (conversationId, formData, { clientRequestId, optimisticMessage, retry = false } = {}) => {
    const optimistic = {
      id: `local-${clientRequestId}`, conversation_id: conversationId, kind: 'chat', body: optimisticMessage?.body || '',
      reply_to: optimisticMessage?.reply_to || null, client_request_id: clientRequestId, created_at: new Date().toISOString(), status: 'pending',
      sender: user ? { id: user.id, display_name: user.display_name || user.username } : undefined,
      attachments: optimisticMessage?.attachments || [],
    };
    if (!retry) dispatch({ type: 'messageOptimistic', message: optimistic });
    else dispatch({ type: 'messageReconciled', message: { ...optimistic, status: 'pending', error: null } });
    try {
      const message = await api.uploadAttachments(conversationId, formData, { idempotencyKey: clientRequestId });
      dispatch({ type: 'messageReconciled', message: { ...message, conversation_id: message?.conversation_id ?? conversationId, client_request_id: message?.client_request_id ?? clientRequestId } });
      return message;
    } catch (error) {
      dispatch({ type: 'messageFailed', clientRequestId, error: extractApiErrorMessage(error) });
      throw error;
    }
  }, [api, user]);
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

  const value = useMemo(() => ({
    cache, refresh, refreshConversations, refreshUnread, refreshThread, loadMoreMessages, loadThreadReplies, getMessageReadStatus, loadMoreConversations,
    setConversationArchived, setConversationPreferences, openGroupConversation,
    openBroadcastConversation, sendMessage, sendAttachments, getAttachment: api.getAttachment,
    getAttachmentThumbnail: api.getAttachmentThumbnail, activeConversationId,
  }), [cache, refresh, refreshConversations, refreshUnread, refreshThread, loadMoreMessages, loadThreadReplies, getMessageReadStatus, loadMoreConversations,
    setConversationArchived, setConversationPreferences, openGroupConversation,
    openBroadcastConversation, sendMessage, sendAttachments, api.getAttachment, api.getAttachmentThumbnail, activeConversationId]);
  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) throw new Error('useMessaging must be used within a MessagingProvider');
  return context;
}
