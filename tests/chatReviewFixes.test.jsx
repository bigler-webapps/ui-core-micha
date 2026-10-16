// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
    i18n: { language: 'de_informal' },
  }),
}));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatThread from '../src/chat/ChatThread';
import ModelPicker from '../src/chat/ModelPicker';
import ChatWorkspace from '../src/chat/ChatWorkspace';

class FakeSocket {
  static OPEN = 1;
  constructor() { this.readyState = 0; this.sent = []; }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; }
}
beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; });

const entries = [
  { id: 'top', label: 'Opus 5.5', provider: 'anthropic', level: 'top', efforts: ['low', 'high'], billing: 'pay_per_use', estimate: { low: { min: 1000, max: 2000, unit: 'tokens' }, high: { min: 3000, max: 6000, unit: 'tokens' } } },
  { id: 'bal', label: 'GPT 6', provider: 'openai', level: 'balanced', efforts: ['low', 'high'], billing: 'pay_per_use', estimate: { low: { min: 2, max: 2, unit: 'level' }, high: { min: 3, max: 3, unit: 'level' } } },
  { id: 'cli', label: 'Sonnet 5.5', provider: 'claude_code', level: 'fast', efforts: ['low'], billing: 'subscription', estimate: {} },
  { id: 'odd', label: 'Mystery', level: 'fast', efforts: ['low'], billing: 'pay_per_use', estimate: {} },
];
const digits = (value) => String(value).replace(/\D/g, '');

describe('picker rows', () => {
  it('shows name, provider and estimate of every entry and no provider for an unknown one', () => {
    render(<ModelPicker entries={entries} selection={{ entry: 'top', effort: 'low' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Opus/ }));
    const rows = screen.getAllByRole('radio');
    const text = (index) => rows[index].textContent;
    expect(text(0)).toContain('Opus 5.5');
    expect(text(0)).toContain('Chat.by Anthropic');
    expect(digits(text(0))).toContain('55' + '10002000');
    expect(text(1)).toContain('GPT 6');
    expect(text(1)).toContain('Chat.by OpenAI');
    expect(rows[1].querySelector('[aria-label="Chat.costScale.2"]')).toBeTruthy();
    expect(text(2)).toContain('Chat.by Anthropic');
    expect(text(2)).toContain('Chat.noTokenSubscription');
    expect(text(3)).toContain('Mystery');
    expect(text(3)).not.toContain('Chat.by');
  });

  it('is a radio group on the keyboard: only the checked row is a tab stop and arrows move the choice', () => {
    const onChange = vi.fn();
    render(<ModelPicker entries={entries} selection={{ entry: 'top', effort: 'low' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Opus/ }));
    const rows = screen.getAllByRole('radio');
    expect(rows.map((row) => row.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith({ entry: 'bal', effort: 'low' });
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ entry: 'odd', effort: 'low' });
  });
});

describe('reply cost', () => {
  const turn = (extra) => ({ id: 1, seq: 1, user_text: 'Q', assistant_text: 'A', state: 'completed', sources: [], ...extra });
  it('shows model, effort and the converted number and calls the converter with the turn usage', () => {
    const usage = { input_tokens: 2 };
    const convert = vi.fn(() => 12345);
    render(<ChatThread turns={[turn({ model: 'Sonnet', effort: 'high', usage })]} usageToTokens={convert} />);
    expect(convert).toHaveBeenCalledWith(usage);
    const caption = screen.getByText(/Chat.replyTokens/).textContent;
    expect(caption).toContain('Sonnet');
    expect(caption).toContain('Chat.effort.high');
    expect(digits(caption)).toContain('12345');
  });

  it('shows the cost even when the turn carries no model or effort', () => {
    render(<ChatThread turns={[turn({ usage: { input_tokens: 2 } })]} usageToTokens={() => 7} />);
    expect(screen.getByText(/Chat.replyTokens/).textContent).toContain('7');
  });

  it('shows no cost caption without a conversion', () => {
    render(<ChatThread turns={[turn({ model: 'Sonnet', effort: 'high', usage: { input_tokens: 2 } })]} />);
    expect(screen.queryByText(/Chat.replyTokens/)).toBeNull();
    expect(screen.getByText(/Sonnet/)).toBeTruthy();
  });
});

describe('stored selection fallback', () => {
  const chat = { id: 7, title: 'Budget', archived_at: null, selection: { entry: 'chat-only', effort: 'low' } };
  const general = { entries: [{ id: 'general', label: 'General', provider: 'openai', efforts: ['low'], default: true }], default: { entry: 'general', effort: 'low' } };
  const forChat = { entries: [{ id: 'chat-only', label: 'ChatOnly', provider: 'openai', efforts: ['low'] }, ...general.entries], default: { entry: 'general', effort: 'low' } };
  const makeApi = (catalogueFn) => ({
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockImplementation(catalogueFn),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat], next: null })),
    createChat: vi.fn(),
    deleteChat: vi.fn(),
    updateChat: vi.fn().mockImplementation(async (id, patch) => ({ ...chat, id, ...patch })),
    listTurns: vi.fn().mockResolvedValue({ results: [], next: null }),
  });
  const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });

  it('never replaces a valid stored selection because the general catalogue lacks it', async () => {
    const api = makeApi(async (arg = {}) => (arg.chat === undefined ? general : forChat));
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click(await screen.findByText('Budget'));
    await waitFor(() => expect(api.getCatalogue).toHaveBeenCalledWith({ chat: 7 }));
    await settle();
    expect(api.updateChat).not.toHaveBeenCalled();
  });

  it('persists the default once when the chat-specific catalogue no longer offers the stored model', async () => {
    const api = makeApi(async () => general);
    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} />);
    fireEvent.click(await screen.findByText('Budget'));
    await waitFor(() => expect(api.updateChat).toHaveBeenCalledWith(7, { selection: { entry: 'general', effort: 'low' } }));
    await settle();
    expect(api.updateChat).toHaveBeenCalledTimes(1);
  });
});
