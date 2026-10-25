// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ModelPicker from '../src/chat/ModelPicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => ({
      'Chat.pickerTitle': 'Model', 'Chat.effortLabel': 'Effort', 'Chat.subscriptionShort': 'Subscription',
      'Chat.estimateTokensShort': `≈ ${values?.lo}–${values?.hi} tokens`, 'Chat.balanceLabel': `Balance: ${values?.n} tokens`,
    })[key] || key,
    i18n: { language: 'en' },
  }),
}));

const entries = [
  { id: 'tokens', label: 'Token model', level: 'top', efforts: ['low', 'medium'], default: true, estimate: { low: { min: 12, max: 48, unit: 'tokens' } }, average_cost_usd_micros: 9000 },
  { id: 'level', label: 'Level model', level: 'best', efforts: ['medium', 'high', 'max'], estimate: { medium: { min: 2, max: 2, unit: 'level' } } },
  { id: 'subscription', label: 'Subscription model', level: 'balanced', efforts: ['low'], billing: 'subscription', average_cost_usd_micros: 1000 },
  { id: 'none', label: 'No estimate', level: 'fast', efforts: ['low'] },
];
const selection = { entry: 'tokens', effort: 'low' };
const openPicker = (props = {}) => {
  render(<ModelPicker entries={entries} selection={selection} open {...props} />);
};
const setViewportNarrow = (matches) => {
  window.matchMedia = vi.fn((query) => ({
    matches: query.includes('max-width') ? matches : false,
    media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
};

afterEach(() => { cleanup(); delete window.matchMedia; });

describe('compact ModelPicker', () => {
  it('renders a flat model list with one cost value per row and no provider or average cost', () => {
    openPicker();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(screen.getByRole('radiogroup').textContent).not.toMatch(/highest quality|balanced|Chat\.level|Chat\.levelHint/i);
    expect(within(radios[0]).getByText('Token model')).toBeTruthy();
    expect(within(radios[0]).getByText('≈ 12–48 tokens')).toBeTruthy();
    expect(within(radios[0]).queryByText(/USD|Anthropic|OpenAI|per answer/i)).toBeNull();
    expect(within(radios[1]).getByLabelText('Chat.costScale.2')).toBeTruthy();
    expect(within(radios[1]).queryByText(/Chat\.estimate/)).toBeNull();
    expect(within(radios[2]).getByText('Subscription')).toBeTruthy();
    expect(radios[3].textContent).toBe('No estimate');
  });

  it('uses provider effort wording, only supported levels, and no explanatory hint', () => {
    openPicker();
    expect(screen.getByText('Effort')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Effort' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Low' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'High' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Max' })).toBeNull();
    expect(screen.queryByText(/more thorough|gründlicher|Chat\.effortHint|Chat\.effortQuestion/i)).toBeNull();
  });

  it('keeps balance and omits the long conversation alert', () => {
    openPicker({ balance: 1200, longChat: true, onNewChat: vi.fn() });
    expect(screen.getByText('Balance: 1,200 tokens')).toBeTruthy();
    expect(screen.queryByText('Chat.longChat')).toBeNull();
  });

  it('uses a popover at wide viewport width and a drawer below md', () => {
    setViewportNarrow(false);
    const wide = render(<ModelPicker entries={entries} selection={selection} open />);
    expect(wide.baseElement.querySelector('.MuiPopover-paper')).toBeTruthy();
    expect(wide.baseElement.querySelector('.MuiDrawer-paper')).toBeNull();
    wide.unmount();
    setViewportNarrow(true);
    const narrow = render(<ModelPicker entries={entries} selection={selection} open />);
    expect(narrow.baseElement.querySelector('.MuiDrawer-paperAnchorBottom')).toBeTruthy();
    expect(narrow.baseElement.querySelector('.MuiPopover-paper')).toBeNull();
  });

  it('keeps arrow-key selection, focus movement, and a single tab stop', () => {
    const onChange = vi.fn();
    openPicker({ onChange });
    const first = screen.getByRole('radio', { name: /Token model/ });
    const second = screen.getByRole('radio', { name: /Level model/ });
    expect(first.getAttribute('tabindex')).toBe('0');
    expect(second.getAttribute('tabindex')).toBe('-1');
    first.focus();
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith({ entry: 'level', effort: 'medium' });
    expect(document.activeElement).toBe(second);
  });
});
