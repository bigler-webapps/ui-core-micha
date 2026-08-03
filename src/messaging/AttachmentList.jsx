import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { Alert, Box, ButtonBase, CircularProgress, Dialog, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMessaging } from './MessagingProvider';

function isImage(attachment) { return attachment.content_type?.startsWith('image/'); }
// `filename` is dcm's real, sanitized upload name (MSG-12) -- `id` is the
// last-resort fallback for interop with a host still on a pre-MSG-12 pin.
function nameOf(attachment) { return attachment.filename || attachment.name || attachment.id; }

/**
 * WhatsApp-style attachment gallery (MSG-6h): a small thumbnail per image
 * attachment; click opens a full-size lightbox, which itself carries its own
 * Download action (reachable by mouse, touch, or keyboard -- right-click is a
 * shortcut, never the only path). A non-image attachment has no preview to
 * open -- click downloads directly. Right-click still opens the same context
 * menu on either kind, for the mouse-user shortcut. Bytes only ever move
 * through the existing authenticated `getAttachment`/`getAttachmentThumbnail`
 * blob endpoints -- no new byte-handling path.
 */
export function AttachmentList({ attachments = [] }) {
  const { t } = useTranslation();
  const { getAttachment, getAttachmentThumbnail } = useMessaging();
  const [previews, setPreviews] = useState({});
  // { attachment, url: string|null, status: 'loading'|'ready'|'error' } | null
  const [lightbox, setLightbox] = useState(null);
  const [menu, setMenu] = useState(null); // { attachment, anchorPosition } | null
  // Full-resolution object URLs, fetched once per attachment on first
  // lightbox open and reused for the rest of this mount (a re-open must not
  // re-fetch what's already sitting in memory). Only ever revoked on
  // unmount -- never while the Dialog might still be displaying one.
  const fullUrlCacheRef = useRef({});

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

  useEffect(() => () => { Object.values(fullUrlCacheRef.current).forEach((url) => URL.revokeObjectURL(url)); }, []);

  if (!attachments.length) return null;

  const download = async (attachment) => {
    const blob = await getAttachment(attachment.id);
    if (!(blob instanceof Blob)) return;
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = nameOf(attachment); link.click(); URL.revokeObjectURL(url);
  };

  const openLightbox = async (attachment) => {
    const cachedUrl = fullUrlCacheRef.current[attachment.id];
    if (cachedUrl) { setLightbox({ attachment, url: cachedUrl, status: 'ready' }); return; }
    setLightbox({ attachment, url: null, status: 'loading' });
    try {
      const blob = await getAttachment(attachment.id);
      if (!(blob instanceof Blob)) throw new Error('Attachment response was not a Blob');
      const url = URL.createObjectURL(blob);
      fullUrlCacheRef.current[attachment.id] = url;
      // A newer open (a different attachment) may have superseded this one
      // while the fetch was in flight -- don't stomp on it with a stale result.
      setLightbox((current) => (current?.attachment.id === attachment.id ? { attachment, url, status: 'ready' } : current));
    } catch {
      setLightbox((current) => (current?.attachment.id === attachment.id ? { ...current, status: 'error' } : current));
    }
  };

  const openMenu = (event, attachment) => {
    event.preventDefault();
    // Attachments live inside a message bubble that has its own right-click
    // menu (MessageBubble.jsx's onContextMenu) -- this must not also open.
    event.stopPropagation();
    setMenu({ attachment, anchorPosition: { top: event.clientY, left: event.clientX } });
  };
  const closeMenu = () => setMenu(null);

  return <>
    <Stack direction="row" spacing={1} flexWrap="wrap" aria-label={t('MessagingAttachments.LABEL')}>
      {attachments.map((attachment) => {
        const image = isImage(attachment);
        const preview = previews[attachment.id];
        const label = image ? t('MessagingAttachments.PREVIEW', { name: nameOf(attachment) }) : t('MessagingAttachments.DOWNLOAD', { name: nameOf(attachment) });
        return (
          <ButtonBase
            key={attachment.id}
            type="button"
            title={nameOf(attachment)}
            onClick={() => (image ? openLightbox(attachment) : download(attachment))}
            onContextMenu={(event) => openMenu(event, attachment)}
            aria-label={label}
            sx={{ width: 64, height: 64, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}
          >
            {image && preview
              ? <Box component="img" src={preview} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Stack alignItems="center" spacing={0.25} sx={{ px: 0.5, maxWidth: '100%' }}>
                  <InsertDriveFileOutlinedIcon fontSize="small" />
                  <Typography variant="caption" noWrap sx={{ maxWidth: '100%' }}>{nameOf(attachment)}</Typography>
                </Stack>}
          </ButtonBase>
        );
      })}
    </Stack>

    <Dialog open={Boolean(lightbox)} onClose={() => setLightbox(null)} maxWidth="lg" aria-label={lightbox ? nameOf(lightbox.attachment) : undefined}>
      {lightbox && <Box sx={{ position: 'relative', minWidth: 240, minHeight: lightbox.status === 'ready' ? undefined : 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 4, right: 4 }}>
          {lightbox.status === 'ready' && <IconButton aria-label={t('MessagingAttachments.DOWNLOAD_ACTION')} onClick={() => download(lightbox.attachment)} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
            <DownloadIcon />
          </IconButton>}
          <IconButton aria-label={t('MessagingAttachments.CLOSE_PREVIEW')} onClick={() => setLightbox(null)} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {lightbox.status === 'loading' && <CircularProgress aria-label={t('MessagingAttachments.LOADING_PREVIEW')} sx={{ m: 4 }} />}
        {lightbox.status === 'error' && <Alert severity="error" role="alert" sx={{ m: 2 }}>{t('MessagingAttachments.PREVIEW_ERROR')}</Alert>}
        {lightbox.status === 'ready' && <Box component="img" src={lightbox.url} alt={nameOf(lightbox.attachment)} sx={{ display: 'block', maxWidth: '90vw', maxHeight: '90vh' }} />}
      </Box>}
    </Dialog>

    <Menu open={Boolean(menu)} onClose={closeMenu} anchorReference="anchorPosition" anchorPosition={menu?.anchorPosition}>
      <MenuItem onClick={() => { const attachment = menu?.attachment; closeMenu(); if (attachment) download(attachment); }}>
        <DownloadIcon fontSize="small" sx={{ mr: 1 }} />{t('MessagingAttachments.DOWNLOAD_ACTION')}
      </MenuItem>
    </Menu>
  </>;
}
