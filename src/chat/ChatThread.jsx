import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MarkdownReply from './MarkdownReply';

export const CHAT_THREAD_TOOL_CHIP_SX = { alignSelf: 'flex-start' };
export const CHAT_THREAD_NOTICE_SX = { mb: 2 };
export const CHAT_THREAD_TRIMMED_SX = { mb: 1.5 };
export const CHAT_THREAD_TOOL_STEPS_SX = { alignItems: 'flex-start' };

const selectionLine = (turn, t) => [turn.model, turn.effort && t(`Chat.effort.${turn.effort}`)].filter(Boolean).join(' · ');
const sameSelection = (a, b) => a.driver === b.driver && a.model === b.model && a.effort === b.effort;

function SourceChips({ sources }) {
  const { t } = useTranslation();
  if (!sources?.length) return null;
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75} role="list" aria-label={t('Chat.sources')}>
      {sources.map((source, index) => (
        <Tooltip key={`${source.label}-${index}`} title={source.reference || ''} describeChild>
          <Chip role="listitem" size="small" variant="outlined" label={source.label} />
        </Tooltip>
      ))}
    </Stack>
  );
}

function Answer({ turn, tool, onRetry, chat, renderAnswerExtra, renderTurnError, usageToTokens, onNavigate }) {
  const { t, i18n } = useTranslation();
  const generating = turn.state === 'generating';
  const failed = ['failed', 'cancelled'].includes(turn.state) && turn.error_code;
  const turnError = failed && renderTurnError
    ? renderTurnError({ turn, chat, retry: onRetry ? () => onRetry(turn) : undefined })
    : null;
  const hasCustomTurnError = turnError !== null && turnError !== undefined && turnError !== false;
  const replyCaption = (turn) => {
    const tokens = turn.usage && usageToTokens?.(turn.usage);
    if (Number.isInteger(tokens) && tokens >= 0) {
      const count = new Intl.NumberFormat(typeof i18n?.language === 'string' ? i18n.language.split('_')[0] || undefined : undefined).format(tokens);
      return [turn.model, turn.effort && t(`Chat.effort.${turn.effort}`), t('Chat.replyTokens', { n: count })].filter(Boolean).join(' · ');
    }
    return selectionLine(turn, t);
  };
  return (
    <Stack spacing={1} aria-busy={generating}>
      {turn.assistant_text ? <MarkdownReply text={turn.assistant_text} onNavigate={onNavigate} /> : null}
      {generating && !turn.assistant_text && !tool ? <Typography variant="body2" color="text.secondary">{t('Chat.typing')}</Typography> : null}
      {generating && tool ? <Chip size="small" color="primary" variant="outlined" label={tool.label} sx={CHAT_THREAD_TOOL_CHIP_SX} /> : null}
      {!generating && turn.tool_steps?.length ? <Stack direction="row" flexWrap="wrap" gap={0.75} role="list" aria-label={t('Chat.toolSteps')} sx={CHAT_THREAD_TOOL_STEPS_SX}>
        {turn.tool_steps.map((step, index) => <Chip key={`${step.name || step.label}-${index}`} role="listitem" size="small" variant="outlined" label={step.label} sx={CHAT_THREAD_TOOL_CHIP_SX} />)}
      </Stack> : null}
      <SourceChips sources={turn.sources} />
      {!generating && replyCaption(turn) ? <Typography variant="caption" color="text.secondary">{replyCaption(turn)}</Typography> : null}
      {renderAnswerExtra ? <React.Fragment key={chat?.id}>{renderAnswerExtra({ turn, chat, appFrames: turn.appFrames ?? [] })}</React.Fragment> : null}
      {turn.state === 'interrupted' ? (
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip size="small" color="warning" label={t('Chat.interrupted')} />
          {onRetry ? <Button size="small" onClick={() => onRetry(turn)}>{t('Chat.retry')}</Button> : null}
        </Stack>
      ) : null}
      {failed ? (
        hasCustomTurnError ? turnError : <Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={() => onRetry(turn)}>{t('Chat.retry')}</Button> : null}>
          {t('Chat.answerIncomplete')}
        </Alert>
      ) : null}
    </Stack>
  );
}

/**
 * The turns of one chat. The streaming answer is simply the last turn in state `generating`; the caller keeps its text
 * up to date. `notice` is a connection or limit message shown under the last turn. `readOnly` (an archived chat) hides Retry.
 */
