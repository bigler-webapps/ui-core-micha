// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChatGroupGrants from '../src/chat/ChatGroupGrants';

let language = 'en';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language } }) }));

const catalogue = (revision = 'g1') => ({
  supported: true, grant_revision: revision, catalogue_revision: 'c1', groups: [
    { id: 'enabled', label: 'Enabled', kind: 'read', enabled: true, editable: true, members: [] },
    { id: 'disabled', label: 'Disabled', kind: 'read', enabled: false, editable: true, members: [] },
  ],
});
const apiFor = (value = catalogue()) => ({
  getGroupGrants: vi.fn().mockResolvedValue(value),
  saveGroupGrants: vi.fn().mockResolvedValue(value),
});
const payload = (ids, extra = {}) => ({ group_ids: ids, grant_revision: 'g1', catalogue_revision: 'c1', ...extra });
async function open() {
  fireEvent.click(await screen.findByRole('button', { name: 'Chat.grants' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('switch', { name: 'Enabled' });
  return dialog;
}
const toggle = (dialog, name) => fireEvent.click(within(dialog).getByRole('switch', { name }));
const save = (dialog) => fireEvent.click(within(dialog).getByRole('button', { name: 'Chat.save' }));
const cycle = (dialog) => { toggle(dialog, 'Enabled'); toggle(dialog, 'Enabled'); };
afterEach(() => { cleanup(); language = 'en'; });

it('reauthorizes an initially enabled group switched off and on before saving', async () => {
  const api = apiFor();
  render(<ChatGroupGrants chatId={1} api={api} />);
  const dialog = await open();
  cycle(dialog);
  save(dialog);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenCalledWith(1, payload(['enabled'], { reauthorize_group_ids: ['enabled'] }), { language: 'en' }));
  await within(dialog).findByText('Chat.grantsSaved');
  save(dialog);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenLastCalledWith(1, payload(['enabled']), { language: 'en' }));
});

it.each([
  ['unchanged', [], ['enabled']],
  ['an unrelated group enabled', ['Disabled'], ['enabled', 'disabled']],
  ['an initially disabled group switched on and off and on', ['Disabled', 'Disabled', 'Disabled'], ['enabled', 'disabled']],
  ['an initially enabled group switched off', ['Enabled'], []],
])('does not reauthorize on %s', async (_label, toggles, ids) => {
  const api = apiFor();
  render(<ChatGroupGrants chatId={1} api={api} />);
  const dialog = await open();
  toggles.forEach((name) => toggle(dialog, name));
  save(dialog);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenCalledWith(1, payload(ids), { language: 'en' }));
});

it('clears reauthorization when the draft is cancelled', async () => {
  const api = apiFor();
  render(<ChatGroupGrants chatId={1} api={api} />);
  let dialog = await open();
  cycle(dialog);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Chat.cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  dialog = await open();
  save(dialog);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenCalledWith(1, payload(['enabled']), { language: 'en' }));
});

it('clears reauthorization when switching chats', async () => {
  const api = apiFor();
  const view = render(<ChatGroupGrants chatId={1} api={api} />);
  const first = await open();
  cycle(first);
  view.rerender(<ChatGroupGrants chatId={2} api={api} />);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  const second = await open();
  save(second);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenCalledWith(2, payload(['enabled']), { language: 'en' }));
});

it('clears reauthorization after reloading a stale save', async () => {
  const api = apiFor();
  api.saveGroupGrants.mockRejectedValueOnce({ response: { data: { code: 'stale_grants' } } }).mockResolvedValue(catalogue('g2'));
  api.getGroupGrants.mockResolvedValueOnce(catalogue()).mockResolvedValueOnce(catalogue()).mockResolvedValue(catalogue('g2'));
  render(<ChatGroupGrants chatId={1} api={api} />);
  const dialog = await open();
  cycle(dialog);
  save(dialog);
  fireEvent.click(await within(dialog).findByRole('button', { name: 'Chat.grantsReload' }));
  await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Chat.save' }).disabled).toBe(false));
  save(dialog);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenLastCalledWith(1, { ...payload(['enabled']), grant_revision: 'g2' }, { language: 'en' }));
});

it('retains reauthorization across a language refresh with unchanged revisions', async () => {
  const api = apiFor();
  const view = render(<ChatGroupGrants chatId={1} api={api} />);
  const dialog = await open();
  cycle(dialog);
  language = 'de';
  view.rerender(<ChatGroupGrants chatId={1} api={api} />);
  await waitFor(() => expect(api.getGroupGrants).toHaveBeenLastCalledWith(1, { language: 'de' }));
  await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Chat.save' }).disabled).toBe(false));
  save(dialog);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenCalledWith(1, payload(['enabled'], { reauthorize_group_ids: ['enabled'] }), { language: 'de' }));
});

it('retains reauthorization after a failed save for retry', async () => {
  const api = apiFor();
  api.saveGroupGrants.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(catalogue());
  render(<ChatGroupGrants chatId={1} api={api} />);
  const dialog = await open();
  cycle(dialog);
  save(dialog);
  await within(dialog).findByText('Chat.grantsSaveError');
  save(dialog);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenCalledTimes(2));
  expect(api.saveGroupGrants).toHaveBeenNthCalledWith(1, 1, payload(['enabled'], { reauthorize_group_ids: ['enabled'] }), { language: 'en' });
  expect(api.saveGroupGrants).toHaveBeenNthCalledWith(2, 1, payload(['enabled'], { reauthorize_group_ids: ['enabled'] }), { language: 'en' });
});

it('submits only cycled groups among multiple initially enabled groups', async () => {
  const value = catalogue();
  value.groups = ['First', 'Second', 'Third', 'Fourth'].map((label) => ({
    id: label.toLowerCase(), label, kind: 'read', enabled: true, editable: true, members: [],
  }));
  const api = apiFor(value);
  render(<ChatGroupGrants chatId={1} api={api} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Chat.grants' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('switch', { name: 'First' });
  ['First', 'First', 'Third', 'Third', 'Fourth'].forEach((name) => toggle(dialog, name));
  save(dialog);
  await waitFor(() => expect(api.saveGroupGrants).toHaveBeenCalledWith(1,
    payload(['second', 'first', 'third'], { reauthorize_group_ids: ['first', 'third'] }), { language: 'en' }));
});

it('shows reauthorization guidance for an enabled group with an available ungranted member', async () => {
  const value = catalogue();
  value.groups[0].members = [{ id: 'member', label: 'Member', available: true, effective: false }];
  render(<ChatGroupGrants chatId={1} api={apiFor(value)} />);
  const dialog = await open();
  expect(within(dialog).getByText('Chat.grantsReauthorizeHint')).toBeTruthy();
});
