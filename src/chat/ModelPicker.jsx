import React, { useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Drawer, IconButton, List, ListItemButton, ListItemText, Popover, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

const LEVELS = ['top', 'best', 'balanced', 'fast'];
const EFFORTS = ['low', 'medium', 'high', 'max'];
export const CHAT_MODEL_TRIGGER_SX = { minWidth: 0, px: 1.25, color: 'text.secondary', whiteSpace: 'nowrap', flexShrink: 0, maxWidth: { xs: 140, sm: 'none' } };
// The short label sits at the end of the compact composer's context row, which clips the host content first.
export const CHAT_MODEL_TRIGGER_SHORT_SX = { ...CHAT_MODEL_TRIGGER_SX, maxWidth: 'none' };
export const CHAT_MODEL_ENTRY_SX ={ borderRadius: 1, alignItems: 'flex-start' };
export const CHAT_MODEL_EFFORT_SX = { flex: 1, minWidth: 0 };
export const CHAT_MODEL_CLOSE_SX = { ml: 'auto' };

const supported = (entry, effort) => entry?.efforts?.includes(effort);
const validSelection = (entries, selection) => {
  const entry = entries.find((item) => item.id === selection?.entry);
  return entry && supported(entry, selection?.effort) ? selection : null;
};
const fallback = (entries) => {
  const entry = entries.find((item) => item.default) || entries[0];
  return entry ? { entry: entry.id, effort: entry.efforts?.[0] } : null;
};
const cleanLabel = (entry, shortLabel = false) => {
  const withoutVersion = (entry?.label || entry?.model || '').replace(/\s+\d+(?:\.\d+)*$/, '');
  return shortLabel ? withoutVersion.replace(/^(?:(?:Claude|Anthropic|OpenAI)\s+)+/i, '') : withoutVersion;
};

function estimateText(entry, effort, t, language) {
  if (entry.billing === 'subscription') return t('Chat.noTokenSubscription');
  const estimate = entry.estimate?.[effort];
  if (!estimate) return null;
  if (estimate.unit === 'tokens') {
    const format = new Intl.NumberFormat(language);
    return t('Chat.estimateTokens', { lo: format.format(estimate.min), hi: format.format(estimate.max) });
  }
  if (estimate.unit === 'level') {
    const level = Math.min(3, Math.max(1, Math.round(estimate.min)));
    return <Box component="span" aria-label={t(`Chat.costScale.${level}`)}>{'●'.repeat(level)}{'○'.repeat(3 - level)}</Box>;
  }
  return null;
}

export function ModelPicker({ entries = [], selection, onChange, disabled = false, open, onOpenChange, sheet, balance = null, longChat = false, onNewChat, shortLabel = false }) {
  const { t, i18n } = useTranslation();
  const language = typeof i18n?.language === 'string' ? i18n.language.split('_')[0] || undefined : undefined;
  const theme = useTheme();
  const viewportNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const narrow = sheet ?? viewportNarrow;
  const anchor = useRef(null);
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = (value) => { setInnerOpen(value); onOpenChange?.(value); };
  const activeSelection = useMemo(() => validSelection(entries, selection) || fallback(entries), [entries, selection]);
  const active = entries.find((entry) => entry.id === activeSelection?.entry);
  const effort = activeSelection?.effort;
  const hasTokenEstimates = entries.some((entry) => Object.values(entry.estimate || {}).some((item) => item.unit === 'tokens'));
  const grouped = LEVELS.map((level) => [level, entries.filter((entry) => entry.level === level)]).filter(([, items]) => items.length);
  const unknown = entries.filter((entry) => !LEVELS.includes(entry.level));
  const selectEntry = (entry) => onChange?.({ entry: entry.id, effort: supported(entry, effort) ? effort : entry.efforts?.[0] });
  const providerName = (entry) => ({ anthropic: 'Anthropic', claude_code: 'Anthropic', openai: 'OpenAI' })[entry.provider];
  const entryRow = (entry) => {
    const shown = supported(entry, effort) ? effort : entry.efforts?.[0];
    const estimate = estimateText(entry, shown, t, language);
    const provider = providerName(entry);
    const checked = entry.id === active?.id;
    return <ListItemButton key={entry.id} role="radio" aria-checked={checked} tabIndex={checked ? 0 : -1} data-model-entry={entry.id} selected={checked} sx={CHAT_MODEL_ENTRY_SX} onClick={() => selectEntry(entry)}>
      <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.label || entry.model}</Typography>} secondary={<>{provider ? t('Chat.by', { provider }) : null}{estimate ? <Box component="span" sx={{ display: 'block' }}>{estimate}</Box> : null}</>} />
    </ListItemButton>;
  };
  // Radio-group keyboard behaviour: arrows move the focus and the choice, only the checked row is a tab stop.
  const moveSelection = (event) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(event.key in keys)) return;
    const order = [...grouped.flatMap(([, items]) => items), ...unknown];
    const at = order.findIndex((entry) => entry.id === active?.id);
    const next = order[(at + keys[event.key] + order.length) % order.length];
    if (!next) return;
    event.preventDefault();
    selectEntry(next);
    [...event.currentTarget.querySelectorAll('[data-model-entry]')].find((node) => node.dataset.modelEntry === next.id)?.focus();
  };
  const content = (
    <Box role="dialog" aria-labelledby="chat-model-picker-title" sx={{ p: 2, width: narrow ? 'auto' : 360, maxWidth: '100%', maxHeight: narrow ? '82vh' : 'min(640px, 80vh)', overflowY: 'auto' }}>
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography id="chat-model-picker-title" variant="subtitle1" sx={{ fontWeight: 600 }}>{t('Chat.pickerTitle')}</Typography>
          <IconButton aria-label={t('Chat.close')} size="small" sx={CHAT_MODEL_CLOSE_SX} onClick={() => setOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Box role="radiogroup" aria-labelledby="chat-model-picker-title" onKeyDown={moveSelection}>
          {grouped.map(([level, items]) => <Box key={level}>
            <Typography variant="subtitle2">{t(`Chat.level.${level}`)}</Typography>
            <Typography variant="caption" color="text.secondary">{t(`Chat.levelHint.${level}`)}</Typography>
            <List dense disablePadding>{items.map(entryRow)}</List>
          </Box>)}
          {unknown.length ? <List dense disablePadding>{unknown.map(entryRow)}</List> : null}
        </Box>
        {active ? <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>{t('Chat.effortQuestion')}</Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" value={effort || null} aria-label={t('Chat.effortQuestion')} onChange={(_event, next) => { if (next) onChange?.({ entry: active.id, effort: next }); }}>
            {EFFORTS.filter((item) => active.efforts?.includes(item)).map((item) => <ToggleButton key={item} value={item} sx={CHAT_MODEL_EFFORT_SX}>{t(`Chat.effort.${item}`)}</ToggleButton>)}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">{t(hasTokenEstimates ? 'Chat.effortHintTokens' : 'Chat.effortHint')}</Typography>
        </Box> : null}
        {longChat ? <Alert severity="warning" action={onNewChat ? <Button color="inherit" size="small" onClick={onNewChat}>{t('Chat.newConversation')}</Button> : null}>{t('Chat.longChat')}</Alert> : null}
        {Number.isInteger(balance) && balance >= 0 ? <Typography variant="caption" color="text.secondary">{t('Chat.balanceLabel', { n: new Intl.NumberFormat(language).format(balance) })}</Typography> : null}
      </Stack>
    </Box>
  );
  const trigger = <Button ref={anchor} size="small" color="inherit" sx={shortLabel ? CHAT_MODEL_TRIGGER_SHORT_SX : CHAT_MODEL_TRIGGER_SX} disabled={disabled || !entries.length} onClick={() => setOpen(true)} aria-haspopup="dialog"><Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{active ? `${cleanLabel(active, shortLabel)} · ${t(`Chat.effort.${effort}`)} ▾` : t('Chat.chooseModel')}</Box></Button>;
  return <>{trigger}{narrow ? <Drawer anchor="bottom" open={isOpen} onClose={() => setOpen(false)}>{content}</Drawer> : <Popover open={isOpen} anchorEl={anchor.current} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'left' }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}>{content}</Popover>}</>;
}
export default ModelPicker;
