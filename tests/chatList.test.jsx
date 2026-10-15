// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));

import ChatList from '../src/chat/ChatList';

afterEach(cleanup);

const chats = [{ id: 1, title: 'Budget' }, { id: 2, title: 'Ideas' }];
const archivedChats = [{ id: 3, title: 'Old notes', archived_at: '2026-10-01T00:00:00Z' }];

function setup(props = {}) {
  const handlers = { onSelect: vi.fn(), onNew: vi.fn(), onRename: vi.fn(), onArchive: vi.fn(), onRestore: vi.fn(), onDelete: vi.fn() };
  render(<ChatList chats={chats} archivedChats={archivedChats} {...handlers} {...props} />);
  return handlers;
}
const rowMenu = (index) => fireEvent.click(screen.getAllByRole('button', { name: 'Chat.actions' })[index]);

describe('ChatList', () => {
  it('selects and creates chats', () => {
    const { onSelect, onNew } = setup();
    fireEvent.click(screen.getByText('Ideas'));
    expect(onSelect).toHaveBeenCalledWith(chats[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Chat.newChat' }));
    expect(onNew).toHaveBeenCalled();
  });

  it('renames through a dialog', () => {
    const { onRename } = setup();
    rowMenu(0);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.rename' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat.renameLabel' }), { target: { value: ' Budget 2027 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.save' }));
    expect(onRename).toHaveBeenCalledWith(chats[0], 'Budget 2027');
  });

  it('archives from the row menu', () => {
    const { onArchive } = setup();
    rowMenu(1);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.archive' }));
    expect(onArchive).toHaveBeenCalledWith(chats[1]);
  });

  it('asks for confirmation before deleting and does nothing on cancel', () => {
    const { onDelete } = setup();
    rowMenu(0);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.delete' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Chat.deleteConfirm')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chat.cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes after the confirmation', () => {
    const { onDelete } = setup();
    rowMenu(0);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chat.delete' }));
    expect(onDelete).toHaveBeenCalledWith(chats[0]);
  });

  it('hides archived chats behind the Archived entry with its count and restores from there', () => {
    const { onRestore } = setup();
    expect(screen.queryByText('Old notes')).toBeNull();
    const toggle = screen.getByRole('button', { name: /Chat.archived/ });
    expect(toggle.textContent).toContain('1');
    fireEvent.click(toggle);
    expect(screen.getByText('Old notes')).toBeTruthy();
    rowMenu(2);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat.restore' }));
    expect(onRestore).toHaveBeenCalledWith(archivedChats[0]);
  });

  it('offers more chats by cursor', () => {
    const onLoadMore = vi.fn();
    setup({ hasMore: true, onLoadMore });
    fireEvent.click(screen.getByRole('button', { name: 'Chat.loadMore' }));
    expect(onLoadMore).toHaveBeenCalled();
  });
});
