// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Button } from '@mui/material';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, values) => (values ? `${key} ${Object.values(values).join(' ')}` : key), i18n: { language: 'en' } }),
}));
vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import apiClient from '../src/auth/apiClient';
import { createReceiptsApi } from '../src/receipts/api';
import { ReceiptCaptureCard } from '../src/receipts/ReceiptCaptureCard';
import { ReceiptReviewDialog } from '../src/receipts/ReceiptReviewDialog';
import { useReceiptConsent } from '../src/receipts/useReceiptConsent';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const consentedApi = (readReceipts) => ({ getConsent: vi.fn().mockResolvedValue({ granted: true }), setConsent: vi.fn(), readReceipts });
const fileInput = () => document.querySelector('input[type=file][accept*="application/pdf"]');
const MB = 1024 * 1024;

describe('size handling', () => {
  it('refuses a file over 10 MB that cannot be scaled down, without a request', async () => {
    const readReceipts = vi.fn();
    render(<ReceiptCaptureCard api={consentedApi(readReceipts)} />);
    await screen.findByRole('button', { name: 'Receipts.CAMERA' });
    fireEvent.change(fileInput(), { target: { files: [new File([new ArrayBuffer(11 * MB)], 'big.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText('Receipts.FILE_PROBLEM')).toBeTruthy();
    expect(readReceipts).not.toHaveBeenCalled();
  });

  describe('a large photo', () => {
    beforeEach(() => {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
      globalThis.URL.revokeObjectURL = vi.fn();
      globalThis.Image = class { set src(value) { this.naturalWidth = 4000; this.naturalHeight = 3000; setTimeout(() => this.onload?.(), 0); } };
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() });
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob([new Uint8Array(200 * 1024)], { type: 'image/jpeg' })));
    });

    it('over 10 MB is scaled down first and then read, not rejected', async () => {
      const readReceipts = vi.fn().mockResolvedValue([]);
      render(<ReceiptCaptureCard api={consentedApi(readReceipts)} />);
      await screen.findByRole('button', { name: 'Receipts.CAMERA' });
      fireEvent.change(fileInput(), { target: { files: [new File([new ArrayBuffer(12 * MB)], 'photo.jpg', { type: 'image/jpeg' })] } });
      await waitFor(() => expect(readReceipts).toHaveBeenCalledTimes(1));
      const sent = readReceipts.mock.calls[0][0];
      expect(sent.type).toBe('image/jpeg');
      expect(sent.size).toBeLessThan(10 * MB);
    });
  });
});

describe('error states by code', () => {
  const cases = [
    ['unsupported_file_type', 'Receipts.FILE_PROBLEM'],
    ['file_too_large', 'Receipts.FILE_PROBLEM'],
    ['invalid_request', 'Receipts.FILE_PROBLEM'],
    ['nothing_recognised', 'Receipts.NOTHING_RECOGNISED'],
    ['provider_unavailable', 'Receipts.UNAVAILABLE'],
    ['spend_cap_reached', 'Receipts.UNAVAILABLE'],
    ['count_limit_reached', 'Receipts.UNAVAILABLE'],
    ['authentication_required', 'Receipts.UNAVAILABLE'],
  ];
  it.each(cases)('%s shows %s', async (code, text) => {
    const failure = Object.assign(new Error('x'), { response: { data: { code } } });
    render(<ReceiptCaptureCard api={consentedApi(vi.fn().mockRejectedValue(failure))} />);
    await screen.findByRole('button', { name: 'Receipts.CAMERA' });
    fireEvent.change(fileInput(), { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText(text)).toBeTruthy();
  });
});

describe('several receipts', () => {
  it('hands the selection over once and closes the picker', async () => {
    const receipts = [{ merchant: 'A', total: '1.00', currency: 'CHF', confidence: 'high', items: [] }, { merchant: 'B', total: '2.00', currency: 'CHF', confidence: 'high', items: [] }];
    const onSelectReceipts = vi.fn();
    render(<ReceiptCaptureCard api={consentedApi(vi.fn().mockResolvedValue(receipts))} onSelectReceipts={onSelectReceipts} />);
    await screen.findByRole('button', { name: 'Receipts.CAMERA' });
    fireEvent.change(fileInput(), { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Receipts.APPLY_COUNT 2' }));
    expect(onSelectReceipts).toHaveBeenCalledTimes(1);
    expect(onSelectReceipts).toHaveBeenCalledWith(receipts);
    expect(screen.queryByRole('button', { name: /Receipts.APPLY_COUNT/ })).toBeNull();
  });
});

describe('review rows', () => {
  it('shows line items as a list', () => {
    const items = [{ description: 'Tea', amount: '2.00' }, { description: 'Cake', amount: '3.50' }, { description: 'Milk', amount: '1.20' }];
    render(<ReceiptReviewDialog open receipt={{ items, confidence: 'high' }} values={{}} onApply={vi.fn()} onClose={vi.fn()} />);
    const entries = screen.getAllByRole('listitem').map((node) => [...node.children].map((part) => part.textContent).join(' | '));
    expect(entries).toEqual(['Tea | 2.00', 'Cake | 3.50', 'Milk | 1.20']);
  });

  it('names the dialog by its title', () => {
    render(<ReceiptReviewDialog open receipt={{ merchant: 'M', confidence: 'high' }} values={{}} onApply={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Receipts.REVIEW_TITLE' })).toBeTruthy();
  });
});

describe('consent and api client', () => {
  function Probe({ api }) {
    const state = useReceiptConsent(api);
    return <><output>{state.granted ? 'yes' : 'no'}</output><Button onClick={() => state.set(false)}>revoke</Button></>;
  }

  it('fails closed when a revocation does not get through', async () => {
    const api = { getConsent: vi.fn().mockResolvedValue({ granted: true }), setConsent: vi.fn().mockRejectedValue(new Error('down')) };
    render(<Probe api={api} />);
    await screen.findByText('yes');
    fireEvent.click(screen.getByRole('button', { name: 'revoke' }));
    expect(await screen.findByText('no')).toBeTruthy();
  });

  it('keeps the real defaults of the functions that were not overridden', async () => {
    apiClient.post.mockResolvedValue({ data: { granted: true } });
    const getConsent = vi.fn().mockResolvedValue({ granted: false });
    const api = createReceiptsApi({ getConsent }, { apiBase: '/x/' });
    expect(await api.getConsent()).toEqual({ granted: false });
    expect(await api.setConsent(true)).toEqual({ granted: true });
    expect(apiClient.post).toHaveBeenCalledWith('/x/consent/');
  });
});

describe('round two fixes', () => {
  it('hands over exactly the empty fields with "Only empty fields"', () => {
    const items = [{ description: 'Tea', amount: '2.00' }];
    const receipt = { merchant: 'Shop', date: '2026-10-14', total: '14.60', currency: 'CHF', payment_method: 'card', items, confidence: 'high', account_suggestions: [{ account_id: 'a1', confidence: 'high' }], project_code: 'P1' };
    const onApply = vi.fn();
    render(<ReceiptReviewDialog open receipt={receipt} values={{ merchant: 'Shop', date: 'typed', total: '4', currency: '', payment_method: '', account: '', items: [], project_code: '' }} extraFields={[{ key: 'project_code', label: 'Project' }]} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.ONLY_EMPTY' }));
    expect(onApply).toHaveBeenCalledWith({ currency: 'CHF', payment_method: 'card', account: 'a1', items, project_code: 'P1' }, { mode: 'empty' });
  });

  it('still offers Apply when the form has the same descriptions but not the amounts', () => {
    const receipt = { items: [{ description: 'Tea', amount: '2.00' }], confidence: 'high' };
    render(<ReceiptReviewDialog open receipt={receipt} values={{ items: [{ description: 'Tea' }] }} onApply={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Receipts.APPLY' })).toBeTruthy();
    expect(screen.queryByText('Receipts.SAME_AS_FORM')).toBeNull();
  });

  it('lets a declared type decide over the extension', async () => {
    const { receiptFileProblem } = await import('../src/receipts/files');
    expect(receiptFileProblem(new File(['x'], 'receipt.jpg', { type: 'image/gif' }))).toBe('unsupported_file_type');
    expect(receiptFileProblem(new File(['x'], 'receipt.heic', { type: '' }))).toBeNull();
    expect(receiptFileProblem(new File(['x'], 'receipt.pdf', { type: 'application/pdf' }))).toBeNull();
  });

  it('accepts exactly the specified type list in the file input', async () => {
    const { RECEIPT_ACCEPT } = await import('../src/receipts/wire');
    render(<ReceiptCaptureCard api={consentedApi(vi.fn())} />);
    await screen.findByRole('button', { name: 'Receipts.CAMERA' });
    expect(fileInput().getAttribute('accept')).toBe(RECEIPT_ACCEPT);
    expect(RECEIPT_ACCEPT.split(',')).toEqual(['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf', '.jpg', '.jpeg', '.png', '.heic', '.heif', '.pdf']);
  });

  it('has every key of the released copy list', async () => {
    const { receiptsTranslations } = await import('../src/i18n/receiptsTranslations');
    const required = ['CAMERA', 'PICK_FILE', 'ACCEPTED_TYPES', 'READING', 'ANOTHER', 'REVIEW_TITLE', 'SAME_AS_FORM', 'APPLY', 'ONLY_EMPTY', 'APPLY_ALL', 'CLOSE', 'CERTAIN', 'UNCERTAIN', 'RECOGNISED_COUNT', 'APPLY_COUNT', 'UNREADABLE', 'AMOUNT_UNKNOWN', 'CONSENT', 'UPLOAD_ONLY', 'NOTHING_RECOGNISED', 'UNAVAILABLE', 'FILE_PROBLEM', 'FIELD_merchant', 'FIELD_date', 'FIELD_total', 'FIELD_currency', 'FIELD_payment_method', 'FIELD_account', 'FIELD_items', 'CARD_LABEL', 'CANCEL', 'PAYMENT_cash', 'PAYMENT_card', 'PAYMENT_other', 'CONSENT_ERROR', 'RETRY'];
    for (const name of required) expect(receiptsTranslations[`Receipts.${name}`], name).toBeTruthy();
  });

  it('forgets a grant when the api changes and until the new api has answered', async () => {
    function Probe({ api }) { const state = useReceiptConsent(api); return <output>{state.status + ':' + (state.granted ? 'yes' : 'no')}</output>; }
    const first = { getConsent: vi.fn().mockResolvedValue({ granted: true }) };
    let release;
    const second = { getConsent: vi.fn(() => new Promise((resolve) => { release = resolve; })) };
    const { rerender } = render(<Probe api={first} />);
    await screen.findByText('ready:yes');
    rerender(<Probe api={second} />);
    expect(await screen.findByText('loading:no')).toBeTruthy();
    release({ granted: true });
    expect(await screen.findByText('ready:yes')).toBeTruthy();
  });
});

describe('stale consent answers', () => {
  it('ignores the answer of an old api after the api changed', async () => {
    let resolveOld;
    const oldApi = { getConsent: vi.fn().mockResolvedValue({ granted: false }), setConsent: vi.fn(() => new Promise((resolve) => { resolveOld = resolve; })) };
    const newApi = { getConsent: vi.fn(() => new Promise(() => {})) };
    function Probe({ api }) {
      const state = useReceiptConsent(api);
      return <><output>{state.status + ':' + (state.granted ? 'yes' : 'no')}</output><Button onClick={() => state.set(true)}>grant</Button></>;
    }
    const { rerender } = render(<Probe api={oldApi} />);
    await screen.findByText('ready:no');
    fireEvent.click(screen.getByRole('button', { name: 'grant' }));
    rerender(<Probe api={newApi} />);
    await screen.findByText('loading:no');
    resolveOld({ granted: true });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByText('loading:no')).toBeTruthy();
  });
});

describe('round four fixes', () => {
  it('applies the clicked row and, with Apply all, every recognised row', () => {
    const items = [{ description: 'Tea', amount: '2.00' }];
    const receipt = { merchant: 'Shop', date: '2026-10-14', total: '14.60', currency: 'CHF', payment_method: 'card', items, confidence: 'high', account_suggestions: [{ account_id: 'a1', confidence: 'high' }] };
    const onApply = vi.fn();
    render(<ReceiptReviewDialog open receipt={receipt} values={{}} onApply={onApply} onClose={vi.fn()} />);
    const rows = screen.getAllByRole('button', { name: 'Receipts.APPLY' });
    fireEvent.click(rows[2]);
    expect(onApply).toHaveBeenLastCalledWith({ total: '14.60', currency: 'CHF' }, { mode: 'field' });
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.APPLY_ALL' }));
    expect(onApply).toHaveBeenLastCalledWith({ merchant: 'Shop', date: '2026-10-14', total: '14.60', currency: 'CHF', payment_method: 'card', account: 'a1', items }, { mode: 'all' });
  });

  it('reports the receipts the user chose, not the initial selection', async () => {
    const { ReceiptPicker } = await import('../src/receipts/ReceiptPicker');
    const a = { merchant: 'A', confidence: 'high' };
    const b = { merchant: 'B', confidence: 'low' };
    const onConfirm = vi.fn();
    render(<ReceiptPicker receipts={[a, b]} onConfirm={onConfirm} onCancel={vi.fn()} />);
    const [first, second] = screen.getAllByRole('checkbox');
    fireEvent.click(first);
    fireEvent.click(second);
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.APPLY_COUNT 1' }));
    expect(onConfirm).toHaveBeenCalledWith([b]);
  });

  it('keeps recognition off while consent is checked again after consent_required', async () => {
    const failure = Object.assign(new Error('x'), { response: { data: { code: 'consent_required' } } });
    let answer;
    let calls = 0;
    const api = {
      getConsent: vi.fn(() => { calls += 1; return calls === 1 ? Promise.resolve({ granted: true }) : new Promise((resolve) => { answer = resolve; }); }),
      setConsent: vi.fn(),
      readReceipts: vi.fn().mockRejectedValue(failure),
    };
    render(<ReceiptCaptureCard api={api} />);
    await screen.findByRole('button', { name: 'Receipts.CAMERA' });
    fireEvent.change(fileInput(), { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Receipts.CAMERA' })).toBeNull());
    await waitFor(() => expect(api.getConsent).toHaveBeenCalledTimes(2));
    answer({ granted: false });
    expect(await screen.findByRole('switch')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Receipts.CAMERA' })).toBeNull();
  });

  it('revokes the preview when nothing was recognised', async () => {
    const revoke = vi.fn();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
    globalThis.URL.revokeObjectURL = revoke;
    render(<ReceiptCaptureCard api={consentedApi(vi.fn().mockResolvedValue([]))} />);
    await screen.findByRole('button', { name: 'Receipts.CAMERA' });
    fireEvent.change(fileInput(), { target: { files: [new File([new ArrayBuffer(10)], 'a.png', { type: 'image/png' })] } });
    expect(await screen.findByText('Receipts.NOTHING_RECOGNISED')).toBeTruthy();
    expect(revoke).toHaveBeenCalledWith('blob:preview');
  });
});
