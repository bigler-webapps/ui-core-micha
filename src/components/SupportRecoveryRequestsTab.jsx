// src/components/SupportRecoveryRequestsTab.jsx
import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../auth/AuthContext';
import {
  approveRecoveryRequest,
  fetchRecoveryRequests,
  fetchUsersList,
  rejectRecoveryRequest,
  updateUserSupportStatus,
} from '../auth/authApi';

export function SupportRecoveryRequestsTab() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const canManageAgents = Boolean(user?.is_superuser || user?.can_manage_support_agents);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogNote, setDialogNote] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentErrorKey, setAgentErrorKey] = useState(null);
  const [selectedAgentCandidate, setSelectedAgentCandidate] = useState(null);
  const [agentActionUserId, setAgentActionUserId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const data = await fetchRecoveryRequests(statusFilter);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorKey(err.code || 'Support.RECOVERY_REQUESTS_LOAD_FAILED');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!canManageAgents) {
      setAllUsers([]);
      setAgentErrorKey(null);
      return;
    }

    setAgentLoading(true);
    setAgentErrorKey(null);
    try {
      const data = await fetchUsersList();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      list.sort((a, b) => {
        const emailA = String(a?.email || '').toLocaleLowerCase();
        const emailB = String(b?.email || '').toLocaleLowerCase();
        return emailA.localeCompare(emailB);
      });
      setAllUsers(list);
    } catch (err) {
      setAgentErrorKey(err.code || 'Auth.USER_LIST_FAILED');
    } finally {
      setAgentLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageAgents]);

  const openDialog = (req) => {
    setSelectedRequest(req);
    setDialogNote('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedRequest(null);
    setDialogNote('');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setErrorKey(null);
    try {
      await approveRecoveryRequest(selectedRequest.id, dialogNote);
      await loadRequests();
      closeDialog();
    } catch (err) {
      setErrorKey(err.code || 'Support.RECOVERY_REQUEST_APPROVE_FAILED');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setErrorKey(null);
    try {
      await rejectRecoveryRequest(selectedRequest.id, dialogNote);
      await loadRequests();
      closeDialog();
    } catch (err) {
      setErrorKey(err.code || 'Support.RECOVERY_REQUEST_REJECT_FAILED');
    }
  };

  const getUserDisplayName = (entry) => {
    if (entry?.first_name || entry?.last_name) {
      return `${entry.first_name || ''} ${entry.last_name || ''}`.trim();
    }
    return entry?.username || '';
  };

  const getUserOptionLabel = (entry) => {
    if (!entry) return '';
    const name = getUserDisplayName(entry);
    if (name && entry?.email) return `${name} (${entry.email})`;
    return entry?.email || name || `#${entry?.id || ''}`;
  };

  const supportAgents = allUsers.filter((entry) => Boolean(entry?.is_support_agent));
  const availableAgentCandidates = allUsers.filter((entry) => !entry?.is_support_agent);

  const handleAddAgent = async () => {
    if (!selectedAgentCandidate) return;

    setAgentActionUserId(selectedAgentCandidate.id);
    setAgentErrorKey(null);
    try {
      await updateUserSupportStatus(selectedAgentCandidate.id, true);
      setSelectedAgentCandidate(null);
      await loadUsers();
    } catch (err) {
      setAgentErrorKey(err.code || 'Auth.USER_SUPPORT_UPDATE_FAILED');
    } finally {
      setAgentActionUserId(null);
    }
  };

  const handleRemoveAgent = async (agentUser) => {
    if (!agentUser?.id) return;

    setAgentActionUserId(agentUser.id);
    setAgentErrorKey(null);
    try {
      await updateUserSupportStatus(agentUser.id, false);
      if (selectedAgentCandidate?.id === agentUser.id) {
        setSelectedAgentCandidate(null);
      }
      await loadUsers();
    } catch (err) {
      setAgentErrorKey(err.code || 'Auth.USER_SUPPORT_UPDATE_FAILED');
    } finally {
      setAgentActionUserId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {canManageAgents && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('Support.AGENTS_TITLE', 'Support agents')}
          </Typography>

          <Typography variant="body2" sx={{ mb: 2 }}>
            {t(
              'Support.AGENTS_DESCRIPTION',
              'Assign which users are allowed to handle support requests.',
            )}
          </Typography>

          {agentErrorKey && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t(agentErrorKey)}
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2, alignItems: { md: 'flex-start' } }}
          >
            <Autocomplete
              fullWidth
              options={availableAgentCandidates}
              value={selectedAgentCandidate}
              loading={agentLoading}
              onChange={(_event, value) => setSelectedAgentCandidate(value)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={getUserOptionLabel}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('Support.AGENTS_SELECT_LABEL', 'Select user')}
                  placeholder={t('Support.AGENTS_SELECT_PLACEHOLDER', 'Choose a user')}
                />
              )}
            />

            <Button
              variant="contained"
              onClick={handleAddAgent}
              disabled={!selectedAgentCandidate || agentLoading || Boolean(agentActionUserId)}
              sx={{ minWidth: 160 }}
            >
              {t('Support.AGENTS_ADD', 'Add as agent')}
            </Button>
          </Stack>

          {agentLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : supportAgents.length === 0 ? (
            <Typography variant="body2">
              {t('Support.AGENTS_EMPTY', 'No support agents assigned yet.')}
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('Profile.NAME_LABEL', 'Name')}</TableCell>
                    <TableCell>{t('Auth.EMAIL_LABEL', 'Email')}</TableCell>
                    <TableCell align="right">
                      {t('Common.ACTIONS', 'Actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supportAgents.map((agentUser) => (
                    <TableRow key={agentUser.id}>
                      <TableCell>{getUserDisplayName(agentUser) || '-'}</TableCell>
                      <TableCell>{agentUser.email || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveAgent(agentUser)}
                          disabled={agentActionUserId === agentUser.id}
                          aria-label={t('Support.AGENTS_REMOVE', 'Remove support agent')}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      <Typography variant="h6" gutterBottom>
        {t('Support.RECOVERY_REQUESTS_TITLE', 'Account recovery requests')}
      </Typography>

      <Typography variant="body2" sx={{ mb: 2 }}>
        {t(
          'Support.RECOVERY_REQUESTS_DESCRIPTION',
          'Users who cannot complete MFA can request support. You can review their request and approve or reject it.',
        )}
      </Typography>

      {errorKey && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(errorKey)}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant={statusFilter === 'pending' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setStatusFilter('pending')}
        >
          {t('Support.RECOVERY_FILTER_PENDING', 'Open')}
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setStatusFilter('approved')}
        >
          {t('Support.RECOVERY_FILTER_APPROVED', 'Approved')}
        </Button>
        <Button
          variant={statusFilter === 'rejected' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setStatusFilter('rejected')}
        >
          {t('Support.RECOVERY_FILTER_REJECTED', 'Rejected')}
        </Button>
      </Stack>

      {requests.length === 0 ? (
        <Typography variant="body2">
          {t(
            'Support.RECOVERY_REQUESTS_EMPTY',
            'No recovery requests for this filter.',
          )}
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  {t('Support.RECOVERY_COL_CREATED', 'Created')}
                </TableCell>
                <TableCell>
                  {t('Support.RECOVERY_USER', 'User')}
                </TableCell>
                <TableCell>
                  {t('Support.RECOVERY_COL_STATUS', 'Status')}
                </TableCell>
                <TableCell>
                  {t('Support.RECOVERY_COL_ACTIONS', 'Actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    {req.created_at
                      ? new Date(req.created_at).toLocaleString()
                      : '-'}
                  </TableCell>
                  <TableCell>{req.user_email || req.user}</TableCell>
                  <TableCell>
                    {t(`Support.RECOVERY_STATUS_${req.status}`, req.status)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => openDialog(req)}
                      disabled={req.status !== 'pending'}
                    >
                      {t('Support.RECOVERY_ACTION_REVIEW', 'Review')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {t('Support.RECOVERY_REVIEW_DIALOG_TITLE', 'Review recovery request')}
        </DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>
                  {t('Support.RECOVERY_USER', 'User')}:
                </strong>{' '}
                {selectedRequest.user_email || selectedRequest.user}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>
                  {t('Support.RECOVERY_REVIEW_CREATED', 'Requested at')}:
                </strong>{' '}
                {selectedRequest.created_at
                  ? new Date(selectedRequest.created_at).toLocaleString()
                  : '-'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>
                  {t(
                    'Support.RECOVERY_REVIEW_MESSAGE',
                    'User’s explanation',
                  )}
                  :
                </strong>
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1,
                  mb: 2,
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.875rem',
                }}
              >
                {selectedRequest.message || t('Support.RECOVERY_NO_MESSAGE', 'No message provided.')}
              </Box>
            </Box>
          )}

          <TextField
            label={t(
              'Support.RECOVERY_NOTE_LABEL',
              'Reason for your decision',
            )}
            helperText={t(
              'Support.RECOVERY_NOTE_HELP',
              'Explain briefly why you approve or reject this request.',
            )}
            multiline
            minRows={3}
            fullWidth
            value={dialogNote}
            onChange={(e) => setDialogNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>
            {t('Support.CANCEL', 'Cancel')}
          </Button>
          <Button
            onClick={handleReject}
            color="error"
            disabled={!dialogNote.trim()}
          >
            {t('Support.RECOVERY_REJECT_SUBMIT', 'Reject request')}
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            disabled={!dialogNote.trim()}
          >
            {t('Support.RECOVERY_APPROVE_SUBMIT', 'Approve and send link')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

