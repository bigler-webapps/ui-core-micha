// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

import ModelPicker from '../src/chat/ModelPicker';

afterEach(() => { cleanup(); delete window.matchMedia; });

const entries = [
  { id: 'cli-sonnet', driver: 'claude_cli', model: 'sonnet', label: 'Sonnet', efforts: ['low', 'medium', 'high'], billing: 'subscription' },
  { id: 'cli-opus', driver: 'claude_cli', model: 'opus', label: 'Opus', efforts: ['high', 'max'], billing: 'subscription' },
  { id: 'oa-5', driver: 'openai', model: 'gpt', label: 'GPT', efforts: ['medium'], billing: 'pay_per_use' },
];
const selection = { entry: 'cli-sonnet', effort: 'high' };
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Sonnet · Chat.effort.high' }));

describe('ModelPicker', () => {
  it('shows the current selection as "model · effort" on the bar', () => {
    render(<ModelPicker entries={entries} selection={selection} />);
    expect(screen.getByRole('button', { name: 'Sonnet · Chat.effort.high' })).toBeTruthy();
  });

  it('groups entries by driver and tags pay-per-use entries', () => {
    render(<ModelPicker entries={entries} selection={selection} />);
    open();
    const cli = screen.getByRole('group', { name: 'claude_cli' });
    expect(within(cli).getByText('Sonnet')).toBeTruthy();
    expect(within(cli).getByText('Opus')).toBeTruthy();
    const openai = screen.getByRole('group', { name: 'openai' });
    expect(within(openai).getByText('GPT')).toBeTruthy();
    expect(within(openai).getByText('Chat.payPerUse')).toBeTruthy();
    expect(within(cli).queryByText('Chat.payPerUse')).toBeNull();
  });

  it('disables effort levels the selected entry does not allow', () => {
    render(<ModelPicker entries={entries} selection={selection} />);
    open();
    expect(screen.getByRole('button', { name: 'Chat.effort.max' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Chat.effort.low' }).disabled).toBe(false);
  });

  it('reports a new effort for the same entry', () => {
    const onChange = vi.fn();
    render(<ModelPicker entries={entries} selection={selection} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Chat.effort.low' }));
    expect(onChange).toHaveBeenCalledWith({ entry: 'cli-sonnet', effort: 'low' });
  });

  it('keeps the effort when the new entry allows it and falls back to its first level otherwise', () => {
    const onChange = vi.fn();
    render(<ModelPicker entries={entries} selection={selection} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByText('Opus'));
    expect(onChange).toHaveBeenLastCalledWith({ entry: 'cli-opus', effort: 'high' });
    fireEvent.click(screen.getByText('GPT'));
    expect(onChange).toHaveBeenLastCalledWith({ entry: 'oa-5', effort: 'medium' });
  });

  it('opens as a bottom sheet at narrow widths', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    const { baseElement } = render(<ModelPicker entries={entries} selection={selection} />);
    open();
    expect(baseElement.querySelector('.MuiDrawer-paperAnchorBottom')).toBeTruthy();
  });
});
