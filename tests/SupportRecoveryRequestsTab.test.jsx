// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const api = vi.hoisted(() => ({
  approveRecoveryRequest: vi.fn(),
  fetchRecoveryRequests: vi.fn(),
  fetchUsersList: vi.fn().mockResolvedValue([]),
  rejectRecoveryRequest: vi.fn(),
  updateUserSupportStatus: vi.fn(),
}));
vi.mock('../src/auth/authApi', () => api);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback || key, i18n: { language: 'en' } }),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { SupportRecoveryRequestsTab } from '../src/components/SupportRecoveryRequestsTab';

function renderSupport() {
  render(
    <AuthContext.Provider value={{ user: { is_superuser: true } }}>
      <SupportRecoveryRequestsTab />
    </AuthContext.Provider>,
  );
}

afterEach(() => cleanup());

it('shows forbidden access without recovery or agent actions', async () => {
  api.fetchRecoveryRequests.mockRejectedValueOnce({ response: { status: 403 } });
  renderSupport();
  expect(screen.getByRole('progressbar')).toBeTruthy();
  expect((await screen.findByRole('alert')).textContent).toBe('Support.RECOVERY_ACCESS_DENIED');
  expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add as agent' })).toBeNull();
  expect(screen.queryByText('No recovery requests for this filter.')).toBeNull();
});

it('distinguishes a failed request from an empty result after retry', async () => {
  api.fetchRecoveryRequests.mockClear();
  api.fetchRecoveryRequests.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  renderSupport();
  expect((await screen.findByRole('alert')).textContent).toContain('Support.RECOVERY_REQUESTS_LOAD_FAILED');
  expect(screen.queryByText('No recovery requests for this filter.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No recovery requests for this filter.')).toBeTruthy();
  expect(api.fetchRecoveryRequests).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Add as agent' })).toBeTruthy();
});
