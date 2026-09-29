// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const authApi = vi.hoisted(() => ({
  fetchUsersList: vi.fn(),
  updateUserRole: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => ({
      'UserList.TITLE': 'All Users',
      'Common.SEARCH': 'Search',
      'UserList.SEARCH_PLACEHOLDER': 'Search users...',
      'Auth.EMAIL_LABEL': 'Email',
      'Profile.NAME_LABEL': 'Name',
      'UserList.ROLE': 'Role',
      'UserList.ROLE_UPDATE_SUCCESS': 'Role updated.',
      'Auth.USER_ROLE_UPDATE_FAILED': 'Role update failed.',
      'UserList.NO_USERS': 'No users found.',
    }[key] ?? (typeof fallback === 'string' ? fallback : key)),
  }),
}));

import { UserListComponent } from '../src/components/UserListComponent';

const currentUser = { id: 99, is_superuser: true, role: 'admin' };
const user = { id: 1, email: 'person@example.com', role: 'student' };

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
