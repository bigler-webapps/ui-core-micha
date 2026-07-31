import { Alert, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Switch, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractApiErrorMessage, useMessaging } from './MessagingProvider';

/** Provider-backed scope configuration surface; hosts choose its placement and capability gate. */
export function MessagingScopeConfig({ conversationId }) {
  const { t } = useTranslation();
  const { loadConversationConfig, saveConversationConfig } = useMessaging();
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { let live = true; loadConversationConfig(conversationId).then((value) => live && setConfig(value)).catch((loadError) => live && setError(t('MessagingConfig.LOAD_ERROR', { message: extractApiErrorMessage(loadError) }))); return () => { live = false; }; }, [conversationId, loadConversationConfig, t]);
  const update = async (patch) => { setSaving(true); setError(null); try { setConfig(await saveConversationConfig(conversationId, patch)); } catch (saveError) { setError(t('MessagingConfig.SAVE_ERROR', { message: extractApiErrorMessage(saveError) })); } finally { setSaving(false); } };
  if (!config) return <Typography aria-label={t('MessagingConfig.LOADING')}>{error || t('MessagingConfig.LOADING')}</Typography>;
  return <Stack spacing={1} aria-label={t('MessagingConfig.LABEL')}><Typography variant="subtitle1">{t('MessagingConfig.TITLE')}</Typography>{error && <Alert severity="error" role="alert">{error}</Alert>}
    <FormControl fullWidth size="small" disabled={saving}><InputLabel>{t('MessagingConfig.DM_POLICY')}</InputLabel><Select label={t('MessagingConfig.DM_POLICY')} value={config.dm_policy || 'all'} onChange={(event) => update({ dm_policy: event.target.value })}><MenuItem value="all">{t('MessagingConfig.DM_ALL')}</MenuItem><MenuItem value="within_shared_groups">{t('MessagingConfig.DM_SHARED')}</MenuItem><MenuItem value="team_only">{t('MessagingConfig.DM_TEAM')}</MenuItem></Select></FormControl>
    <FormControlLabel control={<Switch checked={Boolean(config.group_chat_enabled)} disabled={saving} onChange={(event) => update({ group_chat_enabled: event.target.checked })} />} label={t('MessagingConfig.GROUP_ENABLED')} />
    <FormControlLabel control={<Switch checked={Boolean(config.everyone_can_post)} disabled={saving || !config.group_chat_enabled} onChange={(event) => update({ everyone_can_post: event.target.checked })} />} label={t('MessagingConfig.EVERYONE_POSTS')} />
  </Stack>;
}
