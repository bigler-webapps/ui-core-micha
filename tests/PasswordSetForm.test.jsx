// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, fallback) => (typeof fallback === 'string' ? fallback : key) }),
}));

import { PasswordSetForm } from '../src/components/PasswordSetForm';

afterEach(() => {
  cleanup();
});

function fillAndSubmit(password1, password2) {
  fireEvent.change(screen.getByLabelText('Auth.NEW_PASSWORD_LABEL'), { target: { value: password1 } });
  fireEvent.change(screen.getByLabelText('Auth.PASSWORD_CONFIRM_LABEL'), { target: { value: password2 } });
  fireEvent.click(screen.getByRole('button', { name: 'Auth.PASSWORD_SET_BUTTON' }));
}

describe('PasswordSetForm', () => {
  it('renders the default password-rules helperText', () => {
    render(<PasswordSetForm onSubmit={vi.fn()} />);
    expect(screen.getAllByText('Auth.PASSWORD_RULES_HINT').length).toBeGreaterThan(0);
  });

  it('lets a caller override the helperText via passwordRulesHint', () => {
    render(<PasswordSetForm onSubmit={vi.fn()} passwordRulesHint="Custom rule text" />);
    expect(screen.getAllByText('Custom rule text').length).toBeGreaterThan(0);
    expect(screen.queryByText('Auth.PASSWORD_RULES_HINT')).toBeNull();
  });

  it('blocks submit and shows the local error for a password shorter than 8 characters', () => {
    const onSubmit = vi.fn();
    render(<PasswordSetForm onSubmit={onSubmit} />);
    fillAndSubmit('short1', 'short1');
    expect(screen.getByText('Auth.PASSWORD_TOO_SHORT_LOCAL')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit and shows the local error for an entirely numeric password', () => {
    const onSubmit = vi.fn();
    render(<PasswordSetForm onSubmit={onSubmit} />);
    fillAndSubmit('12345678', '12345678');
    expect(screen.getByText('Auth.PASSWORD_NUMERIC_LOCAL')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit for a valid, non-numeric password of sufficient length', () => {
    const onSubmit = vi.fn();
    render(<PasswordSetForm onSubmit={onSubmit} />);
    fillAndSubmit('correct-horse-1', 'correct-horse-1');
    expect(onSubmit).toHaveBeenCalledWith('correct-horse-1');
  });

  it('honours a custom minPasswordLength for an app with a looser backend policy', () => {
    const onSubmit = vi.fn();
    render(<PasswordSetForm onSubmit={onSubmit} minPasswordLength={4} />);
    fillAndSubmit('ab12', 'ab12');
    expect(onSubmit).toHaveBeenCalledWith('ab12');
  });

  it('allows an entirely numeric password when allowNumericPassword is set', () => {
    const onSubmit = vi.fn();
    render(<PasswordSetForm onSubmit={onSubmit} allowNumericPassword />);
    fillAndSubmit('12345678', '12345678');
    expect(onSubmit).toHaveBeenCalledWith('12345678');
  });
});
