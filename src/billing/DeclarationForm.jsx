import React, { useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from './format';

const LIMITS = { name: 200, email: 254, contract_hint: 200, reason: 2000, message: 2000 };
const INITIAL_VALUES = { name: '', email: '', contract_hint: '', cancellation_type: 'ordinary', requested_end_date: '', reason: '', message: '' };
const FIELD_ORDER = ['name', 'email', 'contract_hint', 'reason', 'message'];

function acknowledgementText(ack, t, language) {
  const { submitted } = ack;
  const lines = [
    t('Billing.DECLARATION_RECEIVED'),
    t('Billing.DECLARATION_REFERENCE', { reference: ack.reference || '' }),
    t('Billing.DECLARATION_RECEIVED_AT', { date: formatDateTime(ack.received_at, language) || ack.received_at || '' }),
    `(${ack.received_at || ''})`,
    t(`Billing.DECLARATION_${submitted.kind.toUpperCase()}`),
    `${t('Billing.DECLARATION_NAME')}: ${submitted.name}`,
    `${t('Billing.DECLARATION_EMAIL')}: ${submitted.email}`,
  ];
  if (submitted.contract_hint) lines.push(`${t('Billing.DECLARATION_CONTRACT_HINT')}: ${submitted.contract_hint}`);
  if (submitted.cancellation_type) lines.push(t(submitted.cancellation_type === 'ordinary' ? 'Billing.CANCEL_ORDINARY' : 'Billing.CANCEL_EXTRAORDINARY'));
  if (submitted.requested_end_date) lines.push(`${t('Billing.DECLARATION_REQUESTED_END_DATE')}: ${submitted.requested_end_date}`);
  if (submitted.reason) lines.push(`${t('Billing.DECLARATION_REASON')}: ${submitted.reason}`);
  if (submitted.message) lines.push(`${t('Billing.DECLARATION_MESSAGE')}: ${submitted.message}`);
  return lines.join('\n');
}

export function DeclarationForm({ api, kind, defaultKind, onSubmitted, legalNotice }) {
  const { t, i18n } = useTranslation();
  const [selectedKind, setSelectedKind] = useState(kind || defaultKind || 'cancellation');
  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState({});
  const [state, setState] = useState('editing');
  const [ack, setAck] = useState(null);
  const csrfPrimed = useRef(false);
  const csrfRequest = useRef(null);
  const submitGuard = useRef(false);
  const currentKind = kind || selectedKind;
  const fixedKind = kind === 'cancellation' || kind === 'withdrawal';
  const kindLabelId = useId();
  const typeLabelId = useId();
  const formRef = useRef(null);
  const ackHeading = useRef(null);
  useEffect(() => { if (state === 'acknowledged') ackHeading.current?.focus(); }, [state]);

  const setField = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  const ensureCsrf = async () => {
    if (csrfPrimed.current) return;
    if (!csrfRequest.current) {
      csrfRequest.current = Promise.resolve().then(() => {
        if (typeof api?.primeDeclarationCsrf !== 'function') throw new Error('csrf_unavailable');
        return api.primeDeclarationCsrf();
      }).then(() => { csrfPrimed.current = true; csrfRequest.current = null; }).catch((error) => { csrfRequest.current = null; throw error; });
    }
    await csrfRequest.current;
  };

  const validate = () => {
    const errors = {};
    if (!values.name.trim()) errors.name = 'Billing.DECLARATION_REQUIRED';
    if (!values.email.trim()) errors.email = 'Billing.DECLARATION_REQUIRED';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Billing.DECLARATION_INVALID_EMAIL';
    if (currentKind === 'cancellation' && values.cancellation_type === 'extraordinary' && !values.reason.trim()) errors.reason = 'Billing.DECLARATION_REASON_REQUIRED';
    for (const [name, limit] of Object.entries(LIMITS)) if (values[name].length > limit) errors[name] = 'Billing.DECLARATION_TOO_LONG';
    setFieldErrors(errors);
    const first = FIELD_ORDER.find((name) => errors[name]);
    if (first) formRef.current?.querySelector(`[name="${first}"]`)?.focus();
    return Object.keys(errors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitGuard.current || state === 'submitting' || state === 'acknowledged' || !validate()) return;
    const submitted = { kind: currentKind, name: values.name.trim(), email: values.email.trim(), contract_hint: values.contract_hint.trim() };
    if (currentKind === 'cancellation') {
      submitted.cancellation_type = values.cancellation_type;
      if (values.requested_end_date) submitted.requested_end_date = values.requested_end_date;
      if (values.cancellation_type === 'extraordinary') submitted.reason = values.reason.trim();
    }
    if (values.message.trim()) submitted.message = values.message.trim();
    submitGuard.current = true; setState('submitting'); setFieldErrors({});
    try {
      await ensureCsrf();
      if (typeof api?.submitDeclaration !== 'function') throw new Error('declaration_unavailable');
      const response = await api.submitDeclaration(submitted);
      const receipt = { reference: response?.reference || '', received_at: response?.received_at || '', submitted };
      setAck(receipt); setState('acknowledged'); onSubmitted?.(response);
    } catch {
      submitGuard.current = false; setState('error'); setFieldErrors({ form: 'Billing.DECLARATION_ERROR' });
    }
  };

  const fieldProps = (name, labelKey, extra = {}) => ({
    label: t(labelKey), name, value: values[name], onChange: (event) => setField(name, event.target.value),
    error: Boolean(fieldErrors[name]), helperText: fieldErrors[name] ? t(fieldErrors[name]) : undefined,
    inputProps: { maxLength: LIMITS[name] }, ...extra,
  });

  const save = () => {
    if (!ack || typeof URL.createObjectURL !== 'function') return;
    const blob = new Blob([acknowledgementText(ack, t, i18n.language)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `declaration-${ack.reference || 'acknowledgement'}.txt`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  if (state === 'acknowledged' && ack) return <Stack spacing={1.5} role="status">
    <Typography variant="h6" ref={ackHeading} tabIndex={-1} sx={{ outline: 'none' }}>{t('Billing.DECLARATION_RECEIVED')}</Typography>
    <Typography>{t('Billing.DECLARATION_REFERENCE', { reference: ack.reference })}</Typography>
    {formatDateTime(ack.received_at, i18n.language) && <Typography>{t('Billing.DECLARATION_RECEIVED_AT', { date: formatDateTime(ack.received_at, i18n.language) })}</Typography>}
    <Typography>{t(`Billing.DECLARATION_${ack.submitted.kind.toUpperCase()}`)}</Typography>
    <Typography>{ack.submitted.name}</Typography><Typography>{ack.submitted.email}</Typography>
    {ack.submitted.contract_hint && <Typography>{ack.submitted.contract_hint}</Typography>}
    {ack.submitted.cancellation_type && <Typography>{t(ack.submitted.cancellation_type === 'ordinary' ? 'Billing.CANCEL_ORDINARY' : 'Billing.CANCEL_EXTRAORDINARY')}</Typography>}
    {ack.submitted.requested_end_date && <Typography>{ack.submitted.requested_end_date}</Typography>}
    {ack.submitted.reason && <Typography>{ack.submitted.reason}</Typography>}
    {ack.submitted.message && <Typography>{ack.submitted.message}</Typography>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
      <Button onClick={save}>{t('Billing.DECLARATION_SAVE')}</Button>
      <Button onClick={() => window.print()}>{t('Billing.DECLARATION_PRINT')}</Button>
    </Stack>
  </Stack>;

  return <Stack component="form" ref={formRef} noValidate onSubmit={submit} spacing={1.5}>
    {!fixedKind && <FormControl>
      <FormLabel id={kindLabelId}>{t('Billing.DECLARATION_KIND_LABEL')}</FormLabel>
      <RadioGroup row aria-labelledby={kindLabelId} value={currentKind} onChange={(event) => setSelectedKind(event.target.value)}>
        <FormControlLabel value="cancellation" control={<Radio />} label={t('Billing.DECLARATION_CANCELLATION')} />
        <FormControlLabel value="withdrawal" control={<Radio />} label={t('Billing.DECLARATION_WITHDRAWAL')} />
      </RadioGroup>
    </FormControl>}
    {legalNotice && <Typography component="div">{legalNotice}</Typography>}
    <TextField {...fieldProps('name', 'Billing.DECLARATION_NAME')} required />
    <TextField {...fieldProps('email', 'Billing.DECLARATION_EMAIL', { type: 'email' })} required />
    <TextField {...fieldProps('contract_hint', 'Billing.DECLARATION_CONTRACT_HINT')} />
    {currentKind === 'cancellation' && <>
      <FormControl>
        <FormLabel id={typeLabelId}>{t('Billing.CANCEL_TYPE_LABEL')}</FormLabel>
        <RadioGroup row aria-labelledby={typeLabelId} value={values.cancellation_type} onChange={(event) => setField('cancellation_type', event.target.value)}>
          <FormControlLabel value="ordinary" control={<Radio />} label={t('Billing.CANCEL_ORDINARY')} />
          <FormControlLabel value="extraordinary" control={<Radio />} label={t('Billing.CANCEL_EXTRAORDINARY')} />
        </RadioGroup>
      </FormControl>
      <TextField type="date" label={t('Billing.DECLARATION_REQUESTED_END_DATE')} value={values.requested_end_date} onChange={(event) => setField('requested_end_date', event.target.value)} InputLabelProps={{ shrink: true }} />
      {values.cancellation_type === 'extraordinary' && <TextField {...fieldProps('reason', 'Billing.DECLARATION_REASON')} required multiline minRows={3} />}
    </>}
    <TextField {...fieldProps('message', 'Billing.DECLARATION_MESSAGE')} multiline minRows={3} />
    {fieldErrors.form && <Alert severity="error" role="alert">{t(fieldErrors.form)}</Alert>}
    <Button type="submit" variant="contained" disabled={state === 'submitting'}>{t(state === 'submitting' ? 'Billing.DECLARATION_SUBMITTING' : 'Billing.DECLARATION_SUBMIT')}</Button>
  </Stack>;
}

export default DeclarationForm;
