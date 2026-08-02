import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, LinearProgress, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { compressImageForUpload } from './composerImageCompression';
import { extractApiErrorMessage, useMessaging } from './MessagingProvider';
import { QUICK_EMOJIS } from './ReactionBar';

function newRequestId() { return globalThis.crypto?.randomUUID?.() || `message-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function isImage(file) { return file.type?.startsWith('image/'); }

/**
 * A provider-backed, independently mountable REST composer.
 *
 * `allowAnnouncement` and `linkTarget`: whether announcement composing (jg's
 * `AnnouncementDialog` — title + body + a deep-link target) is offered here at
 * all is a host decision (the server enforces who may actually post one; the
 * client only offers the affordance). `linkTarget`'s VALUE is inherently
 * app-specific navigation context (jg pre-fills it from the currently open
 * event-info section) that ucm cannot compute itself, so the host supplies it.
 * Broadcasting to a 1:1 direct conversation is never meaningful regardless of
 * what the host passes for `allowAnnouncement` (typically an event-manager
 * permission check with no notion of the currently open conversation's kind),
 * so this is excluded here rather than relying on every host to remember it.
 */
export function Composer({ conversationId, conversation, replyTarget = null, onReplyTargetChange, allowAnnouncement = false, linkTarget }) {
  const canAnnounce = allowAnnouncement && conversation?.kind !== 'direct';
  const { t } = useTranslation();
  const { sendMessage, sendAttachments, createConversationPoll } = useMessaging();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [failed, setFailed] = useState(null);
  const [sending, setSending] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const inputRef = useRef(null);
  const messageInputRef = useRef(null);
  useEffect(() => {
    if (replyTarget?.deleted_at) onReplyTargetChange?.(null);
  }, [replyTarget, onReplyTargetChange]);
  useEffect(() => { setBody(''); setFiles([]); }, [conversationId]);
  useEffect(() => {
    const urls = files.map((file) => isImage(file) ? URL.createObjectURL(file) : null);
    setPreviews(urls);
    return () => urls.filter(Boolean).forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  const submit = async (requestId = newRequestId(), retry = false) => {
    if (!body.trim() && !files.length) return;
    setSending(true); setError(null);
    const payload = { kind: 'chat', body: body.trim() || undefined, reply_to: replyTarget?.id || undefined, client_request_id: requestId };
    try {
      if (files.length) {
        const formData = new FormData();
        const uploadFiles = await Promise.all(files.map(compressImageForUpload));
        uploadFiles.forEach((file) => formData.append('files[]', file));
        if (payload.body) formData.append('body', payload.body);
        if (payload.reply_to) formData.append('reply_to', String(payload.reply_to));
        formData.append('client_request_id', requestId);
        setUploadProgress(0);
        const onUploadProgress = (event) => setUploadProgress(event.total ? Math.round((event.loaded / event.total) * 100) : null);
        await sendAttachments(conversationId, formData, { clientRequestId: requestId, retry, onUploadProgress, optimisticMessage: { body: payload.body, reply_to: payload.reply_to, attachments: files.map((file, index) => ({ id: `local-${requestId}-${index}`, filename: file.name, content_type: file.type })) } });
      } else await sendMessage(conversationId, payload, { clientRequestId: requestId, retry });
      setBody(''); setFiles([]); setFailed(null); onReplyTargetChange?.(null);
    } catch (sendError) {
      const message = extractApiErrorMessage(sendError);
      setError(files.length ? t('MessagingComposer.UPLOAD_ERROR', { message }) : t('MessagingComposer.SEND_ERROR', { message }));
      setFailed({ requestId, retry: true });
    } finally { setSending(false); setUploadProgress(null); }
  };
  const removeFile = (index) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  const insertEmoji = (emoji) => {
    const input = messageInputRef.current?.querySelector?.('textarea') || messageInputRef.current;
    const start = input?.selectionStart ?? body.length;
    const end = input?.selectionEnd ?? start;
    setBody(`${body.slice(0, start)}${emoji}${body.slice(end)}`); setEmojiAnchor(null);
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + emoji.length, start + emoji.length); });
  };
  const submitPoll = async () => {
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) { setError(t('MessagingPoll.CREATE_VALIDATION')); return; }
    setSending(true); setError(null);
    try {
      await createConversationPoll(conversationId, { question: pollQuestion.trim(), options, allow_multiple: allowMultiple }, { clientRequestId: newRequestId() });
      setPollQuestion(''); setPollOptions(['', '']); setAllowMultiple(false); setPollOpen(false);
    } catch (pollError) { setError(t('MessagingPoll.CREATE_ERROR', { message: extractApiErrorMessage(pollError) })); } finally { setSending(false); }
  };
  const submitAnnouncement = async () => {
    if (!announcementTitle.trim()) { setError(t('MessagingAnnouncement.VALIDATION')); return; }
    setSending(true); setError(null);
    const requestId = newRequestId();
    try {
      await sendMessage(conversationId, {
        kind: 'announcement',
        title: announcementTitle.trim(),
        body: announcementBody.trim() || undefined,
        link_target: linkTarget || undefined,
        client_request_id: requestId,
      }, { clientRequestId: requestId });
      setAnnouncementTitle(''); setAnnouncementBody(''); setAnnouncementOpen(false);
    } catch (announcementError) { setError(t('MessagingAnnouncement.ERROR', { message: extractApiErrorMessage(announcementError) })); } finally { setSending(false); }
  };
  return <Stack component="form" spacing={1} onSubmit={(event) => { event.preventDefault(); submit(); }} aria-label={t('MessagingComposer.LABEL')}>
    {replyTarget && <Alert severity="info" onClose={() => onReplyTargetChange?.(null)}>{t('MessagingComposer.REPLYING_TO', { sender: replyTarget.sender?.display_name || t('MessagingThread.UNKNOWN_SENDER') })}</Alert>}
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {files.length > 0 && <Stack direction="row" spacing={0.5} flexWrap="wrap" aria-label={t('MessagingComposer.STAGED_FILES')}>
      {files.map((file, index) => <Stack key={`${file.name}-${index}`} direction="row" alignItems="center" spacing={0.25} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 0.25 }}>
        {previews[index] && <Box component="img" src={previews[index]} alt={file.name} width={36} height={36} sx={{ objectFit: 'cover' }} />}
        <Typography variant="caption">{file.name}</Typography><IconButton type="button" size="small" aria-label={t('MessagingComposer.REMOVE_ATTACHMENT', { name: file.name })} onClick={() => removeFile(index)}><CloseIcon fontSize="inherit" /></IconButton>
      </Stack>)}
    </Stack>}
    {files.length > 0 && <Typography variant="caption">{t('MessagingComposer.FILES_SELECTED', { count: files.length })}</Typography>}
    <Stack direction="row" spacing={1} alignItems="flex-end">
      <input ref={inputRef} hidden type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
      <IconButton type="button" aria-label={t('MessagingComposer.ADD_ATTACHMENT')} onClick={() => inputRef.current?.click()}><AttachFileIcon /></IconButton>
      <IconButton type="button" aria-label={t('MessagingComposer.ADD_EMOJI')} onClick={(event) => setEmojiAnchor(event.currentTarget)}><EmojiEmotionsOutlinedIcon /></IconButton>
      <IconButton type="button" aria-label={t('MessagingPoll.CREATE')} disabled={pollOpen || files.some(isImage)} onClick={() => setPollOpen(true)}><PollOutlinedIcon /></IconButton>
      {canAnnounce && <IconButton type="button" aria-label={t('MessagingAnnouncement.CREATE')} onClick={() => setAnnouncementOpen(true)}><CampaignOutlinedIcon /></IconButton>}
      <TextField inputRef={messageInputRef} fullWidth multiline minRows={2} value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} label={t('MessagingComposer.MESSAGE')} disabled={sending} />
      <Button type="submit" variant="contained" disabled={sending || (!body.trim() && !files.length)}>{t('MessagingComposer.SEND')}</Button>
    </Stack>
    {sending && files.length > 0 && <Stack spacing={0.5} role="status">
      <Stack direction="row" spacing={1} alignItems="center">
        {uploadProgress == null ? <CircularProgress size={16} /> : <CircularProgress size={16} variant="determinate" value={uploadProgress} />}
        <Typography variant="caption">{t('MessagingComposer.UPLOADING')}</Typography>
      </Stack>
      {uploadProgress != null && <LinearProgress variant="determinate" value={uploadProgress} />}
    </Stack>}
    {failed && <Button type="button" onClick={() => submit(failed.requestId, true)} disabled={sending}>{t('MessagingComposer.RETRY')}</Button>}
    <Menu anchorEl={emojiAnchor} open={Boolean(emojiAnchor)} onClose={() => setEmojiAnchor(null)}>
      {QUICK_EMOJIS.map((emoji) => <MenuItem key={emoji} onClick={() => insertEmoji(emoji)}>{emoji}</MenuItem>)}
    </Menu>
    <Dialog open={pollOpen} onClose={() => !sending && setPollOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{t('MessagingPoll.CREATE')}</DialogTitle><DialogContent><Stack spacing={1} sx={{ pt: 1 }}>
        <TextField label={t('MessagingPoll.QUESTION')} value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} autoFocus />
        {pollOptions.map((option, index) => <TextField key={index} label={t('MessagingPoll.OPTION', { count: index + 1 })} value={option} onChange={(event) => setPollOptions((current) => current.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} />)}
        <Button type="button" disabled={pollOptions.length >= 10} onClick={() => setPollOptions((current) => [...current, ''])}>{t('MessagingPoll.ADD_OPTION')}</Button>
        <FormControlLabel control={<Checkbox checked={allowMultiple} onChange={(event) => setAllowMultiple(event.target.checked)} />} label={t('MessagingPoll.ALLOW_MULTIPLE')} />
      </Stack></DialogContent><DialogActions><Button onClick={() => setPollOpen(false)}>{t('MessagingPoll.CANCEL')}</Button><Button variant="contained" onClick={submitPoll} disabled={sending}>{t('MessagingPoll.CREATE')}</Button></DialogActions>
    </Dialog>
    {canAnnounce && <Dialog open={announcementOpen} onClose={() => !sending && setAnnouncementOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{t('MessagingAnnouncement.CREATE')}</DialogTitle><DialogContent><Stack spacing={1} sx={{ pt: 1 }}>
        <TextField label={t('MessagingAnnouncement.TITLE')} value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} autoFocus />
        <TextField label={t('MessagingAnnouncement.BODY')} value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} multiline minRows={2} />
      </Stack></DialogContent><DialogActions><Button onClick={() => setAnnouncementOpen(false)}>{t('MessagingAnnouncement.CANCEL')}</Button><Button variant="contained" onClick={submitAnnouncement} disabled={sending}>{t('MessagingAnnouncement.SEND')}</Button></DialogActions>
    </Dialog>}
  </Stack>;
}
