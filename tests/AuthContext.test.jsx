// @vitest-environment jsdom
import React, { useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const apiClient = vi.hoisted(() => ({
  ensureCsrfToken: vi.fn().mockResolvedValue(undefined),
}));
const authApi = vi.hoisted(() => ({
  fetchAuthMethods: vi.fn().mockResolvedValue({}),
  fetchCurrentUser: vi.fn(),
  logoutSession: vi.fn(),
}));

vi.mock('../src/auth/apiClient', () => apiClient);
vi.mock('../src/auth/authApi', () => authApi);
vi.mock('../src/auth/ReauthModal', () => ({ ReauthModal: () => null }));

import { AuthContext, AuthProvider } from '../src/auth/AuthContext';

function Probe() {
  const { user, refreshUser } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="first-name">{user?.first_name || ''}</span>
      <button type="button" onClick={() => refreshUser()}>refresh</button>
    </div>
  );
}

describe('AuthContext refreshUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-fetches the current user and updates context state', async () => {
    authApi.fetchCurrentUser
      .mockResolvedValueOnce({ id: 1, first_name: 'Ada' })
      .mockResolvedValueOnce({ id: 1, first_name: 'Grace' });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('first-name').textContent).toBe('Ada'));

    screen.getByRole('button', { name: 'refresh' }).click();

    await waitFor(() => expect(screen.getByTestId('first-name').textContent).toBe('Grace'));
    expect(authApi.fetchCurrentUser).toHaveBeenCalledTimes(2);
  });
});
