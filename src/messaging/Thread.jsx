import { Alert, Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthContext } from '../auth/AuthContext';
import { MessageBubble } from './MessageBubble';
import { useMessaging } from './MessagingProvider';
import { ReadTicks } from './ReadTicks';

function chronological(messages) { return [...messages].sort((left, right) => new Date(left.created_at || 0) - new Date(right.created_at || 0)); }

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
export function Thread({ conversationId, onReplyTargetChange }) {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext) || {};
  const { cache, loadMoreMessages, loadThreadReplies } = useMessaging();
  const scrollRef = useRef(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [openThreads, setOpenThreads] = useState({});
  const conversation = cache.conversations[conversationId];
  const roots = useMemo(() => chronological(Object.values(cache.messages).filter((message) => message.conversation_id === conversationId && !message.reply_to)), [cache.messages, conversationId]);

  const loadOlder = useCallback(async () => {
    setLoadingOlder(true); setError(null);
    try { await loadMoreMessages(conversationId); } catch { setError(t('MessagingThread.LOAD_ERROR')); } finally { setLoadingOlder(false); }
  }, [conversationId, loadMoreMessages, t]);
  const onScroll = () => { if (scrollRef.current?.scrollTop === 0 && cache.cursors.messages[conversationId] && !loadingOlder) loadOlder(); };
  const reply = (message) => { setReplyingTo(message); onReplyTargetChange?.(message); };
  const toggleReplies = async (root) => {
    if (!openThreads[root.id]) {
      try { await loadThreadReplies(root.id); } catch { setError(t('MessagingThread.REPLIES_ERROR')); return; }
    }
    setOpenThreads((current) => ({ ...current, [root.id]: !current[root.id] }));
  };
  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      {error && <Alert severity="error" role="alert">{error}</Alert>}
      {replyingTo && <Alert severity="info" onClose={() => { setReplyingTo(null); onReplyTargetChange?.(null); }}>{t('MessagingThread.REPLYING_TO', { sender: replyingTo.sender?.display_name || t('MessagingThread.UNKNOWN_SENDER') })}</Alert>}
      <Box ref={scrollRef} onScroll={onScroll} sx={{ maxHeight: 560, overflowY: 'auto', px: 0.5 }} aria-label={t('MessagingThread.TIMELINE')}>
        {cache.cursors.messages[conversationId] && <Box textAlign="center" py={1}><Button onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? <CircularProgress size={18} /> : t('MessagingThread.LOAD_OLDER')}</Button></Box>}
        {!roots.length && <Typography color="text.secondary" textAlign="center" py={4}>{t('MessagingThread.EMPTY')}</Typography>}
        <Stack spacing={1}>{roots.map((message) => {
          const replies = chronological(Object.values(cache.messages).filter((item) => item.reply_to === message.id));
          const isOwn = Boolean(user?.id) && message.sender?.id === user.id;
          return <Stack key={message.id} spacing={0.75}><MessageBubble message={message} onReply={reply}>{isOwn && <ReadTicks messageId={message.id} conversation={conversation} />}</MessageBubble>
            {(message.reply_count || replies.length) > 0 && <Button size="small" onClick={() => toggleReplies(message)}>{openThreads[message.id] ? t('MessagingThread.HIDE_REPLIES') : t('MessagingThread.SHOW_REPLIES', { count: message.reply_count || replies.length })}</Button>}
            {openThreads[message.id] && <Stack spacing={0.75} sx={{ pl: 3, borderLeft: 2, borderColor: 'divider' }}>{replies.map((item) => <MessageBubble key={item.id} message={item} replyTo={message} onReply={reply}>{Boolean(user?.id) && item.sender?.id === user.id && <ReadTicks messageId={item.id} conversation={conversation} />}</MessageBubble>)}</Stack>}
            <Divider /></Stack>;
        })}</Stack>
      </Box>
    </Stack>
  );
}
