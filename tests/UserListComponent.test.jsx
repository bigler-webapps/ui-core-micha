// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const authApi = vi.hoisted(() => ({
  fetchUsersList: vi.fn(),
  updateUserRole: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);
vi.mock('react-i18next', () => {
  const KEYS = {
    'UserList.TITLE': 'All Users',
    'Common.SEARCH': 'Search',
    // UCM-BILL-9: the icon delete button is named "Delete – {name}"; the mock does not interpolate.
    'Common.DELETE_FOR': 'Delete',
    'UserList.SEARCH_PLACEHOLDER': 'Search users...',
    'Auth.EMAIL_LABEL': 'Email',
    'Profile.NAME_LABEL': 'Name',
    'UserList.ROLE': 'Role',
    'UserList.ROLE_UPDATE_SUCCESS': 'Role updated.',
    'Auth.USER_ROLE_UPDATE_FAILED': 'Role update failed.',
    'UserList.NO_USERS': 'No users found.',
  };
  const t = (key, fallback) => KEYS[key] ?? (typeof fallback === 'string' ? fallback : key);
  return {
    useTranslation: () => ({
      t,
      // resolveErrorText (AUTH-10) reads i18n.exists/i18n.t off the object
      // useTranslation() returns — this mock must carry both, not just `t`.
      i18n: { exists: (key) => Object.hasOwn(KEYS, key), t },
    }),
  };
});

import { UserListComponent, formatDisplayedRowsLabel } from '../src/components/UserListComponent';

const currentUser = { id: 99, is_superuser: true, role: 'admin' };
const user = { id: 1, email: 'person@example.com', role: 'student' };
const ownUser = { id: 99, email: 'admin@example.com', role: 'admin' };

function renderDeleteList(props = {}) {
  return render(
    <UserListComponent
      currentUser={currentUser}
      showNewColumn={false}
      showSuccessfulLoginColumn={false}
      {...props}
    />,
  );
}

describe('compact user directory', () => {
  afterEach(() => cleanup());

  it('keeps role, login, extension callbacks and delete restrictions while filtering cards', async () => {
    const onInspect = vi.fn();
    authApi.fetchUsersList.mockResolvedValueOnce([
      { ...user, last_login: '2026-11-12T09:00:00Z' },
      ownUser,
    ]);
    renderDeleteList({
      compact: true,
      showSuccessfulLoginColumn: true,
      extraColumns: [{ key: 'extra', label: 'Extension', renderCell: ({ user: entry }) => `Extra ${entry.id}` }],
      extraRowActions: [{ key: 'inspect', label: 'Inspect', onClick: onInspect }],
    });

    await screen.findByText(user.email);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Delete' }).map((button) => button.disabled)).toEqual([true, false]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'student' } });
    expect(screen.queryByText(ownUser.email)).toBeNull();
    const lastLogin = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })
      .format(new Date('2026-11-12T09:00:00Z'));
    expect(screen.getByText(`UserList.LAST_LOGIN: ${lastLogin}`)).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Role' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'UserList.DETAILS' }));
    expect(screen.getByText('Extra 1')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }));
  });

  it('does not show or sort by login timestamps when the caller hides login information', async () => {
    authApi.fetchUsersList.mockResolvedValueOnce([{ ...user, last_login: '2026-11-12T09:00:00Z' }]);
    renderDeleteList({ compact: true });
    await screen.findByText(user.email);
    expect(screen.queryByText(/UserList\.LAST_LOGIN/)).toBeNull();
  });
});

function getRowByEmail(email) {
  return screen.getByRole('cell', { name: email }).closest('tr');
}

function renderUserList() {
  return render(
    <UserListComponent
      currentUser={currentUser}
      showNewColumn={false}
      showSuccessfulLoginColumn={false}
      showDeleteAction={false}
    />,
  );
}

async function chooseRole(role) {
  fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
  await waitFor(() => expect(screen.getByRole('listbox')).toBeTruthy());
  fireEvent.click(screen.getByRole('option', { name: role }));
}

