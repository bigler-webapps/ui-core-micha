import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

import { AuthContext } from '../auth/AuthContext';
import {
  archiveConversation,
  createBroadcastConversation,
  createDirectConversation,
  createGroupConversation,
  getReadStatus,
  getUnreadCount,
  listConversations,
  listMessages,
  listThread,
  patchConversationPreferences,
  markConversationRead,
  markThreadRead,
  createMessage,
  uploadAttachments,
  getAttachment,
  getAttachmentThumbnail,
  addReaction,
  removeReaction,
  createPoll,
  votePoll,
  closePoll,
  getConversationConfig,
  patchConversationConfig,
  patchMessage as patchMessageRequest,
  deleteMessage as deleteMessageRequest,
} from './api';
import { useRealtime } from '../notifications/realtime';

const MessagingContext = createContext(null);
export const MESSAGING_ENVELOPE = 'messaging';
const EMPTY_CACHE = { conversations: {}, messages: {}, threads: {}, polls: {}, reactions: {}, receipts: {}, unread: { unread_count: 0, by_conversation: {} }, cursors: { conversations: null, messages: {}, threads: {} } };
const DEFAULT_API = {
  listConversations, listMessages, listThread, getReadStatus, getUnreadCount, archiveConversation,
  patchConversationPreferences, createGroupConversation, createBroadcastConversation, createDirectConversation,
  markConversationRead, markThreadRead,
  createMessage, uploadAttachments, getAttachment, getAttachmentThumbnail,
  addReaction, removeReaction, createPoll, votePoll, closePoll, getConversationConfig, patchConversationConfig,
  patchMessage: patchMessageRequest, deleteMessage: deleteMessageRequest,
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
    case 'messagePatched': return { ...state, messages: mergeById(state.messages, action.message) };
    case 'conversationRead': {
      const previousCount = state.unread?.by_conversation?.[action.conversationId] || 0;
      if (!previousCount) return state;
      return {
        ...state,
        unread: {
          ...state.unread,
          unread_count: Math.max(0, (state.unread?.unread_count || 0) - previousCount),
          by_conversation: { ...state.unread.by_conversation, [action.conversationId]: 0 },
        },
      };
    }
    case 'frame': return applyFrame(state, action.frame, action.activeConversationId);
    default: return state;
  }
}

