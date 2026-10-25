// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => (values?.model ? `${key}:${values.model}` : key) }) }));

import ChatThread from '../src/chat/ChatThread';
import MarkdownReply from '../src/chat/MarkdownReply';

afterEach(cleanup);

const turn = (extra) => ({ id: 1, seq: 1, user_text: 'Question', assistant_text: 'Answer', state: 'completed', sources: [], driver: 'claude_cli', model: 'Sonnet', effort: 'high', ...extra });

describe('MarkdownReply', () => {
  it('renders a list and a table', () => {
    render(<MarkdownReply text={'- first item\n- second item\n\n| A | B |\n|---|---|\n| x | y |'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('shows raw HTML as text and never creates the element', () => {
    const { container } = render(<MarkdownReply text={'before <script>window.__pwned = 1</script> <b>bold</b> after'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(window.__pwned).toBeUndefined();
    expect(container.textContent).toContain('<script>');
  });

  it('does not load an image reference and opens an external link in a new tab', () => {
    // UCM-CHAT-9: links are clickable now; external ones open in a new tab.
    const { container } = render(<MarkdownReply text={'![the chart](https://img.example.test/a.png) and [docs](https://docs.example.test)'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('the chart');
    const link = container.querySelector('a');
    expect(link.textContent).toBe('docs');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

describe('ChatThread', () => {
  it('shows source chips with the label and the reference on hover', async () => {
    render(<ChatThread turns={[turn({ sources: [{ label: 'KB-12', reference: 'kb://handbook/12#intro' }] })]} />);
    const chip = screen.getByText('KB-12');
    expect(screen.queryByText('kb://handbook/12#intro')).toBeNull();
    fireEvent.mouseOver(chip);
    expect((await screen.findByRole('tooltip')).textContent).toContain('kb://handbook/12#intro');
  });

  it('marks where the model changed between two turns', () => {
    render(<ChatThread turns={[turn(), turn({ id: 2, seq: 2, model: 'Opus', effort: 'max' })]} />);
    expect(screen.getByRole('separator').textContent).toContain('Chat.modelChanged:Opus · Chat.effort.max');
  });

  it('shows no divider when the selection is unchanged', () => {
    render(<ChatThread turns={[turn(), turn({ id: 2, seq: 2 })]} />);
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('shows a typing indicator, then the tool label, for a generating turn', () => {
    const generating = turn({ id: 2, seq: 2, assistant_text: '', state: 'generating' });
    const { rerender } = render(<ChatThread turns={[generating]} />);
    expect(screen.getByText('Chat.typing')).toBeTruthy();
    rerender(<ChatThread turns={[generating]} tool={{ label: 'Searching the knowledge base' }} />);
    expect(screen.getByText('Searching the knowledge base')).toBeTruthy();
    expect(screen.queryByText('Chat.typing')).toBeNull();
  });

  it('shows Interrupted with Retry and calls onRetry with the turn', () => {
    const onRetry = vi.fn();
    const interrupted = turn({ state: 'interrupted' });
    render(<ChatThread turns={[interrupted]} onRetry={onRetry} />);
    expect(screen.getByText('Chat.interrupted')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chat.retry' }));
    expect(onRetry).toHaveBeenCalledWith(interrupted);
  });

  it('shows the incomplete-answer alert for a failed turn', () => {
    render(<ChatThread turns={[turn({ state: 'failed', error_code: 'provider_error', assistant_text: '' })]} />);
    expect(screen.getByText('Chat.answerIncomplete')).toBeTruthy();
  });

  it('renders the user message as plain text', () => {
    const { container } = render(<ChatThread turns={[turn({ user_text: '<img src=x onerror=alert(1)>' })]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x');
  });

  it('offers older turns through the cursor callback', () => {
    const onLoadOlder = vi.fn();
    render(<ChatThread turns={[turn()]} hasOlder onLoadOlder={onLoadOlder} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat.loadOlder' }));
    expect(onLoadOlder).toHaveBeenCalled();
  });

  it('loads older turns when the thread is scrolled to the top', () => {
    const onLoadOlder = vi.fn();
    render(<ChatThread turns={[turn()]} hasOlder onLoadOlder={onLoadOlder} />);
    const log = screen.getByRole('log');
    fireEvent.scroll(log, { target: { scrollTop: 400 } });
    expect(onLoadOlder).not.toHaveBeenCalled();
    fireEvent.scroll(log, { target: { scrollTop: 0 } });
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it('starts only one older-turns request for rapid scroll events', async () => {
    let release;
    const onLoadOlder = vi.fn(() => new Promise((resolve) => { release = resolve; }));
    render(<ChatThread turns={[turn()]} hasOlder onLoadOlder={onLoadOlder} />);
    const log = screen.getByRole('log');
    fireEvent.scroll(log, { target: { scrollTop: 0 } });
    fireEvent.scroll(log, { target: { scrollTop: 0 } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.loadOlder' }));
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => { fireEvent.scroll(log, { target: { scrollTop: 0 } }); expect(onLoadOlder).toHaveBeenCalledTimes(2); });
  });
});
