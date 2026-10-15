import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Drawer, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { createChatApi } from './api';
import { useChatSocket } from './useChatSocket';
import ChatList from './ChatList';
import ChatThread from './ChatThread';
import ChatComposer from './ChatComposer';
import ModelPicker from './ModelPicker';

const PENDING_ID = 'pending';
const bySeq = (a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER);
const chronological = (turns) => [...(turns || [])].sort(bySeq);
const isGenerating = (turn) => turn.state === 'generating';

/** Replaces the turn that was generating (or has the same id) with the final one; appends it when neither exists. */
const settleTurn = (turns, final) => {
  const index = turns.findIndex((turn) => turn.id === final.id || isGenerating(turn));
  if (index < 0) return chronological([...turns, final]);
  return [...turns.slice(0, index), final, ...turns.slice(index + 1)];
};
const failGenerating = (turns, code) => turns.map((turn) => (isGenerating(turn)
  ? { ...turn, state: 'failed', error_code: code === 'quota_exceeded' ? null : code }
  : turn));
const appendDelta = (turns, text) => {
  const index = turns.findLastIndex(isGenerating);
  if (index < 0) return turns;
  return turns.map((turn, i) => (i === index ? { ...turn, assistant_text: `${turn.assistant_text || ''}${text}` } : turn));
};

/**
 * The complete chat surface: chat list, thread, composer and model picker for one user.
 *
 * Props: `apiBase` and `wsUrl` (where the app mounted the chat routes), `api` (partial overrides of the REST
 * calls; every function not given keeps its default), `scope` (passed when creating a chat), `sx`.
 */
