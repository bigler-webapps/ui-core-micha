import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined';
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined';
import { ButtonBase, List, ListItem, Popover } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMessaging } from './MessagingProvider';

/** Renders only the aggregate receipt unless the server explicitly supplies permitted detail. */
export function ReadTicks({ messageId, conversation }) {
  const { t } = useTranslation();
  const { getMessageReadStatus } = useMessaging();
  const [status, setStatus] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  useEffect(() => {
    let mounted = true;
    getMessageReadStatus(messageId).then((next) => { if (mounted) setStatus(next); }).catch(() => { if (mounted) setStatus(null); });
    return () => { mounted = false; };
  }, [getMessageReadStatus, messageId]);
  if (!status) return null;
  const label = status.all_read ? t('MessagingReadTicks.ALL_READ') : t('MessagingReadTicks.DELIVERED', { count: status.delivered_count || 0 });
  const StatusIcon = status.all_read ? DoneAllOutlinedIcon : DoneOutlinedIcon;
  // The server never returns DM detail; enforce the same carve-out defensively.
  const detail = conversation?.kind === 'direct' ? null : status.recipient_detail;
  const recipients = detail?.map((recipient) => recipient.display_name || recipient.username || recipient.user_id).filter(Boolean) || [];
  if (!recipients.length) return <StatusIcon role="img" aria-label={label} color={status.all_read ? 'primary' : 'inherit'} />;
  return <><ButtonBase aria-label={label} aria-haspopup="dialog" aria-expanded={Boolean(anchorEl)} onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ display: 'inline-flex', color: status.all_read ? 'primary.main' : 'inherit' }}><StatusIcon aria-hidden="true" /></ButtonBase><Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}><List aria-label={t('MessagingReadTicks.RECIPIENTS')}>{recipients.map((recipient) => <ListItem key={recipient}>{recipient}</ListItem>)}</List></Popover></>;
}
