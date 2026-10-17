// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createTheme } from '@mui/material/styles';

const { translationState } = vi.hoisted(() => ({ translationState: { language: 'en' } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
    i18n: translationState,
  }),
}));
vi.mock('../src/auth/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import { ReceiptReviewDialog, RECEIPT_REVIEW_CHIP_SX, RECEIPT_REVIEW_ROW_SX, RECEIPT_REVIEW_SHEET_PAPER_SX } from '../src/receipts/ReceiptReviewDialog';
import { formatReceiptDate, normaliseItems } from '../src/receipts/format';

let narrowViewport = false;
const originalMatchMedia = window.matchMedia;
function setViewport(narrow) {
  narrowViewport = narrow;
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: narrowViewport && query.includes('max-width'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
function renderReview(receipt, values = {}, onApply = vi.fn(), narrow = false) {
  setViewport(narrow);
  render(<ReceiptReviewDialog open receipt={receipt} values={values} extraFields={[{ key: 'project', label: 'Project' }]} onApply={onApply} onClose={vi.fn()} />);
  return onApply;
}

beforeEach(() => { translationState.language = 'en'; setViewport(false); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.matchMedia = originalMatchMedia; });

describe('receipt review parity', () => {
  it('normalises recognised and current item lists safely, including blank and unknown shapes', () => {
    expect(normaliseItems([{ description: ' Tea ', amount: 2 }, ' Cake ', { description: { nested: true }, amount: { cents: 4 } }]))
      .toEqual([{ description: 'Tea', amount: '2' }, { description: 'Cake', amount: '' }]);
    const onApply = renderReview(
      { merchant: 'Shop', items: [{ description: 'Sandwich', amount: 7.9 }, 'Coffee', { mystery: { deep: true } }], confidence: 'high' },
      { merchant: { current: { nested: true } }, items: [{ description: 'Tea', amount: '2.00' }, 'Cake', { mystery: { deep: true } }] },
      vi.fn(),
    );
    const lines = screen.getAllByRole('listitem').map((item) => [...item.children].map((part) => part.textContent).join(' | '));
    expect(lines).toEqual(['Sandwich | 7.9', 'Coffee', 'Tea | 2.00', 'Cake']);
    expect(document.body.textContent).not.toContain('[object Object]');
    expect(onApply).toHaveBeenCalledTimes(0);
  });

  it('treats blank item rows as empty and compares normalized lists', () => {
    const onApply = renderReview(
      { items: [{ description: 'Sandwich', amount: '7.90' }], confidence: 'high' },
      { items: [{}, { description: '', amount: '' }, ' '] },
      vi.fn(),
    );
    const itemsRow = document.querySelector('[data-receipt-review-row="items"]');
    expect(within(itemsRow).queryByText('Receipts.SAME_AS_FORM')).toBeNull();
    expect(within(itemsRow).queryAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.ONLY_EMPTY' }));
    expect(onApply).toHaveBeenCalledWith({ items: [{ description: 'Sandwich', amount: '7.90' }] }, { mode: 'empty' });

    cleanup();
    renderReview(
      { items: [{ description: ' Tea ', amount: '2.00' }], confidence: 'high' },
      { items: [{ description: 'tea', amount: '2.00' }] },
      vi.fn(),
    );
    const equalRow = document.querySelector('[data-receipt-review-row="items"]');
    expect(within(equalRow).getByText('Receipts.SAME_AS_FORM')).toBeTruthy();
    expect(within(equalRow).queryByRole('button', { name: 'Receipts.APPLY' })).toBeNull();
  });

  it('combines amount and currency for display and every apply mode', () => {
    const receipt = { total: '14.60', currency: 'CHF', confidence: 'high' };
    const onApply = renderReview(receipt);
    const totalRow = document.querySelector('[data-receipt-review-row="total"]');
    expect(totalRow.textContent).toContain('CHF');
    expect(screen.queryByText('Receipts.FIELD_currency')).toBeNull();
    fireEvent.click(within(totalRow).getByRole('button', { name: 'Receipts.APPLY' }));
    expect(onApply).toHaveBeenLastCalledWith({ total: '14.60', currency: 'CHF' }, { mode: 'field' });
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.APPLY_ALL' }));
    expect(onApply).toHaveBeenLastCalledWith({ total: '14.60', currency: 'CHF' }, { mode: 'all' });

    cleanup();
    const emptyTotalApply = renderReview(receipt, { total: '', currency: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.ONLY_EMPTY' }));
    expect(emptyTotalApply).toHaveBeenCalledWith({ total: '14.60', currency: 'CHF' }, { mode: 'empty' });

    cleanup();
    const emptyCurrencyApply = renderReview(receipt, { total: '3.00', currency: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.ONLY_EMPTY' }));
    expect(emptyCurrencyApply).toHaveBeenCalledWith({ currency: 'CHF' }, { mode: 'empty' });

    cleanup();
    const filledApply = renderReview(receipt, { total: '14.60', currency: 'CHF' });
    expect(screen.getByText('Receipts.SAME_AS_FORM')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Receipts.ONLY_EMPTY' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.ONLY_EMPTY' }));
    expect(filledApply).not.toHaveBeenCalled();
    cleanup();
    renderReview(receipt, { total: '14.60', currency: '' });
    expect(screen.queryByText('Receipts.SAME_AS_FORM')).toBeNull();
  });

  it('formats dates with a long year in the active language and displays the active form', () => {
    expect(formatReceiptDate('2026-10-14', 'de')).toBe('14.10.2026');
    expect(formatReceiptDate('2026-10-14', 'de_informal')).toBe('14.10.2026');
    expect(formatReceiptDate('2026-10-14', 'en')).toBe('10/14/2026');
    expect(formatReceiptDate('not-a-date', 'de')).toBe('not-a-date');
    translationState.language = 'de';
    renderReview({ date: '2026-10-14', confidence: 'high' });
    expect(screen.getByText('14.10.2026')).toBeTruthy();
  });

  it('renders actions in keyboard order at each width and fills the sheet width', () => {
    renderReview({ merchant: 'Shop', confidence: 'high' }, {}, vi.fn(), true);
    const mobileActions = [...document.querySelectorAll('[role="dialog"] .MuiDialogActions-root button')];
    expect(mobileActions.map((button) => button.textContent)).toEqual(['Receipts.APPLY_ALL', 'Receipts.ONLY_EMPTY', 'Receipts.CLOSE']);
    expect(mobileActions.every((button) => button.classList.contains('MuiButton-fullWidth'))).toBe(true);
    const theme = createTheme();
    const paperSx = RECEIPT_REVIEW_SHEET_PAPER_SX(theme);
    expect(paperSx.height).toBeUndefined();
    expect(paperSx.maxHeight).toBe('calc(100% - 56px)');

    cleanup();
    renderReview({ merchant: 'Shop', confidence: 'high' });
    const desktopActions = [...document.querySelectorAll('[role="dialog"] .MuiDialogActions-root button')];
    expect(desktopActions.map((button) => button.textContent)).toEqual(['Receipts.CLOSE', 'Receipts.ONLY_EMPTY', 'Receipts.APPLY_ALL']);
  });

  it('uses a soft warning chip and one three-column row per recognised field', () => {
    renderReview({ merchant: 'Shop', total: '14.60', currency: 'CHF', confidence: 'low' });
    const chip = screen.getAllByText('Receipts.UNCERTAIN')[0].closest('.MuiChip-root');
    expect(chip.className).not.toContain('MuiChip-colorWarning');
    const theme = createTheme();
    expect(RECEIPT_REVIEW_CHIP_SX.backgroundColor(theme)).toBe('rgba(237, 108, 2, 0.12)');

    const rows = [...document.querySelectorAll('[data-receipt-review-row]')];
    expect(rows.map((row) => row.getAttribute('data-receipt-review-row'))).toEqual(['merchant', 'total']);
    rows.forEach((row) => {
      expect(row.children.length).toBe(3);
      expect(row.children[0].textContent).toMatch(/^Receipts\.FIELD_/);
      expect(row.children[1].textContent.length).toBeGreaterThan(0);
      expect(row.children[2].textContent).toContain('Receipts.APPLY');
    });
    expect(RECEIPT_REVIEW_ROW_SX['&:last-of-type'].borderBottom).toBe(0);
    expect(RECEIPT_REVIEW_ROW_SX.gridTemplateColumns.sm).toBe('120px minmax(0, 1fr) auto');
  });
});

describe('review fixes of round one', () => {
  const base = { merchant: 'Shop', total: '14.60', currency: 'CHF', confidence: 'high' };

  it('shows the amount and the currency together in the total row', () => {
    renderReview(base);
    const totalRow = document.querySelector('[data-receipt-review-row="total"]');
    expect(totalRow.children[1].textContent).toMatch(/CHF\s?14\.60/);
  });

  it('never hands over the currency with an empty amount when the form already has a currency', () => {
    const onApply = renderReview(base, { total: '', currency: 'EUR' });
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.ONLY_EMPTY' }));
    expect(onApply).toHaveBeenCalledWith({ merchant: 'Shop', total: '14.60' }, { mode: 'empty' });
  });

  it('still shows an object-valued extra field without a formatter, as JSON text, and lets the host apply it', () => {
    const onApply = renderReview({ ...base, project: { code: 'P1' } }, {});
    const row = document.querySelector('[data-receipt-review-row="project"]');
    expect(row.textContent).toContain('{"code":"P1"}');
    fireEvent.click(within(row).getByRole('button', { name: 'Receipts.APPLY' }));
    expect(onApply).toHaveBeenCalledWith({ project: { code: 'P1' } }, { mode: 'field' });
  });
});

describe('review fixes of round two', () => {
  it('keeps a currency row for a receipt with a currency and no amount, and applies it', () => {
    const onApply = renderReview({ merchant: 'Shop', currency: 'CHF', confidence: 'high' });
    const row = document.querySelector('[data-receipt-review-row="currency"]');
    expect(row).toBeTruthy();
    expect(row.children[0].textContent).toBe('Receipts.FIELD_currency');
    expect(row.children[1].textContent).toBe('CHF');
    expect(document.querySelector('[data-receipt-review-row="total"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Receipts.APPLY_ALL' }));
    expect(onApply).toHaveBeenCalledWith({ merchant: 'Shop', currency: 'CHF' }, { mode: 'all' });
  });

  it('renders rows as grids and the sheet paper with a max height and no fixed height', () => {
    renderReview({ merchant: 'Shop', total: '1.00', currency: 'CHF', confidence: 'high' }, {}, vi.fn(), true);
    const row = document.querySelector('[data-receipt-review-row="merchant"]');
    expect(window.getComputedStyle(row).display).toBe('grid');
    const paper = document.querySelector('.MuiDrawer-paper');
    const style = window.getComputedStyle(paper);
    expect(style.maxHeight).toContain('calc(100% - 56px)');
    expect(style.height).not.toBe('92%');
    expect(paper.getAttribute('role')).toBe('dialog');
  });
});
