import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Drawer, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { createChatApi } from './api';
import { useChatSocket } from './useChatSocket';
import ChatList from './ChatList';
import ChatThread from './ChatThread';
import ChatComposer from './ChatComposer';
import ModelPicker from './ModelPicker';

const PENDING_ID = 'pending';
const buildSendFrame = (message, getContext) => {
  if (typeof getContext !== 'function') return { frame: { type: 'send', message } };
  try {
    const context = getContext();
    if (context == null) return { frame: { type: 'send', message } };
    if (typeof context !== 'object' || Array.isArray(context)) return { error: true };
    const prototype = Object.getPrototypeOf(context);
    if (prototype !== Object.prototype && prototype !== null) return { error: true };
    if (typeof JSON.stringify(context) !== 'string') return { error: true };
    return { frame: { type: 'send', message, context } };
  } catch {
    return { error: true };
  }
};
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
/** Stores an app frame on the turn that is generating; frames outside a running turn are dropped. */
const attachAppFrame = (turns, frame) => {
  const index = turns.findLastIndex(isGenerating);
  if (index < 0) return turns;
  const turn = turns[index];
  const appFrames = [...(turn.appFrames || []), { name: frame.name, payload: frame.payload }];
  return turns.map((item, i) => (i === index ? { ...turn, appFrames } : item));
};
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
export function ChatWorkspace({ apiBase, wsUrl, api: apiOverrides, scope, sx, unavailableReasonText, sidePanel, sidePanelLabel, renderAnswerExtra, renderComposerExtra, onAppFrame, activeChatId, onActiveChatChange, composerPrefill, getSendContext, sendRequest, onSendRequestHandled, layout = 'viewport', compactBelow = 720, tokenBalance = null, usageToTokens, longChatTokens = 40000 }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const viewportNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const rootRef = useRef(null);
  const [containerNarrow, setContainerNarrow] = useState(false);
  const [status, setStatus] = useState('loading'); // loading | available | not_configured | error
  const narrow = layout === 'compact' || (layout === 'container' ? containerNarrow : viewportNarrow);
  const appFrameCallback = useRef(onAppFrame);
  useEffect(() => { appFrameCallback.current = onAppFrame; }, [onAppFrame]);
  useEffect(() => {
    if (layout !== 'container') return undefined;
    if (typeof ResizeObserver === 'undefined' || !rootRef.current) { setContainerNarrow(viewportNarrow); return undefined; }
    const observer = new ResizeObserver((entries) => { const width = entries[0]?.contentRect?.width; if (width !== undefined) setContainerNarrow(width < compactBelow); });
    observer.observe(rootRef.current); return () => observer.disconnect();
  }, [layout, compactBelow, viewportNarrow, status]);
  const api = useMemo(() => createChatApi(apiOverrides, { apiBase }), [apiOverrides, apiBase]);

  const [catalogue, setCatalogue] = useState({ entries: [], default: null });
  const [summary, setSummary] = useState(null);
  // The chat the current catalogue was requested for: a general catalogue must never drive the stored selection of a chat.
  const [catalogueChatId, setCatalogueChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [archived, setArchived] = useState([]);
  const [nextChats, setNextChats] = useState(null);
  const [chat, setChat] = useState(null);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [turns, setTurns] = useState([]);
  const [olderCursor, setOlderCursor] = useState(null);
  const [olderBusy, setOlderBusy] = useState(false);
  const [tool, setTool] = useState(null);
  const [draft, setDraft] = useState('');
  const composerInputRef = useRef(null);
  const lastPrefillId = useRef(undefined);
  const lastSendRequestId = useRef(undefined);
  const deferredSendRequest = useRef(null); // `{ id, wanted }`: a request that had to wait for the chat named by `activeChatId`
  const connectedChatId = useRef(null);
  const getSendContextRef = useRef(getSendContext);
  getSendContextRef.current = getSendContext;
  const sendRequestHandledRef = useRef(onSendRequestHandled);
  sendRequestHandledRef.current = onSendRequestHandled;
  const [focusRequest, setFocusRequest] = useState(0);
  const focusPending = useRef(false);
  const [problem, setProblem] = useState(null);
  const [unavailableReason, setUnavailableReason] = useState(null);
  const [trimmedCount, setTrimmedCount] = useState(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const turnsRef = useRef(turns);
  useEffect(() => { turnsRef.current = turns; }, [turns]);
  const activeChangeCallback = useRef(onActiveChatChange);
  activeChangeCallback.current = onActiveChatChange;
  const lastReportedId = useRef(null);
  const latestWantedId = useRef(activeChatId);
  latestWantedId.current = activeChatId;
  const appliedId = useRef(undefined);
  const unloadableIds = useRef(new Set()); // ids the host asked for that no list contains
  const [listOpen, setListOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openedOnce, setOpenedOnce] = useState(false); // distinguishes a reconnect from the first connect

  const running = turns.some(isGenerating);
  const isArchived = Boolean(chat?.archived_at);
  const selection = chat?.selection || catalogue.default;
  const activeEntry = catalogue.entries.find((entry) => entry.id === selection?.entry);
  const latestUsageTurn = [...turns].reverse().find((turn) => turn.usage);
  const longChat = longChatTokens > 0 && Number.isFinite(latestUsageTurn?.usage?.context_tokens) && latestUsageTurn.usage.context_tokens >= longChatTokens;
  const refreshCatalogue = useCallback(async (chatId) => {
    try { const next = await api.getCatalogue(chatId !== undefined ? { chat: chatId } : {}); setCatalogue(next); setCatalogueChatId(chatId ?? null); return next; } catch { return null; }
  }, [api]);

  // Bumped on every scope change so that a list response of the previous scope is dropped.
  const scopeVersion = useRef(0);
  useEffect(() => { scopeVersion.current += 1; setChat(null); setListsLoaded(false); appliedId.current = undefined; unloadableIds.current.clear(); }, [scope]);

  const loadLists = useCallback(async () => {
    const version = scopeVersion.current;
    // Without a scope the api is called exactly as before the scope existed.
    const [active, old] = scope === undefined
      ? await Promise.all([api.listChats(), api.listChats({ archived: true })])
      : await Promise.all([api.listChats({ scope }), api.listChats({ scope, archived: true })]);
    if (version !== scopeVersion.current) return undefined;
    setChats(active.results || []);
    setNextChats(active.next || null);
    setArchived(old.results || []);
    return [...(active.results || []), ...(old.results || [])];
  }, [api, scope]);

  useEffect(() => {
    let live = true;
    const request = scope === undefined ? api.getStatus() : api.getStatus({ scope });
    request
      .then(async (state) => {
        if (state.status !== 'available') { if (live) { setStatus(state.status); setUnavailableReason(state.reason || null); } return; }
        const [entries] = await Promise.all([api.getCatalogue(), loadLists()]);
        if (live) { setStatus(state.status); setCatalogue(entries); setListsLoaded(true); }
      })
      .catch(() => { if (live) setStatus('error'); });
    return () => { live = false; };
  }, [api, loadLists, scope]);

  useEffect(() => { if (chat?.id !== undefined) refreshCatalogue(chat.id); }, [chat?.id, refreshCatalogue]);
  useEffect(() => { if (pickerOpen) refreshCatalogue(chat?.id); }, [pickerOpen]);

  useEffect(() => {
    const id = chat?.id ?? null;
    if (id === lastReportedId.current) return;
    lastReportedId.current = id;
    activeChangeCallback.current?.(id);
  }, [chat?.id]);

  // A layout effect: a host-driven switch to a known chat is applied before the browser paints.
  useLayoutEffect(() => {
    if (activeChatId === undefined || status !== 'available' || !listsLoaded) return undefined;
    const wantedKey = activeChatId === null ? null : String(activeChatId);
    if (wantedKey === null) {
      appliedId.current = null;
      setChat(null);
      return;
    }
    if (String(chat?.id) === wantedKey) return;
    const existing = [...chats, ...archived].find((item) => String(item.id) === wantedKey);
    if (existing) { setChat(existing); return; }
    if (appliedId.current === wantedKey) return;
    appliedId.current = wantedKey;
    let live = true;
    loadLists().then((loaded) => {
      if (!live || loaded === undefined || latestWantedId.current === undefined || String(latestWantedId.current) !== wantedKey) return;
      const found = loaded.find((item) => String(item.id) === wantedKey);
      if (!found) unloadableIds.current.add(wantedKey);
      setChat(found || null);
    }).catch(() => {
      if (live && latestWantedId.current !== undefined && String(latestWantedId.current) === wantedKey) {
        unloadableIds.current.add(wantedKey);
        setChat(null);
      }
    });
    return () => { live = false; };
  }, [activeChatId, status, listsLoaded]);

  // Clear the previous chat's content before the browser paints, so a host-driven switch never flashes it under the new title.
  useLayoutEffect(() => {
    connectedChatId.current = null; // the socket of the new chat has not opened yet
    setTurns([]); setOlderCursor(null); setTool(null); setProblem(null); setTrimmedCount(null); setSidePanelOpen(false); setDraft(''); setOpenedOnce(false); setSummary(null);
  }, [chat?.id]);

  useEffect(() => {
    if (!chat?.id) return undefined;
    let live = true;
    api.listTurns(chat.id)
      .then((page) => { if (live) { setTurns(chronological((page.results || []).map((turn) => ({ ...turn, appFrames: [] })))); setOlderCursor(page.next || null); setSummary(page.summary || null); } })
      .catch(() => { if (live) setProblem('load_error'); });
    return () => { live = false; };
  }, [api, chat?.id]);

  const onFrame = useCallback((frame, chatId) => {
    if (chatId !== chat?.id) return;
    if (frame.type === 'history') { setTurns(chronological((frame.turns || []).map((turn) => ({ ...turn, appFrames: [] })))); setSummary(frame.summary || null); }
    else if (frame.type === 'delta') setTurns((current) => appendDelta(current, frame.text || ''));
    else if (frame.type === 'app') {
      setTurns((current) => attachAppFrame(current, frame));
      const running = turnsRef.current.findLast(isGenerating);
      appFrameCallback.current?.({ name: frame.name, payload: frame.payload, chatId, turnId: running?.id });
    } else if (frame.type === 'notice' && frame.code === 'history_trimmed') setTrimmedCount(frame.left_out || 0);
    else if (frame.type === 'notice' && frame.code === 'summarised') { api.listTurns(chatId).then((page) => setSummary(page.summary || null)).catch(() => {}); }
    else if (frame.type === 'tool') setTool(frame.phase === 'start' ? { label: frame.label, name: frame.name } : null);
    else if (frame.type === 'turn' && frame.turn) {
      setTool(null);
      setTurns((current) => { const pending = current.findLast(isGenerating); return settleTurn(current, { ...frame.turn, appFrames: pending?.appFrames || [] }); });
      refreshCatalogue(chatId);
      if (frame.turn.error_code === 'quota_exceeded') setProblem('quota_exceeded');
    } else if (frame.type === 'error') {
      setTool(null);
      setTurns((current) => failGenerating(current, frame.code));
      setProblem(frame.code); if (frame.code === 'unavailable') setUnavailableReason(frame.reason || unavailableReason);
    }
  }, [chat?.id, api, refreshCatalogue]);
  const onOpen = useCallback((chatId) => { connectedChatId.current = String(chatId); setOpenedOnce(true); setProblem((current) => (current === 'connection_lost' ? null : current)); }, []);
  const onClose = useCallback(({ reason, retrying }) => { connectedChatId.current = null; if (!retrying) setProblem(reason); }, []);
  const socket = useChatSocket(chat?.id, { wsUrl, onFrame, onOpen, onClose });

  useEffect(() => {
    if (composerPrefill == null || composerPrefill.id === lastPrefillId.current) return;
    // `null` means the host wants no chat shown: nothing to fill, and the chat being left must not receive the text.
    if (activeChatId === null) { lastPrefillId.current = composerPrefill.id; return; }
    // The host switches chats and prefills in one go: wait for the requested chat instead of filling the one being left.
    const wanted = activeChatId == null ? null : String(activeChatId);
    if (wanted !== null && String(chat?.id) !== wanted && !unloadableIds.current.has(wanted)) return;
    lastPrefillId.current = composerPrefill.id;
    if (!chat || isArchived) return;
    setDraft(composerPrefill.text);
    focusPending.current = true;
    setFocusRequest((count) => count + 1);
  }, [composerPrefill, chat, isArchived, activeChatId]);

  // Host send request, handled once per id. A request that arrives before the chat named by `activeChatId` is shown waits
  // for that chat AND for its socket to open (sending needs a connected socket of that chat); a chat that cannot be found
  // ends the wait. Every other request is decided at once. Decided = sent if the surface can send right now, otherwise
  // reported as not sent.
  useEffect(() => {
    const answerFor = (id, sent) => {
      lastSendRequestId.current = id;
      if (deferredSendRequest.current?.id === id) deferredSendRequest.current = null;
      sendRequestHandledRef.current?.({ id, sent });
    };
    // A waiting request that the host replaced or withdrew is answered as not sent, exactly once.
    const waiting = deferredSendRequest.current;
    if (waiting && waiting.id !== sendRequest?.id) answerFor(waiting.id, false);
    if (sendRequest == null || sendRequest.id === lastSendRequestId.current) return;
    const answer = (sent) => answerFor(sendRequest.id, sent);
    const blank = typeof sendRequest.text !== 'string' || !sendRequest.text.trim();
    if (activeChatId === null || blank) { answer(false); return; }
    const wanted = activeChatId === undefined ? null : String(activeChatId);
    const deferred = deferredSendRequest.current?.id === sendRequest.id ? deferredSendRequest.current : null;
    // The host named another chat while the request was waiting: it belonged to the earlier one, so it is not sent.
    if (deferred && deferred.wanted !== wanted) { answer(false); return; }
    if (wanted !== null && !unloadableIds.current.has(wanted)) {
      if (String(chat?.id) !== wanted) { deferredSendRequest.current = { id: sendRequest.id, wanted }; return; }
      // Only a request that could be sent once connected is worth waiting for.
      if (deferred && connectedChatId.current !== wanted && !isArchived && !running) return;
    }
    const text = sendRequest.text;
    const sent = Boolean(canSendRef.current && typeof text === 'string' && text.trim() && startTurn(text));
    if (sent) canSendRef.current = false;
    answer(sent);
  }, [sendRequest, chat, activeChatId, socket.connected, running]);

  // Runs after the render that carries the prefilled draft; a counter, so the same text requested twice focuses twice.
  // A disabled input (connection down) cannot take focus, so the request stays pending until it is enabled again.
  useEffect(() => {
    const input = composerInputRef.current;
    if (!focusPending.current || !input || input.disabled) return;
    focusPending.current = false;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange?.(end, end);
  }, [focusRequest, socket.connected]);

  const guarded = (action) => async (...args) => {
    try { return await action(...args); } catch { setProblem('action_error'); return null; }
  };

  const selectChat = (next) => { setChat(next); setListOpen(false); };
  const createChat = guarded(async () => {
    const created = await api.createChat(scope !== undefined ? { scope } : {});
    setChats((current) => [created, ...current]);
    selectChat(created);
  });
  const updateChat = guarded(async (target, patch) => {
    const updated = await api.updateChat(target.id, patch);
    if (chat?.id === target.id) setChat(updated);
    await loadLists();
  });
  const fallbackApplied = useRef(new Set());
  useEffect(() => {
    if (!chat || catalogueChatId !== chat.id || !catalogue.entries.length || fallbackApplied.current.has(chat.id)) return;
    const valid = catalogue.entries.some((entry) => entry.id === chat.selection?.entry && entry.efforts?.includes(chat.selection?.effort));
    if (valid) return;
    const entry = catalogue.entries.find((item) => item.default) || catalogue.entries[0];
    if (!entry) return;
    fallbackApplied.current.add(chat.id);
    updateChat(chat, { selection: { entry: entry.id, effort: entry.efforts?.[0] } });
  }, [chat, catalogue, catalogueChatId, updateChat]);
  const deleteChat = guarded(async (target) => {
    await api.deleteChat(target.id);
    setChats((current) => current.filter((item) => item.id !== target.id));
    setArchived((current) => current.filter((item) => item.id !== target.id));
    if (chat?.id === target.id) setChat(null);
  });
  const loadMoreChats = guarded(async () => {
    const page = await api.listChats({ ...(scope !== undefined ? { scope } : {}), cursor: nextChats });
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
    const built = buildSendFrame(message, getSendContextRef.current);
    if (built.error) { setProblem('action_error'); return false; }
    if (!socket.send(built.frame)) return false;
    setProblem(null);
    setTurns((current) => [...current, {
      id: PENDING_ID, user_text: message, assistant_text: '', state: 'generating', sources: [],
      driver: activeEntry?.driver, model: activeEntry?.label || activeEntry?.model, effort: selection?.effort,
    }]);
    return true;
  };
  const canSendFromSlot = Boolean(chat && !isArchived && socket.connected && !running);
  // A slot may keep an old `send` around: read the latest availability, and close it right away after a send.
  const canSendRef = useRef(false);
  canSendRef.current = canSendFromSlot;
  const sendFromSlot = (text) => {
    const message = typeof text === 'string' ? text : '';
    if (!canSendRef.current || !message.trim()) return false;
    const started = startTurn(message);
    if (started) canSendRef.current = false;
    return started;
  };
  const answerExtra = renderAnswerExtra
    ? (args) => renderAnswerExtra({ ...args, send: sendFromSlot, canSend: canSendFromSlot })
    : undefined;
  const send = () => { if (startTurn(draft)) setDraft(''); };
  const retry = (turn) => {
    if (!socket.connected) return;
    if (startTurn(turn.user_text)) setTurns((current) => current.filter((item) => item.id !== turn.id));
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

  const notConfigured = status === 'not_configured' || problem === 'not_configured';
  const unavailable = status === 'unavailable' || problem === 'unavailable';
  const unavailableText = typeof unavailableReasonText === 'function' ? unavailableReasonText(unavailableReason) : unavailableReasonText?.[unavailableReason];
  if (status === 'loading') return <Box sx={sx} aria-busy="true" />;
  if (status === 'error') return <Box sx={sx}><Alert severity="error">{t('Chat.loadError')}</Alert></Box>;
  if (notConfigured) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ minHeight: 320, p: 3, textAlign: 'center', ...sx }}>
        <Typography variant="h6">{t('Chat.unavailable')}</Typography>
        <Typography color="text.secondary">{t('Chat.noModel')}</Typography>
      </Stack>
    );
  }
  if (unavailable) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ minHeight: 320, p: 3, textAlign: 'center', ...sx }}>
        <Typography color="text.secondary">{unavailableText || t('Chat.notAvailableHere')}</Typography>
      </Stack>
    );
  }

  return (
    <Box ref={rootRef} sx={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : `minmax(240px, 320px) minmax(0, 1fr)${chat && sidePanel ? ' minmax(240px, 320px)' : ''}`, height: '100%', minHeight: 480, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper', ...sx }}>
      {narrow ? null : <Box sx={{ borderRight: 1, borderColor: 'divider', minHeight: 0 }}>{list}</Box>}
      <Stack sx={{ minWidth: 0, minHeight: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.5, py: 0.5, borderBottom: 1, borderColor: 'divider', minHeight: 56 }}>
          {narrow ? <Button color="inherit" onClick={() => setListOpen(true)}>{t('Chat.chats')}</Button> : null}
          <Typography noWrap sx={{ flex: 1, fontWeight: 600 }}>{chat ? (chat.title || t('Chat.untitled')) : ''}</Typography>
          {socket.status === 'connecting' && openedOnce ? <Chip size="small" color="warning" variant="outlined" label={t('Chat.reconnecting')} /> : null}
          {isArchived ? <Chip size="small" label={t('Chat.archived')} /> : null}
          {isArchived ? <Button size="small" onClick={() => updateChat(chat, { archived: false })}>{t('Chat.restore')}</Button> : null}
          {chat && sidePanel && narrow ? <Button color="inherit" onClick={() => setSidePanelOpen(true)}>{sidePanelLabel || t('Chat.sidePanel')}</Button> : null}
        </Stack>
        {chat ? (
          <>
            <ChatThread turns={turns} chat={chat} renderAnswerExtra={answerExtra} trimmedCount={trimmedCount} tool={tool} notice={noticeFor()} hasOlder={Boolean(olderCursor)} olderBusy={olderBusy} onLoadOlder={loadOlder} onRetry={retry} readOnly={isArchived} summary={summary} usageToTokens={usageToTokens} />
            {isArchived ? <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1 }}>{t('Chat.archivedReadOnly')}</Typography> : null}
            {renderComposerExtra ? <Box key={chat.id}>{renderComposerExtra({ chat })}</Box> : null}
            {longChat ? <Alert severity="info" action={<Button color="inherit" size="small" onClick={createChat}>{t('Chat.newConversation')}</Button>}>{t('Chat.longChat')}</Alert> : null}
            <ChatComposer value={draft} onChange={setDraft} onSend={send} onStop={() => socket.send({ type: 'stop' })} running={running} archived={isArchived} connected={socket.connected} inputRef={composerInputRef}
              actions={<ModelPicker entries={catalogue.entries} selection={selection} disabled={isArchived || running} open={pickerOpen} onOpenChange={setPickerOpen} onChange={(next) => updateChat(chat, { selection: next })} sheet={narrow} balance={tokenBalance} longChat={longChat} onNewChat={createChat} />} />
          </>
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ flex: 1, p: 3 }}>
            <Typography color="text.secondary" align="center">{t('Chat.selectChat')}</Typography>
            <Button variant="contained" onClick={createChat}>{t('Chat.newChat')}</Button>
          </Stack>
        )}
      </Stack>
      {chat && sidePanel && !narrow ? <Box key={chat.id} sx={{ borderLeft: 1, borderColor: 'divider', minHeight: 0, overflow: 'auto' }}>{sidePanel(chat)}</Box> : null}
      {narrow && chat && sidePanel ? <Drawer anchor="right" open={sidePanelOpen} onClose={() => setSidePanelOpen(false)} slotProps={{ paper: { 'aria-label': sidePanelLabel || t('Chat.sidePanel') } }}><Box key={chat.id}>{sidePanel(chat)}</Box></Drawer> : null}
      {narrow ? <Drawer open={listOpen} onClose={() => setListOpen(false)} slotProps={{ paper: { sx: { width: 'min(320px, 86vw)' } } }}>{list}</Drawer> : null}
    </Box>
  );
}

export default ChatWorkspace;
