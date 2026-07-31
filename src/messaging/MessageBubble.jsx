import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AttachmentList } from './AttachmentList';
import { extractApiErrorMessage, useOptionalMessaging } from './MessagingProvider';
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

/** Provider-backed timeline collaborator, including per-message mutations. */
export function MessageBubble({ message, replyTo, onReply, onJumpToMessage, canModerateMessages = false, children }) {
  const { t } = useTranslation();
  const messaging = useOptionalMessaging();
  const { currentUser, editMessage, removeMessage } = messaging || {};
  const deleted = Boolean(message.deleted_at);
  const attachments = message.attachments || [];
  const canAct = !deleted && message.kind !== 'poll' && ((Boolean(currentUser?.id) && message.sender?.id === currentUser?.id) || canModerateMessages);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body || '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (deleted) { setEditing(false); setConfirmingDelete(false); setMenuAnchor(null); }
  }, [deleted]);
  const closeMenu = () => setMenuAnchor(null);
  const openMenu = (event) => { event.preventDefault(); setMenuAnchor(event.currentTarget); };
  const startEdit = () => { setDraft(message.body || ''); setEditing(true); closeMenu(); };
  const saveEdit = async () => {
    setSaving(true); setError(null);
    try { await editMessage?.(message.id, { body: draft.trim() }); setEditing(false); }
    catch (saveError) { setError(t('MessagingActions.EDIT_ERROR', { message: extractApiErrorMessage(saveError) })); } finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    setSaving(true); setError(null);
    try { await removeMessage?.(message.id); setConfirmingDelete(false); }
    catch (deleteError) { setError(t('MessagingActions.DELETE_ERROR', { message: extractApiErrorMessage(deleteError) })); } finally { setSaving(false); }
  };
  const copyMessage = async () => {
    closeMenu();
    try { await navigator.clipboard.writeText(message.body || ''); }
    catch (copyError) { setError(t('MessagingActions.COPY_ERROR', { message: extractApiErrorMessage(copyError) })); }
  };
  return (
    <Paper component="article" variant="outlined" sx={{ p: 1.25, maxWidth: 'min(100%, 680px)', '& .message-actions': { opacity: 0 }, '&:hover .message-actions': { opacity: 1 } }} aria-label={t('MessagingThread.MESSAGE')} data-message-id={message.id} onContextMenu={canAct ? openMenu : undefined}>
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
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        {editing ? <Stack spacing={0.75}><TextField label={t('MessagingActions.EDIT')} value={draft} onChange={(event) => setDraft(event.target.value)} multiline minRows={2} autoFocus disabled={saving} /><Stack direction="row" spacing={1}><Button type="button" onClick={saveEdit} disabled={saving}>{t('MessagingActions.SAVE')}</Button><Button type="button" onClick={() => setEditing(false)} disabled={saving}>{t('MessagingActions.CANCEL')}</Button></Stack></Stack> : <Typography sx={{ whiteSpace: 'pre-wrap' }}>{deleted ? t('MessagingThread.DELETED') : (message.kind === 'announcement' ? message.body : (message.body || message.title)) || ''}</Typography>}
        {!deleted && <Stack spacing={0.75}>
          {attachments.length > 0 && <AttachmentList attachments={attachments} />}
          <ReactionBar message={message} />
          {message.poll && <PollCard message={message} />}
        </Stack>}
        {!deleted && onReply && <Button type="button" size="small" onClick={() => onReply(message)}>{t('MessagingThread.REPLY')}</Button>}
        {canAct && <IconButton className="message-actions" size="small" aria-label={t('MessagingActions.MENU')} onClick={openMenu}><MoreVertIcon /></IconButton>}
        {children}
      </Stack>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={startEdit}>{t('MessagingActions.EDIT')}</MenuItem>
        <MenuItem onClick={() => { setConfirmingDelete(true); closeMenu(); }}>{t('MessagingActions.DELETE')}</MenuItem>
        <MenuItem onClick={copyMessage}>{t('MessagingActions.COPY')}</MenuItem>
      </Menu>
      <Dialog open={confirmingDelete} onClose={() => !saving && setConfirmingDelete(false)}>
        <DialogTitle>{t('MessagingActions.DELETE_CONFIRM_TITLE')}</DialogTitle>
        <DialogContent>{t('MessagingActions.DELETE_CONFIRM_BODY')}</DialogContent>
        <DialogActions><Button onClick={() => setConfirmingDelete(false)} disabled={saving}>{t('MessagingActions.CANCEL')}</Button><Button onClick={confirmDelete} disabled={saving} color="error">{t('MessagingActions.DELETE')}</Button></DialogActions>
      </Dialog>
    </Paper>
  );
}
