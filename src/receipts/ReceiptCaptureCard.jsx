import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { defaultReceiptsApi } from './api';
import { RECEIPT_ACCEPT } from './wire';
import { prepareReceiptFile, receiptFileProblem } from './files';
import { useReceiptConsent } from './useReceiptConsent';
import ReceiptConsentSwitch from './ReceiptConsentSwitch';
import ReceiptPicker from './ReceiptPicker';
import ReceiptReviewDialog from './ReceiptReviewDialog';

export const RECEIPT_CAPTURE_CARD_SX = { width: '100%' };
export const RECEIPT_CAPTURE_ALERT_SX = { width: '100%' };
export const RECEIPT_CAPTURE_ACTION_SX = { flex: '1 1 auto' };
export const RECEIPT_CAPTURE_PROGRESS_SX = { width: '100%' };
const ERROR_TEXT = { unsupported_file_type: 'file', file_too_large: 'file', invalid_request: 'file', nothing_recognised: 'nothing', provider_unavailable: 'unavailable', spend_cap_reached: 'unavailable', count_limit_reached: 'unavailable', authentication_required: 'unavailable' };
const problemCode = (error) => error?.response?.data?.code || 'provider_unavailable';

export function ReceiptCaptureCard({ api = defaultReceiptsApi, provider = 'OpenAI', context, values, fieldLabels, extraFields, accountLabel, onApply, onSelectReceipts, confirmLabel, onUploadOnly, onFile, onReset, disabled, sx }) {
  const { t } = useTranslation(); const consent = useReceiptConsent(api);
  const [phase, setPhase] = useState('idle'), [error, setError] = useState(null), [receipt, setReceipt] = useState(null), [receipts, setReceipts] = useState([]), [progress, setProgress] = useState(null), [reviewOpen, setReviewOpen] = useState(false);
  const [file, setFile] = useState(null), [preview, setPreview] = useState(null); const cameraRef = useRef(null), fileRef = useRef(null), uploadRef = useRef(null), abortRef = useRef(null), urlRef = useRef(null);
  const clearUrl = () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = null; setPreview(null); };
  const reset = () => { abortRef.current?.abort(); abortRef.current = null; clearUrl(); setFile(null); setReceipt(null); setReceipts([]); setProgress(null); setError(null); setPhase('idle'); setReviewOpen(false); onReset?.(); };
  useEffect(() => () => { abortRef.current?.abort(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  useEffect(() => { if (consent.status === 'ready' && !consent.granted && phase === 'reading') { abortRef.current?.abort(); setPhase('idle'); } }, [consent.status, consent.granted, phase]);
  const choose = async (raw, uploadOnly = false) => {
    const incoming = raw?.target?.files?.[0] || raw; if (raw?.target) raw.target.value = ''; if (!incoming) return;
    abortRef.current?.abort(); clearUrl(); setError(null); setReceipt(null); setReceipts([]); setReviewOpen(false);
    let issue = receiptFileProblem(incoming, { checkSize: uploadOnly }); if (issue) { setError(issue); setPhase('error'); return; }
    if (uploadOnly) { onUploadOnly?.(incoming); return; }
    const controller = new AbortController(); abortRef.current = controller; setPhase('reading'); setProgress(null);
    try {
      const prepared = await prepareReceiptFile(incoming); issue = receiptFileProblem(prepared);
      if (controller.signal.aborted) return;
      if (issue) { setError(issue); setPhase('error'); return; }
      setFile(prepared); onFile?.(prepared);
      if (['image/jpeg', 'image/png'].includes(prepared.type.toLowerCase()) && !/\.(heic|heif)$/i.test(prepared.name)) { try { urlRef.current = URL.createObjectURL(prepared); setPreview(urlRef.current); } catch { /* preview is optional */ } }
      const result = await api.readReceipts(prepared, { context, signal: controller.signal, onUploadProgress: (e) => setProgress(e?.total ? Math.round((e.loaded / e.total) * 100) : null) });
      if (controller.signal.aborted) return;
      const list = Array.isArray(result) ? result : [];
      if (!list.length) { setError('nothing_recognised'); setPhase('error'); return; }
      setReceipts(list);
      if (list.length === 1) { setReceipt(list[0]); setPhase('review'); setReviewOpen(true); }
      else setPhase('picker');
    } catch (e) { if (!controller.signal.aborted) { const code = problemCode(e); if (code === 'consent_required') { consent.reload(); setPhase('idle'); } else { setError(code); setPhase('error'); } } }
  };
  const errKey = error && ERROR_TEXT[error];
  const overlayBoxes = receipt ? [receipt.box, ...(receipt.items || []).map((i) => i.box)].filter((b) => b && b.w > 0 && b.h > 0) : [];
  const camera = <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={choose} />;
  const chooser = <input ref={fileRef} hidden type="file" accept={RECEIPT_ACCEPT} onChange={choose} />;
  return <Paper component="section" aria-label={t('Receipts.CARD_LABEL')} sx={[RECEIPT_CAPTURE_CARD_SX, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
    <Card variant="outlined"><CardContent><Stack spacing={2}>
      <ReceiptConsentSwitch api={api} provider={provider} consent={consent} />
      {!consent.granted && <>{onUploadOnly && <><Button disabled={disabled} onClick={() => uploadRef.current?.click()}>{t('Receipts.UPLOAD_ONLY')}</Button><input ref={uploadRef} hidden type="file" accept={RECEIPT_ACCEPT} onChange={(e) => choose(e, true)} /></>}</>}
      {consent.status === 'loading' && <LinearProgress sx={RECEIPT_CAPTURE_PROGRESS_SX} />}
      {consent.granted && <><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>{camera}{chooser}<Button sx={RECEIPT_CAPTURE_ACTION_SX} variant="contained" disabled={disabled || phase === 'reading'} onClick={() => cameraRef.current?.click()}>{t('Receipts.CAMERA')}</Button><Button sx={RECEIPT_CAPTURE_ACTION_SX} disabled={disabled || phase === 'reading'} onClick={() => fileRef.current?.click()}>{t('Receipts.PICK_FILE')}</Button></Stack><Typography variant="body2" color="text.secondary">{t('Receipts.ACCEPTED_TYPES')}</Typography></>}
      {phase === 'reading' && <><Box sx={{ position: 'relative' }}>{preview ? <><img src={preview} alt={file?.name || ''} style={{ display: 'block', maxWidth: '100%', maxHeight: 360 }} />{overlayBoxes.map((b, i) => <Box key={i} sx={{ position: 'absolute', left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, border: 2, borderColor: 'primary.main', pointerEvents: 'none' }} />)}</> : <Typography>{file?.name || ' '}</Typography>}</Box><LinearProgress variant={progress == null ? 'indeterminate' : 'determinate'} value={progress || 0} sx={RECEIPT_CAPTURE_PROGRESS_SX} /><Typography role="status">{t('Receipts.READING')}</Typography></>}
      {phase === 'review' && <><Box sx={{ position: 'relative' }}>{preview && <><img src={preview} alt={file?.name || ''} style={{ display: 'block', maxWidth: '100%', maxHeight: 360 }} />{overlayBoxes.map((b, i) => <Box key={i} sx={{ position: 'absolute', left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, border: 2, borderColor: 'primary.main', pointerEvents: 'none' }} />)}</>}</Box><Button onClick={() => setReviewOpen(true)}>{t('Receipts.REVIEW_TITLE')}</Button><ReceiptReviewDialog open={reviewOpen} receipt={receipt} values={values} fieldLabels={fieldLabels} extraFields={extraFields} accountLabel={accountLabel} onApply={onApply} onClose={() => setReviewOpen(false)} /></>}
      {phase === 'picker' && <ReceiptPicker receipts={receipts} imageUrl={preview} fieldLabels={fieldLabels} confirmLabel={confirmLabel} onCancel={reset} onConfirm={(chosen) => { onSelectReceipts?.(chosen); clearUrl(); setReceipts([]); setPhase('idle'); }} />}
      {errKey && <Alert severity={errKey === 'file' ? 'error' : errKey === 'nothing' ? 'info' : 'warning'} sx={RECEIPT_CAPTURE_ALERT_SX}>{t(errKey === 'file' ? 'Receipts.FILE_PROBLEM' : errKey === 'nothing' ? 'Receipts.NOTHING_RECOGNISED' : 'Receipts.UNAVAILABLE')}</Alert>}
      {phase !== 'idle' && <Button onClick={reset}>{t('Receipts.ANOTHER')}</Button>}
    </Stack></CardContent></Card>
  </Paper>;
}
export default ReceiptCaptureCard;
