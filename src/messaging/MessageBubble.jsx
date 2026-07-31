import { Button, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AttachmentList } from './AttachmentList';
import { ReactionBar } from './ReactionBar';
import { PollCard } from './PollCard';

function senderName(message) {
  return message.sender?.display_name || message.sender?.username || message.sender_name || message.sender?.name;
}
function quoteSnippet(message) {
  const content = message.body || message.title;
  if (!content) return null;
  return content.length > 120 ? `${content.slice(0, 117)}...` : content;
}
// A quoted source can be textless for two different reasons: it was deleted
// (server blanks body/title/link_target on soft delete), or it always had no
// text — an attachment-only chat send is a real, reachable case (Composer
// only requires body OR files). Collapsing both into "This message was
// deleted" would mislabel the second case, so they're distinguished here.
function quoteLabel(message, t) {
  if (message.deleted_at) return t('MessagingThread.DELETED');
  const snippet = quoteSnippet(message);
  if (snippet) return snippet;
  return message.attachments?.length ? t('MessagingThread.QUOTE_ATTACHMENT') : '';
}

/** Provider-backed timeline collaborator; it deliberately has no mutation controls. */
export function MessageBubble({ message, replyTo, onReply, onJumpToMessage, children }) {
  const { t } = useTranslation();
  const deleted = Boolean(message.deleted_at);
  const attachments = message.attachments || [];
  return (
    <Paper component="article" variant="outlined" sx={{ p: 1.25, maxWidth: 'min(100%, 680px)' }} aria-label={t('MessagingThread.MESSAGE')} data-message-id={message.id}>
      <Stack spacing={0.75}>
        {replyTo && <Button type="button" variant="text" size="small" onClick={() => onJumpToMessage?.(replyTo.id)} sx={{ justifyContent: 'flex-start', px: 0, textAlign: 'left', textTransform: 'none' }}>
          <Stack spacing={0} alignItems="flex-start">
            <Typography variant="caption" color="text.secondary">{t('MessagingThread.REPLY_TO', { sender: senderName(replyTo) || t('MessagingThread.UNKNOWN_SENDER') })}</Typography>
            <Typography variant="caption" color="text.secondary">{quoteLabel(replyTo, t)}</Typography>
          </Stack>
        </Button>}
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="subtitle2">{senderName(message) || t('MessagingThread.UNKNOWN_SENDER')}</Typography>
          {message.created_at && <Typography variant="caption" color="text.secondary">{new Date(message.created_at).toLocaleString()}</Typography>}
          {message.edited_at && !deleted && <Typography variant="caption" color="text.secondary">{t('MessagingThread.EDITED')}</Typography>}
        </Stack>
        {!deleted && message.kind === 'announcement' && message.title && <Typography variant="subtitle1" fontWeight={700}>{message.title}</Typography>}
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{deleted ? t('MessagingThread.DELETED') : (message.kind === 'announcement' ? message.body : (message.body || message.title)) || ''}</Typography>
        {!deleted && <Stack spacing={0.75}>
          {attachments.length > 0 && <AttachmentList attachments={attachments} />}
          <ReactionBar message={message} />
          {message.poll && <PollCard message={message} />}
        </Stack>}
        {!deleted && onReply && <Button type="button" size="small" onClick={() => onReply(message)}>{t('MessagingThread.REPLY')}</Button>}
        {children}
      </Stack>
    </Paper>
  );
}
