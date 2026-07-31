import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Stack, TextField, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractApiErrorMessage, useMessaging } from './MessagingProvider';

function newRequestId() { return globalThis.crypto?.randomUUID?.() || `message-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

/**
 * A provider-backed, independently mountable REST composer.
 *
 * `allowAnnouncement` and `linkTarget`: whether announcement composing (jg's
 * `AnnouncementDialog` — title + body + a deep-link target) is offered here at
 * all is a host decision (the server enforces who may actually post one; the
 * client only offers the affordance). `linkTarget`'s VALUE is inherently
 * app-specific navigation context (jg pre-fills it from the currently open
 * event-info section) that ucm cannot compute itself, so the host supplies it.
 */
export function Composer({ conversationId, replyTarget = null, onReplyTargetChange, allowAnnouncement = false, linkTarget }) {
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
  const inputRef = useRef(null);
  useEffect(() => {
    if (replyTarget?.deleted_at) onReplyTargetChange?.(null);
  }, [replyTarget, onReplyTargetChange]);
  const submit = async (requestId = newRequestId(), retry = false) => {
    if (!body.trim() && !files.length) return;
    setSending(true); setError(null);
    const payload = { kind: 'chat', body: body.trim() || undefined, reply_to: replyTarget?.id || undefined, client_request_id: requestId };
    try {
      if (files.length) {
        const formData = new FormData();
        files.forEach((file) => formData.append('files[]', file));
        if (payload.body) formData.append('body', payload.body);
        if (payload.reply_to) formData.append('reply_to', String(payload.reply_to));
        formData.append('client_request_id', requestId);
        await sendAttachments(conversationId, formData, { clientRequestId: requestId, retry, optimisticMessage: { body: payload.body, reply_to: payload.reply_to, attachments: files.map((file, index) => ({ id: `local-${requestId}-${index}`, filename: file.name, content_type: file.type })) } });
      } else await sendMessage(conversationId, payload, { clientRequestId: requestId, retry });
      setBody(''); setFiles([]); setFailed(null); onReplyTargetChange?.(null);
    } catch (sendError) {
      const message = extractApiErrorMessage(sendError);
      setError(files.length ? t('MessagingComposer.UPLOAD_ERROR', { message }) : t('MessagingComposer.SEND_ERROR', { message }));
      setFailed({ requestId, retry: true });
    } finally { setSending(false); }
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
    {files.length > 0 && <Typography variant="caption">{t('MessagingComposer.FILES_SELECTED', { count: files.length })}</Typography>}
    <Stack direction="row" spacing={1} alignItems="flex-end">
      <input ref={inputRef} hidden type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
      <IconButton type="button" aria-label={t('MessagingComposer.ADD_ATTACHMENT')} onClick={() => inputRef.current?.click()}><AttachFileIcon /></IconButton>
      <IconButton type="button" aria-label={t('MessagingPoll.CREATE')} onClick={() => setPollOpen(true)}><PollOutlinedIcon /></IconButton>
      {allowAnnouncement && <IconButton type="button" aria-label={t('MessagingAnnouncement.CREATE')} onClick={() => setAnnouncementOpen(true)}><CampaignOutlinedIcon /></IconButton>}
      <TextField fullWidth multiline minRows={2} value={body} onChange={(event) => setBody(event.target.value)} label={t('MessagingComposer.MESSAGE')} disabled={sending} />
      <Button type="submit" variant="contained" disabled={sending || (!body.trim() && !files.length)}>{t('MessagingComposer.SEND')}</Button>
    </Stack>
    {failed && <Button type="button" onClick={() => submit(failed.requestId, true)} disabled={sending}>{t('MessagingComposer.RETRY')}</Button>}
    <Dialog open={pollOpen} onClose={() => !sending && setPollOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{t('MessagingPoll.CREATE')}</DialogTitle><DialogContent><Stack spacing={1} sx={{ pt: 1 }}>
        <TextField label={t('MessagingPoll.QUESTION')} value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} autoFocus />
        {pollOptions.map((option, index) => <TextField key={index} label={t('MessagingPoll.OPTION', { count: index + 1 })} value={option} onChange={(event) => setPollOptions((current) => current.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} />)}
        <Button type="button" onClick={() => setPollOptions((current) => [...current, ''])}>{t('MessagingPoll.ADD_OPTION')}</Button>
        <FormControlLabel control={<Checkbox checked={allowMultiple} onChange={(event) => setAllowMultiple(event.target.checked)} />} label={t('MessagingPoll.ALLOW_MULTIPLE')} />
      </Stack></DialogContent><DialogActions><Button onClick={() => setPollOpen(false)}>{t('MessagingPoll.CANCEL')}</Button><Button variant="contained" onClick={submitPoll} disabled={sending}>{t('MessagingPoll.CREATE')}</Button></DialogActions>
    </Dialog>
    {allowAnnouncement && <Dialog open={announcementOpen} onClose={() => !sending && setAnnouncementOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{t('MessagingAnnouncement.CREATE')}</DialogTitle><DialogContent><Stack spacing={1} sx={{ pt: 1 }}>
        <TextField label={t('MessagingAnnouncement.TITLE')} value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} autoFocus />
        <TextField label={t('MessagingAnnouncement.BODY')} value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} multiline minRows={2} />
      </Stack></DialogContent><DialogActions><Button onClick={() => setAnnouncementOpen(false)}>{t('MessagingAnnouncement.CANCEL')}</Button><Button variant="contained" onClick={submitAnnouncement} disabled={sending}>{t('MessagingAnnouncement.SEND')}</Button></DialogActions>
    </Dialog>}
  </Stack>;
}
