// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options && Object.keys(options).length ? `${key}:${JSON.stringify(options)}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { AttachmentList } from '../src/messaging/AttachmentList';
import { AuthContext } from '../src/auth/AuthContext';
import { MessageBubble } from '../src/messaging/MessageBubble';
import { MessagingProvider } from '../src/messaging/MessagingProvider';

const imageAttachment = { id: 'att-1', filename: 'vacation-photo.jpg', content_type: 'image/jpeg' };
const fileAttachment = { id: 'att-2', filename: 'Report.pdf', content_type: 'application/pdf' };
const fallbackAttachment = { id: 'att-3', content_type: 'application/pdf' }; // no filename -- pre-MSG-12 dcm pin

function makeApi(overrides = {}) {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }),
    getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    getAttachment: vi.fn().mockResolvedValue(new Blob(['full-bytes'], { type: 'image/jpeg' })),
    getAttachmentThumbnail: vi.fn().mockResolvedValue(new Blob(['thumb-bytes'], { type: 'image/jpeg' })),
    ...overrides,
  };
}

afterEach(cleanup);

describe('MSG-6h: attachment gallery (thumbnail/lightbox/right-click download)', () => {
  it('1. an image attachment renders a thumbnail; clicking it opens a lightbox showing the full image', async () => {
    const api = makeApi();
    render(<MessagingProvider api={api} active={false}><AttachmentList attachments={[imageAttachment]} /></MessagingProvider>);
    const thumbnail = await screen.findByLabelText(/MessagingAttachments\.PREVIEW/);
    await waitFor(() => expect(api.getAttachmentThumbnail).toHaveBeenCalledWith('att-1'));

    fireEvent.click(thumbnail);
    await waitFor(() => expect(api.getAttachment).toHaveBeenCalledWith('att-1'));
    const lightboxImage = await screen.findByAltText('vacation-photo.jpg');
    expect(lightboxImage.tagName).toBe('IMG');
  });

  it('2. right-clicking an image attachment opens a context menu with Download; selecting it downloads', async () => {
    const api = makeApi();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MessagingProvider api={api} active={false}><AttachmentList attachments={[imageAttachment]} /></MessagingProvider>);
    const thumbnail = await screen.findByLabelText(/MessagingAttachments\.PREVIEW/);

    fireEvent.contextMenu(thumbnail);
    const downloadItem = await screen.findByText('MessagingAttachments.DOWNLOAD_ACTION');
    fireEvent.click(downloadItem);
    await waitFor(() => expect(api.getAttachment).toHaveBeenCalledWith('att-1'));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('3. a non-image attachment renders a file indicator, not a broken image; clicking it downloads directly', async () => {
    const api = makeApi();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MessagingProvider api={api} active={false}><AttachmentList attachments={[fileAttachment]} /></MessagingProvider>);
    const target = screen.getByLabelText('MessagingAttachments.DOWNLOAD:{"name":"Report.pdf"}');
    expect(target.querySelector('img')).toBeNull();
    expect(screen.getByText('Report.pdf')).toBeTruthy();

    fireEvent.click(target);
    await waitFor(() => expect(api.getAttachment).toHaveBeenCalledWith('att-2'));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    // No lightbox for a non-image -- nothing to preview.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('4. nameOf prefers attachment.filename when present, falls back to attachment.id when absent (pre-MSG-12 dcm interop)', () => {
    render(<MessagingProvider api={makeApi()} active={false}><AttachmentList attachments={[fileAttachment, fallbackAttachment]} /></MessagingProvider>);
    expect(screen.getByText('Report.pdf')).toBeTruthy();
    expect(screen.getByText('att-3')).toBeTruthy();
  });

  it('6. the lightbox itself has a Download action -- reachable without a right-click, closing an accessibility regression (touch/keyboard users could not download an image otherwise)', async () => {
    const api = makeApi();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MessagingProvider api={api} active={false}><AttachmentList attachments={[imageAttachment]} /></MessagingProvider>);
    const thumbnail = await screen.findByLabelText(/MessagingAttachments\.PREVIEW/);
    fireEvent.click(thumbnail);
    await screen.findByAltText('vacation-photo.jpg');
    api.getAttachment.mockClear();

    const downloadButton = screen.getByLabelText('MessagingAttachments.DOWNLOAD_ACTION');
    fireEvent.click(downloadButton);
    await waitFor(() => expect(api.getAttachment).toHaveBeenCalledWith('att-1'));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('7. the lightbox shows a loading state while the full image fetches, and an error state if the fetch fails', async () => {
    let resolveFetch;
    const api = makeApi({ getAttachment: vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; })) });
    render(<MessagingProvider api={api} active={false}><AttachmentList attachments={[imageAttachment]} /></MessagingProvider>);
    const thumbnail = await screen.findByLabelText(/MessagingAttachments\.PREVIEW/);

    fireEvent.click(thumbnail);
    await screen.findByLabelText('MessagingAttachments.LOADING_PREVIEW');
    expect(screen.queryByAltText('vacation-photo.jpg')).toBeNull();

    resolveFetch(new Blob(['bytes'], { type: 'image/jpeg' }));
    await screen.findByAltText('vacation-photo.jpg');
    expect(screen.queryByLabelText('MessagingAttachments.LOADING_PREVIEW')).toBeNull();
  });

  it('8. a failed full-image fetch shows a visible error, not a silent no-op', async () => {
    const api = makeApi({ getAttachment: vi.fn().mockRejectedValue(new Error('network error')) });
    render(<MessagingProvider api={api} active={false}><AttachmentList attachments={[imageAttachment]} /></MessagingProvider>);
    const thumbnail = await screen.findByLabelText(/MessagingAttachments\.PREVIEW/);

    fireEvent.click(thumbnail);
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toBe('MessagingAttachments.PREVIEW_ERROR');
  });

  it('5. the attachment context menu does not also trigger the message-level action menu', async () => {
    const api = makeApi();
    render(
      <AuthContext.Provider value={{ user: { id: 1 } }}>
        <MessagingProvider api={api} active={false}>
          <MessageBubble message={{ id: 'm1', body: 'see attached', sender: { id: 1 }, attachments: [imageAttachment] }} conversation={{ kind: 'group' }} canModerateMessages />
        </MessagingProvider>
      </AuthContext.Provider>,
    );
    const thumbnail = await screen.findByLabelText(/MessagingAttachments\.PREVIEW/);

    fireEvent.contextMenu(thumbnail);
    await screen.findByText('MessagingAttachments.DOWNLOAD_ACTION');
    // The message-level menu's own items (e.g. Reply) must not also be open.
    expect(screen.queryByText('MessagingThread.REPLY')).toBeNull();
  });
});
