// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => { const translations = { 'Chat.estimateTokensShort': `Chat.estimateTokensShort:${values?.lo}–${values?.hi} tokens`, 'Chat.balanceLabel': `Chat.balanceLabel:${values?.n}`, 'Chat.effortLabel': 'Effort' }; return translations[key] || key; }, i18n: { language: 'en' } }) }));
import ModelPicker from '../src/chat/ModelPicker';
afterEach(() => { cleanup(); delete window.matchMedia; });
const entries = [
  { id: 'sonnet', label: 'Claude Sonnet 4.5', provider: 'anthropic', level: 'balanced', efforts: ['low', 'medium', 'high'], default: true, estimate: { high: { min: 100, max: 240, unit: 'tokens' } }, billing: 'pay_per_use' },
  { id: 'astra', label: 'GPT-6 Astra', provider: 'openai', level: 'top', efforts: ['medium', 'max'], estimate: { medium: { min: 3, max: 3, unit: 'level' } } },
  { id: 'subscription', label: 'Claude Code', provider: 'claude_code', level: 'fast', efforts: ['low'], billing: 'subscription' },
  { id: 'other', label: 'Other', provider: 'openai', level: '', efforts: ['low'], estimate: {} },
];
const selection = { entry: 'sonnet', effort: 'high' };
const show = (props = {}) => { render(<ModelPicker entries={entries} selection={selection} {...props} />); fireEvent.click(screen.getByRole('button', { name: /Claude Sonnet ·/ })); };

describe('ModelPicker', () => {
  it('lists server entries directly without provider lines or billing chips', () => {
    show();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryByRole('group', { name: /driver/i })).toBeNull();
    expect(screen.queryByText('Chat.payPerUse')).toBeNull();
    expect(screen.getByText('Claude Sonnet 4.5')).toBeTruthy();
    expect(screen.queryByText(/Chat\.by:/)).toBeNull();
  });
  it('orders levels, hides empty levels, and leaves unknown levels last without a heading', () => {
    show({ entries: entries.filter((entry) => entry.id !== 'subscription') });
    const allText = screen.getByRole('radiogroup').textContent;
    expect(allText).not.toContain('Chat.level.');
    expect(allText.indexOf('Other')).toBeGreaterThan(allText.indexOf('Claude Sonnet 4.5'));
  });
  it('shows approximate token ranges, relative cost with accessible name, and subscription label', () => {
    show();
    expect(screen.getByText('Chat.estimateTokensShort:100–240 tokens')).toBeTruthy();
    expect(screen.getByLabelText('Chat.costScale.3')).toBeTruthy();
    expect(screen.getByText('Chat.subscriptionShort')).toBeTruthy();
  });
  it('offers supported effort words, calls changes, and falls back effort on model change', () => {
    const onChange = vi.fn(); show({ onChange });
    expect(screen.getByRole('button', { name: 'Low' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Max' })).toBeNull();
    fireEvent.click(screen.getByText('GPT-6 Astra'));
    expect(onChange).toHaveBeenCalledWith({ entry: 'astra', effort: 'medium' });
  });
  it('shows balance; supports controlled open; a sheet prop no longer forces the bottom sheet (UCM-CHAT-12)', () => {
    const onOpenChange = vi.fn();
    const { rerender, baseElement } = render(<ModelPicker entries={entries} selection={selection} open={false} onOpenChange={onOpenChange} balance={1200} />);
    fireEvent.click(screen.getByRole('button', { name: /Claude Sonnet/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    rerender(<ModelPicker entries={entries} selection={selection} open balance={1200} sheet />);
    expect(screen.queryByText('Chat.longChat')).toBeNull();
    expect(screen.getByText('Chat.balanceLabel:1,200')).toBeTruthy();
    expect(baseElement.querySelector('.MuiDrawer-paperAnchorBottom')).toBeNull();
  });
  it('falls back from an unsupported selection to a default entry', () => {
    render(<ModelPicker entries={entries} selection={{ entry: 'gone', effort: 'high' }} />);
    expect(screen.getByRole('button', { name: /Claude Sonnet · Chat.effort.low/ })).toBeTruthy();
  });
});
