// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ChatThread from '../src/chat/ChatThread';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => values?.model ? `${key}:${values.model}` : key }) }));
afterEach(cleanup);
it('shows a collapsed plain-text summary before the first later turn and expands it', () => {
  const turns = [{ id: 1, seq: 8, user_text: 'old', assistant_text: 'answer', state: 'completed', sources: [] }, { id: 2, seq: 10, user_text: 'new', assistant_text: 'answer 2', state: 'completed', sources: [] }];
  const { container } = render(<ChatThread turns={turns} summary={{ up_to_seq: 8, text: '<b>plain summary</b>' }} />);
  const toggle = screen.getByRole('button', { name: /Chat.summaryUntilHere/ });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(container.textContent.indexOf('Chat.summaryUntilHere')).toBeLessThan(container.textContent.indexOf('new'));
  fireEvent.click(toggle);
  expect(screen.getByText('<b>plain summary</b>')).toBeTruthy();
  expect(container.querySelector('b')).toBeNull();
});
