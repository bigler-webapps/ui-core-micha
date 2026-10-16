// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => values ? `${key} ${Object.values(values).join(' ')}` : key, i18n: { language: 'en' } }) }));
import { ReceiptReviewDialog } from '../src/receipts/ReceiptReviewDialog';
import { ReceiptPicker } from '../src/receipts/ReceiptPicker';
import { ReceiptCaptureCard } from '../src/receipts/ReceiptCaptureCard';
import { useReceiptConsent } from '../src/receipts/useReceiptConsent';
import { Button } from '@mui/material';
afterEach(cleanup);

describe('receipt review and picker', () => {
  const receipt = { merchant: '<b>Shop</b>', date: '2026-10-14', total: '14.60', currency: 'CHF', payment_method: 'card', items: [{ description: 'Tea', amount: '2.00' }], confidence: 'low', account_suggestions: [{ account_id: 'a1', confidence: 'low' }], project_code: 'P1' };
  it('applies a field, applies only empty values, renders equal/different and low confidence safely', () => {
    const onApply = vi.fn(); render(<ReceiptReviewDialog open receipt={receipt} values={{ merchant: '<b>Shop</b>', date: 'other', total: '4', currency: '', payment_method: '', account: '', items: [], project_code: '' }} extraFields={[{ key: 'project_code', label: 'Project' }]} accountLabel={(id) => `Account ${id}`} onApply={onApply} onClose={vi.fn()} />);
    expect(screen.getByText('<b>Shop</b>')).toBeTruthy(); expect(screen.getByText('Receipts.SAME_AS_FORM')).toBeTruthy(); expect(screen.getAllByText('Receipts.UNCERTAIN').length).toBeGreaterThan(0); expect(screen.getByText('Account a1')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Receipts.APPLY' })[0]); expect(onApply).toHaveBeenCalledWith({ date: '2026-10-14' }, { mode: 'field' });
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.ONLY_EMPTY' })); expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ currency: 'CHF', account: 'a1', items: receipt.items, project_code: 'P1' }), { mode: 'empty' });
  });
  it('applies every recognised row and omits fields the receipt did not recognise', () => {
    const onApply = vi.fn(); render(<ReceiptReviewDialog open receipt={{ merchant: 'M', payment_method: 'unknown', items: [] }} onApply={onApply} onClose={vi.fn()} />);
    expect(screen.queryByText('Receipts.FIELD_items')).toBeNull(); expect(screen.queryByText('Receipts.FIELD_payment_method')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.APPLY_ALL' })); expect(onApply).toHaveBeenCalledWith({ merchant: 'M' }, { mode: 'all' });
  });
  it('starts low-confidence receipts unselected and confirms selected receipts in original order', () => {
    const onConfirm = vi.fn(); render(<ReceiptPicker receipts={[{ merchant: 'A', confidence: 'high', box: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } }, { merchant: '', confidence: 'low' }]} imageUrl="blob:x" onConfirm={onConfirm} onCancel={vi.fn()} />);
    const checks = screen.getAllByRole('checkbox'); expect(checks[0].checked).toBe(true); expect(checks[1].checked).toBe(false);
    expect(screen.getByRole('img', { name: 'Receipts.UNREADABLE' })).toBeTruthy(); expect(screen.getAllByText('Receipts.AMOUNT_UNKNOWN').length).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.APPLY_COUNT 1' })); expect(onConfirm).toHaveBeenCalledWith([{ merchant: 'A', confidence: 'high', box: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } }]);
    expect(window.getComputedStyle(document.querySelector('[role="img"]')).backgroundSize).toBe('200% 200%');
  });
});

describe('receipt capture consent and file validation', () => {
  function ConsentProbe({ api }) { const state = useReceiptConsent(api); return <><output>{state.granted ? 'yes' : 'no'}</output><Button onClick={() => state.set(true)}>grant</Button></>; }
  it('keeps the old consent state after a failed update', async () => {
    const api = { getConsent: vi.fn().mockResolvedValue({ granted: true }), setConsent: vi.fn().mockRejectedValue(Error()) }; render(<ConsentProbe api={api} />); await screen.findByText('yes'); fireEvent.click(screen.getByRole('button', { name: 'grant' })); await waitFor(() => expect(api.setConsent).toHaveBeenCalledWith(true)); expect(screen.getByText('yes')).toBeTruthy();
  });
  it('offers upload-only without consent and never calls recognition for invalid or upload-only files', async () => {
    const api = { getConsent: vi.fn().mockResolvedValue({ granted: false }), setConsent: vi.fn().mockResolvedValue({ granted: true }), readReceipts: vi.fn() }; const onUploadOnly = vi.fn();
    render(<ReceiptCaptureCard api={api} onUploadOnly={onUploadOnly} />); await screen.findByRole('switch', { name: /Receipts.CONSENT/ });
    expect(screen.queryByRole('button', { name: 'Receipts.CAMERA' })).toBeNull(); expect(screen.getByRole('button', { name: 'Receipts.UPLOAD_ONLY' })).toBeTruthy();
    const input = document.querySelector('input[type=file][accept*="application/pdf"]'); fireEvent.change(input, { target: { files: [new File(['x'], 'bad.gif')] } }); expect(await screen.findByText('Receipts.FILE_PROBLEM')).toBeTruthy(); expect(onUploadOnly).not.toHaveBeenCalled(); expect(api.readReceipts).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File(['x'], 'okay.pdf', { type: 'application/pdf' })] } }); expect(onUploadOnly).toHaveBeenCalled(); expect(api.readReceipts).not.toHaveBeenCalled();
  });
  it('exposes the specified capture and file input attributes once consent is granted', async () => {
    const api = { getConsent: vi.fn().mockResolvedValue({ granted: true }), setConsent: vi.fn(), readReceipts: vi.fn() }; render(<ReceiptCaptureCard api={api} />); await screen.findByRole('button', { name: 'Receipts.CAMERA' });
    const inputs = document.querySelectorAll('input[type=file]'); expect(inputs[0].getAttribute('accept')).toBe('image/*'); expect(inputs[0].getAttribute('capture')).toBe('environment'); expect(inputs[1].getAttribute('accept')).toContain('image/heic');
  });
  it('writes consent before revealing capture actions', async () => {
    const api = { getConsent: vi.fn().mockResolvedValue({ granted: false }), setConsent: vi.fn().mockResolvedValue({ granted: true }), readReceipts: vi.fn() };
    render(<ReceiptCaptureCard api={api} />); const toggle = await screen.findByRole('switch'); expect(screen.queryByRole('button', { name: 'Receipts.CAMERA' })).toBeNull();
    fireEvent.click(toggle); await waitFor(() => expect(api.setConsent).toHaveBeenCalledWith(true)); await screen.findByRole('button', { name: 'Receipts.CAMERA' });
  });
  it('shows coded and unknown recognition errors and never requests a bad file', async () => {
    const api = { getConsent: vi.fn().mockResolvedValue({ granted: true }), setConsent: vi.fn(), readReceipts: vi.fn().mockRejectedValueOnce({ response: { data: { code: 'nothing_recognised' } } }).mockRejectedValueOnce(new Error('offline')) };
    render(<ReceiptCaptureCard api={api} />); await screen.findByRole('button', { name: 'Receipts.CAMERA' }); const fileInput = document.querySelector('input[type=file][accept*="application/pdf"]');
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'bad.gif')] } }); expect(await screen.findByText('Receipts.FILE_PROBLEM')).toBeTruthy(); expect(api.readReceipts).not.toHaveBeenCalled();
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'ok.pdf', { type: 'application/pdf' })] } }); expect(await screen.findByText('Receipts.NOTHING_RECOGNISED')).toBeTruthy();
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'ok2.pdf', { type: 'application/pdf' })] } }); expect(await screen.findByText('Receipts.UNAVAILABLE')).toBeTruthy();
  });
});
