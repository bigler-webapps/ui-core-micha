// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { MessageBubble } from '../src/messaging/MessageBubble';
import { MessagingProvider } from '../src/messaging/MessagingProvider';

function makeApi() {
  return {
    getReadStatus: vi.fn().mockResolvedValue({ all_read: false }),
    getAttachment: vi.fn(), getAttachmentThumbnail: vi.fn(), addReaction: vi.fn(), removeReaction: vi.fn(),
    votePoll: vi.fn(), closePoll: vi.fn(),
  };
}
function renderMessage(body) {
  return render(<MessagingProvider api={makeApi()} active={false}><MessageBubble message={{ id: 1, body, sender: { display_name: 'Ava' } }} conversation={{ kind: 'group' }} /></MessagingProvider>);
}

afterEach(cleanup);

describe('message URL linkification', () => {
  it('renders http(s) URLs as safe external links', () => {
    renderMessage('Open https://example.com/path for details.');
    const link = screen.getByRole('link', { name: 'https://example.com/path' });
    expect(link.getAttribute('href')).toBe('https://example.com/path');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not turn javascript URLs into links', () => {
    renderMessage('javascript:alert(1)');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('javascript:alert(1)')).toBeTruthy();
  });

  it('leaves surrounding prose outside the link and trims sentence punctuation', () => {
    const { container } = renderMessage('See https://example.com/path, then continue reading.');
    const link = screen.getByRole('link');
    expect(link.textContent).toBe('https://example.com/path');
    // MUI's `Link` itself carries a `MuiTypography-root` class (it is a
    // Typography variant), so `.closest('.MuiTypography-root')` would match
    // the link, not its containing paragraph -- `.closest('p')` skips past it
    // to the actual message-body Typography (MUI's default root tag for the
    // unvaried `body1` variant used here).
    expect(link.closest('p').textContent).toBe('See https://example.com/path, then continue reading.');
  });
});
