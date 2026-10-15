import React from 'react';
import { Button, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Message input. Send is disabled while a turn runs, for an archived chat and while the connection is down;
 * Stop replaces it during a turn. Enter sends, Shift+Enter inserts a line break.
 */
export function ChatComposer({ value = '', onChange, onSend, onStop, running = false, archived = false, connected = true, sx }) {
  const { t } = useTranslation();
  const blocked = archived || !connected;
  const canSend = !running && !blocked && value.trim().length > 0;
  const submit = () => { if (canSend) onSend?.(); };
  return (
    <Stack direction="row" alignItems="flex-end" gap={1} sx={{ p: { xs: 1, md: 2 }, borderTop: 1, borderColor: 'divider', ...sx }}>
      <TextField
        multiline
        maxRows={6}
        fullWidth
        size="small"
        value={value}
        disabled={blocked}
        placeholder={t('Chat.message')}
        slotProps={{ htmlInput: { 'aria-label': t('Chat.message') } }}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) { event.preventDefault(); submit(); }
        }}
      />
      {running ? <Button variant="outlined" sx={{ minHeight: 40 }} onClick={onStop}>{t('Chat.stop')}</Button> : null}
      <Button variant="contained" sx={{ minHeight: 40 }} onClick={submit} disabled={!canSend}>{t('Chat.send')}</Button>
    </Stack>
  );
}

export default ChatComposer;
