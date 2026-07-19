// @vitest-environment jsdom
import React, { useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

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
  const { user, loading, refreshUser } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="first-name">{user?.first_name || ''}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button type="button" onClick={() => refreshUser()}>refresh</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    cleanup();
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

  it('starts auth methods and current user together after CSRF, then waits for both', async () => {
    let resolveCsrf;
    let resolveMethods;
    let resolveUser;
    const callOrder = [];

    apiClient.ensureCsrfToken.mockImplementation(() => new Promise((resolve) => {
      resolveCsrf = resolve;
    }));
    authApi.fetchAuthMethods.mockImplementation(() => {
      callOrder.push('auth-methods');
      return new Promise((resolve) => {
        resolveMethods = resolve;
      });
    });
    authApi.fetchCurrentUser.mockImplementation(() => {
      callOrder.push('current-user');
      return new Promise((resolve) => {
        resolveUser = resolve;
      });
    });

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(callOrder).toEqual([]);
    resolveCsrf();

    await waitFor(() => expect(callOrder).toEqual(['auth-methods', 'current-user']));
    expect(screen.getByTestId('loading').textContent).toBe('true');

    resolveUser({ id: 1, first_name: 'Ada' });
    await Promise.resolve();
    expect(screen.getByTestId('loading').textContent).toBe('true');

    resolveMethods({ password_login: false });
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('first-name').textContent).toBe('Ada');
  });

  it('still sets the user when auth-methods fails but current-user succeeds', async () => {
    let resolveUser;

    apiClient.ensureCsrfToken.mockResolvedValue(undefined);
    authApi.fetchAuthMethods.mockRejectedValue(new Error('auth-methods unavailable'));
    authApi.fetchCurrentUser.mockImplementation(() => new Promise((resolve) => {
      resolveUser = resolve;
    }));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(authApi.fetchAuthMethods).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('loading').textContent).toBe('true');

    resolveUser({ id: 1, first_name: 'Ada' });
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('first-name').textContent).toBe('Ada');
  });

  it('preserves the unauthenticated state after a current-user failure', async () => {
    let resolveMethods;

    apiClient.ensureCsrfToken.mockResolvedValue(undefined);
    authApi.fetchAuthMethods.mockImplementation(() => new Promise((resolve) => {
      resolveMethods = resolve;
    }));
    authApi.fetchCurrentUser.mockRejectedValue(new Error('Unauthenticated'));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(authApi.fetchCurrentUser).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('loading').textContent).toBe('true');

    resolveMethods({ password_login: false });
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('first-name').textContent).toBe('');
  });
});
