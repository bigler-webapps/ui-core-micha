import { Alert, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractApiErrorMessage, useMessaging } from './MessagingProvider';

function newRequestId() { return globalThis.crypto?.randomUUID?.() || `message-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

/** A provider-backed, independently mountable REST composer. */
export function Composer({ conversationId, replyTarget = null, onReplyTargetChange }) {
  const { t } = useTranslation();
  const { sendMessage, sendAttachments } = useMessaging();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [failed, setFailed] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
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
  return <Stack component="form" spacing={1} onSubmit={(event) => { event.preventDefault(); submit(); }} aria-label={t('MessagingComposer.LABEL')}>
    {replyTarget && <Alert severity="info" onClose={() => onReplyTargetChange?.(null)}>{t('MessagingComposer.REPLYING_TO', { sender: replyTarget.sender?.display_name || t('MessagingThread.UNKNOWN_SENDER') })}</Alert>}
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {files.length > 0 && <Typography variant="caption">{t('MessagingComposer.FILES_SELECTED', { count: files.length })}</Typography>}
    <Stack direction="row" spacing={1} alignItems="flex-end">
      <input ref={inputRef} hidden type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
      <IconButton type="button" aria-label={t('MessagingComposer.ADD_ATTACHMENT')} onClick={() => inputRef.current?.click()}><AttachFileIcon /></IconButton>
      <TextField fullWidth multiline minRows={2} value={body} onChange={(event) => setBody(event.target.value)} label={t('MessagingComposer.MESSAGE')} disabled={sending} />
      <Button type="submit" variant="contained" disabled={sending || (!body.trim() && !files.length)}>{t('MessagingComposer.SEND')}</Button>
    </Stack>
    {failed && <Button type="button" onClick={() => submit(failed.requestId, true)} disabled={sending}>{t('MessagingComposer.RETRY')}</Button>}
  </Stack>;
}
