import React, { useMemo, useRef, useState } from 'react';
import { Box, Button, Drawer, IconButton, List, ListItemButton, Popover, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

const LEVELS = ['top', 'best', 'balanced', 'fast'];
const EFFORTS = ['low', 'medium', 'high', 'max'];
const EFFORT_LABELS = { low: 'Low', medium: 'Medium', high: 'High', max: 'Max' };
export const CHAT_MODEL_TRIGGER_SX = { minWidth: 0, px: 1.25, color: 'text.secondary', whiteSpace: 'nowrap', flexShrink: 0, maxWidth: { xs: 140, sm: 'none' } };
// The short label sits at the end of the compact composer's context row, which clips the host content first.
export const CHAT_MODEL_TRIGGER_SHORT_SX = { ...CHAT_MODEL_TRIGGER_SX, maxWidth: 'none' };
export const CHAT_MODEL_ENTRY_SX = { borderRadius: 1, alignItems: 'center' };
export const CHAT_MODEL_ENTRY_CONTENT_SX = { display: 'flex', alignItems: 'center', width: '100%', gap: 1 };
export const CHAT_MODEL_COST_SX = { ml: 'auto', textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 };
export const CHAT_MODEL_EFFORT_SX = { flex: 1, minWidth: 0 };
export const CHAT_MODEL_CLOSE_SX = { ml: 'auto' };
export const CHAT_MODEL_PANEL_SX = { p: 2, width: 300, maxWidth: '100%', maxHeight: 'min(640px, 80vh)', overflowY: 'auto' };
export const CHAT_MODEL_PANEL_SHEET_SX = { ...CHAT_MODEL_PANEL_SX, width: '100%', maxHeight: '82vh' };

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
  if (entry.billing === 'subscription') return t('Chat.subscriptionShort');
  const estimate = entry.estimate?.[effort];
  if (!estimate) return null;
  if (estimate.unit === 'tokens') {
    // One short value per row (UCM-CHAT-12 prototype "≈ 2–6k Token"): thousands are shown as "k" so the label never wraps.
    if (estimate.max >= 1000) {
      const thousands = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
      return t('Chat.estimateTokensShort', { lo: thousands.format(estimate.min / 1000), hi: `${thousands.format(estimate.max / 1000)}k` });
    }
    const format = new Intl.NumberFormat(language);
    return t('Chat.estimateTokensShort', { lo: format.format(estimate.min), hi: format.format(estimate.max) });
  }
  if (estimate.unit === 'level') {
    const level = Math.min(3, Math.max(1, Math.round(estimate.min)));
    return <Box component="span" aria-label={t(`Chat.costScale.${level}`)}>{'●'.repeat(level)}{'○'.repeat(3 - level)}</Box>;
  }
  return null;
}

export function ModelPicker({ entries = [], selection, onChange, disabled = false, open, onOpenChange, balance = null, shortLabel = false }) {
  const { t, i18n } = useTranslation();
  const language = typeof i18n?.language === 'string' ? i18n.language.split('_')[0] || undefined : undefined;
  const theme = useTheme();
  const viewportNarrow = useMediaQuery(theme.breakpoints.down('md'));
  // The bottom sheet only on a narrow viewport, whatever the chat container's width (UCM-CHAT-12).
  const narrow = viewportNarrow;
  const anchor = useRef(null);
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = (value) => { setInnerOpen(value); onOpenChange?.(value); };
  const activeSelection = useMemo(() => validSelection(entries, selection) || fallback(entries), [entries, selection]);
  const active = entries.find((entry) => entry.id === activeSelection?.entry);
  const effort = activeSelection?.effort;
  const grouped = LEVELS.map((level) => [level, entries.filter((entry) => entry.level === level)]).filter(([, items]) => items.length);
  const unknown = entries.filter((entry) => !LEVELS.includes(entry.level));
  const orderedEntries = [...grouped.flatMap(([, items]) => items), ...unknown];
  const selectEntry = (entry) => onChange?.({ entry: entry.id, effort: supported(entry, effort) ? effort : entry.efforts?.[0] });
  const entryRow = (entry) => {
    const shown = supported(entry, effort) ? effort : entry.efforts?.[0];
    const estimate = estimateText(entry, shown, t, language);
    const checked = entry.id === active?.id;
    return <ListItemButton key={entry.id} role="radio" aria-checked={checked} tabIndex={checked ? 0 : -1} data-model-entry={entry.id} selected={checked} sx={CHAT_MODEL_ENTRY_SX} onClick={() => selectEntry(entry)}>
      <Box sx={CHAT_MODEL_ENTRY_CONTENT_SX}><Typography variant="body2" fontWeight={checked ? 600 : 400}>{entry.label || entry.model}</Typography>{estimate ? <Typography variant="caption" color="text.secondary" sx={CHAT_MODEL_COST_SX}>{estimate}</Typography> : null}</Box>
    </ListItemButton>;
  };
  // Radio-group keyboard behaviour: arrows move the focus and the choice, only the checked row is a tab stop.
  const moveSelection = (event) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(event.key in keys)) return;
    const at = orderedEntries.findIndex((entry) => entry.id === active?.id);
    const next = orderedEntries[(at + keys[event.key] + orderedEntries.length) % orderedEntries.length];
    if (!next) return;
    event.preventDefault();
    selectEntry(next);
    [...event.currentTarget.querySelectorAll('[data-model-entry]')].find((node) => node.dataset.modelEntry === next.id)?.focus();
  };
  const content = (
    <Box role="dialog" aria-labelledby="chat-model-picker-title" sx={narrow ? CHAT_MODEL_PANEL_SHEET_SX : CHAT_MODEL_PANEL_SX}>
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography id="chat-model-picker-title" variant="subtitle1" sx={{ fontWeight: 600 }}>{t('Chat.pickerTitle')}</Typography>
          <IconButton aria-label={t('Chat.close')} size="small" sx={CHAT_MODEL_CLOSE_SX} onClick={() => setOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Box role="radiogroup" aria-labelledby="chat-model-picker-title" onKeyDown={moveSelection}>
          <List dense disablePadding>{orderedEntries.map(entryRow)}</List>
        </Box>
        {active ? <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>{t('Chat.effortLabel')}</Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" value={effort || null} aria-label={t('Chat.effortLabel')} onChange={(_event, next) => { if (next) onChange?.({ entry: active.id, effort: next }); }}>
            {EFFORTS.filter((item) => active.efforts?.includes(item)).map((item) => <ToggleButton key={item} value={item} sx={CHAT_MODEL_EFFORT_SX}>{EFFORT_LABELS[item]}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box> : null}
        {Number.isInteger(balance) && balance >= 0 ? <Typography variant="caption" color="text.secondary">{t('Chat.balanceLabel', { n: new Intl.NumberFormat(language).format(balance) })}</Typography> : null}
      </Stack>
    </Box>
  );
  const trigger = <Button ref={anchor} size="small" color="inherit" sx={shortLabel ? CHAT_MODEL_TRIGGER_SHORT_SX : CHAT_MODEL_TRIGGER_SX} disabled={disabled || !entries.length} onClick={() => setOpen(true)} aria-haspopup="dialog"><Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{active ? `${cleanLabel(active, shortLabel)} · ${t(`Chat.effort.${effort}`)} ▾` : t('Chat.chooseModel')}</Box></Button>;
  return <>{trigger}{narrow ? <Drawer anchor="bottom" open={isOpen} onClose={() => setOpen(false)}>{content}</Drawer> : <Popover open={isOpen} anchorEl={anchor.current} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'left' }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}>{content}</Popover>}</>;
}
export default ModelPicker;
