import { useId, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { extractApiErrorMessage, useMessaging } from './MessagingProvider';

/**
 * Starts direct conversations from host-provided people. Candidate discovery is
 * intentionally outside messaging because memberships are host-domain data.
 */
export function DirectMessageLauncher({ candidates = [], scope, onOpen }) {
  const { t } = useTranslation();
  const { openDirectConversation } = useMessaging();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const titleId = useId();

  const showPicker = () => {
    setSelectedId(null);
    setError(null);
    setOpen(true);
  };
  const closePicker = () => {
    if (!starting) setOpen(false);
  };
  const start = async () => {
    if (selectedId == null || starting) return;
    setStarting(true);
    setError(null);
    try {
      const conversation = await openDirectConversation({
        target_user_id: selectedId,
        ...(scope == null ? {} : { scope }),
      });
      setOpen(false);
      onOpen?.(conversation);
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError) || t('MessagingDirect.START_ERROR'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <Button variant="outlined" onClick={showPicker}>{t('MessagingDirect.LAUNCH')}</Button>
      <Dialog open={open} onClose={closePicker} fullScreen={fullScreen} aria-labelledby={titleId}>
        <DialogTitle id={titleId}>{t('MessagingDirect.TITLE')}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {starting && <Typography role="status" sx={{ mb: 1 }}><CircularProgress size={16} sx={{ mr: 1 }} />{t('MessagingDirect.STARTING')}</Typography>}
          {candidates.length === 0 ? (
            <Typography>{t('MessagingDirect.EMPTY')}</Typography>
          ) : (
            <List aria-label={t('MessagingDirect.CANDIDATES')}>
              {candidates.map((candidate) => (
                <ListItemButton
                  key={candidate.id}
                  selected={candidate.id === selectedId}
                  disabled={starting}
                  onClick={() => setSelectedId(candidate.id)}
                >
                  <ListItemText primary={candidate.display_name || candidate.name || candidate.label || candidate.id} />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePicker} disabled={starting}>{t('MessagingDirect.CANCEL')}</Button>
          <Button variant="contained" onClick={start} disabled={selectedId == null || starting}>
            {t('MessagingDirect.START')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
