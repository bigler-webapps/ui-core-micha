import React, { useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Drawer, List, ListItemButton, ListItemText, Popover, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const EFFORT_LEVELS = ['low', 'medium', 'high', 'max'];
export const driverName = (t, id) => t(`Chat.driver.${id}`, { defaultValue: id });

const groupByDriver = (entries) => entries.reduce((groups, entry) => {
  (groups[entry.driver] = groups[entry.driver] || []).push(entry);
  return groups;
}, {});

/**
 * Model and effort of one chat. A popover at wide widths, a bottom sheet at narrow widths. `onChange` receives
 * `{ entry, effort }`; the caller persists it (the change applies from the next turn). Can be controlled with `open`.
 */
export function ModelPicker({ entries = [], selection, onChange, disabled = false, open, onOpenChange, sheet }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const viewportNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const narrow = sheet ?? viewportNarrow;
  const anchor = useRef(null);
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = (value) => { setInnerOpen(value); onOpenChange?.(value); };
  const groups = useMemo(() => groupByDriver(entries), [entries]);
  const active = entries.find((entry) => entry.id === selection?.entry);

  const pickEntry = (entry) => {
    const effort = entry.efforts?.includes(selection?.effort) ? selection.effort : entry.efforts?.[0];
    onChange?.({ entry: entry.id, effort });
  };

  const content = (
    <Box sx={{ p: 2, minWidth: narrow ? 0 : 320, maxWidth: '100%' }}>
      <Stack spacing={1.5}>
        {Object.entries(groups).map(([driver, items]) => (
          <Box key={driver} role="group" aria-label={driverName(t, driver)}>
            <Typography variant="overline" color="text.secondary">{driverName(t, driver)}</Typography>
            <List dense disablePadding>
              {items.map((entry) => (
                <ListItemButton key={entry.id} selected={entry.id === selection?.entry} onClick={() => pickEntry(entry)} sx={{ minHeight: 40, borderRadius: 1 }}>
                  <ListItemText primary={entry.label || entry.model} />
                  {entry.billing === 'pay_per_use' ? <Chip size="small" variant="outlined" label={t('Chat.payPerUse')} /> : null}
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
        <Box>
          <Typography variant="overline" color="text.secondary">{t('Chat.effortLabel')}</Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            aria-label={t('Chat.effortLabel')}
            value={selection?.effort || null}
            onChange={(_event, effort) => { if (effort && active) onChange?.({ entry: active.id, effort }); }}
          >
            {EFFORT_LEVELS.map((effort) => (
              <ToggleButton key={effort} value={effort} disabled={!active?.efforts?.includes(effort)} sx={{ minHeight: 40 }}>
                {t(`Chat.effort.${effort}`)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </Box>
  );

  const label = active ? [active.label || active.model, selection?.effort && t(`Chat.effort.${selection.effort}`)].filter(Boolean).join(' · ') : t('Chat.chooseModel');
  return (
    <>
      <Button ref={anchor} size="small" color="inherit" disabled={disabled || entries.length === 0} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {label}
      </Button>
      {narrow ? (
        <Drawer anchor="bottom" open={isOpen} onClose={() => setOpen(false)}>{content}</Drawer>
      ) : (
        <Popover open={isOpen} anchorEl={anchor.current} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>{content}</Popover>
      )}
    </>
  );
}

export default ModelPicker;
