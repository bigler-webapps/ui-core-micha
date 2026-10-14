// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => ({
      'Profile.USERNAME_LABEL': 'Username',
      'Auth.EMAIL_LABEL': 'Email',
      'Profile.FIRST_NAME_LABEL': 'First name',
      'Profile.LAST_NAME_LABEL': 'Last name',
      'Profile.ACCEPT_PRIVACY_LABEL': 'Accept privacy statement',
      'Profile.ACCEPT_COOKIES_LABEL': 'Accept convenience cookies',
      'Profile.SAVE_BUTTON': 'Save',
    }[key] ?? fallback ?? key),
    i18n: { exists: () => true },
  }),
}));

vi.mock('../src/auth/authApi', () => ({
  fetchCookieStatement: vi.fn(),
  fetchPrivacyStatement: vi.fn(),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { ProfileComponent } from '../src/components/ProfileComponent';

const theme = createTheme();

function makeUser(overrides = {}) {
  return {
    id: 17,
    username: 'pat',
    email: 'pat@example.com',
    first_name: 'Pat',
    last_name: 'Example',
    accepted_privacy_statement: false,
    accepted_convenience_cookies: true,
    ...overrides,
  };
}

function profileTree(user, onSubmit) {
  return (
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={{ user, loading: false }}>
        <ProfileComponent onSubmit={onSubmit} showStatements={false} />
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

function renderProfile(user, onSubmit = vi.fn()) {
  const view = render(profileTree(user, onSubmit));
  return {
    ...view,
    onSubmit,
    setUser: (nextUser) => view.rerender(profileTree(nextUser, onSubmit)),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProfileComponent user refresh', () => {
  it('refreshes untouched editable fields while retaining the independently edited field', () => {
    const { setUser } = renderProfile(makeUser());
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Local first' },
    });

    setUser(makeUser({
      first_name: 'Server first',
      last_name: 'Server last',
      accepted_privacy_statement: true,
      accepted_convenience_cookies: false,
    }));

    expect(screen.getByRole('textbox', { name: 'First name' }).value).toBe('Local first');
    expect(screen.getByRole('textbox', { name: 'Last name' }).value).toBe('Server last');
    expect(screen.getByRole('checkbox', { name: 'Accept privacy statement' }).checked).toBe(true);
    expect(screen.getByRole('checkbox', { name: 'Accept convenience cookies' }).checked).toBe(false);
  });

  it('preserves edits for the same identity and refreshes untouched fields', async () => {
    const { onSubmit, setUser } = renderProfile(makeUser());
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Patricia' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Last name' }), {
      target: { value: 'Newname' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept privacy statement' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept convenience cookies' }));

    setUser(makeUser({
      username: 'pat-updated',
      email: 'new@example.com',
      first_name: 'Server first',
      last_name: 'Server last',
      accepted_privacy_statement: false,
      accepted_convenience_cookies: true,
    }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Username' }).value).toBe('pat-updated');
      expect(screen.getByRole('textbox', { name: 'Email' }).value).toBe('new@example.com');
    });
    expect(screen.getByRole('textbox', { name: 'First name' }).value).toBe('Patricia');
    expect(screen.getByRole('textbox', { name: 'Last name' }).value).toBe('Newname');
    expect(screen.getByRole('checkbox', { name: 'Accept privacy statement' }).checked).toBe(true);
    expect(screen.getByRole('checkbox', { name: 'Accept convenience cookies' }).checked).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        first_name: 'Patricia',
        last_name: 'Newname',
        accepted_privacy_statement: true,
        accepted_convenience_cookies: false,
      });
    });
  });

  it('resets every field when the identity changes', async () => {
    const { setUser } = renderProfile(makeUser());
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Unsaved first' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Last name' }), {
      target: { value: 'Unsaved last' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept privacy statement' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept convenience cookies' }));

    setUser(makeUser({
      id: 18,
      username: 'lee',
      email: 'lee@example.com',
      first_name: 'Lee',
      last_name: 'Newperson',
      accepted_privacy_statement: false,
      accepted_convenience_cookies: true,
    }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'First name' }).value).toBe('Lee');
    });
    expect(screen.getByRole('textbox', { name: 'Username' }).value).toBe('lee');
    expect(screen.getByRole('textbox', { name: 'Email' }).value).toBe('lee@example.com');
    expect(screen.getByRole('textbox', { name: 'Last name' }).value).toBe('Newperson');
    expect(screen.getByRole('checkbox', { name: 'Accept privacy statement' }).checked).toBe(false);
    expect(screen.getByRole('checkbox', { name: 'Accept convenience cookies' }).checked).toBe(true);
  });

  it('clears edits on logout before initializing the next login', async () => {
    const { setUser } = renderProfile(makeUser());
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Unsaved first' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept privacy statement' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept convenience cookies' }));

    setUser(null);
    expect(await screen.findByText('User not logged in.')).toBeTruthy();
    setUser(makeUser({
      first_name: 'Pat after login',
      accepted_privacy_statement: false,
      accepted_convenience_cookies: true,
    }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'First name' }).value).toBe('Pat after login');
    });
    expect(screen.getByRole('checkbox', { name: 'Accept privacy statement' }).checked).toBe(false);
    expect(screen.getByRole('checkbox', { name: 'Accept convenience cookies' }).checked).toBe(true);
  });

  it('hydrates fields when the current user arrives asynchronously', async () => {
    const { setUser } = renderProfile(null);
    setUser(makeUser({ first_name: 'Hydrated' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'First name' }).value).toBe('Hydrated');
      expect(screen.getByRole('textbox', { name: 'Last name' }).value).toBe('Example');
    });
    expect(screen.getByRole('checkbox', { name: 'Accept privacy statement' }).checked).toBe(false);
    expect(screen.getByRole('checkbox', { name: 'Accept convenience cookies' }).checked).toBe(true);
  });
});
