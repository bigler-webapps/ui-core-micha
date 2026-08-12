// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';

import { createAppTheme } from '../src/theme';
import StatTile from '../src/components/StatTile';

const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

function renderTile(props) {
  return render(<ThemeProvider theme={theme}><StatTile {...props} /></ThemeProvider>);
}

afterEach(() => cleanup());

describe('StatTile', () => {
  it('renders label, value and caption', () => {
    renderTile({ label: 'Coverage at budget', value: '71.4 %', caption: 'of maximum realizable' });

    expect(screen.getByText('Coverage at budget')).toBeTruthy();
    expect(screen.getByText('71.4 %')).toBeTruthy();
    expect(screen.getByText('of maximum realizable')).toBeTruthy();
  });

  it('omits the value row when value is undefined', () => {
    renderTile({ label: 'Recovered' });

    expect(screen.getByText('Recovered')).toBeTruthy();
    expect(screen.queryByText('undefined')).toBeNull();
  });

  it('renders children', () => {
    renderTile({ label: 'Deaths averted', value: '63.8 %', children: <span>children slot</span> });

    expect(screen.getByText('children slot')).toBeTruthy();
  });

  it('applies the accent border only when accent is set', () => {
    const { container: plain } = renderTile({ label: 'Body fat', value: '18.4 %' });
    const plainStyle = window.getComputedStyle(plain.firstChild);
    expect(plainStyle.borderWidth).toBe('1px');

    cleanup();

    const { container: accented } = renderTile({ label: 'Lean mass', value: '62.1 kg', accent: true });
    const accentedStyle = window.getComputedStyle(accented.firstChild);
    expect(accentedStyle.borderWidth).toBe('2px');
  });

  it('renders the value with tabular-nums', () => {
    renderTile({ label: 'theta*', value: '0.8421' });

    const value = screen.getByText('0.8421');
    expect(window.getComputedStyle(value).fontVariantNumeric).toBe('tabular-nums');
  });
});
