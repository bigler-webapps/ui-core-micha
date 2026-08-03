import { Alert, Badge, Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthContext } from '../auth/AuthContext';
import { MessageBubble } from './MessageBubble';
import { MESSAGING_ENVELOPE, useMessaging } from './MessagingProvider';
import { ReadTicks } from './ReadTicks';
import { useRealtime } from '../notifications/realtime';

function chronological(messages) { return [...messages].sort((left, right) => new Date(left.created_at || 0) - new Date(right.created_at || 0)); }
function replyToId(message) { return message.reply_to_id ?? message.reply_to; }
// last_reply_at/reply_count are viewer-independent (always on serialize_message);
// thread_last_read_at is viewer-specific and REST-only (never on a frame — see
// MessagingProvider.jsx's applyFrame merge-trap handling). A null receipt with
// at least one reply counts as unread; no replies means no marker at all.
function hasUnreadReplies(message, receipts, userId) {
  if (!message.reply_count) return false;
  const lastReadAt = receipts[`thread:${message.id}:${userId}`]?.last_read_at ?? message.thread_last_read_at;
  if (lastReadAt == null) return true;
  return Boolean(message.last_reply_at) && new Date(message.last_reply_at) > new Date(lastReadAt);
}
// A still-pending optimistic row (chunk 4) has a fake `local-<requestId>` id
// and no durable server row yet — mounting ReadTicks against it would fire a
// getMessageReadStatus REST call for an id the server has never heard of.
// Wait for reconciliation (status !== 'pending') before showing read state.
function canShowReadTicks(message, user) {
  return Boolean(user?.id) && message.sender?.id === user.id && message.status !== 'pending';
}

/**
 * A standalone timeline. Compose/reaction/poll/attachment mutations remain
 * separate chunk collaborators.
 *
 * ReadTicks is only mounted for the current user's own messages (matches
 * jg's `shouldShowReadTick(msg, isOwn)`): a read receipt tells the sender
 * whether their own message was seen, not the recipient anything about a
 * message they're currently reading. Gating here also bounds the number of
 * `getMessageReadStatus` REST calls a rendered timeline fires — one per own
 * message shown, not one per message in the conversation.
 */
