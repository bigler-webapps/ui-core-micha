import { Alert, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractApiErrorMessage, useMessaging } from './MessagingProvider';

/** Independently mountable live poll view. Server authorization remains authoritative. */
export function PollCard({ message, canClose: canCloseProp }) {
  const { t } = useTranslation();
  const { castPollVote, closeConversationPoll, currentUser } = useMessaging();
  const poll = message?.poll;
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // voted_option_ids is a view-level enrichment dcm adds ONLY to the
  // create/vote/close poll REST responses (serialize_poll itself, every
  // message-list/thread load, and every poll_updated realtime frame never
  // carry it) — so it's only ever present right after this viewer's own
  // vote/create/close action. When it's absent (a freshly loaded or
  // frame-updated poll), there's no way to know this viewer's vote from the
  // payload alone; default to no selection rather than guessing or carrying
  // over stale local state.
  useEffect(() => setSelected(poll?.voted_option_ids ? [...poll.voted_option_ids] : []), [poll]);
  if (!poll) return null;
  const closed = Boolean(poll.closed_at);
  const creatorId = poll.created_by_id ?? poll.created_by?.id ?? poll.created_by;
  const canClose = canCloseProp ?? poll.can_close ?? message?.can_close ?? message?.permissions?.can_close ?? (creatorId != null && creatorId === currentUser?.id);
  const changeSelection = (id) => setSelected((current) => poll.allow_multiple ? (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]) : (current.includes(id) ? [] : [id]));
  const vote = async () => {
    if (!selected.length) { setError(t('MessagingPoll.SELECT_OPTION')); return; }
    setBusy(true); setError(null);
    try { await castPollVote(message.id, poll, selected); } catch (voteError) { setError(t('MessagingPoll.VOTE_ERROR', { message: extractApiErrorMessage(voteError) })); } finally { setBusy(false); }
  };
  const close = async () => {
    setBusy(true); setError(null);
    try { await closeConversationPoll(message.id, poll); } catch (closeError) { setError(t('MessagingPoll.CLOSE_ERROR', { message: extractApiErrorMessage(closeError) })); } finally { setBusy(false); }
  };
  return <Paper variant="outlined" sx={{ p: 1 }} aria-label={t('MessagingPoll.LABEL')}><Stack spacing={0.5}>
    <Typography variant="subtitle2">{poll.question}</Typography>
    {(poll.options || []).map((option) => {
      // dcm's poll projection gives voter user ids only, never names — there
      // is no user-directory endpoint (same structural limit already
      // established for the DM candidate list). A count is always correct;
      // marking the viewer's own vote is derivable from voted_option_ids.
      const votedByMe = Boolean(poll.voted_option_ids?.includes(option.id));
      const voterCount = option.voters?.length ?? option.vote_count ?? option.votes_count ?? 0;
      return <FormControlLabel key={option.id} disabled={closed || busy} control={<Checkbox checked={selected.includes(option.id)} onChange={() => changeSelection(option.id)} />} label={`${option.text || option.label} (${option.vote_count ?? voterCount ?? 0})${votedByMe ? ` — ${t('MessagingPoll.YOU_VOTED')}` : ''}`} />;
    })}
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    <Stack direction="row" spacing={1}><Button size="small" onClick={vote} disabled={closed || busy}>{t('MessagingPoll.VOTE')}</Button>{canClose && !closed && <Button size="small" color="warning" onClick={close} disabled={busy}>{t('MessagingPoll.CLOSE')}</Button>}{closed && <Typography variant="caption">{t('MessagingPoll.CLOSED')}</Typography>}</Stack>
  </Stack></Paper>;
}
