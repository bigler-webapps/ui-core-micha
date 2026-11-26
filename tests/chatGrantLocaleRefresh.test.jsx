// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatGroupGrants from '../src/chat/ChatGroupGrants';
import { createChatApi } from '../src/chat/api';

let language = 'en';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language } }) }));
vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
import client from '../src/auth/apiClient';

const catalogue = (label, enabled = true) => ({ supported: true, grant_revision: 'g', catalogue_revision: 'c', groups: [{ id: 'one', label, kind: 'read', enabled, editable: true, members: [] }] });
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
afterEach(() => { cleanup(); language = 'en'; vi.clearAllMocks(); });

it('forwards locale as a request header without changing grant payloads', async () => {
  client.get.mockResolvedValue({ data: {} });
  client.put.mockResolvedValue({ data: {} });
  const api = createChatApi({}, { apiBase: '/custom/' });
  const payload = { group_ids: ['one'], grant_revision: 'g', catalogue_revision: 'c' };
  await api.getGroupGrants('a/b', { language: 'de' });
  await api.saveGroupGrants('a/b', payload, { language: 'de' });
  expect(client.get).toHaveBeenCalledWith('/custom/chats/a%2Fb/group-grants/', { headers: { 'Accept-Language': 'de' } });
  expect(client.put).toHaveBeenCalledWith('/custom/chats/a%2Fb/group-grants/', payload, { headers: { 'Accept-Language': 'de' } });
});

it('refreshes translated labels, preserves a draft, and ignores an older language response', async () => {
  const old = deferred();
  const api = { getGroupGrants: vi.fn().mockResolvedValueOnce(catalogue('English')).mockReturnValueOnce(old.promise).mockResolvedValueOnce(catalogue('Deutsch')), saveGroupGrants: vi.fn() };
  const view = render(<ChatGroupGrants chatId={1} api={api} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Chat.grants' }));
  language = 'de';
  view.rerender(<ChatGroupGrants chatId={1} api={api} />);
  expect(await screen.findByRole('switch', { name: 'Deutsch' })).toBeTruthy();
  await act(async () => old.resolve(catalogue('English')));
  expect(screen.queryByRole('switch', { name: 'English' })).toBeNull();
  fireEvent.click(screen.getByRole('switch', { name: 'Deutsch' }));
  api.getGroupGrants.mockResolvedValueOnce(catalogue('Français'));
  language = 'fr';
  view.rerender(<ChatGroupGrants chatId={1} api={api} />);
  expect((await screen.findByRole('switch', { name: 'Français' })).checked).toBe(false);
  expect(api.getGroupGrants).toHaveBeenLastCalledWith(1, { language: 'fr' });
});

it('waits for an in-flight save before fetching the new language', async () => {
  const pending = deferred();
  const api = { getGroupGrants: vi.fn().mockResolvedValueOnce(catalogue('English')).mockResolvedValueOnce(catalogue('English')).mockResolvedValueOnce(catalogue('Deutsch', false)), saveGroupGrants: vi.fn().mockReturnValue(pending.promise) };
  const view = render(<ChatGroupGrants chatId={1} api={api} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Chat.grants' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Chat.save' }));
  language = 'de';
  view.rerender(<ChatGroupGrants chatId={1} api={api} />);
  expect(api.getGroupGrants).toHaveBeenCalledTimes(2);
  await act(async () => pending.resolve(catalogue('English', false)));
  await waitFor(() => expect(screen.getByRole('switch', { name: 'Deutsch' }).checked).toBe(false));
});

it.each(['grant_revision', 'catalogue_revision'])('marks a preserved draft stale when %s changes during locale refresh', async (revision) => {
  const initial = catalogue('English');
  const updated = { ...catalogue('Deutsch'), [revision]: 'changed' };
  const api = { getGroupGrants: vi.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce(initial).mockResolvedValue(updated), saveGroupGrants: vi.fn() };
  const view = render(<ChatGroupGrants chatId={1} api={api} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Chat.grants' }));
  fireEvent.click(await screen.findByRole('switch', { name: 'English' }));
  language = 'de';
  view.rerender(<ChatGroupGrants chatId={1} api={api} />);
  expect((await screen.findByRole('switch', { name: 'Deutsch' })).checked).toBe(false);
  expect(await screen.findByText('Chat.grantsStale')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Chat.save' }).disabled).toBe(true);
  expect(api.saveGroupGrants).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Chat.grantsReload' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Chat.save' }).disabled).toBe(false));
  expect(screen.getByRole('switch', { name: 'Deutsch' }).checked).toBe(true);
});
