// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { MobileBottomNav } from '../src/components/MobileBottomNav';
import { createAppTheme } from '../src/theme/createAppTheme';

const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

function Icon() {
  return <svg aria-hidden="true" data-testid="destination-icon" />;
}

const destinations = [
  { route: '/first', label: 'First', icon: Icon },
  { route: '/second', label: 'Second', icon: Icon },
  { route: '/third', label: 'Third', icon: Icon },
];

function setMediaQueryMatches(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: typeof matches === 'function' ? matches(query) : matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function setViewportWidth(width) {
  setMediaQueryMatches((query) => {
    const minWidth = query.match(/min-width:(\d+)px/)?.[1];
    return minWidth ? width >= Number(minWidth) : false;
  });
}

function renderNav(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <MobileBottomNav
        destinations={destinations}
        activeRoute="/first"
        onNavigate={vi.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('MobileBottomNav', () => {
  beforeEach(() => setMediaQueryMatches(false));

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders one action per destination, in order, with visible labels', () => {
    renderNav();

    expect(screen.getAllByRole('button').map((action) => action.textContent)).toEqual([
      'First',
      'Second',
      'Third',
    ]);
  });

  it('selects exactly the matching route and tolerates no match', () => {
    const { rerender } = renderNav({ activeRoute: '/second' });
    const selected = () => screen.getAllByRole('button')
      .filter((action) => action.classList.contains('Mui-selected'));

    expect(selected()).toHaveLength(1);
    expect(selected()[0].textContent).toBe('Second');
    expect(selected()[0].getAttribute('aria-current')).toBe('page');
    expect(screen.getAllByRole('button').filter((action) => action.hasAttribute('aria-current')))
      .toHaveLength(1);

    rerender(
      <ThemeProvider theme={theme}>
        <MobileBottomNav
          destinations={destinations}
          activeRoute="/not-in-the-bar"
          onNavigate={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(selected()).toHaveLength(0);
    expect(screen.getAllByRole('button').some((action) => action.hasAttribute('aria-current')))
      .toBe(false);
  });

  it('calls onNavigate with the selected destination route', () => {
    const onNavigate = vi.fn();
    renderNav({ onNavigate });

    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith('/second');
  });

  it('renders a positive badge only on its own destination', () => {
    renderNav({
      destinations: [
        { route: '/inbox', label: 'Inbox', icon: Icon, badgeCount: 4 },
        { route: '/empty', label: 'Empty', icon: Icon, badgeCount: 0 },
        { route: '/unset', label: 'Unset', icon: Icon },
      ],
      activeRoute: '/inbox',
    });

    const actions = screen.getAllByRole('button');
    expect(within(actions[0]).getByText('4')).toBeTruthy();
    expect(actions[0].querySelectorAll('.MuiBadge-root')).toHaveLength(1);
    expect(actions[1].querySelector('.MuiBadge-root')).toBeNull();
    expect(actions[2].querySelector('.MuiBadge-root')).toBeNull();
  });

  it('uses shortLabel when present and label when it is absent', () => {
    renderNav({
      destinations: [
        { route: '/registrations', label: 'My registrations', shortLabel: 'Mine', icon: Icon },
        { route: '/messages', label: 'Messages', icon: Icon },
      ],
    });

    expect(screen.getAllByRole('button').map((action) => action.textContent)).toEqual([
      'Mine',
      'Messages',
    ]);
    expect(screen.getByRole('button', { name: 'My registrations' }).textContent).toBe('Mine');
  });

  it('resolves its surface and action colours from both baseline and plain MUI themes', () => {
    const themes = [
      createAppTheme({
        palette: {
          primary: { main: '#123456' },
          background: { paper: '#F1F2F3' },
          text: { secondary: '#445566' },
        },
      }),
      createTheme({
        palette: {
          primary: { main: '#654321' },
          background: { paper: '#E7E8E9' },
          text: { secondary: '#665544' },
        },
      }),
    ];
    const expected = [
      { background: 'rgb(241, 242, 243)', selected: 'rgb(18, 52, 86)', rest: 'rgb(68, 85, 102)' },
      { background: 'rgb(231, 232, 233)', selected: 'rgb(101, 67, 33)', rest: 'rgb(102, 85, 68)' },
    ];

    themes.forEach((currentTheme, index) => {
      const { container } = render(
        <ThemeProvider theme={currentTheme}>
          <MobileBottomNav
            destinations={destinations}
            activeRoute="/first"
            onNavigate={vi.fn()}
          />
        </ThemeProvider>,
      );
      const actions = screen.getAllByRole('button');

      expect(getComputedStyle(container.firstElementChild).backgroundColor)
        .toBe(expected[index].background);
      expect(getComputedStyle(actions[0]).color).toBe(expected[index].selected);
      expect(getComputedStyle(actions[1]).color).toBe(expected[index].rest);
      cleanup();
    });
  });

  it('renders nothing at and above hideAbove', () => {
    setMediaQueryMatches((query) => query === '(min-width:900px)');
    const { container } = renderNav();

    expect(window.matchMedia).toHaveBeenCalledWith('(min-width:900px)');
    expect(container.childElementCount).toBe(0);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('declares safe-area bottom padding on the fixed bar', () => {
    const { container } = renderNav();
    const nav = container.firstElementChild;

    expect(nav.classList.contains('MuiBottomNavigation-root')).toBe(true);
    // jsdom drops env() declarations while parsing CSS, so assert the sx
    // declaration before browser CSS parsing instead of a computed inset.
    expect(MobileBottomNav.toString()).toContain('env(safe-area-inset-bottom)');
  });

  it('renders the five-item, two-badge specimen at 375px and nothing at 1280px', () => {
    const specimen = [
      { route: '/triage', label: 'Triage', icon: Icon, badgeCount: 7 },
      { route: '/board', label: 'Board', icon: Icon, badgeCount: 3 },
      { route: '/chat', label: 'Chat', icon: Icon },
      { route: '/status', label: 'Status', icon: Icon },
      { route: '/more', label: 'More', icon: Icon, emphasis: true },
    ];

    setViewportWidth(375);
    renderNav({ destinations: specimen, activeRoute: '/triage' });
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(document.querySelectorAll('.MuiBadge-root')).toHaveLength(2);

    cleanup();
    setViewportWidth(1280);
    renderNav({ destinations: specimen, activeRoute: '/triage' });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
