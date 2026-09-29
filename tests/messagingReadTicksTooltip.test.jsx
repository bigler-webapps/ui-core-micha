// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.read != null ? `${key}:${options.read}/${options.total}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { MessagingProvider } from '../src/messaging/MessagingProvider';
import { ReadTicks } from '../src/messaging/ReadTicks';

function makeApi(status) {
  return {
    getReadStatus: vi.fn().mockResolvedValue(status),
    getAttachment: vi.fn(), getAttachmentThumbnail: vi.fn(), addReaction: vi.fn(), removeReaction: vi.fn(),
    votePoll: vi.fn(), closePoll: vi.fn(),
  };
}

afterEach(cleanup);

describe('message read ratio marker', () => {
  it('gives the visible ratio an explanatory tooltip', async () => {
    render(<MessagingProvider api={makeApi({ read_count: 2, recipient_count: 5 })} active={false}><ReadTicks messageId={7} conversation={{ kind: 'group' }} /></MessagingProvider>);
    expect(await screen.findByTitle('MessagingReadTicks.READ_RATIO:2/5')).toBeTruthy();
  });

  it('hides a ratio when there are no recipients', async () => {
    let resolveStatus;
    const api = { ...makeApi({}), getReadStatus: vi.fn().mockReturnValue(new Promise((resolve) => { resolveStatus = resolve; })) };
    const { container } = render(<MessagingProvider api={api} active={false}><ReadTicks messageId={7} conversation={{ kind: 'group' }} /></MessagingProvider>);
    await waitFor(() => expect(api.getReadStatus).toHaveBeenCalled());
    await act(async () => resolveStatus({ read_count: 0, recipient_count: 0 }));
    expect(container.textContent).toBe('');
  });
});
