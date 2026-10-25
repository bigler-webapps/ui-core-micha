// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key, values) => values ? `${key}:${Object.values(values).join(':')}` : key,
  i18n: { language: 'en' },
}) }));
vi.mock('@mui/icons-material/MoreVert', () => ({ default: () => null }));

import ChatWorkspace from '../src/chat/ChatWorkspace';
import MarkdownReply from '../src/chat/MarkdownReply';
import ModelPicker from '../src/chat/ModelPicker';

class FakeSocket {
  static OPEN = 1;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  push(frame) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  send(data) { this.sent.push(JSON.parse(data)); }
  close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
}

const selection = { entry: 'sonnet', effort: 'medium' };
const chat = { id: 7, title: 'Budget', archived_at: null, selection };
const catalogue = { entries: [{ id: 'sonnet', label: 'Claude Sonnet', provider: 'anthropic', level: 'balanced', efforts: ['medium'] }], default: selection };

function makeApi(extra = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getCatalogue: vi.fn().mockResolvedValue(catalogue),
    getLimit: vi.fn().mockResolvedValue(null),
    listChats: vi.fn().mockImplementation(async ({ archived } = {}) => ({ results: archived ? [] : [chat], next: null })),
    listTurns: vi.fn().mockResolvedValue({ results: [], next: null }),
    createChat: vi.fn().mockResolvedValue({ ...chat, id: 8 }),
    updateChat: vi.fn().mockResolvedValue(chat), deleteChat: vi.fn().mockResolvedValue(null),
    ...extra,
  };
}

async function openWorkspace(api, props = {}) {
  render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} {...props} />);
  fireEvent.click(await screen.findByText('Budget'));
  await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
  act(() => FakeSocket.instances[0].open());
  return FakeSocket.instances[0];
}

beforeEach(() => { globalThis.WebSocket = FakeSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; FakeSocket.instances = []; });

describe('ChatWorkspace limit and stored tool steps', () => {
  it('disables input at the limit, shows a reset date and hides Change model', async () => {
    const api = makeApi({ getLimit: vi.fn().mockResolvedValue({ period: 'month', limit_usd_micros: 2000000, used_usd_micros: 2000000, resets_at: '2026-11-01T00:00:00Z' }) });
    const socket = await openWorkspace(api);
    await screen.findByText('Chat.limitReached.month');
    expect(screen.getByText(/^Chat.limitResets:/)).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Chat.message' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Chat.send' }).disabled).toBe(true);
    act(() => socket.push({ type: 'error', code: 'quota_exceeded' }));
    await waitFor(() => expect(api.getLimit).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Chat.usageLimit:Sonnet')).toBeNull();
  });

  it('shows usage below the limit and refetches it when a turn settles', async () => {
    const api = makeApi({ getLimit: vi.fn()
      .mockResolvedValueOnce({ period: 'month', limit_usd_micros: 10000000, used_usd_micros: 1250000, resets_at: '2026-11-01T00:00:00Z' })
      .mockResolvedValueOnce({ period: 'month', limit_usd_micros: 10000000, used_usd_micros: 2500000, resets_at: '2026-11-01T00:00:00Z' }) });
    const socket = await openWorkspace(api);
    await screen.findByText('Chat.limitUsage:1.25:10.00');
    expect(screen.getByRole('textbox', { name: 'Chat.message' }).disabled).toBe(false);
    act(() => socket.push({ type: 'turn', turn: { id: 9, seq: 1, user_text: 'Question', assistant_text: 'Answer', state: 'completed', tool_steps: [] } }));
    await screen.findByText('Chat.limitUsage:2.50:10.00');
    expect(api.getLimit).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['rejecting', vi.fn().mockRejectedValue(new Error('not supported'))],
    ['null fields', vi.fn().mockResolvedValue({ period: null, limit_usd_micros: null, used_usd_micros: null, resets_at: null })],
  ])('leaves the composer unchanged when limit data is %s', async (_label, getLimit) => {
    await openWorkspace(makeApi({ getLimit }));
    await waitFor(() => expect(getLimit).toHaveBeenCalled());
    expect(screen.queryByText(/^Chat.limitUsage:/)).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Chat.message' }).disabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Chat.send' }).disabled).toBe(true); // Empty draft, as before.
  });

  it('renders stored tool-step labels from the loaded turn', async () => {
    const api = makeApi({ listTurns: vi.fn().mockResolvedValue({ results: [{ id: 5, seq: 1, user_text: 'Question', assistant_text: 'Answer', state: 'completed', tool_steps: [{ name: 'search', label: 'Search files' }, { name: 'read', label: 'Read document' }], sources: [] }], next: null }) });
    await openWorkspace(api);
    expect(await screen.findByText('Search files')).toBeTruthy();
    expect(screen.getByText('Read document')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Chat.toolSteps' })).toBeTruthy();
  });
});

describe('MarkdownReply links', () => {
  it('routes app links through the callback and opens safe external links in a new tab', () => {
    const onNavigate = vi.fn();
    const { container } = render(<MarkdownReply text={'[a](/projects/1)\n\n[b](https://example.org)'} onNavigate={onNavigate} />);
    const appLink = screen.getByRole('link', { name: 'a' });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    appLink.dispatchEvent(click);
    expect(onNavigate).toHaveBeenCalledWith('/projects/1');
    expect(click.defaultPrevented).toBe(true);
    const external = screen.getByRole('link', { name: 'b' });
    expect(external.getAttribute('target')).toBe('_blank');
    expect(external.getAttribute('rel')).toContain('noopener');
    expect(container.querySelectorAll('a')).toHaveLength(2);
  });

  it('renders unsafe schemes as text', () => {
    const { container } = render(<MarkdownReply text={'[c](javascript:alert(1))'} />);
    expect(container.querySelector('a')).toBeNull();
  });

  it('does not treat a backslash path that resolves to another host as an app link', () => {
    const onNavigate = vi.fn();
    const { container } = render(<MarkdownReply text={'[d](/\\evil.example/x)'} onNavigate={onNavigate} />);
    const anchor = container.querySelector('a');
    if (anchor) {
      expect(new URL(anchor.getAttribute('href'), window.location.origin).origin).toBe(window.location.origin);
      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
      // Any navigation stays a path inside the app (react-markdown encodes the backslash as %5C).
      onNavigate.mock.calls.forEach(([path]) => {
        expect(path.startsWith('/') && !path.startsWith('//')).toBe(true);
        expect(new URL(path, window.location.origin).origin).toBe(window.location.origin);
      });
    }
  });
});

describe('ModelPicker estimates', () => {
  it('shows average cost when present and no average-cost line when absent', async () => {
    const entries = [
      { ...catalogue.entries[0], average_cost_usd_micros: 125000 },
      { ...catalogue.entries[0], id: 'free', label: 'Free model', average_cost_usd_micros: null },
    ];
    render(<ModelPicker entries={entries} selection={selection} sheet />);
    fireEvent.click(screen.getByRole('button', { name: /Claude Sonnet/ }));
    expect(await screen.findByText('Chat.estimatePerAnswer:0.13')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Free model/ }).textContent).not.toContain('Chat.estimatePerAnswer');
  });
});
