import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import { MemoryRouter } from 'react-router-dom';
import { Box, Button, ButtonGroup, CssBaseline, FormControl, InputLabel, MenuItem, Paper, Select, Stack, ThemeProvider, Typography, createTheme } from '@mui/material';

import { chartsTranslations } from '../src/i18n/chartsTranslations';
import { notificationsTranslations } from '../src/i18n/notificationsTranslations';
import { messagingTranslations } from '../src/i18n/messagingTranslations';
import { createAppTheme } from '../src/theme/createAppTheme';
import { entries } from './entries';
import { MockTransportProvider } from './mockTransport';

const translations = Object.fromEntries(
  Object.entries({ ...notificationsTranslations, ...chartsTranslations, ...messagingTranslations }).map(([key, value]) => [key, value.en]),
);
Object.assign(translations, {
  'harness.caseUpdated': 'Case updated',
  'harness.caseUpdatedBody': 'The case is ready for review.',
  'harness.caseAssigned': 'Case assigned',
  'harness.caseAssignedBody': 'A case was assigned to you.',
});

const i18n = i18next.createInstance();
i18n.init({ lng: 'en', fallbackLng: 'en', resources: { en: { translation: translations } }, interpolation: { escapeValue: false } });

function Harness() {
  const [entryId, setEntryId] = useState(entries[0].id);
  const [mode, setMode] = useState('light');
  const [width, setWidth] = useState('desktop');
  const entry = entries.find((item) => item.id === entryId) || entries[0];
  const usesBaselineTheme = ['theme-baseline', 'mobile-bottom-nav'].includes(entry.id);
  const usesBrowserViewport = entry.id === 'mobile-bottom-nav';
  const effectiveMode = usesBaselineTheme ? 'light' : mode;
  const theme = useMemo(
    () => usesBaselineTheme
      ? createAppTheme({ palette: { primary: { main: '#3D5A99' } } })
      : createTheme({ palette: { mode } }),
    [mode, usesBaselineTheme],
  );
  const viewportWidth = width === 'mobile' ? 390 : width === 'tablet' ? 768 : 1180;
  const Entry = entry.Component;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', p: 3, bgcolor: 'background.default' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ md: 'center' }}>
          <Typography variant="h5" sx={{ mr: 'auto' }}>ui-core-micha harness</Typography>
          <FormControl size="small" sx={{ minWidth: 220 }}><InputLabel id="entry-label">Entry</InputLabel><Select labelId="entry-label" label="Entry" value={entryId} onChange={(event) => setEntryId(event.target.value)}>{entries.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}</Select></FormControl>
          <ButtonGroup size="small"><Button variant={effectiveMode === 'light' ? 'contained' : 'outlined'} onClick={() => setMode('light')}>Light</Button><Button disabled={usesBaselineTheme} variant={effectiveMode === 'dark' ? 'contained' : 'outlined'} onClick={() => setMode('dark')}>Dark</Button></ButtonGroup>
          {usesBrowserViewport ? (
            <Typography variant="caption" color="text.secondary">Use the browser viewport for this specimen</Typography>
          ) : (
            <ButtonGroup size="small">{['mobile', 'tablet', 'desktop'].map((size) => <Button key={size} variant={width === size ? 'contained' : 'outlined'} onClick={() => setWidth(size)}>{size}</Button>)}</ButtonGroup>
          )}
        </Stack>
        <Paper variant="outlined" sx={{ width: viewportWidth, maxWidth: '100%', mx: 'auto', p: 3, overflow: 'hidden', containerType: 'inline-size' }}>
          <Entry />
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><I18nextProvider i18n={i18n}><MemoryRouter><MockTransportProvider><Harness /></MockTransportProvider></MemoryRouter></I18nextProvider></StrictMode>,
);
