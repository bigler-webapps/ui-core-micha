import { Tooltip, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMessaging } from './MessagingProvider';

/** Renders only the aggregate receipt unless the server explicitly supplies permitted detail. */
export function ReadTicks({ messageId, conversation }) {
  const { t } = useTranslation();
  const { getMessageReadStatus } = useMessaging();
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let mounted = true;
    getMessageReadStatus(messageId).then((next) => { if (mounted) setStatus(next); }).catch(() => { if (mounted) setStatus(null); });
    return () => { mounted = false; };
  }, [getMessageReadStatus, messageId]);
  if (!status) return null;
  const label = status.all_read ? t('MessagingReadTicks.ALL_READ') : t('MessagingReadTicks.DELIVERED', { count: status.delivered_count || 0 });
  // The server never returns DM detail; enforce the same carve-out defensively.
  const detail = conversation?.kind === 'direct' ? null : status.recipient_detail;
  const detailText = detail?.map((recipient) => recipient.display_name || recipient.username || recipient.user_id).filter(Boolean).join(', ');
  return <Tooltip title={detailText || label}><Typography component="span" variant="caption" color="text.secondary" aria-label={label}>{label}</Typography></Tooltip>;
}
