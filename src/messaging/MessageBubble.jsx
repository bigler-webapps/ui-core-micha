import { Chip, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AttachmentList } from './AttachmentList';

function senderName(message) {
  return message.sender?.display_name || message.sender?.username || message.sender_name || message.sender?.name;
}

/** Provider-backed timeline collaborator; it deliberately has no mutation controls. */
export function MessageBubble({ message, replyTo, onReply, children }) {
  const { t } = useTranslation();
  const deleted = Boolean(message.deleted_at);
  const attachments = message.attachments || [];
  const reactions = message.reactions || [];
  return (
    <Paper component="article" variant="outlined" sx={{ p: 1.25, maxWidth: 'min(100%, 680px)' }} aria-label={t('MessagingThread.MESSAGE')}>
      <Stack spacing={0.75}>
        {replyTo && <Typography variant="caption" color="text.secondary">{t('MessagingThread.REPLY_TO', { sender: senderName(replyTo) || t('MessagingThread.UNKNOWN_SENDER') })}</Typography>}
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="subtitle2">{senderName(message) || t('MessagingThread.UNKNOWN_SENDER')}</Typography>
          {message.created_at && <Typography variant="caption" color="text.secondary">{new Date(message.created_at).toLocaleString()}</Typography>}
          {message.edited_at && !deleted && <Typography variant="caption" color="text.secondary">{t('MessagingThread.EDITED')}</Typography>}
        </Stack>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{deleted ? t('MessagingThread.DELETED') : (message.body || message.title || '')}</Typography>
        {!deleted && <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {attachments.length > 0 && <AttachmentList attachments={attachments} />}
          {reactions.length > 0 && <Chip size="small" label={t('MessagingThread.REACTION_COUNT', { count: reactions.length })} />}
          {message.poll && <Chip size="small" label={t('MessagingThread.POLL')} />}
        </Stack>}
        {!deleted && onReply && <button type="button" onClick={() => onReply(message)}>{t('MessagingThread.REPLY')}</button>}
        {children}
      </Stack>
    </Paper>
  );
}
