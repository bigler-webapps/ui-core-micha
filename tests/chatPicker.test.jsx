// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => { const translations = { 'Chat.by': `Chat.by:${values?.provider}`, 'Chat.estimateTokens': `Chat.estimateTokens:${values?.lo}–${values?.hi} tokens per reply`, 'Chat.balanceLabel': `Chat.balanceLabel:${values?.n}` }; return translations[key] || key; }, i18n: { language: 'en' } }) }));
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
  it('lists server entries directly, with no driver groups or billing chips', () => {
    show();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryByRole('group', { name: /driver/i })).toBeNull();
    expect(screen.queryByText('Chat.payPerUse')).toBeNull();
    expect(screen.getByText('Claude Sonnet 4.5')).toBeTruthy();
    expect(screen.getAllByText('Chat.by:Anthropic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chat.by:OpenAI').length).toBeGreaterThan(0);
  });
  it('orders levels, hides empty levels, and leaves unknown levels last without a heading', () => {
    show({ entries: entries.filter((entry) => entry.id !== 'subscription') });
    const allText = screen.getByRole('radiogroup').textContent;
    expect(allText.indexOf('Chat.level.top')).toBeLessThan(allText.indexOf('Chat.level.balanced'));
    expect(allText).not.toContain('Chat.level.fast');
    expect(allText.indexOf('Other')).toBeGreaterThan(allText.indexOf('Claude Sonnet 4.5'));
  });
  it('shows approximate token ranges, relative cost with accessible name, and subscription label', () => {
    show();
    expect(screen.getByText('Chat.estimateTokens:100–240 tokens per reply')).toBeTruthy();
    expect(screen.getByLabelText('Chat.costScale.3')).toBeTruthy();
    expect(screen.getByText('Chat.noTokenSubscription')).toBeTruthy();
  });
  it('offers supported effort words, calls changes, and falls back effort on model change', () => {
    const onChange = vi.fn(); show({ onChange });
    expect(screen.getByRole('button', { name: 'Chat.effort.low' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Chat.effort.max' })).toBeNull();
    fireEvent.click(screen.getByText('GPT-6 Astra'));
    expect(onChange).toHaveBeenCalledWith({ entry: 'astra', effort: 'medium' });
  });
  it('shows long chat notice and balance; supports controlled open and narrow bottom sheet', () => {
    const onOpenChange = vi.fn();
    const { rerender, baseElement } = render(<ModelPicker entries={entries} selection={selection} open={false} onOpenChange={onOpenChange} longChat balance={1200} onNewChat={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Claude Sonnet/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    rerender(<ModelPicker entries={entries} selection={selection} open longChat balance={1200} onNewChat={vi.fn()} sheet />);
    expect(screen.getByText('Chat.longChat')).toBeTruthy();
    expect(screen.getByText('Chat.balanceLabel:1,200')).toBeTruthy();
    expect(baseElement.querySelector('.MuiDrawer-paperAnchorBottom')).toBeTruthy();
  });
  it('falls back from an unsupported selection to a default entry', () => {
    render(<ModelPicker entries={entries} selection={{ entry: 'gone', effort: 'high' }} />);
    expect(screen.getByRole('button', { name: /Claude Sonnet · Chat.effort.low/ })).toBeTruthy();
  });
});
