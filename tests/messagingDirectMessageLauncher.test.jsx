// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { DirectMessageLauncher } from '../src/index';
import { MessagingProvider } from '../src/messaging/MessagingProvider';

const candidates = [{ id: 2, display_name: 'Alex' }, { id: 3, display_name: 'Sam' }];

function renderLauncher({ api = { createDirectConversation: vi.fn().mockResolvedValue({ id: 41, kind: 'direct' }) }, ...props } = {}) {
  const onOpen = props.onOpen || vi.fn();
  render(<MessagingProvider api={api} active={false}><DirectMessageLauncher candidates={candidates} onOpen={onOpen} {...props} /></MessagingProvider>);
  return { api, onOpen };
}
function openPicker() { fireEvent.click(screen.getByRole('button', { name: 'MessagingDirect.LAUNCH' })); }
function selectCandidate(name) {
  const input = screen.getByLabelText('MessagingDirect.CANDIDATES');
  fireEvent.mouseDown(input);
  fireEvent.click(screen.getByRole('option', { name }));
}

afterEach(() => {
  cleanup();
  window.matchMedia = undefined;
});

describe('DirectMessageLauncher', () => {
  it('opens a picker with a searchable candidate autocomplete and renders a distinct empty state', () => {
    renderLauncher();
    openPicker();
    expect(screen.getByRole('dialog')).toBeTruthy();
    const input = screen.getByLabelText('MessagingDirect.CANDIDATES');
    expect(input.getAttribute('placeholder')).toBe('MessagingDirect.SEARCH_PLACEHOLDER');
    fireEvent.mouseDown(input);
    expect(screen.getByRole('option', { name: 'Alex' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Sam' })).toBeTruthy();

    cleanup();
    renderLauncher({ candidates: [] });
    openPicker();
    expect(screen.getByText('MessagingDirect.EMPTY')).toBeTruthy();
    expect(screen.queryByLabelText('MessagingDirect.CANDIDATES')).toBeNull();
  });

  it('filters candidates as the query is typed', () => {
    renderLauncher();
    openPicker();
    const input = screen.getByLabelText('MessagingDirect.CANDIDATES');
    fireEvent.mouseDown(input);
    // MUI's Autocomplete only reacts to a typed value once the input is genuinely focused --
    // mouseDown alone opens the listbox but doesn't focus the input in jsdom.
    input.focus();
    fireEvent.change(input, { target: { value: 'Sa' } });
    expect(screen.getByRole('option', { name: 'Sam' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Alex' })).toBeNull();
  });

  it('shows a localized message when a typed query matches nothing (ui_reviewer finding U1)', () => {
    renderLauncher();
    openPicker();
    const input = screen.getByLabelText('MessagingDirect.CANDIDATES');
    fireEvent.mouseDown(input);
    input.focus();
    fireEvent.change(input, { target: { value: 'zzz-no-such-person' } });
    expect(screen.getByText('MessagingDirect.NO_MATCHES')).toBeTruthy();
  });

  it('requires a recipient, disables while starting, then opens the created conversation with scope', async () => {
    let resolveRequest;
    const api = { createDirectConversation: vi.fn(() => new Promise((resolve) => { resolveRequest = resolve; })) };
    const { onOpen } = renderLauncher({ api, scope: { kind: 'event', id: 8 } });
    openPicker();
    const start = screen.getByRole('button', { name: 'MessagingDirect.START' });
    expect(start.disabled).toBe(true);
    selectCandidate('Alex');
    expect(start.disabled).toBe(false);
    fireEvent.click(start);
    expect(api.createDirectConversation).toHaveBeenCalledWith({ target_user_id: 2, scope: { kind: 'event', id: 8 } });
    expect(start.disabled).toBe(true);
    expect(screen.getByRole('status')).toBeTruthy();
    resolveRequest({ id: 41, kind: 'direct' });
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith({ id: 41, kind: 'direct' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('uses the selected candidate scope over the launcher scope', () => {
    const api = { createDirectConversation: vi.fn().mockResolvedValue({ id: 41, kind: 'direct' }) };
    renderLauncher({
      api,
      candidates: [
        { id: 2, display_name: 'Alex', scope: 'scope-a' },
        { id: 3, display_name: 'Sam', scope: 'scope-b' },
      ],
      scope: 'scope-prop',
    });
    openPicker();
    selectCandidate('Sam');
    fireEvent.click(screen.getByRole('button', { name: 'MessagingDirect.START' }));
    expect(api.createDirectConversation).toHaveBeenCalledWith({ target_user_id: 3, scope: 'scope-b' });
  });

  it('falls back to the launcher scope when the selected candidate has none', () => {
    const api = { createDirectConversation: vi.fn().mockResolvedValue({ id: 41, kind: 'direct' }) };
    renderLauncher({
      api,
      candidates: [
        { id: 2, display_name: 'Alex' },
        { id: 3, display_name: 'Sam', scope: 'scope-b' },
      ],
      scope: 'scope-prop',
    });
    openPicker();
    selectCandidate('Alex');
    fireEvent.click(screen.getByRole('button', { name: 'MessagingDirect.START' }));
    expect(api.createDirectConversation).toHaveBeenCalledWith({ target_user_id: 2, scope: 'scope-prop' });
  });

  it('omits scope when neither the candidate nor launcher provides one', () => {
    const api = { createDirectConversation: vi.fn().mockResolvedValue({ id: 41, kind: 'direct' }) };
    renderLauncher({ api });
    openPicker();
    selectCandidate('Alex');
    fireEvent.click(screen.getByRole('button', { name: 'MessagingDirect.START' }));
    expect(Object.keys(api.createDirectConversation.mock.calls[0][0])).toEqual(['target_user_id']);
  });

  it('surfaces a policy rejection without closing the picker', async () => {
    const api = { createDirectConversation: vi.fn().mockRejectedValue({ response: { data: { detail: 'Direct messages are restricted.' } } }) };
    renderLauncher({ api });
    openPicker();
    selectCandidate('Alex');
    fireEvent.click(screen.getByRole('button', { name: 'MessagingDirect.START' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Direct messages are restricted.');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('uses a fullscreen dialog at the small-viewport media query', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderLauncher();
    openPicker();
    expect(document.querySelector('.MuiDialog-paperFullScreen')).not.toBeNull();
  });
});