export function ChatThread({ turns = [], tool = null, notice = null, hasOlder = false, olderBusy = false, onLoadOlder, onRetry, readOnly = false, sx, chat, renderAnswerExtra, renderTurnError, trimmedCount, summary = null, usageToTokens, onNavigate }) {
  const { t } = useTranslation();
  const end = useRef(null);
  const scroller = useRef(null);
  const heightBeforeOlder = useRef(null);
  const pinned = useRef(true); // follow the stream only while the reader is at the bottom
  const last = turns[turns.length - 1];
  // Follow the stream, but only when new content arrives at the end (not when older turns are prepended).
  useEffect(() => { if (pinned.current) end.current?.scrollIntoView?.({ block: 'end' }); }, [last?.id, last?.assistant_text, last?.state]);

  // Keep the reader's position when older turns are prepended.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && heightBeforeOlder.current !== null) el.scrollTop += el.scrollHeight - heightBeforeOlder.current;
    heightBeforeOlder.current = null;
  }, [turns[0]?.id]);
  const loadingOlder = useRef(false); // one request at a time, also across rapid scroll events
  const loadOlder = async () => {
    if (loadingOlder.current) return;
    loadingOlder.current = true;
    heightBeforeOlder.current = scroller.current?.scrollHeight ?? null;
    try { await onLoadOlder?.(); } finally { loadingOlder.current = false; }
  };
  const [summaryOpen, setSummaryOpen] = useState(false);
  useEffect(() => { setSummaryOpen(false); }, [chat?.id, summary?.up_to_seq]);
  const summaryVisible = Boolean(summary?.text?.trim());
  const renderSummary = () => summaryVisible ? <Box sx={{ mb: 2 }}><Button size="small" aria-expanded={summaryOpen} onClick={() => setSummaryOpen((value) => !value)}>{t('Chat.summaryUntilHere')} {summaryOpen ? '▾' : '▸'}</Button>{summaryOpen ? <Typography component="div" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{summary.text}</Typography> : null}</Box> : null;
  let summaryRendered = false;

  return (
    <Box ref={scroller} onScroll={(event) => {
      const el = event.currentTarget;
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (hasOlder && !olderBusy && el.scrollTop <= 40) loadOlder();
    }} role="log" aria-live="polite" aria-label={t('Chat.thread')} sx={{ minHeight: 0, flex: 1, overflowY: 'auto', p: { xs: 1.5, md: 2.5 }, ...sx }}>
      {hasOlder ? (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Button size="small" onClick={loadOlder} disabled={olderBusy}>{t('Chat.loadOlder')}</Button>
        </Box>
      ) : null}
      {turns.length === 0 ? (
        <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 6 }}>{t('Chat.emptyTitle')}</Typography>
      ) : null}
      {turns.map((turn, index) => {
        const previous = turns[index - 1];
        return (
          <Box key={turn.id ?? index} sx={{ mb: 3 }}>
            {!summaryRendered && summaryVisible && turn.seq > summary.up_to_seq ? (summaryRendered = true, renderSummary()) : null}
            {previous && !sameSelection(previous, turn) ? (
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2, color: 'text.secondary' }} role="separator">
                <Box sx={{ flex: 1, borderTop: 1, borderColor: 'divider' }} />
                <Typography variant="caption">{t('Chat.modelChanged', { model: selectionLine(turn, t) })}</Typography>
                <Box sx={{ flex: 1, borderTop: 1, borderColor: 'divider' }} />
              </Stack>
            ) : null}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
              <Typography sx={{ maxWidth: '85%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', bgcolor: 'action.hover', borderRadius: 2, px: 1.5, py: 1 }}>
                {turn.user_text}
              </Typography>
            </Box>
            <Answer turn={turn} tool={index === turns.length - 1 ? tool : null} onRetry={readOnly ? undefined : onRetry} chat={chat} renderAnswerExtra={renderAnswerExtra} renderTurnError={renderTurnError} usageToTokens={usageToTokens} onNavigate={onNavigate} />
          </Box>
        );
      })}
      {!summaryRendered ? renderSummary() : null}
      {trimmedCount ? <Chip size="small" variant="outlined" label={t(trimmedCount === 1 ? 'Chat.historyTrimmed_one' : 'Chat.historyTrimmed_other', { count: trimmedCount })} sx={CHAT_THREAD_TRIMMED_SX} /> : null}
      {notice ? (
        <Alert
          severity={notice.severity || 'warning'}
          sx={CHAT_THREAD_NOTICE_SX}
          action={notice.action ? <Button color="inherit" size="small" onClick={notice.action.onClick}>{notice.action.label}</Button> : null}
        >
          {notice.text}
        </Alert>
      ) : null}
      <div ref={end} />
    </Box>
  );
}

export default ChatThread;
