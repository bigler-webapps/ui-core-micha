import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Button, Checkbox, Chip, FormControlLabel, LinearProgress, Paper, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractApiErrorMessage, useMessaging } from './MessagingProvider';

/**
 * Independently mountable live poll view. Server authorization remains authoritative.
 *
 * Tap-to-vote (MSG-6g): each option is its own control, cast immediately on tap — no
 * separate submit step. Single-choice uses a real `RadioGroup` (native "tap a different
 * option moves the vote, tap the same one is a no-op" semantics, plus the group's own
 * arrow-key navigation and screen-reader group announcement — a bare ungrouped `Radio`
 * per option, tried first, loses both); multi-select uses `Checkbox` (each tap
 * independently toggles that option). `FormControlLabel` wraps each control, matching
 * this repo's existing radio convention (`AuthFactorRequirementCard.jsx`) — clicking
 * anywhere in the label natively activates the control, no manual click-handling needed.
 * Every tap is optimistic (see `castPollVote` in `MessagingProvider`), dims while
 * in flight (matching `ReactionBar`'s `pending` convention) so an optimistic vote is
 * never visually indistinguishable from a confirmed one, and visibly reverts on a
 * rejected vote.
 */
export function PollCard({ message, canClose: canCloseProp }) {
  const { t } = useTranslation();
  const { castPollVote, closeConversationPoll, currentUser } = useMessaging();
  const poll = message?.poll;
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(() => new Set());
  // Guards a rejected vote's revert against a newer tap that has since
  // superseded it -- see the matching token in MessagingProvider.castPollVote.
  const voteTokenRef = useRef(null);
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
  // Percentage denominator (MSG-6i): the number of distinct people who
  // answered this poll, not sum(vote_count) across options. For a
  // multi-select poll one person can vote for several options, so summing
  // vote_count can exceed the actual respondent count -- dividing by that
  // inflated sum understated everyone's percentage and the bars didn't sum
  // to a sensible 100%. dcm's serialize_poll always includes each option's
  // `voters` (a list of user ids, ungated -- unlike messaging read
  // receipts); the union across all options is exactly "everyone who
  // answered", computed client-side, no backend change. This deliberately
  // reverses MSG-6g's own explicit non-goal ("denominator = votes cast, not
  // participant count") -- an operator-confirmed correction, not a revert.
  const respondentCount = new Set((poll.options || []).flatMap((option) => option.voters || [])).size;

  const tap = async (id) => {
    if (closed) return;
    const previousSelected = selected;
    const nextSelected = poll.allow_multiple
      ? (selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])
      : [id];
    // Belt-and-suspenders: native radios already don't fire a change event
    // when re-clicking the checked one, but this guards any caller shape.
    if (nextSelected.length === previousSelected.length && nextSelected.every((value) => previousSelected.includes(value))) return;
    const token = {};
    voteTokenRef.current = token;
    setSelected(nextSelected);
    setError(null);
    // Rapid re-taps are allowed and race deliberately (last write wins via
    // the token above) -- `pending` is a visual signal only, never gates
    // further taps, so it must not disable the control.
    setPending((current) => new Set(current).add(id));
    try {
      await castPollVote(message.id, poll, nextSelected);
    } catch (voteError) {
      // A later tap already moved the selection on; a stale failure must not
      // revert past it.
      if (voteTokenRef.current === token) {
        setSelected(previousSelected);
        setError(t('MessagingPoll.VOTE_ERROR', { message: extractApiErrorMessage(voteError) }));
      }
    } finally {
      setPending((current) => { const next = new Set(current); next.delete(id); return next; });
    }
  };
  const close = async () => {
    setBusy(true); setError(null);
    try { await closeConversationPoll(message.id, poll); } catch (closeError) { setError(t('MessagingPoll.CLOSE_ERROR', { message: extractApiErrorMessage(closeError) })); } finally { setBusy(false); }
  };

  const optionLabel = (option) => {
    // dcm's poll projection gives voter user ids only, never names — there
    // is no user-directory endpoint (same structural limit already
    // established for the DM candidate list).
    const voteCount = option.vote_count ?? option.voters?.length ?? 0;
    const percent = respondentCount > 0 ? Math.round((voteCount / respondentCount) * 100) : 0;
    const votedByMe = selected.includes(option.id);
    const resultText = t('MessagingPoll.OPTION_RESULT', { count: voteCount, percent });
    // The bar is decorative; count/percent live in the accessible name (via
    // aria-label on the control itself) as well as in adjacent visible text —
    // width alone must never be the only signal (WO risk note).
    const accessibleLabel = `${option.text || option.label}, ${resultText}${votedByMe ? `, ${t('MessagingPoll.YOU_VOTED')}` : ''}`;
    // MSG-6i scope B: "airier, not wider" (operator, after seeing a
    // screenshot of the checkbox/text/percent squeezed onto one tight line
    // with a thin bar close to the text) -- more internal spacing/a taller
    // bar, not a wider bubble (MessageBubble.jsx's maxWidth is untouched).
    const richLabel = <Stack sx={{ flex: 1, minWidth: 0, opacity: pending.has(option.id) ? 0.6 : 1 }} spacing={0.75}>
      {/* MSG-6j: `justifyContent: 'space-between'` only distributes LEFTOVER width -- but
          this row sits inside a `MessageBubble` sized `width: fit-content` around this exact
          content, so there is by construction no leftover width, and space-between alone
          reserved a zero-width gap (the reported bug: label text ran directly into the
          vote-count/percent text). `spacing` adds a real minimum gap via margin, independent
          of justify-content, so the two never touch regardless of available width. */}
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" noWrap>{option.text || option.label}</Typography>
        <Typography variant="caption" color="text.secondary">{resultText}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={percent} sx={{ borderRadius: 1, height: 8 }} color={votedByMe ? 'primary' : 'inherit'} />
    </Stack>;
    return { accessibleLabel, richLabel };
  };
  const formControlSx = { width: '100%', m: 0, alignItems: 'flex-start' };

  // MSG-6j: a short question/option set could otherwise pull the whole `MessageBubble`
  // (`width: fit-content`) in tighter than comfortable to read. 260px stays under the
  // bubble's own `maxWidth: min(75%, 680px)` ceiling even at a 375px viewport (75% = 281px)
  // -- verified at that width, not just desktop.
  return <Paper variant="outlined" sx={{ p: 1.5, minWidth: 260 }} aria-label={t('MessagingPoll.LABEL')}><Stack spacing={1.5}>
    <Typography variant="subtitle2">{poll.question}</Typography>
    {poll.allow_multiple
      ? (poll.options || []).map((option) => {
          const { accessibleLabel, richLabel } = optionLabel(option);
          return <FormControlLabel key={option.id} disabled={closed} sx={formControlSx} label={richLabel}
            control={<Checkbox checked={selected.includes(option.id)} inputProps={{ 'aria-label': accessibleLabel }} onChange={() => tap(option.id)} sx={{ pt: 0.25 }} />} />;
        })
      // No RadioGroup-level onChange: it would only ever hand back
      // `event.target.value`, a DOM string -- coercing a non-string option id
      // (dcm's are UUID strings today, but the id type isn't a guaranteed
      // contract). `value` alone still drives each Radio's `checked` via the
      // group's own comparison; each Radio's own `onChange` below fires
      // `tap` with the option's real, correctly-typed id, matching the
      // Checkbox branch above exactly.
      : <RadioGroup value={selected[0] ?? ''} name={`poll-${poll.id}-options`}>
          {(poll.options || []).map((option) => {
            const { accessibleLabel, richLabel } = optionLabel(option);
            return <FormControlLabel key={option.id} value={option.id} disabled={closed} sx={formControlSx} label={richLabel}
              control={<Radio inputProps={{ 'aria-label': accessibleLabel }} onChange={() => tap(option.id)} sx={{ pt: 0.25 }} />} />;
          })}
        </RadioGroup>}
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    <Stack direction="row" spacing={1} alignItems="center">
      {canClose && !closed && <Button size="small" color="warning" onClick={close} disabled={busy}>{t('MessagingPoll.CLOSE')}</Button>}
      {closed && <Chip size="small" icon={<LockOutlinedIcon fontSize="small" />} label={t('MessagingPoll.CLOSED')} />}
    </Stack>
  </Stack></Paper>;
}