export function Thread({ conversationId, onReplyTargetChange, canModerateMessages = false, onAnnouncementLink }) {
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext) || {};
  const { cache, loadMoreMessages, loadThreadReplies, markConversationRead, markThreadRead, refreshThread } = useMessaging();
  const { subscribe } = useRealtime();
  const scrollRef = useRef(null);
  const wasNearBottomRef = useRef(true);
  const messageCountRef = useRef(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [openThreads, setOpenThreads] = useState({});
  const conversation = cache.conversations[conversationId];
  const conversationMessages = useMemo(() => chronological(Object.values(cache.messages).filter((message) => message.conversation_id === conversationId)), [cache.messages, conversationId]);
  const roots = useMemo(() => chronological(Object.values(cache.messages).filter((message) => message.conversation_id === conversationId && !replyToId(message))), [cache.messages, conversationId]);
  const datedRoots = useMemo(() => roots.map((message, index) => ({ message, showDateSeparator: index > 0 && new Date(roots[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString() })), [roots]);

  useEffect(() => { if (conversationId != null) markConversationRead(conversationId).catch(() => {}); }, [conversationId, markConversationRead]);
  // Re-mark read when a live message frame arrives for the conversation
  // currently open -- without this, `read_count` biases downward for the
  // person paying the most attention: the mount-effect above only fires once
  // per open, so a viewer already sitting in the thread when a new message
  // lands is recorded as "not read" until they navigate away and back.
  // Subscribes independently of MessagingProvider's own subscription to the
  // same envelope (the registry supports multiple handlers per envelope) so
  // this stays a Thread-local concern, not a MessagingProvider reducer change.
  // No sender check needed: dcm's `resolve_live_recipients(sender=actor)`
  // already excludes the sender from the live fan-out, so a `message` frame
  // for this conversation structurally cannot be the viewer's own send.
  useEffect(() => {
    if (conversationId == null) return undefined;
    return subscribe(MESSAGING_ENVELOPE, (frame) => {
      if (frame.type !== 'message') return;
      const frameConversationId = frame.conversation_id ?? frame.message?.conversation_id;
      if (String(frameConversationId) !== String(conversationId)) return;
      if (document.visibilityState === 'hidden') return;
      markConversationRead(conversationId).catch(() => {});
    });
  }, [conversationId, markConversationRead, subscribe]);
  useEffect(() => { wasNearBottomRef.current = true; messageCountRef.current = 0; }, [conversationId]);
  // Nothing else in this component ever fetches messages for the conversation
  // actually being opened — `cache.messages` is otherwise only populated by a
  // live realtime frame arriving while mounted, or this browser's own
  // optimistic send. A conversation whose history predates this session (the
  // common case — every DM someone didn't have open when a message arrived)
  // rendered as permanently empty despite the conversation list correctly
  // showing a last-message preview, which comes from a completely different
  // request. Fetch on open, every time — a stale first page is worse than a
  // redundant one.
  useEffect(() => {
    if (conversationId == null) return undefined;
    let cancelled = false;
    setLoadingInitial(true);
    setError(null);
    refreshThread(conversationId)
      .catch(() => { if (!cancelled) setError(t('MessagingThread.LOAD_ERROR')); })
      .finally(() => { if (!cancelled) setLoadingInitial(false); });
    return () => { cancelled = true; };
    // `t` deliberately not in deps: a language switch mid-flight must not re-trigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, refreshThread]);
  useEffect(() => {
    if (replyingTo && cache.messages[replyingTo.id]?.deleted_at) {
      setReplyingTo(null);
      onReplyTargetChange?.(null);
    }
  }, [cache.messages, onReplyTargetChange, replyingTo]);
  useEffect(() => {
    const isNewMessage = conversationMessages.length > messageCountRef.current;
    messageCountRef.current = conversationMessages.length;
    if (!isNewMessage || !wasNearBottomRef.current || !scrollRef.current) return;
    const timeline = scrollRef.current;
    if (typeof timeline.scrollTo === 'function') timeline.scrollTo({ top: timeline.scrollHeight, behavior: 'smooth' });
    else timeline.scrollTop = timeline.scrollHeight;
  }, [conversationMessages]);

  const loadOlder = useCallback(async () => {
    setLoadingOlder(true); setError(null);
    try { await loadMoreMessages(conversationId); } catch { setError(t('MessagingThread.LOAD_ERROR')); } finally { setLoadingOlder(false); }
  }, [conversationId, loadMoreMessages, t]);
  const onScroll = () => {
    const timeline = scrollRef.current;
    if (timeline) wasNearBottomRef.current = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight < 80;
    if (timeline?.scrollTop === 0 && cache.cursors.messages[conversationId] && !loadingOlder) loadOlder();
  };
  const reply = (message) => { setReplyingTo(message); onReplyTargetChange?.(message); };
  const jumpToMessage = (messageId) => {
    const target = [...(scrollRef.current?.querySelectorAll('[data-message-id]') || [])]
      .find((element) => String(element.dataset.messageId) === String(messageId));
    target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  };
  const toggleReplies = async (root) => {
    if (!openThreads[root.id]) {
      try { await loadThreadReplies(root.id); } catch { setError(t('MessagingThread.REPLIES_ERROR')); return; }
      markThreadRead(root.id).catch(() => {});
    }
    setOpenThreads((current) => ({ ...current, [root.id]: !current[root.id] }));
  };
  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      {error && <Alert severity="error" role="alert">{error}</Alert>}
      {replyingTo && <Alert severity="info" onClose={() => { setReplyingTo(null); onReplyTargetChange?.(null); }}>{t('MessagingThread.REPLYING_TO', { sender: replyingTo.sender?.display_name || t('MessagingThread.UNKNOWN_SENDER') })}</Alert>}
      <Box ref={scrollRef} onScroll={onScroll} sx={{ maxHeight: 560, overflowY: 'auto', overflowX: 'hidden', px: 0.5 }} aria-label={t('MessagingThread.TIMELINE')}>
        {cache.cursors.messages[conversationId] && <Box textAlign="center" py={1}><Button onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? <CircularProgress size={18} /> : t('MessagingThread.LOAD_OLDER')}</Button></Box>}
        {/* Only show the initial-load spinner when there's nothing to show yet
            — re-opening a conversation whose messages are already cached (an
            earlier visit this session, or a realtime frame that arrived while
            a different conversation was open) still re-fetches in the
            background, but the already-visible messages must not be replaced
            by a spinner while that redundant refetch is in flight. */}
        {loadingInitial && !roots.length ? <Box textAlign="center" py={4}><CircularProgress size={20} /></Box> : (!roots.length && <Typography color="text.secondary" textAlign="center" py={4}>{t('MessagingThread.EMPTY')}</Typography>)}
        {/* pr wider than pl, on this Stack only (not the scroll container
            above, which stays symmetric so the centered LOAD_OLDER button
            isn't skewed): an own (right-aligned) bubble sits flush against
            this Stack's right edge, and MessageBubble's hover/tap "more
            actions" icon (MessageBubble.jsx, `top: -12, right: -12`) floats
            12px past the bubble's own right edge — without enough padding to
            absorb that overhang, the scroll container's overflowX: hidden
            (the scrollbar fix above) would clip the icon whenever there's no
            vertical scrollbar reserving extra width (a short conversation,
            no vertical overflow). */}
        <Stack spacing={1} sx={{ pr: 2 }}>{datedRoots.map(({ message, showDateSeparator }) => {
          const replies = chronological(Object.values(cache.messages).filter((item) => String(replyToId(item)) === String(message.id)));
          return <Stack key={message.id} spacing={0.75}>{showDateSeparator && <Stack data-testid="day-separator" direction="row" alignItems="center" spacing={1}><Divider sx={{ flex: 1 }} /><Typography variant="caption" color="text.secondary">{new Date(message.created_at).toLocaleDateString(i18n?.language)}</Typography><Divider sx={{ flex: 1 }} /></Stack>}<MessageBubble message={message} conversation={conversation} onReply={reply} onJumpToMessage={jumpToMessage} onAnnouncementLink={onAnnouncementLink} canModerateMessages={canModerateMessages}>{canShowReadTicks(message, user) && <ReadTicks messageId={message.id} conversation={conversation} />}</MessageBubble>
            {(message.reply_count || replies.length) > 0 && (() => {
              const unread = hasUnreadReplies(message, cache.receipts, user?.id);
              const label = openThreads[message.id] ? t('MessagingThread.HIDE_REPLIES') : t('MessagingThread.SHOW_REPLIES', { count: message.reply_count || replies.length });
              // MUI's Badge spreads unrecognized props (incl. aria-label) onto
              // its own non-interactive wrapping span, not the inner control —
              // a screen reader focuses the Button, so the accessible name
              // must live there, not on the purely-visual dot.
              return <Badge color="error" variant="dot" invisible={!unread}><Button size="small" aria-label={unread ? `${label} — ${t('MessagingThread.UNREAD_REPLIES')}` : undefined} onClick={() => toggleReplies(message)}>{label}</Button></Badge>;
            })()}
            {openThreads[message.id] && <Stack spacing={0.75} sx={{ pl: 3, borderLeft: 2, borderColor: 'divider' }}>{replies.map((item) => <MessageBubble key={item.id} message={item} replyTo={message} conversation={conversation} onReply={reply} onJumpToMessage={jumpToMessage} onAnnouncementLink={onAnnouncementLink} canModerateMessages={canModerateMessages}>{canShowReadTicks(item, user) && <ReadTicks messageId={item.id} conversation={conversation} />}</MessageBubble>)}</Stack>}
            <Divider /></Stack>;
        })}</Stack>
      </Box>
    </Stack>
  );
}
