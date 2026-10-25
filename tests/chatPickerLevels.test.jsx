// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ModelPicker from '../src/chat/ModelPicker';
afterEach(cleanup);
it('shows a flat list in level order and leaves unknown entries at the end', () => {
  const entries = [
    { id: 'f', label: 'Fast', level: 'fast', efforts: ['low'] },
    { id: 'u', label: 'Unknown', efforts: ['low'] },
    { id: 't', label: 'Top', level: 'top', efforts: ['low'] },
  ];
  render(<ModelPicker entries={entries} selection={{ entry: 't', effort: 'low' }} />);
  fireEvent.click(screen.getByRole('button', { name: /Top/ }));
  const text = screen.getByRole('radiogroup').textContent;
  expect(text).not.toContain('Chat.level.');
  expect(text).not.toContain('Chat.levelHint.');
  expect(text.indexOf('Top')).toBeLessThan(text.indexOf('Fast'));
  expect(text.indexOf('Unknown')).toBeGreaterThan(text.indexOf('Fast'));
});
