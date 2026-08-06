// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, fallback) => (typeof fallback === 'string' ? fallback : key) }),
}));

import { PasswordChangeForm } from '../src/components/PasswordChangeForm';

afterEach(() => {
  cleanup();
});

function fillAndSubmit(currentPassword, newPassword) {
  fireEvent.change(screen.getByLabelText(/Auth\.CURRENT_PASSWORD_LABEL/), { target: { value: currentPassword } });
  fireEvent.change(screen.getByLabelText(/Auth\.NEW_PASSWORD_LABEL/), { target: { value: newPassword } });
  fireEvent.click(screen.getByRole('button', { name: 'Auth.CHANGE_PASSWORD_BUTTON' }));
}

describe('PasswordChangeForm', () => {
  it('renders the default password-rules helperText', () => {
    render(<PasswordChangeForm onSubmit={vi.fn()} />);
    expect(screen.getAllByText('Auth.PASSWORD_RULES_HINT').length).toBeGreaterThan(0);
  });

  it('lets a caller override the helperText via passwordRulesHint', () => {
    render(<PasswordChangeForm onSubmit={vi.fn()} passwordRulesHint="Custom rule text" />);
    expect(screen.getAllByText('Custom rule text').length).toBeGreaterThan(0);
    expect(screen.queryByText('Auth.PASSWORD_RULES_HINT')).toBeNull();
  });

  it('blocks submit and shows the local error for a new password shorter than 8 characters', () => {
    const onSubmit = vi.fn();
    render(<PasswordChangeForm onSubmit={onSubmit} />);
    fillAndSubmit('currentpw', 'short1');
    expect(screen.getByText('Auth.PASSWORD_TOO_SHORT_LOCAL')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit and shows the local error for an entirely numeric new password', () => {
    const onSubmit = vi.fn();
    render(<PasswordChangeForm onSubmit={onSubmit} />);
    fillAndSubmit('currentpw', '12345678');
    expect(screen.getByText('Auth.PASSWORD_NUMERIC_LOCAL')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit for a valid, non-numeric new password of sufficient length', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PasswordChangeForm onSubmit={onSubmit} />);
    fillAndSubmit('currentpw', 'correct-horse-1');
    expect(onSubmit).toHaveBeenCalledWith('currentpw', 'correct-horse-1');
  });

  it('honours a custom minPasswordLength for an app with a looser backend policy', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PasswordChangeForm onSubmit={onSubmit} minPasswordLength={4} />);
    fillAndSubmit('currentpw', 'ab12');
    expect(onSubmit).toHaveBeenCalledWith('currentpw', 'ab12');
  });

  it('allows an entirely numeric new password when allowNumericPassword is set', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PasswordChangeForm onSubmit={onSubmit} allowNumericPassword />);
    fillAndSubmit('currentpw', '12345678');
    expect(onSubmit).toHaveBeenCalledWith('currentpw', '12345678');
  });
});
