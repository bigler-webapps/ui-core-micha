// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('react-i18next', () => {
  const KEYS = {
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
  };
  const t = (key, fallback) => KEYS[key] ?? fallback ?? key;
  return {
    useTranslation: () => ({
      t,
      // resolveErrorText (AUTH-10) reads i18n.exists/i18n.t off the object
      // useTranslation() returns — this mock must carry both, not just `t`.
      i18n: { exists: (key) => Object.hasOwn(KEYS, key), t },
    }),
  };
});

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

function openNavigation(isMobile) {
  if (isMobile) {
    fireEvent.click(screen.getByRole('button', { name: /Section /i }));
    return screen.getByRole('dialog');
  }
  return screen.getByRole('navigation', { name: 'Switch section' });
}

function groupTabLabels(navRoot, groupLabel) {
  const heading = within(navRoot).getByText(groupLabel);
  const groupCard = heading.closest('.MuiPaper-root');
  return within(groupCard).getAllByRole('button').map((button) => button.textContent);
}

function allNavigationTabLabels(navRoot) {
  return within(navRoot).getAllByRole('button').map((button) => button.textContent);
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

  it('appends my-account extras after Profile and Security on desktop', () => {
    setViewportWidth(1280);
    renderAccount({ extraTabs: [{ value: 'subscription', label: 'Subscription', group: 'my-account' }] });

    const nav = openNavigation(false);
    expect(groupTabLabels(nav, 'My account')).toEqual(['Profile', 'Security', 'Subscription']);
    expect(within(nav).queryByText('More')).toBeNull();
  });

  it('places management and help extras after their visible built-in tabs', () => {
    setViewportWidth(1280);
    const { unmount } = renderAccount({
      extraTabs: [
        { value: 'audit', label: 'Audit', group: 'management' },
        { value: 'contact', label: 'Contact', group: 'help' },
      ],
    });
    let nav = openNavigation(false);
    expect(groupTabLabels(nav, 'Management')).toEqual(['Users', 'Invite', 'Audit']);
    expect(groupTabLabels(nav, 'Help')).toEqual(['Support', 'Contact']);
    unmount();

    renderAccount({
      user: { email: 'person@example.com', is_superuser: false, ui_permissions: {}, available_roles: [] },
      extraTabs: [{ value: 'audit', label: 'Audit', group: 'management' }],
    });
    nav = openNavigation(false);
    expect(groupTabLabels(nav, 'Management')).toEqual(['Audit']);
  });

  it('preserves extra-tab order and falls back to More for missing or invalid groups', () => {
    setViewportWidth(1280);
    renderAccount({
      extraTabs: [
        { value: 'first', label: 'First', group: 'my-account' },
        { value: 'second', label: 'Second', group: 'my-account' },
        { value: 'ungrouped', label: 'Ungrouped' },
        { value: 'more-key', label: 'More key', group: 'more' },
        { value: 'unknown', label: 'Unknown', group: 'nonsense' },
        { value: 'number', label: 'Number', group: 42 },
        { value: 'object', label: 'Object', group: {} },
      ],
    });

    const nav = openNavigation(false);
    expect(groupTabLabels(nav, 'My account')).toEqual(['Profile', 'Security', 'First', 'Second']);
    expect(groupTabLabels(nav, 'More')).toEqual([
      'Ungrouped', 'More key', 'Unknown', 'Number', 'Object',
    ]);
  });

  it('places grouped and ungrouped extras in the same locations in phone navigation', () => {
    renderAccount({
      extraTabs: [
        { value: 'subscription', label: 'Subscription', group: 'my-account' },
        { value: 'notifications', label: 'Notifications' },
      ],
    });

    const nav = openNavigation(true);
    expect(groupTabLabels(nav, 'My account')).toEqual(['Profile', 'Security', 'Subscription']);
    expect(groupTabLabels(nav, 'More')).toEqual(['Notifications']);
  });

  it('keeps the built-in ordered labels unchanged and grouped extras render their content', () => {
    setViewportWidth(1280);
    const { unmount } = renderAccount({ extraTabs: [] });
    expect(allNavigationTabLabels(openNavigation(false))).toEqual([
      'Profile', 'Security', 'Users', 'Invite', 'Support',
    ]);
    unmount();

    renderAccount({
      route: '/account?tab=subscription',
      extraTabs: [{
        value: 'subscription',
        label: 'Subscription',
        group: 'my-account',
        render: () => <div>Subscription content</div>,
      }],
    });
    expect(screen.getByText('Subscription content')).toBeTruthy();
    expect(allNavigationTabLabels(openNavigation(false))).toEqual([
      'Profile', 'Security', 'Subscription', 'Users', 'Invite', 'Support',
    ]);
  });

  it('continues to skip hidden extra tabs and values that collide with built-in tabs', () => {
    setViewportWidth(1280);
    renderAccount({
      extraTabs: [
        { value: 'hidden', label: 'Hidden', group: 'my-account', visible: () => false },
        { value: 'profile', label: 'Duplicate profile', group: 'help' },
      ],
    });

    const nav = openNavigation(false);
    expect(groupTabLabels(nav, 'My account')).toEqual(['Profile', 'Security']);
    expect(within(nav).queryByText('Hidden')).toBeNull();
    expect(within(nav).queryByText('Duplicate profile')).toBeNull();
  });
});
