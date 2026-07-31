import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import { Alert, Chip, IconButton, Stack } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractApiErrorMessage, useMessaging } from './MessagingProvider';

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀'];

/** Independently mountable aggregate reaction controls for one message. */
export function ReactionBar({ message }) {
  const { t } = useTranslation();
  const { toggleReaction } = useMessaging();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);
  // Tracks in-flight emoji toggles for this message so a rapid double-click
  // can't fire two concurrent requests for the same emoji — toggleReaction's
  // rollback-on-failure reverts to a pre-optimistic snapshot, which would
  // silently discard a second, already-succeeded change if both were in
  // flight at once. Disabling the chip while its own request is pending
  // removes the race instead of trying to make concurrent toggles safe.
  const [pending, setPending] = useState(() => new Set());
  const reactions = message?.reactions || [];
  const react = async (emoji, active = false) => {
    if (pending.has(emoji)) return;
    setError(null);
    setPending((current) => new Set(current).add(emoji));
    try { await toggleReaction(message.id, emoji, active); }
    catch (reactionError) { setError(t('MessagingReactions.ERROR', { message: extractApiErrorMessage(reactionError) })); }
    finally { setPending((current) => { const next = new Set(current); next.delete(emoji); return next; }); }
  };
  return <Stack spacing={0.5} aria-label={t('MessagingReactions.LABEL')}>
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {reactions.map((reaction) => <Chip key={reaction.emoji} size="small" disabled={pending.has(reaction.emoji)} color={reaction.reacted ? 'primary' : 'default'} label={`${reaction.emoji} ${reaction.count || 0}`} onClick={() => react(reaction.emoji, Boolean(reaction.reacted))} aria-label={t('MessagingReactions.TOGGLE', { emoji: reaction.emoji, count: reaction.count || 0 })} />)}
      <IconButton size="small" aria-label={t('MessagingReactions.ADD')} onClick={() => setExpanded((value) => !value)}><AddReactionOutlinedIcon fontSize="small" /></IconButton>
    </Stack>
    {expanded && <Stack direction="row" spacing={0.25} flexWrap="wrap">{QUICK_EMOJIS.map((emoji) => {
      // A quick-emoji already reflected in the aggregate row must toggle it
      // off, not re-add it — otherwise clicking an already-reacted emoji here
      // optimistically double-increments the count before the API call.
      const existing = reactions.find((reaction) => reaction.emoji === emoji);
      return <Chip key={emoji} size="small" disabled={pending.has(emoji)} color={existing?.reacted ? 'primary' : 'default'} label={emoji} onClick={() => { react(emoji, Boolean(existing?.reacted)); setExpanded(false); }} />;
    })}</Stack>}
    {error && <Alert severity="error" role="alert">{error}</Alert>}
  </Stack>;
}
