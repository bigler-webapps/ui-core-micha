// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.name ? `${key}:${options.name}` : key }) }));
vi.mock('../src/notifications/realtime', () => ({ useRealtime: () => ({ subscribe: () => () => {}, onReconnect: () => () => {} }) }));

import { Composer } from '../src/messaging/Composer';
import { MessagingProvider } from '../src/messaging/MessagingProvider';

function makeApi() {
  return {
    listConversations: vi.fn().mockResolvedValue({ results: [] }), listMessages: vi.fn().mockResolvedValue({ results: [] }), getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0, by_conversation: {} }),
    createMessage: vi.fn().mockResolvedValue({ id: 1, conversation_id: 7 }), uploadAttachments: vi.fn().mockResolvedValue({ id: 2, conversation_id: 7 }), getAttachment: vi.fn(), getAttachmentThumbnail: vi.fn(),
  };
}
function renderComposer(api = makeApi(), conversationId = 7) {
  return render(<MessagingProvider api={api} active={false}><Composer conversationId={conversationId} /></MessagingProvider>);
}
function attachmentInput() { return document.querySelector('input[type=file]'); }
function messageInput() { return screen.getByLabelText('MessagingComposer.MESSAGE'); }
function imageFile(name = 'photo.png') { return new File(['image'], name, { type: 'image/png' }); }

beforeEach(() => {
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Composer chunk 5 behavior', () => {
  it('sends on Enter and leaves Shift+Enter available for a newline', async () => {
    const api = makeApi(); renderComposer(api);
    fireEvent.change(messageInput(), { target: { value: 'first' } });
    fireEvent.keyDown(messageInput(), { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(api.createMessage).toHaveBeenCalledTimes(1));

    fireEvent.change(messageInput(), { target: { value: 'first' } });
    fireEvent.keyDown(messageInput(), { key: 'Enter', code: 'Enter', shiftKey: true });
    fireEvent.change(messageInput(), { target: { value: 'first\nsecond' } });
    expect(api.createMessage).toHaveBeenCalledTimes(1);
    expect(messageInput().value).toBe('first\nsecond');
  });

  it('shows staged image previews and removes only the chosen file before upload', async () => {
    const api = makeApi(); renderComposer(api);
    const first = imageFile('first.png'); const second = imageFile('second.png');
    fireEvent.change(attachmentInput(), { target: { files: [first, second] } });
    expect(screen.getByRole('img', { name: 'first.png' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'second.png' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.REMOVE_ATTACHMENT:first.png' }));
    expect(screen.queryByRole('img', { name: 'first.png' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.SEND' }));
    await waitFor(() => expect(api.uploadAttachments).toHaveBeenCalledTimes(1));
    const sentFiles = Array.from(api.uploadAttachments.mock.calls[0][1].getAll('files[]'));
    expect(sentFiles).toHaveLength(1);
    expect(sentFiles[0].name).toBe('second.png');
  });

  it('shows real byte-percentage upload progress while an attachment upload is in flight', async () => {
    let resolveUpload; const api = makeApi(); api.uploadAttachments.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve; }));
    renderComposer(api); fireEvent.change(attachmentInput(), { target: { files: [imageFile()] } });
    fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.SEND' }));
    expect(await screen.findByRole('status')).toBeTruthy();
    const { onUploadProgress } = api.uploadAttachments.mock.calls[0][2];
    onUploadProgress({ loaded: 25, total: 100 });
    await waitFor(() => expect(screen.getAllByRole('progressbar')[0].getAttribute('aria-valuenow')).toBe('25'));
    resolveUpload({ id: 2, conversation_id: 7 });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('compresses oversized images before adding them to FormData and falls back silently if compression fails', async () => {
    const largeImage = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    const api = makeApi();
    class SuccessfulImage { naturalWidth = 5120; naturalHeight = 2560; set src(_) { this.onload(); } }
    vi.stubGlobal('Image', SuccessfulImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['compressed'], { type: 'image/jpeg' })));
    renderComposer(api); fireEvent.change(attachmentInput(), { target: { files: [largeImage] } }); fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.SEND' }));
    await waitFor(() => expect(api.uploadAttachments).toHaveBeenCalledTimes(1));
    const compressed = api.uploadAttachments.mock.calls[0][1].get('files[]');
    expect(compressed.name).toBe('large.jpg'); expect(compressed.type).toBe('image/jpeg');

    cleanup(); const fallbackApi = makeApi(); class FailingImage { set src(_) { this.onerror(); } }
    vi.stubGlobal('Image', FailingImage);
    renderComposer(fallbackApi); fireEvent.change(attachmentInput(), { target: { files: [largeImage] } }); fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.SEND' }));
    await waitFor(() => expect(fallbackApi.uploadAttachments).toHaveBeenCalledTimes(1));
    const fallback = fallbackApi.uploadAttachments.mock.calls[0][1].get('files[]');
    expect(fallback.name).toBe('large.png'); expect(fallback.type).toBe('image/png');
  });

  it('inserts the selected emoji at the current cursor position', async () => {
    renderComposer(); fireEvent.change(messageInput(), { target: { value: 'abCD' } });
    messageInput().setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.ADD_EMOJI' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '👍' }));
    await waitFor(() => expect(messageInput().value).toBe('ab👍CD'));
  });

  it('disables poll composing while an image is staged and resets drafts for a new conversation', async () => {
    const api = makeApi(); const view = renderComposer(api, 7);
    fireEvent.change(attachmentInput(), { target: { files: [imageFile()] } });
    expect(screen.getByRole('button', { name: 'MessagingPoll.CREATE' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'MessagingComposer.REMOVE_ATTACHMENT:photo.png' }));
    expect(screen.getByRole('button', { name: 'MessagingPoll.CREATE' }).disabled).toBe(false);
    fireEvent.change(messageInput(), { target: { value: 'unsent draft' } });
    view.rerender(<MessagingProvider api={api} active={false}><Composer conversationId={8} /></MessagingProvider>);
    await waitFor(() => expect(messageInput().value).toBe(''));
  });
});
