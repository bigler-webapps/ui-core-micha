// @vitest-environment jsdom
import React, { useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const apiClient = vi.hoisted(() => ({ ensureCsrfToken: vi.fn().mockResolvedValue(undefined) }));
const authApi = vi.hoisted(() => ({
  fetchAuthMethods: vi.fn(), fetchCurrentUser: vi.fn(), fetchBootstrap: vi.fn(), logoutSession: vi.fn(),
}));
vi.mock('../src/auth/apiClient', () => apiClient);
vi.mock('../src/auth/authApi', () => authApi);
vi.mock('../src/auth/ReauthModal', () => ({ ReauthModal: () => null }));

import { AuthContext, AuthProvider, useBootstrapExtension } from '../src/auth/AuthContext';

function Probe() {
  const auth = useContext(AuthContext);
  const applicationAccess = useBootstrapExtension('application_access');
  const absent = useBootstrapExtension('absent');
  const nullValue = useBootstrapExtension('null_value');
  return <>
    <output data-testid="user">{auth.user?.first_name || ''}</output>
    <output data-testid="loading">{String(auth.loading)}</output>
    <output data-testid="methods">{String(auth.authMethods.password_login)}</output>
    <output data-testid="extension">{JSON.stringify(applicationAccess) ?? String(applicationAccess)}</output>
    <output data-testid="absent">{String(absent)}</output>
    <output data-testid="null-extension">{String(nullValue)}</output>
  </>;
}

const payload = {
  user: { id: 7, first_name: 'Ada' },
  auth_methods: { password_login: false },
  notifications: { feed: { results: [{ id: 9 }] }, unread_count: { count: 3 } },
  extensions: { application_access: { apps: ['x'] }, null_value: null },
};

describe('AuthProvider bootstrap opt-in', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    apiClient.ensureCsrfToken.mockResolvedValue(undefined);
    authApi.fetchAuthMethods.mockResolvedValue({});
    authApi.fetchCurrentUser.mockResolvedValue({ id: 8, first_name: 'Lin' });
  });

  it('loads auth, notifications seed, and extension from one bootstrap request', async () => {
    authApi.fetchBootstrap.mockResolvedValue(payload);
    render(<AuthProvider bootstrap><Probe /></AuthProvider>);
    expect(screen.getByTestId('loading').textContent).toBe('true');
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(authApi.fetchBootstrap).toHaveBeenCalledOnce();
    expect(authApi.fetchBootstrap).toHaveBeenCalledWith('/api/bootstrap/');
    expect(apiClient.ensureCsrfToken).not.toHaveBeenCalled();
    expect(authApi.fetchCurrentUser).not.toHaveBeenCalled();
    expect(authApi.fetchAuthMethods).not.toHaveBeenCalled();
    expect(screen.getByTestId('user').textContent).toBe('Ada');
    expect(screen.getByTestId('methods').textContent).toBe('false');
    expect(screen.getByTestId('extension').textContent).toBe('{"apps":["x"]}');
    expect(screen.getByTestId('absent').textContent).toBe('undefined');
    expect(screen.getByTestId('null-extension').textContent).toBe('undefined');
  });

  it('uses anonymous bootstrap state and auth methods without fallback', async () => {
    authApi.fetchBootstrap.mockResolvedValue({ user: null, auth_methods: { password_login: false }, notifications: null });
    render(<AuthProvider bootstrap><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('');
    expect(screen.getByTestId('methods').textContent).toBe('false');
    expect(authApi.fetchCurrentUser).not.toHaveBeenCalled();
    expect(authApi.fetchAuthMethods).not.toHaveBeenCalled();
  });

  it('keeps the separate request flow when bootstrap is off', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(authApi.fetchBootstrap).not.toHaveBeenCalled();
    expect(apiClient.ensureCsrfToken).toHaveBeenCalledOnce();
    expect(authApi.fetchCurrentUser).toHaveBeenCalledOnce();
    expect(authApi.fetchAuthMethods).toHaveBeenCalledOnce();
    expect(screen.getByTestId('extension').textContent).toBe('undefined');
  });

  it.each([
    ['500 part failure', { response: { status: 500, data: { detail: 'bootstrap_part_failed' } } }],
    ['429 throttling', { response: { status: 429 } }],
    ['501 unavailable', { response: { status: 501 } }],
    ['404 missing endpoint', { response: { status: 404 } }],
    ['network error', new Error('network')],
  ])('falls back once after %s and retains separate endpoint outcomes', async (_label, failure) => {
    authApi.fetchBootstrap.mockRejectedValue(failure);
    authApi.fetchCurrentUser.mockResolvedValue({ id: 8, first_name: 'Lin' });
    authApi.fetchAuthMethods.mockResolvedValue({ password_login: false });
    render(<AuthProvider bootstrap><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(authApi.fetchBootstrap).toHaveBeenCalledOnce();
    expect(apiClient.ensureCsrfToken).toHaveBeenCalledOnce();
    expect(authApi.fetchCurrentUser).toHaveBeenCalledOnce();
    expect(authApi.fetchAuthMethods).toHaveBeenCalledOnce();
    expect(screen.getByTestId('user').textContent).toBe('Lin');
  });

  it('falls back to signed out when the separate current-user request is refused', async () => {
    authApi.fetchBootstrap.mockRejectedValue(new Error('bootstrap failed'));
    authApi.fetchCurrentUser.mockRejectedValue(new Error('unauthenticated'));
    render(<AuthProvider bootstrap><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('');
    expect(authApi.fetchCurrentUser).toHaveBeenCalledOnce();
    expect(authApi.fetchBootstrap).toHaveBeenCalledOnce();
  });

  it('drops the bootstrap extensions on logout', async () => {
    authApi.fetchBootstrap.mockResolvedValue(payload);
    authApi.logoutSession.mockResolvedValue(undefined);
    function LogoutButton() {
      const { logout } = useContext(AuthContext);
      return <button type="button" onClick={() => logout()}>logout</button>;
    }
    render(<AuthProvider bootstrap><Probe /><LogoutButton /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('extension').textContent).toBe('{"apps":["x"]}'));

    screen.getByText('logout').click();

    await waitFor(() => expect(screen.getByTestId('extension').textContent).toBe('undefined'));
    expect(screen.getByTestId('user').textContent).toBe('');
  });

  it('returns no extension when used without the provider', () => {
    function Outside() { return <output>{String(useBootstrapExtension('x'))}</output>; }
    render(<Outside />);
    expect(screen.getByText('undefined')).toBeTruthy();
  });
});
