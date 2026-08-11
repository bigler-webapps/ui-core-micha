// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => ({
      'Account.TITLE': 'Account & Administration',
      'Account.PAGE_TITLE': 'Account',
      'Account.TAB_PROFILE': 'Profile',
      'Account.TAB_SECURITY': 'Security',
      'Account.TAB_USERS': 'Users',
      'Account.TAB_INVITE': 'Invite',
      'Account.TAB_SUPPORT': 'Support',
      'Account.GROUP_MY_ACCOUNT': 'My account',
      'Account.GROUP_MANAGEMENT': 'Management',
      'Account.GROUP_HELP': 'Help',
      'Account.GROUP_MORE': 'More',
      'SectionNav.TITLE': 'Switch section',
      'SectionNav.TRIGGER_EYEBROW': 'Section',
      'SectionNav.LAST_OPENED': 'Last opened',
    }[key] ?? fallback ?? key),
  }),
}));

vi.mock('../src/auth/authApi', () => ({
  fetchAuthPolicy: vi.fn(() => new Promise(() => {})),
  updateUserProfile: vi.fn(),
}));

vi.mock('../src/components/ProfileComponent', () => ({
  ProfileComponent: () => <div>Profile content</div>,
}));
vi.mock('../src/components/SecurityComponent', () => ({
  SecurityComponent: () => <div>Security content</div>,
}));
vi.mock('../src/components/UserListComponent', () => ({
  UserListComponent: () => <div>Users content</div>,
}));
vi.mock('../src/components/UserInviteComponent', () => ({ UserInviteComponent: () => null }));
vi.mock('../src/components/AccessCodeManager', () => ({ AccessCodeManager: () => null }));
vi.mock('../src/components/AllowedEmailDomainsManager', () => ({ AllowedEmailDomainsManager: () => null }));
vi.mock('../src/components/RegistrationMethodsManager', () => ({ RegistrationMethodsManager: () => null }));
vi.mock('../src/components/AuthFactorRequirementCard', () => ({ AuthFactorRequirementCard: () => null }));
vi.mock('../src/components/AccessCodeSingleUseToggle', () => ({ AccessCodeSingleUseToggle: () => null }));
vi.mock('../src/components/QrSignupManager', () => ({ QrSignupManager: () => null }));
vi.mock('../src/components/QrSignupValidityManager', () => ({ QrSignupValidityManager: () => null }));
vi.mock('../src/components/SupportRecoveryRequestsTab', () => ({
  SupportRecoveryRequestsTab: () => <div>Support content</div>,
}));
vi.mock('../src/components/BulkInviteCsvTab', () => ({ BulkInviteCsvTab: () => null }));

import { AuthContext } from '../src/auth/AuthContext';
import { AccountPage } from '../src/pages/AccountPage';

const theme = createTheme();
const superuser = {
  email: 'admin@example.com',
  is_superuser: true,
  ui_permissions: {},
  available_roles: [],
};
const notificationsTab = {
  value: 'notifications',
  label: 'Notifications',
  render: () => <div>Notifications content</div>,
};

function setViewportWidth(width) {
  window.matchMedia = vi.fn().mockImplementation((query) => {
    const maxWidth = query.match(/max-width:(\d+(?:\.\d+)?)px/)?.[1];
    const minWidth = query.match(/min-width:(\d+(?:\.\d+)?)px/)?.[1];
    const matches = maxWidth
      ? width <= Number(maxWidth)
      : minWidth
        ? width >= Number(minWidth)
        : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderAccount({ user = superuser, route = '/account', extraTabs = [notificationsTab] } = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={{ user, login: vi.fn(), loading: false }}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route
              path="/account"
              element={(
                <>
                  <AccountPage extraTabs={extraTabs} />
                  <LocationProbe />
                </>
              )}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>,
  );
}

describe('AccountPage section navigation', () => {
  beforeEach(() => setViewportWidth(375));

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('makes all six cockpit-shaped sections reachable at 375px without a horizontal strip', () => {
    const { container } = renderAccount();
    const trigger = screen.getByRole('button', { name: /Section Profile/i });

    expect(container.querySelector('.MuiTabs-root')).toBeNull();
    expect(getComputedStyle(trigger).width).toBe('100%');
    fireEvent.click(trigger);

    const sectionButtons = ['Profile', 'Security', 'Users', 'Invite', 'Support', 'Notifications']
      .map((label) => screen.getByRole('button', { name: label }));
    expect(sectionButtons).toHaveLength(6);
    sectionButtons.forEach((item) => {
      expect(getComputedStyle(item).position).not.toBe('absolute');
    });
    expect(document.documentElement.scrollWidth - document.documentElement.clientWidth).toBe(0);
  });

  it('keeps the ?tab= contract and updates it when a drawer item is selected', () => {
    renderAccount({ route: '/account?tab=notifications' });

    expect(screen.getByText('Notifications content')).toBeTruthy();
    const trigger = screen.getByRole('button', { name: /Section Notifications/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Security' }));

    expect(screen.getByText('Security content')).toBeTruthy();
    expect(screen.getByTestId('location-search').textContent).toBe('?tab=security');
  });

  it('keeps permission-gated sections absent and falls an unpermitted query back to profile', () => {
    renderAccount({
      user: {
        email: 'person@example.com',
        is_superuser: false,
        ui_permissions: {},
        available_roles: [],
      },
      route: '/account?tab=users',
      extraTabs: [],
    });

    expect(screen.getByText('Profile content')).toBeTruthy();
    const trigger = screen.getByRole('button', { name: /Section Profile/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Security' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Users' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Invite' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Support' })).toBeNull();
    expect(screen.queryByText('Management')).toBeNull();
    expect(screen.queryByText('Help')).toBeNull();
    expect(screen.queryByText('More')).toBeNull();
  });

  it('uses the desktop grouped grid at 1280px with no tab strip left behind', () => {
    setViewportWidth(1280);
    const { container } = renderAccount();
    const grid = container.querySelector('[data-section-nav-mode="desktop"]');

    expect(grid).toBeTruthy();
    expect(getComputedStyle(grid).gridTemplateColumns).toBe('280px minmax(0, 1fr)');
    expect(container.querySelector('.MuiTabs-root')).toBeNull();
    expect(container.querySelector('nav')).toBeTruthy();
  });
});
