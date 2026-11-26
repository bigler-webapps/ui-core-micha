// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { chatTranslations } from '../src/i18n/chatTranslations';
import ChatGroupGrants from '../src/chat/ChatGroupGrants';
import ChatWorkspace from '../src/chat/ChatWorkspace';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values = {}) => {
  let text = chatTranslations[key]?.de || key;
  Object.entries(values).forEach(([name, value]) => { text = text.replace(`{{${name}}}`, String(value)); });
  return text;
} }) }));

const member = (id, label, extra = {}) => ({ id, label, available: true, effective: true, ...extra });
const group = (id, label, kind, members, extra = {}) => ({ id, label, kind, members, enabled: false, editable: true, ...extra });
const planning = {
  supported: true, grant_revision: 'g1', catalogue_revision: 'c1', groups: [
    group('plans', 'Planungsgrundlagen', 'read', [member('a', 'Pläne lesen'), member('b', 'Prüfung lesen', { available: false, effective: false })], { enabled: true }),
    group('rounds', 'Runden', 'read', [member('c', 'Runden lesen', { available: false, effective: false })], { editable: false }),
  ],
};
const library = {
  supported: true, grant_revision: 'g2', catalogue_revision: 'c2', groups: [
    group('books', 'Bibliothek', 'read', [member('book', 'Bücher lesen')]),
    group('direct', 'Notizen', 'write', [member('note', 'Notiz erstellen', { confirmation: 'direct' })]),
    group('confirm', 'Ausleihe', 'write', [member('loan', 'Buch ausleihen', { confirmation: 'confirmation_required' })]),
    group('mixed', 'Sammlung', 'write', [member('add', 'Hinzufügen', { confirmation: 'direct' }), member('remove', 'Entfernen', { confirmation: 'confirmation_required' })]),
  ],
};
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const apiFor = (value) => ({ getGroupGrants: vi.fn().mockResolvedValue(value), saveGroupGrants: vi.fn().mockResolvedValue(value) });
async function open() { const trigger = await screen.findByRole('button', { name: 'Chat-Freigaben' }); trigger.focus(); fireEvent.click(trigger); return screen.findByRole('dialog', { name: 'Chat-Freigaben' }); }
afterEach(cleanup);

