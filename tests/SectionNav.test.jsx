// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const translation = vi.hoisted(() => ({
  t: vi.fn((key) => ({
    'SectionNav.TITLE': 'Switch section',
    'SectionNav.TRIGGER_EYEBROW': 'Section',
    'SectionNav.LAST_OPENED': 'Last opened',
  }[key] ?? key)),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => translation }));

import {
  SECTION_NAV_DRAWER_PAPER_SX,
  SectionNav,
} from '../src/layout/SectionNav';
import { sectionNavTranslations } from '../src/i18n/sectionNavTranslations';
import { createAppTheme } from '../src/theme/createAppTheme';

const groups = [
  {
    key: 'account',
    label: 'My account',
    items: [
      { key: 'profile', label: 'Profile' },
      { key: 'security', label: 'Security' },
    ],
  },
  {
    key: 'management',
    label: 'Management',
    items: [
      { key: 'users', label: 'Users' },
      { key: 'invite', label: 'Invite' },
    ],
  },
  {
    key: 'help',
    label: 'Help',
    items: [{ key: 'support', label: 'Support' }],
  },
  {
    key: 'more',
    label: 'More',
    items: [{ key: 'notifications', label: 'Notifications' }],
  },
];

const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

function renderNav(props = {}, currentTheme = theme) {
  return render(
    <ThemeProvider theme={currentTheme}>
      <SectionNav
        mode="desktop"
        groups={groups}
        activeKey="profile"
        onSelect={vi.fn()}
        {...props}
      >
        <div data-testid="section-content">Section content</div>
      </SectionNav>
    </ThemeProvider>,
  );
}

