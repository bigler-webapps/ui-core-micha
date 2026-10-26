import React from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

/**
 * Message input. Send is disabled while a turn runs, for an archived chat and while the connection is down;
 * Stop replaces it during a turn. Enter sends, Shift+Enter inserts a line break.
 *
 * `layout="compact"` (UCM-CHAT-7) stacks an optional one-line `notice` (`{ text, action, onAction, onDismiss }`),
 * a context row (`context`, then `actions` at its end; never wraps, the context is clipped first) and a full-width
 * input row with an icon Send that becomes Stop while running. The default `standard` layout is unchanged.
 */
export const CHAT_COMPOSER_INPUT_SX = { flex: '1 1 12rem', minWidth: 0 };
export const CHAT_COMPOSER_COMPACT_ROOT_SX = { display: 'flex', flexDirection: 'column', gap: 0.75, p: { xs: 1, md: 1.5 }, borderTop: 1, borderColor: 'divider', minWidth: 0, contain: 'layout paint' };
export const CHAT_COMPOSER_STANDARD_ROOT_SX = { p: { xs: 1, md: 2 }, borderTop: 1, borderColor: 'divider', contain: 'layout paint' };
export const CHAT_COMPOSER_CONTEXT_ROW_SX = { display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 30, minWidth: 0, flexWrap: 'nowrap' };
export const CHAT_COMPOSER_CONTEXT_SX = { minWidth: 0, flex: '1 1 auto', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' };
export const CHAT_COMPOSER_CONTEXT_ACTIONS_SX = { flex: '0 0 auto', minWidth: 0, whiteSpace: 'nowrap' };
export const CHAT_COMPOSER_INPUT_ROW_SX = { display: 'flex', alignItems: 'flex-end', gap: 0.5, minWidth: 0, p: '3px 3px 3px 10px', border: 1, borderColor: 'divider', borderRadius: 1, '&:focus-within': { borderColor: 'primary.main', boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}33` } };
export const CHAT_COMPOSER_COMPACT_FIELD_SX = { flex: '1 1 auto', minWidth: 0, '& .MuiOutlinedInput-root': { p: 0, alignItems: 'flex-end' }, '& .MuiOutlinedInput-notchedOutline': { border: 0 }, '& .MuiInputBase-inputMultiline': { px: 0, py: 1.5, maxHeight: '7.5em', overflowY: 'auto' } };
export const CHAT_COMPOSER_ACTION_SX = { width: 36, height: 36, flex: '0 0 36px' };
// Send is the filled primary action of the input row, as in the prototype; Stop keeps the plain icon button.
export const CHAT_COMPOSER_SEND_SX = {
  ...CHAT_COMPOSER_ACTION_SX,
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  '&:hover': { bgcolor: 'primary.dark' },
  '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
};
export const CHAT_COMPOSER_NOTICE_SX = { display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, minHeight: 32, px: 1, color: 'text.secondary', bgcolor: 'action.hover', borderRadius: 1 };
export const CHAT_COMPOSER_NOTICE_TEXT_SX = { minWidth: 0, flex: '1 1 auto', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' };
export const CHAT_COMPOSER_NOTICE_ACTION_SX = { flex: '0 0 auto', minWidth: 0, p: 0.25, whiteSpace: 'nowrap' };
export const CHAT_COMPOSER_NOTICE_CLOSE_SX = { width: 28, height: 28, flex: '0 0 28px' };
export const CHAT_COMPOSER_USAGE_METER_SX = { height: 3 };

function CompactNotice({ notice, t }) {
  if (!notice) return null;
  const details = React.isValidElement(notice) ? { content: notice } : notice;
  if (!details || typeof details !== 'object') return notice;
  return (
    <Box role="status" sx={CHAT_COMPOSER_NOTICE_SX}>
      <Box component="span" sx={CHAT_COMPOSER_NOTICE_TEXT_SX}>{details.text || details.content}</Box>
      {details.action ? <Button size="small" color="inherit" sx={CHAT_COMPOSER_NOTICE_ACTION_SX} onClick={details.onAction}>{details.action}</Button> : null}
      <IconButton aria-label={t('Chat.dismissNotice')} size="small" sx={CHAT_COMPOSER_NOTICE_CLOSE_SX} onClick={details.onDismiss}><CloseIcon fontSize="small" /></IconButton>
    </Box>
  );
}

function UsageLimit({ usageLimit, t, language }) {
  if (!usageLimit) return null;
  const format = (micros) => new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(micros / 1000000);
  const reached = usageLimit.usedUsdMicros >= usageLimit.limitUsdMicros;
  const date = new Date(usageLimit.resetsAt);
  const resetDate = Number.isNaN(date.getTime()) ? usageLimit.resetsAt : new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
  const usageText = t('Chat.limitUsage', { used: format(usageLimit.usedUsdMicros), limit: format(usageLimit.limitUsdMicros) });
  return <Stack spacing={0.5}>
    {reached
      ? <><Typography variant="caption" color="text.secondary">{t(`Chat.limitReached.${usageLimit.period}`)}</Typography><Typography variant="caption" color="text.secondary">{t('Chat.limitResets', { date: resetDate })}</Typography></>
      : <Typography variant="caption" color="text.secondary">{usageText}</Typography>}
    <LinearProgress variant="determinate" aria-label={usageText} value={reached ? 100 : Math.min(100, (usageLimit.usedUsdMicros / usageLimit.limitUsdMicros) * 100)} sx={CHAT_COMPOSER_USAGE_METER_SX} />
  </Stack>;
}

export function ChatComposer({ value, onChange, onSend, onStop, running = false, archived = false, connected = true, inputRef, sx, actions, layout = 'standard', context, notice, usageLimit = null, draftRequest, onDraftRequestApplied }) {
  const { t, i18n } = useTranslation();
  const [internalDraft, setInternalDraft] = React.useState('');
  const appliedDraftRequest = React.useRef(undefined);
  const controlled = value !== undefined;
  const draft = controlled ? value : internalDraft;
  React.useLayoutEffect(() => {
    if (controlled || !draftRequest || draftRequest.seq === appliedDraftRequest.current) return;
    appliedDraftRequest.current = draftRequest.seq;
    setInternalDraft(typeof draftRequest.text === 'string' ? draftRequest.text : '');
    onDraftRequestApplied?.(draftRequest.seq);
  }, [controlled, draftRequest, onDraftRequestApplied]);
  const limitReached = Boolean(usageLimit && usageLimit.usedUsdMicros >= usageLimit.limitUsdMicros);
  const blocked = archived || !connected || limitReached;
  const language = typeof i18n?.language === 'string' ? i18n.language.split('_')[0] || undefined : undefined;
  const canSend = !running && !blocked && draft.trim().length > 0;
  const changeDraft = (next) => { if (controlled) onChange?.(next); else setInternalDraft(next); };
  const submit = () => {
    if (!canSend) return;
    if (controlled) onSend?.();
    else if (onSend?.(draft) === true) setInternalDraft('');
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) { event.preventDefault(); submit(); }
  };
  if (layout === 'compact') return (
    <Stack sx={sx ? [CHAT_COMPOSER_COMPACT_ROOT_SX, sx] : CHAT_COMPOSER_COMPACT_ROOT_SX}>
      <CompactNotice notice={notice} t={t} />
      <UsageLimit usageLimit={usageLimit} t={t} language={language} />
      <Stack direction="row" alignItems="center" sx={CHAT_COMPOSER_CONTEXT_ROW_SX}>
        <Box sx={CHAT_COMPOSER_CONTEXT_SX}>{context}</Box>
        {actions ? <Box sx={CHAT_COMPOSER_CONTEXT_ACTIONS_SX}>{actions}</Box> : null}
      </Stack>
      <Stack direction="row" alignItems="flex-end" sx={CHAT_COMPOSER_INPUT_ROW_SX}>
        <TextField
          multiline maxRows={5} variant="outlined" sx={CHAT_COMPOSER_COMPACT_FIELD_SX} size="small" value={draft}
          inputRef={inputRef} disabled={blocked} placeholder={t('Chat.message')}
          slotProps={{ htmlInput: { 'aria-label': t('Chat.message') } }}
          onChange={(event) => changeDraft(event.target.value)} onKeyDown={handleKeyDown}
        />
        {running
          ? <IconButton aria-label={t('Chat.stopAnswer')} title={t('Chat.stopAnswer')} sx={CHAT_COMPOSER_ACTION_SX} onClick={onStop}><StopIcon /></IconButton>
          : <IconButton aria-label={t('Chat.send')} sx={CHAT_COMPOSER_SEND_SX} onClick={submit} disabled={!canSend}><SendIcon fontSize="small" /></IconButton>}
      </Stack>
    </Stack>
  );
  return (
    <Stack direction="row" alignItems="flex-end" flexWrap="wrap" gap={1} sx={{ ...CHAT_COMPOSER_STANDARD_ROOT_SX, ...sx }}>
      {usageLimit ? <Stack flexBasis="100%"><UsageLimit usageLimit={usageLimit} t={t} language={language} /></Stack> : null}
      <TextField multiline maxRows={6} sx={CHAT_COMPOSER_INPUT_SX} size="small" value={draft} inputRef={inputRef} disabled={blocked} placeholder={t('Chat.message')}
        slotProps={{ htmlInput: { 'aria-label': t('Chat.message') } }} onChange={(event) => changeDraft(event.target.value)} onKeyDown={handleKeyDown} />
      {actions ? <Stack direction="row" alignItems="flex-end">{actions}</Stack> : null}
      {running ? <Button variant="outlined" onClick={onStop}>{t('Chat.stop')}</Button> : null}
      <Button variant="contained" onClick={submit} disabled={!canSend}>{t('Chat.send')}</Button>
    </Stack>
  );
}

export default ChatComposer;
