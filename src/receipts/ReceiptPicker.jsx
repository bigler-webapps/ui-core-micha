import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Checkbox, Chip, DialogActions, DialogContent, DialogTitle, Grid, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatReceiptAmount, formatReceiptDate } from './format';

export const RECEIPT_PICKER_CARD_SX = { height: '100%' };
export const RECEIPT_PICKER_CLICK_SX = { cursor: 'pointer', height: '100%' };
export const RECEIPT_PICKER_ACTION_SX = { justifyContent: 'space-between' };
function cropStyle(box) { if (!box || !box.w || !box.h) return null; return { backgroundSize: `${100 / box.w}% ${100 / box.h}%`, backgroundPosition: `${(box.x / (1 - box.w)) * 100 || 0}% ${(box.y / (1 - box.h)) * 100 || 0}%` }; }
export function ReceiptPicker({ receipts = [], imageUrl, onConfirm, onCancel, confirmLabel, fieldLabels, sx }) {
  const { t, i18n } = useTranslation(); const [selected, setSelected] = useState([]);
  useEffect(() => setSelected(receipts.map((r, i) => r.confidence === 'low' ? -1 : i).filter((i) => i >= 0)), [receipts]);
  const toggle = (i) => setSelected((old) => old.includes(i) ? old.filter((n) => n !== i) : [...old, i]);
  const count = selected.length;
  return <Box sx={sx}><DialogTitle>{t('Receipts.RECOGNISED_COUNT', { n: receipts.length })}</DialogTitle><DialogContent><Grid container spacing={2}>{receipts.map((r, i) => { const crop = cropStyle(r.box); return <Grid size={{ xs: 12, md: 4 }} key={i}><Card sx={RECEIPT_PICKER_CARD_SX} variant="outlined"><Box onClick={() => toggle(i)} sx={RECEIPT_PICKER_CLICK_SX}><CardContent><Stack spacing={1}><Box role="img" aria-label={r.merchant || t('Receipts.UNREADABLE')} sx={{ height: 100, bgcolor: 'action.hover', backgroundImage: imageUrl && crop ? `url(${imageUrl})` : 'none', backgroundRepeat: 'no-repeat', ...(imageUrl && crop ? crop : {}) }} /><Stack direction="row" alignItems="center"><Checkbox checked={selected.includes(i)} inputProps={{ 'aria-label': r.merchant || t('Receipts.UNREADABLE') }} onChange={() => toggle(i)} onClick={(e) => e.stopPropagation()} /><Typography>{r.merchant || t('Receipts.UNREADABLE')}</Typography></Stack><Typography variant="body2">{r.date ? formatReceiptDate(r.date, i18n.language) : ''}{r.total ? ` · ${formatReceiptAmount(r.total, r.currency, i18n.language)}` : t('Receipts.AMOUNT_UNKNOWN')}</Typography><Chip size="small" color={r.confidence === 'low' ? 'warning' : 'success'} label={t(r.confidence === 'low' ? 'Receipts.UNCERTAIN' : 'Receipts.CERTAIN')} /></Stack></CardContent></Box></Card></Grid>; })}</Grid></DialogContent><DialogActions sx={RECEIPT_PICKER_ACTION_SX}><Button onClick={onCancel}>{t('Receipts.CANCEL')}</Button><Button disabled={!count} variant="contained" onClick={() => onConfirm?.(receipts.filter((_r, i) => selected.includes(i)))}>{confirmLabel ? confirmLabel(count) : t('Receipts.APPLY_COUNT', { n: count })}</Button></DialogActions></Box>;
}
export default ReceiptPicker;
