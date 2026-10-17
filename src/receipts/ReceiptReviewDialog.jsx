import React from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { formatReceiptAmount, formatReceiptDate, isEmptyValue, normaliseItems, receiptValueEqual } from './format';

// The gap spaces the buttons; MUI's own left margin between DialogActions children would shift the stacked buttons.
export const RECEIPT_REVIEW_ACTIONS_SX = { gap: 1, flexWrap: { xs: 'nowrap', sm: 'wrap' }, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, '& > :not(style):not(:first-of-type)': { marginLeft: 0 } };
export const RECEIPT_REVIEW_ROW_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', sm: '120px minmax(0, 1fr) auto' },
  columnGap: 1.25,
  alignItems: 'center',
  py: 1.125,
  borderBottom: '1px solid',
  borderColor: 'divider',
  '&:last-of-type': { borderBottom: 0 },
  '& > :first-child': { gridColumn: { xs: '1 / -1', sm: 'auto' } },
};
// The prototype's dialog is 640 px wide; on narrower windows it keeps the usual margin.
export const RECEIPT_REVIEW_DIALOG_PAPER_SX = { width: 640, maxWidth: 'calc(100% - 64px)', maxHeight: 'min(640px, calc(100% - 64px))' };
export const RECEIPT_REVIEW_SHEET_PAPER_SX = (theme) => ({
  height: 'auto',
  maxHeight: 'calc(100% - 56px)',
  display: 'flex',
  flexDirection: 'column',
  borderTopLeftRadius: theme.shape.borderRadius * 2,
  borderTopRightRadius: theme.shape.borderRadius * 2,
});
export const RECEIPT_REVIEW_ACTION_BUTTON_SX = { flex: { xs: '1 1 100%', sm: '0 0 auto' }, width: { xs: '100%', sm: 'auto' } };
export const RECEIPT_REVIEW_CHIP_SX = {
  alignSelf: 'flex-start',
  fontWeight: 700,
  backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.12),
  color: 'warning.dark',
};
export const RECEIPT_REVIEW_ROW_ACTION_SX = { justifySelf: 'end', alignSelf: 'center' };

const normaliseScalar = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');
const isItemsEmpty = (value) => normaliseItems(value).length === 0;
const isRowEmpty = (row, values) => row.key === 'items'
  ? isItemsEmpty(values.items)
  : row.key === 'total'
    ? isEmptyValue(values.total)
    : isEmptyValue(values[row.key]);

function rowApplyValues(row, receipt, values) {
  if (row.key === 'total') {
    const result = { total: row.value };
    if (receipt?.currency) result.currency = receipt.currency;
    return result;
  }
  return { [row.key]: row.value };
}

function emptyApplyRows(rows, receipt, values) {
  const result = {};
  rows.forEach((row) => {
    if (!isRowEmpty(row, values)) return;
    const handed = rowApplyValues(row, receipt, values);
    // "Only empty fields" never overwrites a filled currency that sits next to an empty amount.
    if (row.key === 'total' && !isEmptyValue(values.currency)) delete handed.currency;
    Object.assign(result, handed);
  });
  const hasTotalRow = rows.some((row) => row.key === 'total');
  if (hasTotalRow && !isEmptyValue(values.total) && isEmptyValue(values.currency) && receipt?.currency) {
    result.currency = receipt.currency;
  }
  return result;
}

function rowEqual(row, receipt, values) {
  if (row.key === 'items') return !isItemsEmpty(values.items) && receiptValueEqual('items', values.items, row.value);
  if (row.key === 'total') {
    const amountMatches = !isEmptyValue(values.total) && receiptValueEqual('total', values.total, row.value);
    if (!amountMatches) return false;
    if (!receipt?.currency) return true;
    return typeof values.currency === 'string'
      && values.currency.trim().toLowerCase() === receipt.currency.trim().toLowerCase();
  }
  return !isEmptyValue(values[row.key]) && receiptValueEqual(row.key, values[row.key], row.value);
}

