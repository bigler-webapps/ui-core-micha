// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatThread } from '../src/chat/ChatThread';
import { ChatComposer } from '../src/chat/ChatComposer';
import ChatWorkspace from '../src/chat/ChatWorkspace';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

afterEach(() => { cleanup(); delete globalThis.WebSocket; TestSocket.instances = []; });

class TestSocket { static instances = []; constructor() { this.readyState = 0; TestSocket.instances.push(this); } open() { this.readyState = 1; this.onopen?.(); } send() {} close() {} }

const turn = (id) => ({ id, seq: id, user_text: `Question ${id}`, assistant_text: `Answer ${id}`, state: 'completed', sources: [], driver: 'test', model: 'test' });

function css(element) { return window.getComputedStyle(element); }

describe('chat layout isolation', () => {
  it('contains the thread scroll region and skips off-screen turn layout', () => {
    const { container } = render(<ChatThread turns={[turn(1), turn(2)]} />);
    const log = screen.getByRole('log');
    expect(css(log).contain).toBe('strict');
    // The log holds one observed content wrapper; turns and the end sentinel are its children.
    const wrapper = log.firstElementChild;
    const turnNodes = [...wrapper.children].filter((node) => css(node).contentVisibility === 'auto');
    expect(turnNodes).toHaveLength(2);
    expect(container.querySelectorAll('[role="log"] div').length).toBeGreaterThan(2);
    for (const node of turnNodes) expect(css(node).containIntrinsicSize).toContain('320px');
    const end = wrapper.lastElementChild;
    expect(end.tagName.toLowerCase()).toBe('div');
    expect(end.childElementCount).toBe(0);
    expect(css(end).contentVisibility).not.toBe('auto');
  });

  it('stays at the bottom while turns take their real height, and not once the reader scrolled up', () => {
    let callback;
    const observe = vi.fn();
    globalThis.ResizeObserver = class { constructor(cb) { callback = cb; } observe(node) { observe(node); } disconnect() {} };
    try {
      render(<ChatThread turns={[turn(1), turn(2)]} />);
      const log = screen.getByRole('log');
      expect(observe).toHaveBeenCalledWith(log.firstElementChild);
      Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 5000 });
      Object.defineProperty(log, 'clientHeight', { configurable: true, value: 400 });
      act(() => callback([]));
      expect(log.scrollTop).toBe(5000);
      log.scrollTop = 100;
      fireEvent.scroll(log);
      Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 6000 });
      act(() => callback([]));
      expect(log.scrollTop).toBe(100);
    } finally {
      delete globalThis.ResizeObserver;
    }
  });

  it('observes the scroll region too, so a thread mounted hidden pins to the bottom when shown', () => {
    let callback;
    const observe = vi.fn();
    globalThis.ResizeObserver = class { constructor(cb) { callback = cb; } observe(node) { observe(node); } disconnect() {} };
    try {
      render(<ChatThread turns={[turn(1), turn(2)]} />);
      const log = screen.getByRole('log');
      expect(observe).toHaveBeenCalledWith(log);
      // Shown: the region gets its real size; the observer reports it and the thread goes to the bottom.
      Object.defineProperty(log, 'clientHeight', { configurable: true, value: 600 });
      Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 9000 });
      act(() => callback([]));
      expect(log.scrollTop).toBe(9000);
    } finally {
      delete globalThis.ResizeObserver;
    }
  });

  it('opens another chat at its bottom even if the reader scrolled up in the previous one', () => {
    let callback;
    globalThis.ResizeObserver = class { constructor(cb) { callback = cb; } observe() {} disconnect() {} };
    try {
      const view = render(<ChatThread chat={{ id: 1 }} turns={[turn(1), turn(2)]} />);
      const log = screen.getByRole('log');
      Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 5000 });
      Object.defineProperty(log, 'clientHeight', { configurable: true, value: 400 });
      log.scrollTop = 100;
      fireEvent.scroll(log);
      // Switch without any scroll event (as in a background page), then the new chat's content grows.
      view.rerender(<ChatThread chat={{ id: 2 }} turns={[turn(3), turn(4)]} />);
      Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 7000 });
      act(() => callback([]));
      expect(log.scrollTop).toBe(7000);
    } finally {
      delete globalThis.ResizeObserver;
    }
  });

  it('contains the wide side panel independently', async () => {
    globalThis.WebSocket = TestSocket;
    const chat = { id: 7, title: 'Chat', archived_at: null, selection: { entry: 'model', effort: 'high' } };
    const api = {
      getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
      getCatalogue: vi.fn().mockResolvedValue({ entries: [{ id: 'model', driver: 'test', model: 'test', label: 'Test' }], default: { entry: 'model', effort: 'high' } }),
      listChats: vi.fn().mockResolvedValue({ results: [chat], next: null }),
      listTurns: vi.fn().mockResolvedValue({ results: [], next: null }),
    };
    const { container } = render(<ChatWorkspace api={api} wsUrl={() => 'ws://test'} sidePanel={() => <div>Panel content</div>} />);
    fireEvent.click(await screen.findByText('Chat'));
    await waitFor(() => expect(TestSocket.instances).toHaveLength(1));
    act(() => TestSocket.instances[0].open());
    // The boundary is the workspace grid's own side-panel cell, not some element inside the host's content.
    const cell = screen.getByText('Panel content').parentElement;
    expect(cell.parentElement).toBe(container.firstElementChild);
    expect(css(cell).contain).toBe('strict');
  });

  it.each(['standard', 'compact'])('keeps the %s composer layout and gives its region layout containment', (layout) => {
    const { container } = render(<ChatComposer layout={layout} />);
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    expect(input.tagName.toLowerCase()).toBe('textarea');
    expect(screen.getByRole('button', { name: 'Chat.send' })).toBeTruthy();
    const region = container.firstElementChild;
    expect(css(region).contain).toBe('layout paint');
  });
});