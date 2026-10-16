import React from 'react';
import { Button, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Message input. Send is disabled while a turn runs, for an archived chat and while the connection is down;
 * Stop replaces it during a turn. Enter sends, Shift+Enter inserts a line break.
 */
export const CHAT_COMPOSER_INPUT_SX = { flex: '1 1 12rem', minWidth: 0 };

export function ChatComposer({ value = '', onChange, onSend, onStop, running = false, archived = false, connected = true, inputRef, sx, actions }) {
  const { t } = useTranslation();
  const blocked = archived || !connected;
  const canSend = !running && !blocked && value.trim().length > 0;
  const submit = () => { if (canSend) onSend?.(); };
  return (
    <Stack direction="row" alignItems="flex-end" flexWrap="wrap" gap={1} sx={{ p: { xs: 1, md: 2 }, borderTop: 1, borderColor: 'divider', ...sx }}>
      <TextField
        multiline
        maxRows={6}
        sx={CHAT_COMPOSER_INPUT_SX}
        size="small"
        value={value}
        inputRef={inputRef}
        disabled={blocked}
        placeholder={t('Chat.message')}
        slotProps={{ htmlInput: { 'aria-label': t('Chat.message') } }}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) { event.preventDefault(); submit(); }
        }}
      />
      {actions ? <Stack direction="row" alignItems="flex-end">{actions}</Stack> : null}
      {running ? <Button variant="outlined" onClick={onStop}>{t('Chat.stop')}</Button> : null}
      <Button variant="contained" onClick={submit} disabled={!canSend}>{t('Chat.send')}</Button>
    </Stack>
  );
}

export default ChatComposer;
