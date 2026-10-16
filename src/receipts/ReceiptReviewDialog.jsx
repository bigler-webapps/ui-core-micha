import React from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { formatReceiptAmount, formatReceiptDate, isEmptyValue, receiptValueEqual } from './format';

export const RECEIPT_REVIEW_ACTIONS_SX = { gap: 1, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' }, '& > :nth-of-type(1)': { order: { xs: 3, sm: 0 } }, '& > :nth-of-type(2)': { order: { xs: 2, sm: 0 } }, '& > :nth-of-type(3)': { order: { xs: 1, sm: 0 } } };
export const RECEIPT_REVIEW_ROW_SX = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: 1, alignItems: 'start' };
export const RECEIPT_REVIEW_SHEET_PAPER_SX = { height: '92%' };
export const RECEIPT_REVIEW_ACTION_BUTTON_SX = { flex: '1 1 auto' };
export function ReceiptReviewDialog({ open, receipt, values = {}, fieldLabels = {}, extraFields = [], accountLabel = (id) => id, onApply, onClose }) {
  const { t, i18n } = useTranslation(); const theme = useTheme(); const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const rows = [];
  const add = (key, value, recognized = value !== '' && value != null, format = (v) => String(v)) => { if (recognized) rows.push({ key, value, text: format(value), confidence: receipt?.confidence }); };
  add('merchant', receipt?.merchant); add('date', receipt?.date, Boolean(receipt?.date), (v) => formatReceiptDate(v, i18n.language));
  add('total', receipt?.total, Boolean(receipt?.total), (v) => formatReceiptAmount(v, receipt?.currency, i18n.language));
  add('currency', receipt?.currency); if (receipt?.payment_method && receipt.payment_method !== 'unknown') add('payment_method', receipt.payment_method, true, (v) => t(`Receipts.PAYMENT_${v}`));
  const account = receipt?.account_suggestions?.find((s) => s?.account_id);
  if (account) rows.push({ key: 'account', value: account.account_id, text: accountLabel(account.account_id), confidence: account.confidence === 'low' ? 'low' : receipt?.confidence });
  if (Array.isArray(receipt?.items) && receipt.items.length) rows.push({ key: 'items', value: receipt.items, text: receipt.items.map((item) => `${item.description || ''}${item.amount ? ` · ${item.amount}` : ''}`).join('\n'), confidence: receipt?.confidence });
  (extraFields || []).forEach(({ key, format }) => { if (!['merchant','date','total','currency','payment_method','account','items'].includes(key) && receipt?.[key] != null && receipt[key] !== '') add(key, receipt[key], true, format || ((v) => typeof v === 'string' ? v : JSON.stringify(v))); });
  const label = (key) => fieldLabels[key] || extraFields.find((field) => field.key === key)?.label || t(`Receipts.FIELD_${key}`);
  const apply = (list, mode, close) => { if (!list.length) return; onApply?.(Object.fromEntries(list.map((r) => [r.key, r.value])), { mode }); if (close) onClose?.(); };
  const content = <><DialogTitle id="receipt-review-title">{t('Receipts.REVIEW_TITLE')}</DialogTitle><DialogContent><Stack spacing={2}>{rows.map((row) => { const current = values[row.key]; const equal = !isEmptyValue(current) && receiptValueEqual(row.key, current, row.value); return <Box key={row.key} sx={RECEIPT_REVIEW_ROW_SX}><Box sx={{ minWidth: 0 }}><Typography variant="subtitle2">{label(row.key)}</Typography><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">{row.key === 'items' ? <Box component="ul" sx={{ m: 0, pl: 2 }}>{row.value.map((item, index) => <li key={index}><Typography component="span">{`${item.description || ''}${item.amount ? ` · ${item.amount}` : ''}`}</Typography></li>)}</Box> : <Typography>{row.text}</Typography>}{row.confidence === 'low' && <Chip size="small" color="warning" label={t('Receipts.UNCERTAIN')} />}{equal ? <Typography variant="caption">{t('Receipts.SAME_AS_FORM')}</Typography> : !isEmptyValue(current) && <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>{String(current)}</Typography>}</Stack></Box>{!equal && <Button size="small" onClick={() => apply([row], 'field', false)}>{t('Receipts.APPLY')}</Button>}</Box>; })}</Stack></DialogContent><DialogActions sx={RECEIPT_REVIEW_ACTIONS_SX}><Button sx={RECEIPT_REVIEW_ACTION_BUTTON_SX} onClick={onClose}>{t('Receipts.CLOSE')}</Button><Button variant="outlined" sx={RECEIPT_REVIEW_ACTION_BUTTON_SX} disabled={!rows.some((r) => isEmptyValue(values[r.key]))} onClick={() => apply(rows.filter((r) => isEmptyValue(values[r.key])), 'empty', true)}>{t('Receipts.ONLY_EMPTY')}</Button><Button variant="contained" sx={RECEIPT_REVIEW_ACTION_BUTTON_SX} disabled={!rows.length} onClick={() => apply(rows, 'all', true)}>{t('Receipts.APPLY_ALL')}</Button></DialogActions></>;
  return mobile ? <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: RECEIPT_REVIEW_SHEET_PAPER_SX, role: 'dialog', 'aria-labelledby': 'receipt-review-title' }}>{content}</Drawer> : <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="receipt-review-title">{content}</Dialog>;
}
export default ReceiptReviewDialog;
