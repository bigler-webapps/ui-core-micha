import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_CLOSE_CODES, defaultChatWsUrl } from './wire';

const delays = [1000, 2000, 4000];
export function useChatSocket(chatId, { wsUrl = defaultChatWsUrl, onFrame, onOpen, onClose } = {}) {
  const socket = useRef(null); const callbacks = useRef({ onFrame, onOpen, onClose }); callbacks.current = { onFrame, onOpen, onClose };
  // The URL builder is read at connect time only: an inline arrow from the caller must not reopen the socket on every render.
  const urlBuilder = useRef(wsUrl); urlBuilder.current = wsUrl;
  const [status, setStatus] = useState('idle'); const [generation, setGeneration] = useState(0);
  const reconnect = useCallback(() => setGeneration((n) => n + 1), []);
  useEffect(() => {
    if (!chatId || typeof WebSocket === 'undefined') { setStatus('idle'); return undefined; }
    let alive = true; let tries = 0; let timer; let wasOpened = false;
    const connect = () => {
      setStatus('connecting'); const ws = new WebSocket(typeof urlBuilder.current === 'function' ? urlBuilder.current(chatId) : urlBuilder.current); socket.current = ws;
      ws.onopen = () => { if (!alive) return; tries = 0; setStatus('open'); callbacks.current.onOpen?.(chatId, wasOpened); wasOpened = true; };
      ws.onmessage = (event) => { if (!alive) return; try { const frame = JSON.parse(event.data); if (frame && typeof frame === 'object') callbacks.current.onFrame?.(frame, chatId); } catch { /* Ignore malformed frames. */ } };
      ws.onclose = (event) => {
        if (!alive || socket.current !== ws) return; socket.current = null;
        const reason = CHAT_CLOSE_CODES[event.code];
        if (reason) { setStatus('closed'); callbacks.current.onClose?.({ reason, chatId, retrying: false }); return; }
        if (tries < delays.length) { setStatus('connecting'); callbacks.current.onClose?.({ reason: 'connection_lost', chatId, retrying: true }); timer = setTimeout(connect, delays[tries++]); }
        else { setStatus('closed'); callbacks.current.onClose?.({ reason: 'connection_lost', chatId, retrying: false }); }
      };
    };
    connect();
    return () => { alive = false; clearTimeout(timer); const ws = socket.current; socket.current = null; if (ws) { ws.onopen = ws.onmessage = ws.onclose = null; ws.close(); } };
  }, [chatId, generation]);
  const send = useCallback((frame) => { const ws = socket.current; if (!ws || ws.readyState !== WebSocket.OPEN) return false; ws.send(JSON.stringify(frame)); return true; }, []);
  return { status, connected: status === 'open', send, reconnect };
}
export default useChatSocket;
