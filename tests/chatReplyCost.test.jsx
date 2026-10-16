// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ChatThread from '../src/chat/ChatThread';
afterEach(cleanup);
const turn = (usage) => ({ id: 1, seq: 1, user_text: 'Q', assistant_text: 'A', state: 'completed', sources: [], model: 'Sonnet', effort: 'high', usage });
it('shows converted cost for a finished reply and falls back for invalid or absent conversions', () => {
  const convert = vi.fn(() => 6);
  const { rerender } = render(<ChatThread turns={[turn({ input_tokens: 2 })]} usageToTokens={convert} />);
  expect(screen.getByText('Sonnet · Chat.effort.high · Chat.replyTokens')).toBeTruthy();
  rerender(<ChatThread turns={[turn({ input_tokens: 2 })]} usageToTokens={() => NaN} />);
  expect(screen.getByText('Sonnet · Chat.effort.high')).toBeTruthy();
  rerender(<ChatThread turns={[turn(null)]} usageToTokens={convert} />);
  expect(screen.getByText('Sonnet · Chat.effort.high')).toBeTruthy();
});
