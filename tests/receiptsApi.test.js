// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createReceiptsApi } from '../src/receipts/api';
import { receiptsApiUrls, RECEIPT_ACCEPT, RECEIPT_MAX_BYTES } from '../src/receipts/wire';
import { receiptFileProblem, prepareReceiptFile } from '../src/receipts/files';
import { formatReceiptAmount, formatReceiptDate, isEmptyValue, receiptValueEqual } from '../src/receipts/format';

vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(() => Promise.resolve({ data: { granted: false } })), post: vi.fn((_u, body, config) => Promise.resolve({ data: { receipts: body, config } })), delete: vi.fn(() => Promise.resolve({ data: { granted: false } })) } }));
import apiClient from '../src/auth/apiClient';

describe('receipt API and utility contract', () => {
  it('builds custom endpoint URLs and preserves defaults when one method is overridden', async () => {
    const custom = vi.fn(); const api = createReceiptsApi({ getConsent: custom }, { apiBase: '/v2/receipts' });
    expect(receiptsApiUrls('/v2/receipts')).toEqual({ consent: '/v2/receipts/consent/', read: '/v2/receipts/read/' });
    expect(api.getConsent).toBe(custom); await api.setConsent(false); expect(api.readReceipts).toBeTypeOf('function');
    expect(apiClient.delete).toHaveBeenCalledWith('/v2/receipts/consent/');
  });
  it('sends file and optional JSON context in multipart without forcing a content type', async () => {
    const api = createReceiptsApi({}, { apiBase: '/r/' }); const f = new File(['abc'], 'a.jpg', { type: 'image/jpeg' });
    await api.readReceipts(f, { context: { project: 2 } }); const [, data, config] = apiClient.post.mock.calls.at(-1);
    expect(data).toBeInstanceOf(FormData); expect(data.get('file')).toBe(f); expect(data.get('context')).toBe('{"project":2}'); expect(config).toEqual({ onUploadProgress: undefined, signal: undefined });
    await api.readReceipts(f); expect(apiClient.post.mock.calls.at(-1)[1].has('context')).toBe(false);
    expect(RECEIPT_ACCEPT).toContain('application/pdf'); expect(RECEIPT_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
  it('accepts phone HEIC extensions and rejects unsupported or oversized files', () => {
    expect(receiptFileProblem(new File(['x'], 'scan.HEIC'))).toBe(null);
    expect(receiptFileProblem(new File(['x'], 'bad.gif'))).toBe('unsupported_file_type');
    expect(receiptFileProblem(new File([new Uint8Array(RECEIPT_MAX_BYTES + 1)], 'large.png', { type: 'image/png' }))).toBe('file_too_large');
  });
  it('formats valid values and compares receipt values', () => {
    expect(formatReceiptAmount('bad', 'CHF', 'de')).toBe('bad'); expect(formatReceiptAmount('14.60', 'CHF', 'de')).toContain('14');
    expect(formatReceiptDate('2026-10-14', 'en')).not.toBe('2026-10-14'); expect(formatReceiptDate('bad', 'en')).toBe('bad');
    expect(receiptValueEqual('total', '14.60', '14.6')).toBe(true); expect(receiptValueEqual('merchant', ' Shop ', 'shop')).toBe(true); expect(isEmptyValue([])).toBe(true);
  });
  it('scales large images to 2400 px, passes through other formats and tolerates decode failure', async () => {
    const originalCreate = document.createElement.bind(document), originalImage = globalThis.Image;
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb) => cb(new Blob(['jpeg'], { type: 'image/jpeg' })) };
    vi.spyOn(document, 'createElement').mockImplementation((name) => name === 'canvas' ? canvas : originalCreate(name));
    globalThis.Image = class { naturalWidth = 4800; naturalHeight = 2400; set src(_v) { this.onload(); } };
    const large = await prepareReceiptFile(new File([new Uint8Array(1600000)], 'photo.png', { type: 'image/png', lastModified: 1 }));
    expect(canvas.width).toBe(2400); expect(canvas.height).toBe(1200); expect(large.type).toBe('image/jpeg');
    const heic = new File(['x'], 'a.heic'); const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' }); const small = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    expect(await prepareReceiptFile(heic)).toBe(heic); expect(await prepareReceiptFile(pdf)).toBe(pdf); expect(await prepareReceiptFile(small)).toBe(small);
    globalThis.Image = class { set src(_v) { this.onerror(); } };
    const fail = new File([new Uint8Array(1600000)], 'fail.jpg', { type: 'image/jpeg' }); expect(await prepareReceiptFile(fail)).toBe(fail);
    globalThis.Image = originalImage; vi.restoreAllMocks();
  });
});
