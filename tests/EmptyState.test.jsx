// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';

import EmptyState from '../src/components/EmptyState';
import { createAppTheme, reportOffPaletteColours } from '../src/theme';

const theme = createAppTheme({ palette: { primary: { main: '#0F62FE' } } });

function renderEmptyState(props) {
  return render(<ThemeProvider theme={theme}><EmptyState {...props} /></ThemeProvider>);
}

afterEach(() => cleanup());

describe('EmptyState', () => {
  it('renders its title as text content, driven by the prop', () => {
    renderEmptyState({ title: 'No events yet' });

    expect(screen.getByText('No events yet')).toBeTruthy();
    cleanup();

    renderEmptyState({ title: 'No songs yet' });

    expect(screen.getByText('No songs yet')).toBeTruthy();
    expect(screen.queryByText('No events yet')).toBeNull();
  });

  it('renders an optional description, driven by the prop', () => {
    renderEmptyState({ title: 'No events yet', description: 'Create an event to see it here.' });

    expect(screen.getByText('Create an event to see it here.')).toBeTruthy();
    cleanup();

    renderEmptyState({ title: 'No events yet' });

    expect(screen.queryByText('Create an event to see it here.')).toBeNull();
  });

  it('renders an accessible real button and calls its action', () => {
    const onClick = vi.fn();
    renderEmptyState({
      title: 'No events yet',
      action: { label: 'Create event', onClick },
    });

    const button = screen.getByRole('button', { name: 'Create event' });
    expect(button.tagName).toBe('BUTTON');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('keeps the component source free of off-palette colour literals', () => {
    const source = fs.readFileSync(path.resolve('src/components/EmptyState.jsx'), 'utf8');
    const result = reportOffPaletteColours([{ path: 'src/components/EmptyState.jsx', source }]);

    expect(result.findings).toEqual([]);
  });
});
