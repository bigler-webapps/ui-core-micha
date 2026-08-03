import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined';
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined';
import { ButtonBase, List, ListItem, Popover, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMessaging } from './MessagingProvider';

// Explicit tokens, not `inherit`/`primary` -- `inherit` inside the message
// meta Stack resolved to `text.disabled`, which read too close to the "read"
// state at the rendered 1rem icon size. The icon shape (Done vs DoneAll)
// already differs, so the colour distinction is a second, independent signal
// rather than the only one.
const DM_SENT_COLOR = 'grey.500';
const DM_READ_COLOR = 'primary.main';

/**
 * Shape-driven, no client-side role/permission branching: dcm only ever
 * includes `read_count`/`recipient_count` inside the same `read_receipt_detail`-
 * gated block as `recipient_detail`, and never for a `direct` conversation
 * (the DM privacy carve-out). So "counts present" already means "team member,
 * non-direct" -- checking anything else here would re-implement a decision
 * dcm's response shape already makes.
 *
 * - counts present -> a read ratio ("18/40"), numeric, no icon ladder.
 * - no counts, `direct` -> a two-state tick (sent / read).
 * - no counts, non-direct -> no indicator at all (an ordinary participant in
 *   a group; a permanently-grey tick here would be the "looks always
 *   delivered" defect this component exists to remove).
 */
export function ReadTicks({ messageId, conversation }) {
  const { t } = useTranslation();
  const { cache, getMessageReadStatus } = useMessaging();
  const [status, setStatus] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  useEffect(() => {
    let mounted = true;
    getMessageReadStatus(messageId).then((next) => { if (mounted) setStatus(next); }).catch(() => { if (mounted) setStatus(null); });
    return () => { mounted = false; };
  }, [getMessageReadStatus, messageId]);
  if (!status) return null;

  const recipientDetail = status.recipient_detail?.map((recipient) => ({ ...recipient, last_read_at: cache.receipts[`${conversation?.id}:${recipient.user_id}`]?.last_read_at ?? recipient.last_read_at })) || status.recipient_detail;
  const directReceipt = conversation?.kind === 'direct' && conversation?.other_user_id != null
    ? cache.receipts[`${conversation.id}:${conversation.other_user_id}`]
    : null;
  const allRead = status.all_read || Boolean(directReceipt?.last_read_at) || Boolean(recipientDetail?.length && recipientDetail.every((recipient) => recipient.last_read_at));
  const hasCounts = typeof status.read_count === 'number' && typeof status.recipient_count === 'number';

  if (!hasCounts && conversation?.kind !== 'direct') return null;

  // The server never returns DM detail; enforce the same carve-out defensively.
  const detail = conversation?.kind === 'direct' ? null : recipientDetail;
  const recipients = detail?.map((recipient) => recipient.display_name || recipient.username || recipient.user_id).filter(Boolean) || [];

  if (hasCounts) {
    // Read count/recipient_count exactly as dcm computed them -- do NOT
    // recompute from recipientDetail here. dcm thresholds each participant's
    // last_read_at against THIS message's created_at
    // (`last_read_at__gte=message.created_at`, services.py); recipientDetail
    // only carries each participant's raw, unthresholded last_read_at, and
    // ReadTicks has no access to the message's own created_at to reproduce
    // that comparison. Recomputing from recipientDetail (tried during
    // implementation, caught in review) silently counted anyone who had ever
    // read the conversation at any point as "read this message" -- in a real
    // group with history, that reads as close to N/N regardless of who
    // actually saw this specific message, the opposite of the WO's intent.
    // The trade-off: unlike the DM tick and the per-person popover below
    // (both viewer/timestamp-relative facts, not message-relative, so they
    // safely reuse cache.receipts), this numeric ratio only updates on the
    // next read-status fetch, not live from a read_state frame.
    const label = t('MessagingReadTicks.READ_RATIO', { read: status.read_count, total: status.recipient_count });
    const ratio = <Typography component="span" variant="caption" color="inherit">{status.read_count}/{status.recipient_count}</Typography>;
    if (!recipients.length) return <span role="img" aria-label={label}>{ratio}</span>;
    return <><ButtonBase aria-label={label} aria-haspopup="dialog" aria-expanded={Boolean(anchorEl)} onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ display: 'inline-flex' }}>{ratio}</ButtonBase><Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}><List aria-label={t('MessagingReadTicks.RECIPIENTS')}>{recipients.map((recipient) => <ListItem key={recipient}>{recipient}</ListItem>)}</List></Popover></>;
  }

  const label = allRead ? t('MessagingReadTicks.ALL_READ') : t('MessagingReadTicks.SENT');
  const StatusIcon = allRead ? DoneAllOutlinedIcon : DoneOutlinedIcon;
  return <StatusIcon role="img" aria-label={label} sx={{ color: allRead ? DM_READ_COLOR : DM_SENT_COLOR }} />;
}
