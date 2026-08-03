import { Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { alpha } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
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
export function MessageBubble({ message, replyTo, conversation, onReply, onJumpToMessage, onAnnouncementLink, canModerateMessages = false, children }) {
  const { t, i18n } = useTranslation();
  const messaging = useOptionalMessaging();
  const { currentUser, editMessage, removeMessage } = messaging || {};
  const deleted = Boolean(message.deleted_at);
  const attachments = message.attachments || [];
  const isOwn = Boolean(currentUser?.id) && message.sender?.id === currentUser.id;
  const canAct = !deleted && message.kind !== 'poll' && (isOwn || canModerateMessages);
  const canOpenMenu = !deleted;
  const reactions = message.reactions || [];
  const hasMeta = Boolean(message.created_at || (message.edited_at && !deleted) || children);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body || '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const bubbleRef = useRef(null);
  useEffect(() => {
    if (deleted) {
      setEditing(false); setConfirmingDelete(false); setMenuAnchor(null); setReactionPickerVisible(false);
    }
  }, [deleted]);
  // The touch/tap reveal is a one-way state flip with no dismiss path of its
  // own (unlike hover/focus, which un-reveal on mouseleave/blur automatically)
  // — without this, any ordinary tap on the bubble (selecting text, opening a
  // poll option, following the reply quote) would leave the overflow icon
  // permanently visible, contradicting the at-rest "no visible affordance"
  // requirement. Dismiss on any pointerdown outside this message's own DOM
  // subtree (bubbleRef spans the Paper plus the reaction-picker sibling, so
  // interacting with either never counts as "outside"); a pointerdown that
  // lands on the Menu/Dialog portals does count as outside, but that's
  // harmless — they already close themselves via their own handlers on the
  // same interaction.
  useEffect(() => {
    if (!actionsVisible) return undefined;
    const dismissIfOutside = (event) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target)) {
        setActionsVisible(false);
      }
    };
    document.addEventListener('pointerdown', dismissIfOutside, true);
    return () => document.removeEventListener('pointerdown', dismissIfOutside, true);
  }, [actionsVisible]);
  const closeMenu = () => setMenuAnchor(null);
  const revealActions = () => setActionsVisible(true);
  const openMenu = (event) => { event.preventDefault(); revealActions(); setMenuAnchor(event.currentTarget); };
  const startEdit = () => { setDraft(message.body || ''); setEditing(true); closeMenu(); };
  const startReply = () => { onReply?.(message); closeMenu(); };
  const startReact = () => { setReactionPickerVisible(true); closeMenu(); };
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
    <Box ref={bubbleRef} component="article" data-message-id={message.id} data-message-side={isOwn ? 'own' : 'incoming'} aria-label={t('MessagingThread.MESSAGE')} sx={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', width: 'fit-content', maxWidth: 'min(75%, 680px)', minWidth: 0 }}>
      <Paper
        variant="outlined"
        data-actions-visible={actionsVisible || undefined}
        onClick={revealActions}
        onContextMenu={canOpenMenu ? openMenu : undefined}
        sx={{
          position: 'relative', p: 1.25, minWidth: 0,
          bgcolor: isOwn ? (theme) => alpha(theme.palette.primary.light, 0.24) : 'background.paper',
          borderColor: isOwn ? (theme) => alpha(theme.palette.primary.main, 0.35) : 'divider',
          overflowWrap: 'anywhere',
          '& .message-actions': { opacity: 0, pointerEvents: 'none', transition: 'opacity 120ms ease-in-out' },
          '&:hover .message-actions, &:focus-within .message-actions, &[data-actions-visible="true"] .message-actions': { opacity: 1, pointerEvents: 'auto' },
        }}
      >
        {canOpenMenu && <IconButton className="message-actions" size="small" aria-label={t('MessagingActions.MENU')} onClick={openMenu} sx={{ position: 'absolute', top: -12, right: -12, bgcolor: 'background.paper', boxShadow: 1 }}><MoreVertIcon fontSize="small" /></IconButton>}
        <Stack spacing={0.75}>
          {replyTo && <ButtonBase type="button" onClick={() => onJumpToMessage?.(replyTo.id)} sx={{ display: 'block', width: '100%', px: 0.75, py: 0.5, textAlign: 'left', borderLeft: 3, borderColor: 'primary.main', bgcolor: 'action.hover', borderRadius: 0.5 }}>
            <Stack spacing={0} alignItems="flex-start">
              <Typography variant="caption" color="text.secondary">{t('MessagingThread.REPLY_TO', { sender: senderName(replyTo) || t('MessagingThread.UNKNOWN_SENDER') })}</Typography>
              <Typography variant="caption" color="text.secondary">{quoteLabel(replyTo, t)}</Typography>
            </Stack>
          </ButtonBase>}
          {conversation?.kind !== 'direct' && <Typography variant="subtitle2">{senderName(message) || t('MessagingThread.UNKNOWN_SENDER')}</Typography>}
          {!deleted && message.kind === 'announcement' && message.title && <Typography variant="subtitle1" fontWeight={700}>{message.title}</Typography>}
          {!deleted && message.kind === 'announcement' && message.link_target && onAnnouncementLink && <Button type="button" size="small" onClick={() => onAnnouncementLink(message.link_target)}>{t('MessagingAnnouncement.OPEN_LINK')}</Button>}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          {editing ? <Stack spacing={0.75}><TextField label={t('MessagingActions.EDIT')} value={draft} onChange={(event) => setDraft(event.target.value)} multiline minRows={2} autoFocus disabled={saving} /><Stack direction="row" spacing={1}><Button type="button" onClick={saveEdit} disabled={saving}>{t('MessagingActions.SAVE')}</Button><Button type="button" onClick={() => setEditing(false)} disabled={saving}>{t('MessagingActions.CANCEL')}</Button></Stack></Stack> : <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{deleted ? t('MessagingThread.DELETED') : (message.kind === 'announcement' ? message.body : (message.body || message.title)) || ''}</Typography>}
          {!deleted && <Stack spacing={0.75}>
            {attachments.length > 0 && <AttachmentList attachments={attachments} />}
            {message.poll && <PollCard message={message} />}
          </Stack>}
          {hasMeta && <Stack data-testid="message-meta" direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" flexWrap="wrap" sx={{ color: 'text.disabled', minWidth: 0, '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>
            {message.created_at && <Typography component="span" variant="caption" color="inherit" sx={{ whiteSpace: 'nowrap' }}>{new Date(message.created_at).toLocaleTimeString(i18n?.language, { hour: '2-digit', minute: '2-digit' })}</Typography>}
            {message.edited_at && !deleted && <Typography component="span" variant="caption" color="inherit">{t('MessagingThread.EDITED')}</Typography>}
            {children}
          </Stack>}
        </Stack>
      </Paper>
      {/* A small positive gap, not the negative-margin "peek from the bottom
          edge" trick this used to have -- that pull was tuned against a
          plain text line and read as an unnatural collision once the
          bubble's actual bottom content became variable (an attachment
          row's bordered Button, or MSG-6g's poll bars), both visually
          boxier than text and closer to the bubble's edge. */}
      {!deleted && (reactions.length > 0 || reactionPickerVisible) && <ReactionBar message={message} expanded={reactionPickerVisible} onExpandedChange={setReactionPickerVisible} sx={{ mt: 0.5, ml: 0.75 }} />}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={startReply}>{t('MessagingThread.REPLY')}</MenuItem>
        <MenuItem onClick={startReact}>{t('MessagingReactions.ADD')}</MenuItem>
        {canAct && <MenuItem onClick={startEdit}>{t('MessagingActions.EDIT')}</MenuItem>}
        {canAct && <MenuItem onClick={() => { setConfirmingDelete(true); closeMenu(); }}>{t('MessagingActions.DELETE')}</MenuItem>}
        <MenuItem onClick={copyMessage}>{t('MessagingActions.COPY')}</MenuItem>
      </Menu>
      <Dialog open={confirmingDelete} onClose={() => !saving && setConfirmingDelete(false)}>
        <DialogTitle>{t('MessagingActions.DELETE_CONFIRM_TITLE')}</DialogTitle>
        <DialogContent>{t('MessagingActions.DELETE_CONFIRM_BODY')}</DialogContent>
        <DialogActions><Button onClick={() => setConfirmingDelete(false)} disabled={saving}>{t('MessagingActions.CANCEL')}</Button><Button onClick={confirmDelete} disabled={saving} color="error">{t('MessagingActions.DELETE')}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
