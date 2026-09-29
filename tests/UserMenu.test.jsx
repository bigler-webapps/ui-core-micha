// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const translation = vi.hoisted(() => ({
  t: vi.fn((key) => `translated:${key}`),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => translation }));

import { AuthContext } from '../src/auth/AuthContext';
import { UserMenu } from '../src/auth/UserMenu';
import { calculateContrastRatio, createAppTheme } from '../src/theme';

const defaultTheme = createAppTheme({ palette: { primary: { main: createTheme().palette.primary.main } } });

function renderUserMenu({ user, logout = vi.fn(), theme = defaultTheme, ...props } = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={{ user, logout }}>
        <UserMenu {...props} />
      </AuthContext.Provider>
    </ThemeProvider>,
  );
}

function getAvatarContrast() {
  const avatar = screen.getByText(/^[A-Z]+$/).closest('.MuiAvatar-root');
  const styles = window.getComputedStyle(avatar);
  return calculateContrastRatio(styles.color, styles.backgroundColor);
}

describe('UserMenu', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('with no items and no overrides, renders identity, Profil and Abmelden', () => {
    const user = { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', username: 'ada' };
    renderUserMenu({ user });

    fireEvent.click(screen.getByRole('button', { name: 'translated:UserMenu.TITLE' }));

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('ada@example.com')).toBeTruthy();
    expect(screen.getByText('translated:UserMenu.PROFILE')).toBeTruthy();
    expect(screen.getByText('translated:UserMenu.LOGOUT')).toBeTruthy();
  });

  it('Abmelden calls AuthContext logout', () => {
    const logout = vi.fn();
    const user = { username: 'ada' };
    renderUserMenu({ user, logout });

    fireEvent.click(screen.getByRole('button', { name: 'translated:UserMenu.TITLE' }));
    fireEvent.click(screen.getByText('translated:UserMenu.LOGOUT'));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('Profil navigates via resolveLink to /account by default, and to an override when given', () => {
    const resolveLink = vi.fn();
    const user = { username: 'ada' };
    renderUserMenu({ user, resolveLink });

    fireEvent.click(screen.getByRole('button', { name: 'translated:UserMenu.TITLE' }));
    fireEvent.click(screen.getByText('translated:UserMenu.PROFILE'));

    expect(resolveLink).toHaveBeenCalledWith('/account');
    cleanup();

    const resolveLinkOverride = vi.fn();
    renderUserMenu({ user, resolveLink: resolveLinkOverride, profileLink: '/settings/profile' });
    fireEvent.click(screen.getByRole('button', { name: 'translated:UserMenu.TITLE' }));
    fireEvent.click(screen.getByText('translated:UserMenu.PROFILE'));

    expect(resolveLinkOverride).toHaveBeenCalledWith('/settings/profile');
  });

  it('renders host items in their slot with onSelect invoked, and Abmelden stays last', () => {
    const onSelectA = vi.fn();
    const onSelectB = vi.fn();
    const user = { username: 'ada' };
    renderUserMenu({
      user,
      items: [
        { id: 'a', label: 'Item A', onSelect: onSelectA },
        { id: 'b', label: 'Item B', onSelect: onSelectB },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'translated:UserMenu.TITLE' }));

    const menuItems = screen.getAllByRole('menuitem').map((el) => el.textContent);
    expect(menuItems).toEqual([
      'translated:UserMenu.PROFILE',
      'Item A',
      'Item B',
      'translated:UserMenu.LOGOUT',
    ]);

    fireEvent.click(screen.getByText('Item A'));
    expect(onSelectA).toHaveBeenCalledTimes(1);
    expect(onSelectB).not.toHaveBeenCalled();
  });

  it('Escape closes the menu and returns focus to the trigger', async () => {
    const user = { username: 'ada' };
    renderUserMenu({ user });

    const trigger = screen.getByRole('button', { name: 'translated:UserMenu.TITLE' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByText('translated:UserMenu.LOGOUT')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeFalsy();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('does not repeat the email when it is also the display name (no first/last name, username === email)', () => {
    const user = { username: 'ada@example.com', email: 'ada@example.com' };
    renderUserMenu({ user });

    fireEvent.click(screen.getByRole('button', { name: 'translated:UserMenu.TITLE' }));

    expect(screen.getAllByText('ada@example.com')).toHaveLength(1);
  });

  it('avatar renders correct initials, falling back to username when names are absent', () => {
    renderUserMenu({ user: { first_name: 'Ada', last_name: 'Lovelace', username: 'ada' } });
    expect(screen.getByText('AL')).toBeTruthy();
    cleanup();

    renderUserMenu({ user: { username: 'grace' } });
    expect(screen.getByText('G')).toBeTruthy();
  });

  it("uses a contrasting avatar pair with jg-ferien's primary colour", () => {
    const theme = createAppTheme({ palette: { primary: { main: '#367964' } } });
    renderUserMenu({ theme, user: { username: 'ab' } });

    expect(getAvatarContrast()).toBeGreaterThanOrEqual(4.5);
  });

  it('uses a contrasting avatar pair with the library baseline primary colour', () => {
    renderUserMenu({ user: { username: 'ab' } });

    expect(getAvatarContrast()).toBeGreaterThanOrEqual(4.5);
  });

  it('falls back to the dark text pair for a medium-luminance primary colour', () => {
    // A synthetic mid-grey (luminance ~0.216, no real brand meaning) picked to
    // fail white-on-background at 4.5:1 (~3.95:1) so this test actually
    // exercises the black-fallback branch, not just the white branch every
    // other test here happens to land on.
    const theme = createAppTheme({ palette: { primary: { main: '#808080' } } });
    renderUserMenu({ theme, user: { username: 'ab' } });

    expect(getAvatarContrast()).toBeGreaterThanOrEqual(4.5);
  });
});
