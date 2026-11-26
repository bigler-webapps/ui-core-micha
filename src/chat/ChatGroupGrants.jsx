import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Switch, Tooltip, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

const policyKey = (members) => {
  const policies = new Set(members.map((member) => member.confirmation).filter(Boolean));
  return policies.size > 1 ? 'Chat.grantsMixed' : policies.has('confirmation_required') ? 'Chat.grantsConfirm' : policies.has('direct') ? 'Chat.grantsDirect' : null;
};

export default function ChatGroupGrants({ chatId, api }) {
  const { t, i18n } = useTranslation();
  const language = i18n?.language;
  const [support, setSupport] = useState('loading');
  const [open, setOpen] = useState(false);
  const [projection, setProjection] = useState(null);
  const [draft, setDraft] = useState([]);
  const [disabledInitiallyEnabled, setDisabledInitiallyEnabled] = useState([]);
  const [expanded, setExpanded] = useState([]);
  const [state, setState] = useState('idle');
  const generation = useRef(0);
  const pendingSave = useRef(null);
  const lastContext = useRef({ chatId, language });

  useEffect(() => {
    const previous = lastContext.current;
    lastContext.current = { chatId, language };
    const chatChanged = previous.chatId !== chatId;
    let active = true;
    generation.current += 1;
    if (chatChanged) {
      setOpen(false);
      setProjection(null);
      setDisabledInitiallyEnabled([]);
      setSupport('loading');
    }
    if (open && !chatChanged) {
      load(true);
    } else {
      api.getGroupGrants(chatId, ...(language ? [{ language }] : [])).then((result) => {
        if (active) setSupport(result?.supported ? 'supported' : 'unsupported');
      }).catch((error) => {
        if (active) setSupport(error?.response?.status === 404 ? 'unsupported' : 'error');
      });
    }
    return () => { active = false; generation.current += 1; };
  }, [api, chatId, language]);

  const load = async (preserveDraft = false) => {
    const current = ++generation.current;
    const saving = pendingSave.current;
    setState('loading');
    try {
      let saveSucceeded = false;
      if (saving) {
        try { await saving; saveSucceeded = true; } catch { /* Keep the draft for retry. */ }
      }
      if (current !== generation.current) return;
      const result = await api.getGroupGrants(chatId, ...(language ? [{ language }] : []));
      if (current !== generation.current) return;
      if (!result?.supported) { setSupport('unsupported'); setOpen(false); return; }
      setSupport('supported');
      const sameRevision = projection && projection.grant_revision === result.grant_revision && projection.catalogue_revision === result.catalogue_revision;
      setProjection(result);
      if (!preserveDraft || saveSucceeded || !projection) {
        setDraft(result.groups.filter((group) => group.enabled).map((group) => group.id));
        setDisabledInitiallyEnabled([]);
      }
      if (!preserveDraft) setExpanded([]);
      setState(preserveDraft && !saveSucceeded && projection && !sameRevision ? 'stale' : 'idle');
    } catch {
      if (current === generation.current) setState('loadError');
    }
  };
  const close = () => { generation.current += 1; setOpen(false); setDisabledInitiallyEnabled([]); setState('idle'); };
  const save = async () => {
    const current = ++generation.current;
    setState('saving');
    try {
      const reauthorizeGroupIds = disabledInitiallyEnabled.filter((id) => draft.includes(id));
      const request = api.saveGroupGrants(chatId, { group_ids: draft, grant_revision: projection.grant_revision, catalogue_revision: projection.catalogue_revision, ...(reauthorizeGroupIds.length ? { reauthorize_group_ids: reauthorizeGroupIds } : {}) }, ...(language ? [{ language }] : []));
      pendingSave.current = request;
      const result = await request;
      if (current !== generation.current) return;
      setProjection(result);
      setDraft(result.groups.filter((group) => group.enabled).map((group) => group.id));
      setDisabledInitiallyEnabled([]);
      setState('saved');
    } catch (error) {
      if (current === generation.current) setState(error?.response?.data?.code === 'stale_grants' ? 'stale' : 'saveError');
    } finally {
      pendingSave.current = null;
    }
  };
  if (support === 'loading' || support === 'unsupported') return null;
  return <>
    <Tooltip title={t('Chat.grants')}><IconButton aria-label={t('Chat.grants')} onClick={() => { setOpen(true); load(); }}><SettingsOutlinedIcon /></IconButton></Tooltip>
    <Dialog open={open} onClose={close} aria-labelledby="chat-grants-title" fullWidth maxWidth="xs">
      <DialogTitle id="chat-grants-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        {t('Chat.grants')}<IconButton aria-label={t('Chat.close')} onClick={close}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('Chat.grantsScope')}</Typography>
        {state === 'loading' ? <CircularProgress size={24} /> : null}
        {state === 'loadError' ? <Alert severity="error" action={<Button onClick={() => load()}>{t('Chat.retry')}</Button>}>{t('Chat.grantsLoadError')}</Alert> : null}
        {state === 'saveError' ? <Alert severity="error">{t('Chat.grantsSaveError')}</Alert> : null}
        {state === 'stale' ? <Alert severity="warning" action={<Button onClick={() => load()}>{t('Chat.grantsReload')}</Button>}>{t('Chat.grantsStale')}</Alert> : null}
        {state === 'saved' ? <Alert severity="success">{t('Chat.grantsSaved')}</Alert> : null}
        {projection && state !== 'loading' && state !== 'loadError' ? ['read', 'write'].map((kind) => {
          const groups = projection.groups.filter((group) => group.kind === kind);
          return <Box key={kind} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t(kind === 'read' ? 'Chat.grantsRead' : 'Chat.grantsWrite')}</Typography>
            {!groups.length ? <Typography variant="body2" color="text.secondary">{t(kind === 'read' ? 'Chat.grantsNoRead' : 'Chat.grantsNoWrite')}</Typography> : groups.map((group) => {
              const isExpanded = expanded.includes(group.id);
              const policy = kind === 'write' ? policyKey(group.members) : null;
              return <Box key={group.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5 }}>
                  <IconButton aria-label={group.label} aria-expanded={isExpanded} onClick={() => setExpanded((items) => isExpanded ? items.filter((id) => id !== group.id) : [...items, group.id])}><ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : undefined }} /></IconButton>
                  <Box sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}><Typography variant="body2">{group.label}</Typography><Typography variant="caption" color="text.secondary">{t('Chat.grantsCount', { available: group.members.filter((member) => member.available).length, total: group.members.length })}{policy ? ` · ${t(policy)}` : ''}</Typography></Box>
                  <Switch checked={draft.includes(group.id)} disabled={!group.editable || state === 'saving' || state === 'stale'} onChange={(event) => { if (!event.target.checked && group.enabled) setDisabledInitiallyEnabled((items) => items.includes(group.id) ? items : [...items, group.id]); setDraft((items) => event.target.checked ? [...items, group.id] : items.filter((id) => id !== group.id)); setState('idle'); }} slotProps={{ input: { 'aria-label': group.label } }} />
                </Stack>
                {group.enabled && group.members.some((member) => member.available && !member.effective) ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2, pb: 1 }}>{t('Chat.grantsReauthorizeHint')}</Typography> : null}
                <Collapse in={isExpanded}><Stack spacing={0.5} sx={{ px: 2, pb: 1 }}>
                  {group.members.map((member) => <Box key={member.id} sx={{ overflowWrap: 'anywhere' }}><Typography variant="body2">{member.label}</Typography><Typography variant="caption" color="text.secondary">{[!member.available ? (member.unavailable_reason || t('Chat.grantsUnavailable')) : group.enabled && !member.effective ? t('Chat.grantsNotGranted') : null, member.confirmation ? t(member.confirmation === 'direct' ? 'Chat.grantsDirect' : 'Chat.grantsConfirm') : null].filter(Boolean).join(' · ')}</Typography></Box>)}
                </Stack></Collapse>
              </Box>;
            })}
          </Box>;
        }) : null}
      </DialogContent>
      <DialogActions><Button onClick={close}>{t('Chat.cancel')}</Button><Button variant="contained" onClick={save} disabled={!projection || ['loading', 'loadError', 'saving', 'stale'].includes(state)}>{t('Chat.save')}</Button></DialogActions>
    </Dialog>
  </>;
}
