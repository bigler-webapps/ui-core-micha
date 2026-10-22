// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => ({
  'Chat.effort.medium': 'Gründlich', 'Chat.longChatShort': 'Lange Unterhaltung: ältere Teile werden zusammengefasst.',
  'Chat.longChat': 'Diese Unterhaltung ist lang. Ältere Teile werden zusammengefasst; eine neue Unterhaltung ist günstiger.',
  'Chat.newChat': 'Neuer Chat', 'Chat.newConversation': 'Neue Unterhaltung', 'Chat.send': 'Senden',
  'Chat.stop': 'Stoppen', 'Chat.stopAnswer': 'Antwort stoppen', 'Chat.dismissNotice': 'Hinweis schliessen',
  'Chat.message': 'Nachricht', 'Chat.chooseModel': 'Modell wählen',
}[key] || key), i18n: { language: 'de' } }) }));
vi.mock('@mui/icons-material/MoreVert', () => ({ default: () => null }));

import { ChatComposer } from '../src/chat/ChatComposer';
import ChatWorkspace from '../src/chat/ChatWorkspace';
import ModelPicker from '../src/chat/ModelPicker';

const entries = [{ id: 'sonnet', label: 'Claude Sonnet 4.5', provider: 'anthropic', level: 'balanced', efforts: ['low', 'medium'], default: true }];
const selection = { entry: 'sonnet', effort: 'medium' };

class FakeSocket {
  static instances = [];
  constructor() { this.readyState = 0; this.sent = []; FakeSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
}

const chats = [
  { id: 7, title: 'Budget', archived_at: null, selection },
  { id: 8, title: 'Planning', archived_at: null, selection },
];
function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue({ entries, default: selection }),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : chats, next: null })),
    listTurns: vi.fn().mockResolvedValue({ results: [{ id: 21, seq: 1, usage: { context_tokens: 100 } }], next: null }),
    createChat: vi.fn().mockResolvedValue({ ...chats[0], id: 9, title: 'New chat' }),
    updateChat: vi.fn().mockResolvedValue(chats[0]), deleteChat: vi.fn().mockResolvedValue(null),
    ...extra,
  };
}

async function openWorkspace(api, props = {}) {
  const result = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} longChatTokens={1} {...props} />);
  fireEvent.click(await screen.findByText('Budget'));
  await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
  act(() => FakeSocket.instances.at(-1).open());
  await screen.findByText(props.composerLayout === 'compact'
    ? 'Lange Unterhaltung: ältere Teile werden zusammengefasst.'
    : 'Diese Unterhaltung ist lang. Ältere Teile werden zusammengefasst; eine neue Unterhaltung ist günstiger.');
  return result;
}

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('compact chat composer', () => {
  it('puts host context and the model in the first row, then a full width input with Send', () => {
    const { container } = render(<ChatComposer layout="compact" value="" onChange={() => {}} onSend={() => {}}
      context={<span>Excerpt A</span>} actions={<ModelPicker entries={entries} selection={selection} shortLabel />} />);
    const contextRow = container.querySelectorAll('.MuiStack-root')[1];
    expect(contextRow.textContent).toContain('Excerpt A');
    expect(contextRow.textContent).toContain('Sonnet · Gründlich');
    // One line that clips the host content and keeps the model choice whole; the input row is a separate row.
    expect(getComputedStyle(contextRow).flexWrap).toBe('nowrap');
    const [contextBox, actionsBox] = contextRow.children;
    expect(getComputedStyle(contextBox).overflow).toBe('hidden');
    expect(['0', '0px']).toContain(getComputedStyle(contextBox).minWidth);
    expect(getComputedStyle(contextBox).textOverflow).toBe('ellipsis');
    const field = screen.getByRole('textbox', { name: 'Nachricht' }).closest('.MuiTextField-root');
    expect(getComputedStyle(field).flexGrow).toBe('1');
    expect(getComputedStyle(actionsBox).flexShrink).toBe('0');
    expect(contextRow.contains(screen.getByRole('textbox', { name: 'Nachricht' }))).toBe(false);
    expect(screen.getByRole('textbox', { name: 'Nachricht' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Senden' })).toBeTruthy();
  });

  it('sends on Enter, inserts a line break on Shift+Enter, and swaps Send for Stop while running', () => {
    const onSend = vi.fn(); const onStop = vi.fn();
    const { rerender } = render(<ChatComposer layout="compact" value="Hallo" onChange={() => {}} onSend={onSend} onStop={onStop} />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Nachricht' }), { key: 'Enter', code: 'Enter' });
    expect(onSend).toHaveBeenCalledTimes(1);
    // Shift+Enter is left to the textarea (not prevented), which inserts the line break.
    expect(fireEvent.keyDown(screen.getByRole('textbox', { name: 'Nachricht' }), { key: 'Enter', code: 'Enter', shiftKey: true })).toBe(true);
    expect(onSend).toHaveBeenCalledTimes(1);
    rerender(<ChatComposer layout="compact" value="Hallo" onChange={() => {}} onSend={onSend} onStop={onStop} running />);
    expect(screen.queryByRole('button', { name: 'Senden' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Antwort stoppen' }));
    expect(onStop).toHaveBeenCalledTimes(1);
    rerender(<ChatComposer layout="compact" value="Hallo" onChange={() => {}} onSend={onSend} onStop={onStop} />);
    expect(screen.getByRole('button', { name: 'Senden' })).toBeTruthy();
  });

  it('closes the long chat notice for one chat across renders and shows it for another chat', async () => {
    const api = makeApi();
    const result = await openWorkspace(api, { composerLayout: 'compact' });
    fireEvent.click(screen.getByRole('button', { name: 'Hinweis schliessen' }));
    expect(screen.queryByText('Lange Unterhaltung: ältere Teile werden zusammengefasst.')).toBeNull();
    result.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} longChatTokens={1} composerLayout="compact" />);
    expect(screen.queryByText('Lange Unterhaltung: ältere Teile werden zusammengefasst.')).toBeNull();
    fireEvent.click(await screen.findByText('Planning'));
    await screen.findByText('Lange Unterhaltung: ältere Teile werden zusammengefasst.');
  });

  it('keeps the standard layout and long-chat Alert when the option is omitted', async () => {
    await openWorkspace(makeApi());
    fireEvent.change(screen.getByRole('textbox', { name: 'Nachricht' }), { target: { value: 'Hallo' } });
    expect(screen.getByRole('button', { name: 'Senden' }).className).toContain('MuiButton-contained');
    expect(screen.getByText('Diese Unterhaltung ist lang. Ältere Teile werden zusammengefasst; eine neue Unterhaltung ist günstiger.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Hinweis schliessen' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Antwort stoppen' })).toBeNull();
  });

  it('keeps the standard Stop as an outlined text button beside Send', () => {
    render(<ChatComposer value="Hallo" onChange={() => {}} onSend={() => {}} onStop={() => {}} running />);
    expect(screen.getByRole('button', { name: 'Stoppen' }).className).toContain('MuiButton-outlined');
    expect(screen.getByRole('button', { name: 'Senden' }).className).toContain('MuiButton-contained');
  });

  it('drops vendor and version from the short model label', () => {
    render(<ModelPicker entries={entries} selection={selection} shortLabel />);
    expect(screen.getByRole('button', { name: 'Sonnet · Gründlich ▾' })).toBeTruthy();
  });
});
