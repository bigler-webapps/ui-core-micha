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
    const entries = screen.getAllByRole('listitem').map((node) => node.textContent);
    expect(entries).toEqual(['Tea · 2.00', 'Cake · 3.50', 'Milk · 1.20']);
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
