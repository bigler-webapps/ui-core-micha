// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key, values) => key === 'Chat.balanceLabel' ? `Balance ${values.n}` : key,
  i18n: { language: 'en' },
}) }));
import ModelPicker, { publicFamilies } from '../src/chat/ModelPicker';

afterEach(cleanup);

const catalogue = [
  { id: 'openai:sol', provider: 'openai', family: 'sol', label: 'secret-model-v7', efforts: ['low', 'high'], source_label: 'private-account', billing: 'subscription', model: 'secret-model-v7' },
  { id: 'claude:sonnet', provider: 'claude', family: 'sonnet', label: 'private-account subscription', efforts: ['low', 'high'], source_id: 'private-account', model: 'secret-model-v7' },
];

function Picker({ entries = catalogue, initial = { entry: 'claude:sonnet', effort: 'low' }, onChange = () => {} }) {
  const [selection, setSelection] = useState(initial);
  return <ModelPicker managed open entries={entries} selection={selection} balance={1200} onChange={(next) => { setSelection(next); onChange(next); }} />;
}

describe('managed family picker', () => {
  it('groups canonical families and never renders private metadata', () => {
    const { baseElement } = render(<Picker />);
    expect(screen.getByText('OpenAI')).toBeTruthy();
    expect(screen.getByText('Claude')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Claude Sonnet' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Balance 1,200')).toBeTruthy();
    expect(baseElement.innerHTML).not.toMatch(/private-account|subscription|secret-model-v7/);
  });

  it('navigates across providers with a stable public ID', () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith({ entry: 'openai:sol', effort: 'low' });
    expect(screen.getByRole('radio', { name: 'OpenAI Sol' }).getAttribute('aria-checked')).toBe('true');
  });

  it('focuses the selected family on opening', async () => {
    render(<ModelPicker managed entries={catalogue} selection={{ entry: 'claude:sonnet', effort: 'low' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Claude · Sonnet/ }));
    const selected = screen.getByRole('radio', { name: 'Claude Sonnet' });
    await waitFor(() => expect(document.activeElement).toBe(selected));
  });

  it('accepts all supported families and filters unavailable efforts', () => {
    const families = { openai: ['astra', 'sol', 'terra', 'luna'], claude: ['fable', 'opus', 'sonnet', 'haiku'] };
    const input = Object.entries(families).flatMap(([provider, names]) => names.map((family) => ({ id: `${provider}:${family}`, provider, family, efforts: ['high', 'unsupported'] })));
    const result = publicFamilies([...input, { id: 'openai:sol', provider: 'openai', family: 'sol', efforts: ['unknown'] }]);
    expect(result.map((item) => item.label)).toEqual(['Astra', 'Sol', 'Terra', 'Luna', 'Fable', 'Opus', 'Sonnet', 'Haiku']);
    expect(result.every((item) => item.efforts.join(',') === 'high')).toBe(true);
    expect(publicFamilies([{ id: 'openai:sol', provider: 'openai', family: 'sol', efforts: ['unknown'] }])).toEqual([]);
  });

  it('does not duplicate an entry or leak an invalid identifier', () => {
    const duplicate = { ...catalogue[1], source_label: 'other-private-route' };
    const invalid = { ...catalogue[1], id: 'secret-account:sonnet' };
    const { baseElement } = render(<Picker entries={[...catalogue, duplicate, invalid]} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(baseElement.innerHTML).not.toMatch(/other-private-route|secret-account/);
  });

  it('shows unavailable without an effort selector when no model is offered', () => {
    render(<Picker entries={[]} />);
    expect(screen.getAllByText('Chat.unavailable').length).toBeGreaterThan(0);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Chat.effortLabel' })).toBeNull();
    expect(screen.queryByText('Chat.effortLabel')).toBeNull();
  });

  it('opens the unavailable panel from a closed empty managed picker', () => {
    render(<ModelPicker managed entries={[]} selection={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat.unavailable' }));
    expect(screen.getByRole('dialog').textContent).toContain('Chat.unavailable');
  });
});

describe.each([['desktop (1280 px)', false], ['mobile (375 px)', true]])('managed family picker at %s', (_name, narrow) => {
  beforeEach(() => {
    window.matchMedia = vi.fn((query) => ({
      matches: query.includes('max-width') ? narrow : false,
      media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
  });
  afterEach(() => { delete window.matchMedia; });

  it('selects across provider groups by keyboard and keeps the explicit choice on reopening', async () => {
    const onChange = vi.fn();
    function Closed() {
      const [selection, setSelection] = useState({ entry: 'claude:sonnet', effort: 'low' });
      const [open, setOpen] = useState(false);
      return <ModelPicker managed open={open} onOpenChange={setOpen} entries={catalogue} selection={selection} balance={1200} onChange={(next) => { setSelection(next); onChange(next); }} />;
    }
    render(<Closed />);
    fireEvent.click(screen.getByRole('button', { name: /Claude · Sonnet/ }));
    expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0);
    expect((document.querySelector('.MuiDrawer-root') !== null)).toBe(narrow);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Claude Sonnet' })));
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ entry: 'openai:sol', effort: 'low' });
    expect(screen.getByRole('button', { name: /OpenAI · Sol/, hidden: true })).toBeTruthy();
    expect(screen.getByText('Balance 1,200')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chat.close' }));
    await waitFor(() => expect(screen.queryByRole('radio')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /OpenAI · Sol/ }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'OpenAI Sol' })));
  });
});
