// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatWorkspace from '../src/chat/ChatWorkspace';

class TestSocket {
  static OPEN = 1;
  constructor() { this.readyState = 0; this.sent = []; }
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; }
}
beforeEach(() => { globalThis.WebSocket = TestSocket; });
afterEach(() => { cleanup(); delete globalThis.WebSocket; });

const chat = { id: 1, title: 'Budget talk', archived_at: null, selection: null, title_source: 'automatic' };
const makeApi = () => ({
  getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
  getCatalogue: vi.fn().mockResolvedValue({ entries: [], default: null }),
  listChats: vi.fn().mockResolvedValue({ results: [chat], next: null }),
  createChat: vi.fn(),
  updateChat: vi.fn(),
  deleteChat: vi.fn(),
  listTurns: vi.fn().mockResolvedValue({
    results: [{ id: 10, seq: 1, user_text: 'Q', assistant_text: 'The answer', state: 'completed', sources: [], model: 'Sonnet 5.5', effort: 'high' }],
    next: null,
  }),
});

it('shows the model line under a reply by default and hides it when the host passes showReplyCaption={false}', async () => {
  const { unmount } = render(<ChatWorkspace api={makeApi()} activeChatId={1} />);
  await screen.findByText('The answer');
  await waitFor(() => expect(screen.getByText(/Sonnet 5\.5/)).toBeTruthy());
  unmount();
  render(<ChatWorkspace api={makeApi()} activeChatId={1} showReplyCaption={false} />);
  await screen.findByText('The answer');
  expect(screen.queryByText(/Sonnet 5\.5/)).toBeNull();
});