describe('catalogue driven chat grants', () => {
  it('marks an available but ineffective member as not granted in an enabled group', async () => {
    const catalogue = { ...planning, groups: [group('plans', 'Planungsgrundlagen', 'read', [member('a', 'Pläne lesen', { effective: false })], { enabled: true })] };
    render(<ChatGroupGrants chatId={1} api={apiFor(catalogue)} />);
    const dialog = await open();
    expect(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }).checked).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Planungsgrundlagen' }));
    const memberRow = within(dialog).getByText('Pläne lesen').parentElement;
    expect(within(memberRow).getByText('Nicht freigegeben')).toBeTruthy();
    expect(within(memberRow).queryByText('App-Recht fehlt')).toBeNull();
  });

  it('renders one translated switch per read group, collapsed details and unavailable members', async () => {
    render(<ChatGroupGrants chatId={1} api={apiFor(planning)} />);
    const dialog = await open();
    expect(within(dialog).getAllByRole('switch')).toHaveLength(2);
    expect(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }).checked).toBe(true);
    expect(within(dialog).getByRole('switch', { name: 'Runden' }).disabled).toBe(true);
    expect(within(dialog).getByText('Keine Schreibaktionen im Chat')).toBeTruthy();
    expect(within(dialog).getByText('1 von 2 verfügbar')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Planungsgrundlagen' }).getAttribute('aria-expanded')).toBe('false');
    expect(within(dialog).queryByText('Pläne lesen', { selector: ':not([aria-hidden])' })?.closest('.MuiCollapse-hidden')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Planungsgrundlagen' }));
    expect(within(dialog).getByText('Pläne lesen')).toBeTruthy();
    expect(within(within(dialog).getByText('Prüfung lesen').parentElement).getByText('App-Recht fehlt')).toBeTruthy();
    expect(within(dialog).getAllByRole('switch')).toHaveLength(2);
  });

  it('renders an unrelated catalogue and direct, confirmed and mixed write policies', async () => {
    render(<ChatGroupGrants chatId={2} api={apiFor(library)} />);
    const dialog = await open();
    expect(within(dialog).getAllByRole('switch')).toHaveLength(4);
    expect(within(dialog).getByText('1 von 1 verfügbar · Direkt bei ausdrücklichem Auftrag')).toBeTruthy();
    expect(within(dialog).getByText('1 von 1 verfügbar · Mit Bestätigung')).toBeTruthy();
    expect(within(dialog).getByText('2 von 2 verfügbar · Bestätigung je nach Aktion')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sammlung' }));
    expect(within(dialog).getByText('Hinzufügen')).toBeTruthy();
    expect(within(dialog).getByText('Entfernen')).toBeTruthy();
    expect(within(dialog).getAllByText('Direkt bei ausdrücklichem Auftrag')).toHaveLength(2);
    expect(within(dialog).getAllByText('Mit Bestätigung')).toHaveLength(2);
    expect(within(dialog).getAllByRole('switch')).toHaveLength(4);
  });

  it('discards cancelled and escaped drafts and returns focus to the gear', async () => {
    const api = apiFor(planning);
    render(<ChatGroupGrants chatId={1} api={api} />);
    let dialog = await open();
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chat-Freigaben' })));
    dialog = await open();
    expect(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }).checked).toBe(true);
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }));
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chat-Freigaben' }));
    expect(api.saveGroupGrants).not.toHaveBeenCalled();
  });

  it('retains a failed draft for retry and saves only group IDs and revisions', async () => {
    const api = apiFor(planning);
    api.saveGroupGrants.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...planning, groups: planning.groups.map((g) => ({ ...g, enabled: false })) });
    render(<ChatGroupGrants chatId={1} api={api} />);
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    expect(await within(dialog).findByText('Chat-Freigaben konnten nicht gespeichert werden.')).toBeTruthy();
    expect(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }).checked).toBe(false);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    expect(await within(dialog).findByText('Chat-Freigaben gespeichert.')).toBeTruthy();
    expect(api.saveGroupGrants).toHaveBeenLastCalledWith(1, { group_ids: [], grant_revision: 'g1', catalogue_revision: 'c1' });
  });

  it('submits the ID of an enabled group', async () => {
    const api = apiFor(library);
    render(<ChatGroupGrants chatId={2} api={api} />);
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Bibliothek' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(api.saveGroupGrants).toHaveBeenCalledWith(2, { group_ids: ['books'], grant_revision: 'g2', catalogue_revision: 'c2' }));
  });

  it('offers reload after a stale save', async () => {
    const api = apiFor(planning);
    const refreshed = { ...planning, grant_revision: 'g3', catalogue_revision: 'c3', groups: planning.groups.map((g) => ({ ...g, enabled: false })) };
    api.getGroupGrants.mockResolvedValueOnce(planning).mockResolvedValueOnce(planning).mockResolvedValueOnce(refreshed);
    api.saveGroupGrants.mockRejectedValueOnce({ response: { data: { code: 'stale_grants' } } }).mockResolvedValueOnce(refreshed);
    render(<ChatGroupGrants chatId={1} api={api} />);
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    expect(await within(dialog).findByText('Die Freigaben wurden geändert. Neu laden.')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Speichern' }).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Neu laden' }));
    await waitFor(() => expect(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }).checked).toBe(false));
    expect(within(dialog).getByRole('button', { name: 'Speichern' }).disabled).toBe(false);
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Planungsgrundlagen' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(api.saveGroupGrants).toHaveBeenLastCalledWith(1, { group_ids: ['plans'], grant_revision: 'g3', catalogue_revision: 'c3' }));
  });

  it.each(['read', 'save'])('ignores a late %s response after switching chats', async (operation) => {
    const pending = deferred();
    const api = apiFor(planning);
    api.getGroupGrants.mockImplementation((id) => id === 2 ? Promise.resolve(library) : operation === 'read' && api.getGroupGrants.mock.calls.filter(([chat]) => chat === 1).length > 1 ? pending.promise : Promise.resolve(planning));
    if (operation === 'save') api.saveGroupGrants.mockReturnValue(pending.promise);
    const view = render(<ChatGroupGrants key="1" chatId={1} api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Chat-Freigaben' }));
    if (operation === 'save') fireEvent.click(await screen.findByRole('button', { name: 'Speichern' }));
    view.rerender(<ChatGroupGrants key="2" chatId={2} api={api} />);
    const dialog = await open();
    expect(await within(dialog).findByRole('switch', { name: 'Bibliothek' })).toBeTruthy();
    await act(async () => pending.resolve(planning));
    expect(within(dialog).getByRole('switch', { name: 'Bibliothek' })).toBeTruthy();
    expect(within(dialog).queryByRole('switch', { name: 'Planungsgrundlagen' })).toBeNull();
  });

  it('keeps the shared workspace usable when the app has no catalogue support', async () => {
    const api = { getStatus: vi.fn().mockResolvedValue({ status: 'available' }), getCatalogue: vi.fn().mockResolvedValue({ entries: [], default: null }), listChats: vi.fn().mockResolvedValue({ results: [{ id: 1, title: 'Existing', archived_at: null }], next: null }), listTurns: vi.fn().mockResolvedValue({ results: [{ id: 1, seq: 1, user_text: 'Hello', state: 'completed' }], next: null }), getGroupGrants: vi.fn().mockResolvedValue({ supported: false }) };
    render(<ChatWorkspace api={api} wsUrl={() => 'ws://localhost/test'} />);
    fireEvent.click(await screen.findByText('Existing'));
    await waitFor(() => expect(api.getGroupGrants).toHaveBeenCalledWith(1));
    expect(screen.queryByRole('button', { name: 'Chat-Freigaben' })).toBeNull();
    expect(screen.getByRole('textbox', { name: chatTranslations['Chat.message'].de })).toBeTruthy();
  });

  it('shows the grants gear in an existing active workspace chat with a supported catalogue', async () => {
    const api = { getStatus: vi.fn().mockResolvedValue({ status: 'available' }), getCatalogue: vi.fn().mockResolvedValue({ entries: [], default: null }), listChats: vi.fn().mockResolvedValue({ results: [{ id: 1, title: 'Existing', archived_at: null }], next: null }), listTurns: vi.fn().mockResolvedValue({ results: [], next: null }), getGroupGrants: vi.fn().mockResolvedValue(planning) };
    render(<ChatWorkspace api={api} wsUrl={() => 'ws://localhost/test'} />);
    fireEvent.click(await screen.findByText('Existing'));
    expect(await screen.findByRole('button', { name: 'Chat-Freigaben' })).toBeTruthy();
    expect(api.getGroupGrants).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Chat-Freigaben' }));
    expect(await screen.findByRole('switch', { name: 'Planungsgrundlagen' })).toBeTruthy();
  });
});