describe('SectionNav', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders finished group and item labels in order, one section per item', () => {
    renderNav();

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual([
      'Profile',
      'Security',
      'Users',
      'Invite',
      'Support',
      'Notifications',
    ]);
    expect(screen.getAllByText(/My account|Management|Help|More/).map((item) => item.textContent))
      .toEqual(['My account', 'Management', 'Help', 'More']);
  });

  it('selects exactly the matching item, tolerates no match, and selects an optional overview for null', () => {
    const { rerender } = renderNav({ activeKey: 'users', overviewItem: { label: 'Overview' } });
    const selected = () => screen.getAllByRole('button')
      .filter((item) => item.classList.contains('Mui-selected'));

    expect(selected()).toHaveLength(1);
    expect(selected()[0].textContent).toBe('Users');

    rerender(
      <ThemeProvider theme={theme}>
        <SectionNav
          mode="desktop"
          groups={groups}
          activeKey="missing"
          overviewItem={{ label: 'Overview' }}
          onSelect={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(selected()).toHaveLength(0);

    rerender(
      <ThemeProvider theme={theme}>
        <SectionNav
          mode="desktop"
          groups={groups}
          activeKey={null}
          overviewItem={{ label: 'Overview' }}
          onSelect={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(selected()).toHaveLength(1);
    expect(selected()[0].textContent).toBe('Overview');
  });

  it('omits overview and remembered UI completely when those props are absent', () => {
    const { container } = renderNav();

    expect(screen.queryByText('Overview')).toBeNull();
    expect(screen.queryByText('Last opened')).toBeNull();
    expect(container.querySelectorAll('.MuiPaper-root')).toHaveLength(groups.length);
  });

  it('shows the remembered secondary line only on its unselected item', () => {
    renderNav({ activeKey: 'profile', rememberedKey: 'security' });
    expect(screen.getByText('Last opened')).toBeTruthy();

    cleanup();
    renderNav({ activeKey: 'security', rememberedKey: 'security' });
    expect(screen.queryByText('Last opened')).toBeNull();
  });

  it('calls onSelect with the item key and closes the uncontrolled drawer', async () => {
    const onSelect = vi.fn();
    renderNav({ mode: 'mobile', onSelect });

    const trigger = screen.getByRole('button', { name: /Section Profile/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Security' }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('security');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Security' })).toBeNull());
  });

  it('defers to the caller in controlled mode: the trigger calls onOpen, not internal state', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const { rerender } = renderNav({ mode: 'mobile', open: false, onOpen, onClose });

    const trigger = screen.getByRole('button', { name: /Section Profile/i });
    fireEvent.click(trigger);

    expect(onOpen).toHaveBeenCalledOnce();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Security' })).toBeNull();

    rerender(
      <ThemeProvider theme={theme}>
        <SectionNav
          mode="mobile"
          groups={groups}
          activeKey="profile"
          onSelect={vi.fn()}
          open
          onOpen={onOpen}
          onClose={onClose}
        >
          <div data-testid="section-content">Section content</div>
        </SectionNav>
      </ThemeProvider>,
    );
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Security' })).toBeTruthy();
  });

  it('renders the desktop sidebar and children in a two-column grid, while mobile renders a trigger and no sidebar', () => {
    const { container } = renderNav({ sidebarWidth: 312 });
    const desktopRoot = container.querySelector('[data-section-nav-mode="desktop"]');

    expect(desktopRoot).toBeTruthy();
    expect(getComputedStyle(desktopRoot).display).toBe('grid');
    expect(getComputedStyle(desktopRoot).gridTemplateColumns).toBe('312px minmax(0, 1fr)');
    expect(container.querySelector('nav')).toBeTruthy();
    expect(screen.getByTestId('section-content')).toBeTruthy();

    cleanup();
    const mobile = renderNav({ mode: 'mobile' });
    expect(screen.getByRole('button', { name: /Section Profile/i })).toBeTruthy();
    expect(mobile.container.querySelector('nav')).toBeNull();
    expect(mobile.container.querySelector('[data-section-nav-mode="desktop"]')).toBeNull();
    expect(screen.getByTestId('section-content')).toBeTruthy();
  });

  it('resolves the default drawer z-index above the SHELL-3 bottom bar', () => {
    renderNav({ mode: 'mobile' });
    fireEvent.click(screen.getByRole('button', { name: /Section Profile/i }));
    const drawer = document.querySelector('.MuiDrawer-root');
    const drawerZIndex = Number(getComputedStyle(drawer).zIndex);

    expect(drawerZIndex).toBe(theme.zIndex.drawer + 3);
    expect(drawerZIndex).toBeGreaterThan(theme.zIndex.drawer + 2);
  });

  it('follows surface and divider tokens under both createAppTheme and plain MUI themes', () => {
    const themes = [
      createAppTheme({
        palette: {
          primary: { main: '#123456' },
          background: { paper: '#F1F2F3' },
          divider: '#445566',
        },
      }),
      createTheme({
        palette: {
          primary: { main: '#654321' },
          background: { paper: '#E7E8E9' },
          divider: '#665544',
        },
      }),
    ];
    const expected = [
      { surface: 'rgb(241, 242, 243)', divider: 'rgb(68, 85, 102)' },
      { surface: 'rgb(231, 232, 233)', divider: 'rgb(102, 85, 68)' },
    ];

    themes.forEach((currentTheme, index) => {
      const { container } = renderNav({}, currentTheme);
      const groupPaper = container.querySelector('.MuiPaper-root');
      const groupHeader = groupPaper.querySelector('[id]');

      expect(getComputedStyle(groupPaper).backgroundColor).toBe(expected[index].surface);
      expect(getComputedStyle(groupHeader).borderBottomColor).toBe(expected[index].divider);
      cleanup();
    });
  });

  it('keeps the promoted drawer dimensions and safe-area declaration', () => {
    expect(SECTION_NAV_DRAWER_PAPER_SX).toMatchObject({
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      maxHeight: '78dvh',
      p: 2,
      pb: 'max(16px, env(safe-area-inset-bottom))',
    });
  });

  it('ships every component-owned chrome string in all supported locales', () => {
    expect(Object.keys(sectionNavTranslations)).toEqual([
      'SectionNav.TITLE',
      'SectionNav.TRIGGER_EYEBROW',
      'SectionNav.LAST_OPENED',
    ]);
    Object.values(sectionNavTranslations).forEach((translations) => {
      expect(Object.keys(translations)).toEqual(['de', 'fr', 'en', 'sw']);
      expect(Object.values(translations).every(Boolean)).toBe(true);
    });
  });
});
