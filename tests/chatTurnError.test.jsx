// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatThread from '../src/chat/ChatThread';
import ChatWorkspace from '../src/chat/ChatWorkspace';

afterEach(cleanup);

const makeTurn = (extra = {}) => ({
  id: 1, seq: 1, user_text: 'Question', assistant_text: '', state: 'failed',
  error_code: 'provider_error', sources: [], driver: 'claude_cli', model: 'Sonnet', effort: 'high', ...extra,
});

describe('ChatThread failed-turn message', () => {
  it('replaces the generic alert when the callback handles the error code', () => {
    const failedTurn = makeTurn({ error_code: 'prompt_too_long' });
    const chat = { id: 12 };
    const renderTurnError = vi.fn(({ turn, chat: receivedChat }) => (
      turn.error_code === 'prompt_too_long' && receivedChat === chat ? <div>Freigaben verkleinern</div> : null
    ));

    render(<ChatThread turns={[failedTurn]} chat={chat} renderTurnError={renderTurnError} />);

    expect(screen.getByText('Freigaben verkleinern')).toBeTruthy();
    expect(screen.queryByText('Chat.answerIncomplete')).toBeNull();
    expect(renderTurnError).toHaveBeenCalledWith({ turn: failedTurn, chat, retry: undefined });
  });

  it('falls back to the generic alert when the callback returns null', () => {
    render(<ChatThread turns={[makeTurn({ error_code: 'provider_error' })]} renderTurnError={() => null} />);
    expect(screen.getByText('Chat.answerIncomplete')).toBeTruthy();
  });

  it('passes a retry action that retries this turn and omits it in read-only mode', () => {
    const failedTurn = makeTurn();
    const onRetry = vi.fn();
    const renderTurnError = vi.fn(({ retry }) => <button onClick={retry}>Retry custom error</button>);
    const { rerender } = render(<ChatThread turns={[failedTurn]} onRetry={onRetry} renderTurnError={renderTurnError} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry custom error' }));
    expect(onRetry).toHaveBeenCalledWith(failedTurn);

    rerender(<ChatThread turns={[failedTurn]} onRetry={onRetry} renderTurnError={renderTurnError} readOnly />);
    expect(renderTurnError.mock.calls.at(-1)[0].retry).toBeUndefined();
  });

  it('shows the unchanged generic alert and retry button without the callback', () => {
    const failedTurn = makeTurn();
    const onRetry = vi.fn();
    render(<ChatThread turns={[failedTurn]} onRetry={onRetry} />);

    expect(screen.getByText('Chat.answerIncomplete')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chat.retry' }));
    expect(onRetry).toHaveBeenCalledWith(failedTurn);
  });

  it('does not call the callback or alter an interrupted turn', () => {
    const renderTurnError = vi.fn(() => <div>Custom error</div>);
    render(<ChatThread turns={[makeTurn({ state: 'interrupted', error_code: 'provider_error' })]} renderTurnError={renderTurnError} />);

    expect(screen.getByText('Chat.interrupted')).toBeTruthy();
    expect(screen.queryByText('Custom error')).toBeNull();
    expect(screen.queryByText('Chat.answerIncomplete')).toBeNull();
    expect(renderTurnError).not.toHaveBeenCalled();
  });
});

class FakeSocket {
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; FakeSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  send() {}
  close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
}
FakeSocket.OPEN = 1;

describe('ChatWorkspace renderTurnError', () => {
  beforeEach(() => { globalThis.WebSocket = FakeSocket; });
  afterEach(() => { delete globalThis.WebSocket; FakeSocket.instances = []; });

  it('passes the callback to the thread with the current turn and chat', async () => {
    const failedTurn = makeTurn({ id: 5, error_code: 'prompt_too_long' });
    const chat = { id: 7, title: 'Budget', archived_at: null, selection: { entry: 'cli-sonnet', effort: 'high' } };
    const api = {
      getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
      getCatalogue: vi.fn().mockResolvedValue({ entries: [{ id: 'cli-sonnet', driver: 'claude_cli', model: 'sonnet', label: 'Sonnet', efforts: ['high'] }], default: { entry: 'cli-sonnet', effort: 'high' } }),
      listChats: vi.fn().mockResolvedValue({ results: [chat], next: null }),
      listTurns: vi.fn().mockResolvedValue({ results: [failedTurn], next: null }),
    };
    const renderTurnError = vi.fn(({ turn, chat: currentChat }) => (
      turn.error_code === 'prompt_too_long' && currentChat?.id === chat.id ? <div>Custom workspace error</div> : null
    ));

    render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} renderTurnError={renderTurnError} />);
    fireEvent.click(await screen.findByText('Budget'));
    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    act(() => FakeSocket.instances[0].open());

    expect(await screen.findByText('Custom workspace error')).toBeTruthy();
    expect(screen.queryByText('Chat.answerIncomplete')).toBeNull();
    expect(renderTurnError).toHaveBeenCalledWith(expect.objectContaining({
      turn: expect.objectContaining({ id: failedTurn.id, error_code: failedTurn.error_code }),
      chat,
      retry: expect.any(Function),
    }));
  });
});
