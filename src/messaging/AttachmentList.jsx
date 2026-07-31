import { Box, Button, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMessaging } from './MessagingProvider';

function isImage(attachment) { return attachment.content_type?.startsWith('image/'); }
function nameOf(attachment) { return attachment.filename || attachment.name || attachment.id; }

/** Download-only attachment renderer; all bytes remain behind the authenticated REST endpoints. */
export function AttachmentList({ attachments = [] }) {
  const { t } = useTranslation();
  const { getAttachment, getAttachmentThumbnail } = useMessaging();
  const [previews, setPreviews] = useState({});
  useEffect(() => {
    let live = true; const urls = [];
    attachments.filter(isImage).forEach(async (attachment) => {
      try {
        const blob = await getAttachmentThumbnail(attachment.id);
        const url = blob instanceof Blob ? URL.createObjectURL(blob) : blob?.url;
        if (url && live) { urls.push(url); setPreviews((current) => ({ ...current, [attachment.id]: url })); }
      } catch { /* The image remains available through the download action. */ }
    });
    return () => { live = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [attachments, getAttachmentThumbnail]);
  if (!attachments.length) return null;
  const download = async (attachment) => {
    const blob = await getAttachment(attachment.id);
    if (!(blob instanceof Blob)) return;
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = nameOf(attachment); link.click(); URL.revokeObjectURL(url);
  };
  return <Stack direction="row" spacing={1} flexWrap="wrap" aria-label={t('MessagingAttachments.LABEL')}>
    {attachments.map((attachment) => <Button key={attachment.id} type="button" size="small" onClick={() => download(attachment)}>
      {previews[attachment.id] && <Box component="img" src={previews[attachment.id]} alt="" width={36} height={36} sx={{ objectFit: 'cover', mr: 0.75 }} />}{t('MessagingAttachments.DOWNLOAD', { name: nameOf(attachment) })}
    </Button>)}
  </Stack>;
}