function ItemLines({ items, struckThrough = false }) {
  const rows = normaliseItems(items);
  if (!rows.length) return null;
  return (
    <Box component="ul" sx={{ display: 'grid', gap: 0.25, m: 0, p: 0, listStyle: 'none', textDecoration: struckThrough ? 'line-through' : 'none' }}>
      {rows.map((item, index) => (
        <Box component="li" key={`${item.description}-${item.amount}-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography component="span" variant="body2" sx={{ color: struckThrough ? 'text.disabled' : 'text.secondary' }}>{item.description}</Typography>
          {item.amount && <Typography component="span" variant="body2" sx={{ flexShrink: 0, color: struckThrough ? 'text.disabled' : 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{item.amount}</Typography>}
        </Box>
      ))}
    </Box>
  );
}

export function ReceiptReviewDialog({ open, receipt, values = {}, fieldLabels = {}, extraFields = [], accountLabel = (id) => id, onApply, onClose }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const rows = [];
  const add = (key, value, recognized = value !== '' && value != null, format = (v) => normaliseScalar(v)) => {
    if (recognized) {
      const formatted = format(value);
      rows.push({ key, value, text: formatted ?? '', confidence: receipt?.confidence });
    }
  };

  add('merchant', receipt?.merchant);
  add('date', receipt?.date, Boolean(receipt?.date), (value) => formatReceiptDate(value, i18n.language));
  add('total', receipt?.total, Boolean(receipt?.total), (value) => formatReceiptAmount(value, receipt?.currency, i18n.language));
  // A receipt with a currency but no amount keeps its own currency row, so the currency can still be shown and applied.
  if (receipt?.currency && !receipt?.total) add('currency', receipt.currency);
  if (receipt?.payment_method && receipt.payment_method !== 'unknown') {
    add('payment_method', receipt.payment_method, true, (value) => t(`Receipts.PAYMENT_${value}`));
  }
  const account = receipt?.account_suggestions?.find((suggestion) => suggestion?.account_id);
  if (account) rows.push({ key: 'account', value: account.account_id, text: accountLabel(account.account_id), confidence: account.confidence === 'low' ? 'low' : receipt?.confidence });
  if (normaliseItems(receipt?.items).length) {
    rows.push({ key: 'items', value: receipt.items, text: '', confidence: receipt?.confidence });
  }
  (extraFields || []).forEach(({ key, format }) => {
    if (['merchant', 'date', 'total', 'currency', 'payment_method', 'account', 'items'].includes(key)) return;
    const value = receipt?.[key];
    if (value == null || value === '') return;
    add(key, value, true, format || ((item) => (typeof item === 'string' || typeof item === 'number' ? String(item).trim() : JSON.stringify(item))));
  });

  const label = (key) => fieldLabels[key] || extraFields.find((field) => field.key === key)?.label || t(`Receipts.FIELD_${key}`);
  const apply = (list, mode, close) => {
    if (!list.length) return;
    const payload = mode === 'empty'
      ? emptyApplyRows(list, receipt, values)
      : Object.assign({}, ...list.map((row) => rowApplyValues(row, receipt, values)));
    if (Object.keys(payload).length) onApply?.(payload, { mode });
    if (close) onClose?.();
  };

  const rowElements = rows.map((row, index) => {
    const equal = rowEqual(row, receipt, values);
    const currentItems = row.key === 'items' ? normaliseItems(values.items) : [];
    const displayCurrent = row.key === 'items'
      ? currentItems.length > 0
      : typeof values[row.key] === 'string' || typeof values[row.key] === 'number';
    const uncertain = row.confidence === 'low';
    const showCurrent = !equal && !isRowEmpty(row, values) && displayCurrent;
    return (
      <Box key={row.key} data-receipt-review-row={row.key} sx={RECEIPT_REVIEW_ROW_SX}>
        <Typography variant="caption" color="text.secondary">{label(row.key)}</Typography>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          {row.key === 'items'
            ? <ItemLines items={row.value} />
            : <Typography sx={{ fontWeight: 600, fontVariantNumeric: row.key === 'total' ? 'tabular-nums' : undefined }}>{row.text}</Typography>}
          {equal && <Typography variant="caption" color="text.disabled">{t('Receipts.SAME_AS_FORM')}</Typography>}
          {showCurrent && (row.key === 'items'
            ? <ItemLines items={values.items} struckThrough />
            : <Typography variant="body2" color="text.disabled" sx={{ textDecoration: 'line-through' }}>{row.key === 'total' && values.currency ? formatReceiptAmount(normaliseScalar(values.total), values.currency, i18n.language) : normaliseScalar(values[row.key])}</Typography>)}
          {mobile && uncertain && <Chip size="small" sx={RECEIPT_REVIEW_CHIP_SX} label={t('Receipts.UNCERTAIN')} />}
        </Stack>
        {(!equal || (!mobile && uncertain)) && (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={RECEIPT_REVIEW_ROW_ACTION_SX}>
            {!mobile && uncertain && <Chip size="small" sx={RECEIPT_REVIEW_CHIP_SX} label={t('Receipts.UNCERTAIN')} />}
            {!equal && (
              <Button
                size="small"
                onClick={() => onApply?.(rowApplyValues(row, receipt, values), { mode: 'field' })}
              >
                {t('Receipts.APPLY')}
              </Button>
            )}
          </Stack>
        )}
      </Box>
    );
  });

  const closeButton = <Button key="close" fullWidth={mobile} sx={RECEIPT_REVIEW_ACTION_BUTTON_SX} onClick={onClose}>{t('Receipts.CLOSE')}</Button>;
  const hasEmptyValue = rows.some((row) => isRowEmpty(row, values));
  const hasEmptyCurrency = rows.some((row) => row.key === 'total') && !isEmptyValue(values.total) && isEmptyValue(values.currency) && receipt?.currency;
  const emptyButton = <Button key="empty" fullWidth={mobile} variant="outlined" sx={RECEIPT_REVIEW_ACTION_BUTTON_SX} disabled={!hasEmptyValue && !hasEmptyCurrency} onClick={() => apply(rows, 'empty', true)}>{t('Receipts.ONLY_EMPTY')}</Button>;
  const allButton = <Button key="all" fullWidth={mobile} variant="contained" sx={RECEIPT_REVIEW_ACTION_BUTTON_SX} disabled={!rows.length} onClick={() => apply(rows, 'all', true)}>{t('Receipts.APPLY_ALL')}</Button>;
  const actions = mobile ? [allButton, emptyButton, closeButton] : [closeButton, emptyButton, allButton];
  const content = <>
    <DialogTitle id="receipt-review-title">{t('Receipts.REVIEW_TITLE')}</DialogTitle>
    <DialogContent sx={{ overflowY: mobile ? 'auto' : undefined, flex: mobile ? '1 1 auto' : undefined }}>
      <Box>{rowElements}</Box>
    </DialogContent>
    <DialogActions sx={RECEIPT_REVIEW_ACTIONS_SX}>{actions}</DialogActions>
  </>;

  return mobile
    ? <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: RECEIPT_REVIEW_SHEET_PAPER_SX, role: 'dialog', 'aria-labelledby': 'receipt-review-title' }}>{content}</Drawer>
    : <Dialog open={open} onClose={onClose} maxWidth={false} PaperProps={{ sx: RECEIPT_REVIEW_DIALOG_PAPER_SX }} aria-labelledby="receipt-review-title">{content}</Dialog>;
}

export default ReceiptReviewDialog;