export function ChatWorkspace({ apiBase, wsUrl, api: apiOverrides, scope, sx }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('md'));
  const api = useMemo(() => createChatApi(apiOverrides, { apiBase }), [apiOverrides, apiBase]);

  const [status, setStatus] = useState('loading'); // loading | available | not_configured | error
  const [catalogue, setCatalogue] = useState({ entries: [], default: null });
  const [chats, setChats] = useState([]);
  const [archived, setArchived] = useState([]);
  const [nextChats, setNextChats] = useState(null);
  const [chat, setChat] = useState(null);
  const [turns, setTurns] = useState([]);
  const [olderCursor, setOlderCursor] = useState(null);
  const [olderBusy, setOlderBusy] = useState(false);
  const [tool, setTool] = useState(null);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState(null); // an error code or close reason, shown as a notice
  const [listOpen, setListOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openedOnce, setOpenedOnce] = useState(false); // distinguishes a reconnect from the first connect

  const running = turns.some(isGenerating);
  const isArchived = Boolean(chat?.archived_at);
  const selection = chat?.selection || catalogue.default;
  const activeEntry = catalogue.entries.find((entry) => entry.id === selection?.entry);

  const loadLists = useCallback(async () => {
    const [active, old] = await Promise.all([api.listChats(), api.listChats({ archived: true })]);
    setChats(active.results || []);
    setNextChats(active.next || null);
    setArchived(old.results || []);
  }, [api]);

  useEffect(() => {
    let live = true;
    api.getStatus()
      .then(async (state) => {
        if (state.status !== 'available') { if (live) setStatus(state.status); return; }
        const [entries] = await Promise.all([api.getCatalogue(), loadLists()]);
        if (live) { setStatus(state.status); setCatalogue(entries); }
      })
      .catch(() => { if (live) setStatus('error'); });
    return () => { live = false; };
  }, [api, loadLists]);

  useEffect(() => {
    setTurns([]); setOlderCursor(null); setTool(null); setProblem(null); setDraft(''); setOpenedOnce(false);
    if (!chat?.id) return undefined;
    let live = true;
    api.listTurns(chat.id)
      .then((page) => { if (live) { setTurns(chronological(page.results)); setOlderCursor(page.next || null); } })
      .catch(() => { if (live) setProblem('load_error'); });
    return () => { live = false; };
  }, [api, chat?.id]);

  const onFrame = useCallback((frame, chatId) => {
    if (chatId !== chat?.id) return;
    if (frame.type === 'history') setTurns(chronological(frame.turns));
    else if (frame.type === 'delta') setTurns((current) => appendDelta(current, frame.text || ''));
    else if (frame.type === 'tool') setTool(frame.phase === 'start' ? { label: frame.label, name: frame.name } : null);
    else if (frame.type === 'turn' && frame.turn) {
      setTool(null);
      setTurns((current) => settleTurn(current, frame.turn));
      if (frame.turn.error_code === 'quota_exceeded') setProblem('quota_exceeded');
    } else if (frame.type === 'error') {
      setTool(null);
      setTurns((current) => failGenerating(current, frame.code));
      setProblem(frame.code);
    }
  }, [chat?.id]);
  const onOpen = useCallback(() => { setOpenedOnce(true); setProblem((current) => (current === 'connection_lost' ? null : current)); }, []);
  const onClose = useCallback(({ reason, retrying }) => { if (!retrying) setProblem(reason); }, []);
  const socket = useChatSocket(chat?.id, { wsUrl, onFrame, onOpen, onClose });

  const guarded = (action) => async (...args) => {
    try { return await action(...args); } catch { setProblem('action_error'); return null; }
  };

  const selectChat = (next) => { setChat(next); setListOpen(false); };
  const createChat = guarded(async () => {
    const created = await api.createChat(scope ? { scope } : {});
    setChats((current) => [created, ...current]);
    selectChat(created);
  });
  const updateChat = guarded(async (target, patch) => {
    const updated = await api.updateChat(target.id, patch);
    if (chat?.id === target.id) setChat(updated);
    await loadLists();
  });
  const deleteChat = guarded(async (target) => {
    await api.deleteChat(target.id);
    setChats((current) => current.filter((item) => item.id !== target.id));
    setArchived((current) => current.filter((item) => item.id !== target.id));
    if (chat?.id === target.id) setChat(null);
  });
  const loadMoreChats = guarded(async () => {
    const page = await api.listChats({ cursor: nextChats });
    setChats((current) => [...current, ...(page.results || [])]);
    setNextChats(page.next || null);
  });
  const loadOlder = guarded(async () => {
    setOlderBusy(true);
    try {
      const page = await api.listTurns(chat.id, { cursor: olderCursor });
      setTurns((current) => chronological([...(page.results || []), ...current]));
      setOlderCursor(page.next || null);
    } finally { setOlderBusy(false); }
  });

  const startTurn = (message) => {
    if (!socket.send({ type: 'send', message })) return false;
    setProblem(null);
    setTurns((current) => [...current, {
      id: PENDING_ID, user_text: message, assistant_text: '', state: 'generating', sources: [],
      driver: activeEntry?.driver, model: activeEntry?.label || activeEntry?.model, effort: selection?.effort,
    }]);
    return true;
  };
  const send = () => { if (startTurn(draft)) setDraft(''); };
  const retry = (turn) => {
    if (!socket.connected) return;
    setTurns((current) => current.filter((item) => item.id !== turn.id));
    startTurn(turn.user_text);
  };

  const noticeFor = () => {
    const texts = {
      session_ended: 'Chat.sessionEnded', access_lost: 'Chat.accessLost', rate_limited: 'Chat.rateLimited',
      load_error: 'Chat.loadError', action_error: 'Chat.actionError',
    };
    if (problem === 'quota_exceeded') {
      return { text: t('Chat.usageLimit', { model: activeEntry?.label || activeEntry?.model || '' }), action: { label: t('Chat.changeModel'), onClick: () => setPickerOpen(true) } };
    }
    if (problem === 'connection_lost') return { text: t('Chat.connectionLost'), action: { label: t('Chat.reconnect'), onClick: socket.reconnect } };
    if (problem === 'not_configured') return null;
    if (texts[problem]) return { text: t(texts[problem]), severity: 'warning' };
    return null;
  };

  const list = (
    <ChatList
      chats={chats}
      archivedChats={archived}
      activeId={chat?.id}
      hasMore={Boolean(nextChats)}
      onSelect={selectChat}
      onNew={createChat}
      onRename={(target, title) => updateChat(target, { title })}
      onArchive={(target) => updateChat(target, { archived: true })}
      onRestore={(target) => updateChat(target, { archived: false })}
      onDelete={deleteChat}
      onLoadMore={loadMoreChats}
    />
  );

  const unavailable = status === 'not_configured' || problem === 'not_configured';
  if (status === 'loading') return <Box sx={sx} aria-busy="true" />;
  if (status === 'error') return <Alert severity="error" sx={sx}>{t('Chat.loadError')}</Alert>;
  if (unavailable) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ minHeight: 320, p: 3, textAlign: 'center', ...sx }}>
        <Typography variant="h6">{t('Chat.unavailable')}</Typography>
        <Typography color="text.secondary">{t('Chat.noModel')}</Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(240px, 320px) minmax(0, 1fr)', height: '100%', minHeight: 480, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper', ...sx }}>
      {narrow ? null : <Box sx={{ borderRight: 1, borderColor: 'divider', minHeight: 0 }}>{list}</Box>}
      <Stack sx={{ minWidth: 0, minHeight: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.5, py: 0.5, borderBottom: 1, borderColor: 'divider', minHeight: 56 }}>
          {narrow ? <Button color="inherit" onClick={() => setListOpen(true)} sx={{ minHeight: 40 }}>{t('Chat.chats')}</Button> : null}
          <Typography noWrap sx={{ flex: 1, fontWeight: 600 }}>{chat ? (chat.title || t('Chat.untitled')) : ''}</Typography>
          {socket.status === 'connecting' && openedOnce ? <Chip size="small" color="warning" variant="outlined" label={t('Chat.reconnecting')} /> : null}
          {isArchived ? <Chip size="small" label={t('Chat.archived')} /> : null}
          {isArchived ? <Button size="small" onClick={() => updateChat(chat, { archived: false })} sx={{ minHeight: 40 }}>{t('Chat.restore')}</Button> : null}
          {chat ? (
            <ModelPicker
              entries={catalogue.entries}
              selection={selection}
              disabled={isArchived || running}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              onChange={(next) => updateChat(chat, { selection: next })}
            />
          ) : null}
        </Stack>
        {chat ? (
          <>
            <ChatThread turns={turns} tool={tool} notice={noticeFor()} hasOlder={Boolean(olderCursor)} olderBusy={olderBusy} onLoadOlder={loadOlder} onRetry={retry} readOnly={isArchived} />
            {isArchived ? <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1 }}>{t('Chat.archivedReadOnly')}</Typography> : null}
            <ChatComposer value={draft} onChange={setDraft} onSend={send} onStop={() => socket.send({ type: 'stop' })} running={running} archived={isArchived} connected={socket.connected} />
          </>
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ flex: 1, p: 3 }}>
            <Typography color="text.secondary" align="center">{t('Chat.selectChat')}</Typography>
            <Button variant="contained" onClick={createChat}>{t('Chat.newChat')}</Button>
          </Stack>
        )}
      </Stack>
      {narrow ? <Drawer open={listOpen} onClose={() => setListOpen(false)} slotProps={{ paper: { sx: { width: 'min(320px, 86vw)' } } }}>{list}</Drawer> : null}
    </Box>
  );
}

export default ChatWorkspace;