describe('UserListComponent role updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.fetchUsersList.mockResolvedValue([user]);
    authApi.updateUserRole.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('confirms a successful role update', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderUserList();

    await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toBeTruthy());
    await chooseRole('teacher');

    await waitFor(() => expect(authApi.updateUserRole).toHaveBeenCalledWith(1, 'teacher'));
    expect(alert).toHaveBeenCalledWith('Role updated.');
  });

  it('keeps the failure feedback when a role update fails', async () => {
    authApi.updateUserRole.mockRejectedValue({ code: 'Auth.USER_ROLE_UPDATE_FAILED' });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderUserList();

    await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toBeTruthy());
    await chooseRole('teacher');

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Role update failed.'));
    expect(authApi.fetchUsersList).toHaveBeenCalledTimes(1);
  });
});

describe('UserListComponent delete actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.fetchUsersList.mockResolvedValue([ownUser, user]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not offer a superuser deletion of their own row', async () => {
    renderDeleteList();

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2));

    // UCM-BILL-9: the own row shows the icon button disabled instead of hiding it.
    expect(within(getRowByEmail(ownUser.email)).getByRole('button', { name: 'Delete' }).disabled).toBe(true);
    expect(within(getRowByEmail(user.email)).getByRole('button', { name: 'Delete' }).disabled).toBe(false);
  });

  it('does not offer an admin deletion of their own row', async () => {
    renderDeleteList({ currentUser: { id: 99, role: 'admin' } });

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2));

    expect(within(getRowByEmail(ownUser.email)).getByRole('button', { name: 'Delete' }).disabled).toBe(true);
    expect(within(getRowByEmail(user.email)).getByRole('button', { name: 'Delete' }).disabled).toBe(false);
  });

  it('does not restore the own-row delete action when canDeleteUser returns true', async () => {
    renderDeleteList({ canDeleteUser: () => true });

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2));

    expect(within(getRowByEmail(ownUser.email)).getByRole('button', { name: 'Delete' }).disabled).toBe(true);
    expect(within(getRowByEmail(user.email)).getByRole('button', { name: 'Delete' }).disabled).toBe(false);
  });

  it('keeps unrelated rows and disabled delete actions when currentUser is not loaded', async () => {
    authApi.fetchUsersList.mockResolvedValue([user]);
    renderDeleteList({ currentUser: null });

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1));

    expect(screen.getByRole('button', { name: 'Delete' }).disabled).toBe(true);
  });

  it('matches the own row even when the row id and current-user id have different types', async () => {
    // The backend row's id can come back as a string while currentUser.id is a
    // number (or vice versa) -- isOwnRow must compare by value, not by strict
    // type, or this exact mismatch would silently show the button again.
    authApi.fetchUsersList.mockResolvedValue([{ ...ownUser, id: String(ownUser.id) }, user]);
    renderDeleteList();

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2));

    expect(within(getRowByEmail(ownUser.email)).getByRole('button', { name: 'Delete' }).disabled).toBe(true);
    expect(within(getRowByEmail(user.email)).getByRole('button', { name: 'Delete' }).disabled).toBe(false);
  });
});

describe('formatDisplayedRowsLabel (UCM-I18N-5)', () => {
  // A real i18next instance's t() supports {{var}} interpolation; this fake mirrors just that,
  // so these assertions pin the KEY and VARS formatDisplayedRowsLabel passes through -- the
  // count === -1 ("more than") branch can never be reached by rendering UserListComponent itself
  // (its own TablePagination always receives a real, non-negative count), so this is the only way
  // to exercise it at all (UCM-I18N-5 review, tests lens).
  function fakeT(key, fallback, vars = {}) {
    const template = { [key]: fallback }[key] ?? fallback;
    return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? `{{${name}}}`));
  }

  it('uses the exact-count key when count is a real number', () => {
    const label = formatDisplayedRowsLabel(fakeT)({ from: 1, to: 10, count: 42 });
    expect(label).toBe('1–10 of 42');
  });

  it('uses the "more than" key, without a literal count, when count is -1', () => {
    const label = formatDisplayedRowsLabel(fakeT)({ from: 1, to: 10, count: -1 });
    expect(label).toBe('1–10 of more than 10');
    expect(label).not.toContain('-1');
  });
});
