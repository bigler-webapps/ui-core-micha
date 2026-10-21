// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const confirmRegistration = vi.hoisted(() => vi.fn());

vi.mock('../src/auth/authApi', () => ({ confirmRegistration }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { exists: () => false, t: (key) => key } }),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { SignupConfirmContent } from '../src/components/SignupConfirmContent';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fillPasswords(password, confirmation = password) {
  fireEvent.change(screen.getByLabelText(/Auth.NEW_PASSWORD_LABEL/), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/Auth.PASSWORD_CONFIRM_LABEL/), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_CONFIRM_SUBMIT' }));
}

describe('SignupConfirmContent', () => {
  it('confirms with the host token and reports success without arguments and without signing in', async () => {
    const onSuccess = vi.fn();
    const login = vi.fn();
    confirmRegistration.mockResolvedValue({});
    render(
      <AuthContext.Provider value={{ user: null, login }}>
        <SignupConfirmContent token="private-token" onSuccess={onSuccess} />
      </AuthContext.Provider>,
    );

    fillPasswords('StrongPass123');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith();
    expect(confirmRegistration).toHaveBeenCalledWith({ token: 'private-token', password: 'StrongPass123' });
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Auth.NEW_PASSWORD_LABEL/).value).toBe('');
  });

  it('validates locally and shows a server rejection without reporting success', async () => {
    const onSuccess = vi.fn();
    confirmRegistration.mockRejectedValueOnce({ code: 'Auth.PENDING_TOKEN_INVALID' });
    render(<SignupConfirmContent token="private-token" onSuccess={onSuccess} />);

    fillPasswords('short');
    expect(screen.getByText('Auth.PASSWORD_TOO_SHORT')).toBeTruthy();
    fillPasswords('StrongPass123', 'Different123');
    expect(screen.getByText('Auth.PASSWORD_MISMATCH')).toBeTruthy();
    expect(confirmRegistration).not.toHaveBeenCalled();

    fillPasswords('StrongPass123');
    await waitFor(() => expect(screen.getByText('Auth.PENDING_TOKEN_INVALID')).toBeTruthy());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows only the invalid-link message without a token and hides navigation without handlers', () => {
    render(<SignupConfirmContent token="" />);
    expect(screen.getByText('Auth.PENDING_TOKEN_INVALID')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
