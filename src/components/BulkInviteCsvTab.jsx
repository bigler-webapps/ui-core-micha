import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { sendAdminInvite } from '../auth/authApi';

function parseEmailsFromCsv(text) {
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const first = lines[0].toLowerCase();
  const hasHeader = first.includes('email');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const emails = [];

  dataLines.forEach((line) => {
    const cols = line.split(/[;,|\t]/).map((part) => part.trim());
    const email = cols.find((part) => part.includes('@'));
    if (email) emails.push(email);
  });

  return Array.from(new Set(emails.map((e) => e.toLowerCase())));
}

export function BulkInviteCsvTab({
  inviteFn = (email) => sendAdminInvite(email),
  onCompleted,
}) {
  const { t } = useTranslation();
  const actionButtonSx = {
    minWidth: 120,
    height: 40,
    textTransform: 'none',
    whiteSpace: 'nowrap',
  };
  const [emails, setEmails] = useState([]);
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const total = emails.length;
  const done = Object.keys(results).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const successCount = useMemo(
    () => Object.values(results).filter((r) => r.ok).length,
    [results],
  );

  const handleFile = async (event) => {
    setError('');
    setSuccess('');
    setResults({});

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseEmailsFromCsv(text);
      if (parsed.length === 0) {
        setError(t('Account.BULK_INVITE_NO_EMAILS', 'No valid email addresses found in CSV.'));
        return;
      }
      setEmails(parsed);
    } catch (err) {
      setError(err.message || t('Account.BULK_INVITE_PARSE_FAILED', 'Could not read CSV file.'));
    }
  };

  const handleInviteAll = async () => {
    if (emails.length === 0) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setResults({});

    const nextResults = {};
    for (const email of emails) {
      try {
        const response = await inviteFn(email);
        nextResults[email] = {
          ok: true,
          message: response?.detail || t('Auth.INVITE_SENT_SUCCESS', 'Invitation sent.'),
        };
      } catch (err) {
        nextResults[email] = {
          ok: false,
          message: t(err?.code || 'Auth.INVITE_FAILED'),
        };
      }
      setResults({ ...nextResults });
    }

    const okCount = Object.values(nextResults).filter((r) => r.ok).length;
    setSuccess(
      t('Account.BULK_INVITE_DONE', '{{ok}} / {{total}} invites sent.', {
        ok: okCount,
        total: emails.length,
      }),
    );
    setBusy(false);
    if (onCompleted) onCompleted(nextResults);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('Account.BULK_INVITE_TITLE', 'Bulk Invite via CSV')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {t(
          'Account.BULK_INVITE_HINT',
          'Upload a CSV file containing email addresses. Header "email" is supported.',
        )}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" component="label" disabled={busy} sx={actionButtonSx}>
          {t('Account.BULK_INVITE_UPLOAD', 'Upload CSV')}
          <input type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
        </Button>
        <Button variant="contained" size="small" sx={actionButtonSx} onClick={handleInviteAll} disabled={busy || emails.length === 0}>
          {t('Account.BULK_INVITE_SEND', 'Send Invites')}
        </Button>
        <Typography variant="body2">
          {t('Account.BULK_INVITE_COUNT', '{{count}} emails loaded', { count: emails.length })}
        </Typography>
      </Box>

      {busy && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {emails.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('Auth.EMAIL_LABEL', 'Email')}</TableCell>
                <TableCell>{t('Common.STATUS', 'Status')}</TableCell>
                <TableCell>{t('Common.DETAILS', 'Details')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {emails.map((email) => {
                const row = results[email];
                return (
                  <TableRow key={email}>
                    <TableCell>{email}</TableCell>
                    <TableCell>
                      {row ? (row.ok ? t('Common.SUCCESS', 'Success') : t('Common.ERROR', 'Error')) : '-'}
                    </TableCell>
                    <TableCell>{row?.message || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {done > 0 && (
        <Typography variant="body2" sx={{ mt: 2 }}>
          {t('Account.BULK_INVITE_PROGRESS', '{{done}} / {{total}} processed', { done, total })}
          {' - '}
          {t('Account.BULK_INVITE_SUCCESS_COUNT', '{{count}} successful', { count: successCount })}
        </Typography>
      )}
    </Box>
  );
}