export function applyFrame(state, frame, activeConversationId = null) {
  const payload = frame.message || frame.conversation || frame.participant || frame;
  const conversationId = frame.conversation_id ?? payload.conversation_id;
  if (frame.type === 'message') {
    const message = { ...payload, conversation_id: conversationId };
    const requestId = clientRequestIdOf(message);
    const reconcilesOptimisticMessage = Boolean(requestId && Object.values(state.messages).some((item) => clientRequestIdOf(item) === requestId));
    const messages = reconcileMessage(state.messages, message);
    if (conversationId == null || String(conversationId) === String(activeConversationId) || reconcilesOptimisticMessage) return { ...state, messages };
    const unread = state.unread || EMPTY_CACHE.unread;
    const previousCount = unread.by_conversation?.[conversationId] || 0;
    return {
      ...state,
      messages,
      unread: {
        ...unread,
        unread_count: (unread.unread_count || 0) + 1,
        by_conversation: { ...unread.by_conversation, [conversationId]: previousCount + 1 },
      },
    };
  }
  if (frame.type === 'message_edited') {
    // dcm's publish_messaging_event always attaches a full frame.message
    // (serialize_message) for this event type, so `payload` already carries
    // the message's own `.id` in practice. The explicit `id:` override below
    // is defensive only — it keeps this branch correct even if a future
    // producer ever omits `.message` and falls through to the raw frame,
    // whose `conversation_id` would otherwise win idOf()'s fallback order.
    const messageId = frame.message_id ?? payload.message_id;
    return { ...state, messages: mergeById(state.messages, { ...payload, id: messageId }) };
  }
  if (frame.type === 'reaction') {
    const messageId = frame.message_id ?? payload.message_id;
    const previous = state.messages[messageId] || { id: messageId };
    return { ...state, messages: mergeById(state.messages, { ...previous, reactions: payload.reactions || frame.reactions || previous.reactions || [] }) };
  }
  if (frame.type === 'poll_updated') {
    const messageId = frame.message_id ?? payload.message_id;
    const previous = state.messages[messageId] || { id: messageId };
    const poll = payload.poll || frame.poll || payload;
    return { ...state, messages: mergeById(state.messages, { ...previous, poll }), polls: mergeById(state.polls, poll) };
  }
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
  const markConversationAsRead = useCallback(async (conversationId, readAt) => {
    const result = await api.markConversationRead(conversationId, readAt);
    dispatch({ type: 'conversationRead', conversationId });
    return result;
  }, [api]);
  const markReplyThreadRead = useCallback((rootId, readAt) => api.markThreadRead(rootId, readAt), [api]);
  const openGroupConversation = useCallback(async (payload) => {
    const conversation = await api.createGroupConversation(payload);
    return updateConversation(conversation);
  }, [api, updateConversation]);
  const openBroadcastConversation = useCallback(async (payload) => {
    const conversation = await api.createBroadcastConversation(payload);
    return updateConversation(conversation);
  }, [api, updateConversation]);
  const openDirectConversation = useCallback(async (payload) => {
    const conversation = await api.createDirectConversation(payload);
    return updateConversation(conversation);
  }, [api, updateConversation]);
  const sendMessage = useCallback(async (conversationId, payload, { clientRequestId, retry = false } = {}) => {
    const requestId = clientRequestId || payload.client_request_id;
    const optimistic = {
      id: `local-${requestId}`,
      conversation_id: conversationId,
      kind: payload.kind || 'chat',
      body: payload.body || '',
      title: payload.title || null,
      link_target: payload.link_target || null,
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
  const sendAttachments = useCallback(async (conversationId, formData, { clientRequestId, optimisticMessage, retry = false, onUploadProgress } = {}) => {
    const optimistic = {
      id: `local-${clientRequestId}`, conversation_id: conversationId, kind: 'chat', body: optimisticMessage?.body || '',
      reply_to: optimisticMessage?.reply_to || null, client_request_id: clientRequestId, created_at: new Date().toISOString(), status: 'pending',
      sender: user ? { id: user.id, display_name: user.display_name || user.username } : undefined,
      attachments: optimisticMessage?.attachments || [],
    };
    if (!retry) dispatch({ type: 'messageOptimistic', message: optimistic });
    else dispatch({ type: 'messageReconciled', message: { ...optimistic, status: 'pending', error: null } });
    try {
      const message = await api.uploadAttachments(conversationId, formData, { idempotencyKey: clientRequestId, onUploadProgress });
      dispatch({ type: 'messageReconciled', message: { ...message, conversation_id: message?.conversation_id ?? conversationId, client_request_id: message?.client_request_id ?? clientRequestId } });
      return message;
    } catch (error) {
      dispatch({ type: 'messageFailed', clientRequestId, error: extractApiErrorMessage(error) });
      throw error;
    }
  }, [api, user]);
  const patchMessage = useCallback((message) => dispatch({ type: 'messagePatched', message }), []);
  // Keep this API-backed action deliberately distinct from the cache-merge
  // helper above. The server remains the authority for author/moderator rights.
  const editMessage = useCallback(async (messageId, patch) => {
    const result = await api.patchMessage(messageId, patch);
    const message = result?.message || result;
    patchMessage({ ...(cache.messages[messageId] || { id: messageId }), ...(message || {}), id: message?.id ?? messageId });
    return result;
  }, [api, cache.messages, patchMessage]);
  const removeMessage = useCallback(async (messageId) => {
    const result = await api.deleteMessage(messageId);
    const message = result?.message || result;
    const previous = cache.messages[messageId] || { id: messageId };
    patchMessage({
      ...previous,
      ...(message || {}),
      id: message?.id ?? messageId,
      deleted_at: message?.deleted_at ?? previous.deleted_at ?? new Date().toISOString(),
      deleted_by: message?.deleted_by ?? previous.deleted_by ?? user?.id,
      body: null,
      title: null,
      link_target: null,
    });
    return result;
  }, [api, cache.messages, patchMessage, user]);
  const toggleReaction = useCallback(async (messageId, emoji, active) => {
    const message = cache.messages[messageId] || { id: messageId };
    const reactions = message.reactions || [];
    const current = reactions.find((reaction) => reaction.emoji === emoji);
    const nextReactions = active
      ? reactions.map((reaction) => reaction.emoji === emoji ? { ...reaction, reacted: false, count: Math.max(0, (reaction.count || 1) - 1) } : reaction).filter((reaction) => reaction.count !== 0)
      : current
        ? reactions.map((reaction) => reaction.emoji === emoji ? { ...reaction, reacted: true, count: (reaction.count || 0) + 1 } : reaction)
        : [...reactions, { emoji, count: 1, reacted: true }];
    patchMessage({ ...message, reactions: nextReactions });
    try {
      const result = active ? await api.removeReaction(messageId, emoji) : await api.addReaction(messageId, emoji);
      patchMessage({ ...message, ...(result?.message || result), reactions: result?.reactions || result?.message?.reactions || nextReactions });
      return result;
    } catch (error) { patchMessage(message); throw error; }
  }, [api, cache.messages, patchMessage]);
  const createConversationPoll = useCallback(async (conversationId, payload, { clientRequestId } = {}) => {
    const poll = await api.createPoll(conversationId, { ...payload, client_request_id: clientRequestId }, { idempotencyKey: clientRequestId });
    const message = poll?.message || poll;
    if (message?.id != null) patchMessage({ ...message, conversation_id: message.conversation_id ?? conversationId, poll: message.poll || poll.poll || poll });
    return poll;
  }, [api, patchMessage]);
  const castPollVote = useCallback(async (messageId, poll, optionIds) => {
    const result = await api.votePoll(poll.id, optionIds);
    const nextPoll = { ...poll, ...(result?.poll || result) };
    patchMessage({ ...(cache.messages[messageId] || { id: messageId }), poll: nextPoll });
    return result;
  }, [api, cache.messages, patchMessage]);
  const closeConversationPoll = useCallback(async (messageId, poll) => {
    const result = await api.closePoll(poll.id);
    const nextPoll = { ...poll, ...(result?.poll || result), closed_at: result?.poll?.closed_at || result?.closed_at || new Date().toISOString() };
    patchMessage({ ...(cache.messages[messageId] || { id: messageId }), poll: nextPoll });
    return result;
  }, [api, cache.messages, patchMessage]);
  const loadConversationConfig = useCallback((conversationId) => api.getConversationConfig(conversationId), [api]);
  const saveConversationConfig = useCallback((conversationId, patch) => api.patchConversationConfig(conversationId, patch), [api]);
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
    dispatch({ type: 'frame', frame, activeConversationId: activeIdRef.current });
  }), [subscribe]);
  useEffect(() => {
    if (!active || !onReconnect) return undefined;
    return onReconnect(() => { refresh().catch(() => {}); });
  }, [active, onReconnect, refresh]);

  const value = useMemo(() => ({
    cache, refresh, refreshConversations, refreshUnread, refreshThread, loadMoreMessages, loadThreadReplies, getMessageReadStatus, loadMoreConversations,
    setConversationArchived, setConversationPreferences, openGroupConversation,
    markConversationRead: markConversationAsRead, markThreadRead: markReplyThreadRead,
    openBroadcastConversation, openDirectConversation, sendMessage, sendAttachments, editMessage, removeMessage, toggleReaction, createConversationPoll, castPollVote, closeConversationPoll,
    loadConversationConfig, saveConversationConfig, currentUser: user, getAttachment: api.getAttachment,
    getAttachmentThumbnail: api.getAttachmentThumbnail, activeConversationId,
  }), [cache, refresh, refreshConversations, refreshUnread, refreshThread, loadMoreMessages, loadThreadReplies, getMessageReadStatus, loadMoreConversations,
    setConversationArchived, setConversationPreferences, openGroupConversation, markConversationAsRead, markReplyThreadRead,
    openBroadcastConversation, openDirectConversation, sendMessage, sendAttachments, editMessage, removeMessage, toggleReaction, createConversationPoll, castPollVote, closeConversationPoll,
    loadConversationConfig, saveConversationConfig, user, api.getAttachment, api.getAttachmentThumbnail, activeConversationId]);
  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const context = useOptionalMessaging();
  if (!context) throw new Error('useMessaging must be used within a MessagingProvider');
  return context;
}

export function useOptionalMessaging() {
  return useContext(MessagingContext);
}
