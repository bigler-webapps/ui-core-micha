import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  Tooltip,
  CircularProgress,
  Alert,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { fetchUsersList, deleteUser, updateUserRole } from '../auth/authApi';

const DEFAULT_ROLES = ['none', 'student', 'teacher', 'admin'];

export function UserListComponent({
    roles = DEFAULT_ROLES,
    currentUser,
    extraColumns = [],
    extraRowActions = [],
    extraContext = null,
    refreshTrigger = 0,
    canEditUser,
    showNewColumn = true,
    showSuccessfulLoginColumn = true,
    showRoleColumn = true,
    onChangeRole = null,
    showDeleteAction = true,
    canDeleteUser = null,
    onDeleteUser = null,
}) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowActionLoading, setRowActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('email');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const controlSx = { minWidth: 140 };
  const actionButtonSx = { textTransform: 'none', minWidth: 90 };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsersList();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      // Keep row identity stable even if backend returns unordered results.
      list.sort((a, b) => {
        const aId = Number(a?.id ?? 0);
        const bId = Number(b?.id ?? 0);
        return aId - bId;
      });
      setUsers(list);
    } catch (err) {
      setError(err.code || 'Auth.USER_LIST_FAILED');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, refreshTrigger]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const handleDelete = async (userId) => {
    if (!window.confirm(t('UserList.DELETE_CONFIRM', 'Are you sure you want to delete this user?'))) return;
    try {
      if (typeof onDeleteUser === 'function') {
        await onDeleteUser({ userId, currentUser, extraContext, t, reloadUsers: loadUsers });
      } else {
        await deleteUser(userId);
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(t(err.code || 'Auth.USER_DELETE_FAILED'));
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      if (typeof onChangeRole === 'function') {
        await onChangeRole({
          userId,
          newRole,
          currentUser,
          extraContext,
          t,
          reloadUsers: loadUsers,
        });
      } else {
        await updateUserRole(userId, newRole);
      }
      await loadUsers();
    } catch (err) {
      alert(t(err.code || 'Auth.USER_ROLE_UPDATE_FAILED'));
    }
  };

  const defaultCanEdit = (targetUser) => {
      if (!currentUser) return false;
      if (currentUser.is_superuser) return true;

      const myRole = currentUser.role || 'none';
      const targetRole = targetUser.role || 'none';

      if (myRole === 'admin') return true;

      if (myRole === 'teacher') {
          if (targetUser.id === currentUser.id) return false;
          if (['teacher', 'admin', 'supervisor'].includes(targetRole)) return false;
          return true;
      }
      return false;
  };
  const canEdit = (targetUser) => {
    if (typeof canEditUser === 'function') {
      return Boolean(canEditUser({ targetUser, currentUser, extraContext }));
    }
    return defaultCanEdit(targetUser);
  };

  const canDelete = (targetUser) => {
    if (typeof canDeleteUser === 'function') {
      return Boolean(canDeleteUser({ targetUser, currentUser, extraContext }));
    }
    return canEdit(targetUser);
  };

  const listContext = useMemo(() => ({
    currentUser,
    extraContext,
    t,
    reloadUsers: loadUsers,
  }), [currentUser, extraContext, t, loadUsers]);

  const visibleExtraColumns = useMemo(
    () =>
      extraColumns.filter((column) =>
        typeof column.visible === 'function' ? column.visible(listContext) : true,
      ),
    [extraColumns, listContext],
  );

  const visibleRowActions = useMemo(
    () =>
      extraRowActions.filter((action) =>
        typeof action.visible === 'function' ? action.visible(listContext) : true,
      ),
    [extraRowActions, listContext],
  );

  const getUserDisplayName = (user) => {
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user?.username || '';
  };

  const renderBooleanStatusIcon = (value, positiveLabel, negativeLabel) => (
    <Tooltip title={value ? positiveLabel : negativeLabel}>
      <span>
        {value ? (
          <CheckCircleIcon color="success" fontSize="small" />
        ) : (
          <CancelIcon color="error" fontSize="small" />
        )}
      </span>
    </Tooltip>
  );

  const getExtraColumnSortValue = (column, user) => {
    const valueContext = { user, currentUser, extraContext, t };

    if (typeof column.getSortValue === 'function') {
      return column.getSortValue(valueContext);
    }

    if (typeof column.sortValue === 'function') {
      return column.sortValue(valueContext);
    }

    if (typeof column.getSearchValue === 'function') {
      return column.getSearchValue(valueContext);
    }

    if (user?.[column.key] !== undefined) return user[column.key];
    if (user?.profile?.[column.key] !== undefined) return user.profile[column.key];
    return '';
  };

  const getExtraColumnSearchValue = (column, user) => {
    const valueContext = { user, currentUser, extraContext, t };

    if (typeof column.getSearchValue === 'function') {
      return column.getSearchValue(valueContext);
    }

    return getExtraColumnSortValue(column, user);
  };

  const toSearchText = (value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map((item) => toSearchText(item)).join(' ');
    if (typeof value === 'object') return Object.values(value).map((item) => toSearchText(item)).join(' ');
    return String(value).toLocaleLowerCase();
  };

  const getSearchBucketForUser = (user) => {
    const hasSuccessfulLogin = Boolean(user?.successful_login ?? user?.last_login);
    const baseValues = [
      user?.id,
      user?.email,
      user?.username,
      user?.first_name,
      user?.last_name,
      getUserDisplayName(user),
      user?.role,
      user?.language,
      hasSuccessfulLogin ? t('Common.YES', 'Yes') : t('Common.NO', 'No'),
    ];

    const extraValues = visibleExtraColumns.map((column) => getExtraColumnSearchValue(column, user));

    return [...baseValues, ...extraValues].map((value) => toSearchText(value)).filter(Boolean);
  };

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (!normalizedSearch) return true;
      const bucket = getSearchBucketForUser(user);
      return bucket.some((entry) => entry.includes(normalizedSearch));
    });
  }, [users, normalizedSearch, visibleExtraColumns, currentUser, extraContext, t]);

  const runRowAction = async (action, user) => {
    const actionId = `${action.key}:${user.id}`;
    setRowActionLoading((prev) => ({ ...prev, [actionId]: true }));
    try {
      await action.onClick({
        user,
        canEdit: canEdit(user),
        currentUser,
        extraContext,
        t,
        reloadUsers: loadUsers,
      });
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err?.message || t('Common.OPERATION_FAILED', 'Operation failed.'));
    } finally {
      setRowActionLoading((prev) => ({ ...prev, [actionId]: false }));
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        field: 'email',
        headerName: t('Auth.EMAIL_LABEL', 'Email'),
        minWidth: 220,
        flex: 1,
        sortable: true,
        align: 'left',
        headerAlign: 'left',
        valueGetter: (row) => row?.email ?? '',
        renderCell: (row) => row.email,
      },
      {
        field: 'name',
        headerName: t('Profile.NAME_LABEL', 'Name'),
        minWidth: 180,
        flex: 0.9,
        sortable: true,
        align: 'left',
        headerAlign: 'left',
        valueGetter: (row) => getUserDisplayName(row),
        renderCell: (row) => getUserDisplayName(row),
      },
    ];

    if (showNewColumn) {
      baseColumns.push({
        field: 'is_new',
        headerName: t('UserList.NEW', 'New'),
        minWidth: 90,
        flex: 0.35,
        sortable: true,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (row) => Boolean(row?.profile?.is_new || row?.is_new),
        renderCell: (row) => renderBooleanStatusIcon(
          Boolean(row?.profile?.is_new || row?.is_new),
          t('Common.YES', 'Yes'),
          t('Common.NO', 'No'),
        ),
      });
    }

    if (showSuccessfulLoginColumn) {
      baseColumns.push({
        field: 'successful_login',
        headerName: t('UserList.SUCCESSFUL_LOGIN', 'Successful Login'),
        minWidth: 120,
        flex: 0.4,
        sortable: true,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (row) => Boolean(row?.successful_login ?? row?.last_login),
        renderCell: (row) => renderBooleanStatusIcon(
          Boolean(row?.successful_login ?? row?.last_login),
          t('Common.YES', 'Yes'),
          t('Common.NO', 'No'),
        ),
      });
    }

    if (showRoleColumn) {
      baseColumns.push({
        field: 'role',
        headerName: t('UserList.ROLE', 'Role'),
        minWidth: 180,
        flex: 0.7,
        sortable: true,
        align: 'left',
        headerAlign: 'left',
        valueGetter: (row) => row?.role || 'none',
        renderCell: (row) => (
          <FormControl size="small" fullWidth sx={controlSx} disabled={!canEdit(row)}>
            <Select
              value={row.role || 'none'}
              onChange={(event) => handleChangeRole(row.id, event.target.value)}
              variant="outlined"
            >
              {roles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </Select>
          </FormControl>
        ),
      });
    }

    const mappedExtraColumns = visibleExtraColumns.map((column) => ({
      field: `extra:${column.key}`,
      headerName: typeof column.label === 'function' ? column.label(listContext) : column.label,
      minWidth: Number(column.minWidth) || 180,
      flex: Number(column.flex) || 0.9,
      sortable: column.sortable !== false,
      align: column.align || 'left',
      headerAlign: column.align || 'left',
      valueGetter: (row) => getExtraColumnSortValue(column, row),
      renderCell: (row) =>
        column.renderCell({
          user: row,
          canEdit: canEdit(row),
          currentUser,
          extraContext,
          t,
          reloadUsers: loadUsers,
        }),
    }));

    const hasActionColumn = showDeleteAction || visibleRowActions.length > 0;

    if (!hasActionColumn) {
      return [...baseColumns, ...mappedExtraColumns];
    }

    const actionColumn = {
      field: 'actions',
      headerName: t('Common.ACTIONS', 'Actions'),
      minWidth: Math.max(220, 110 + (visibleRowActions.length + (showDeleteAction ? 1 : 0)) * 110),
      flex: 1.1,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      valueGetter: null,
      renderCell: (row) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', py: 0.5 }}>
          {visibleRowActions.map((action) => {
            const actionId = `${action.key}:${row.id}`;
            const isBusy = Boolean(rowActionLoading[actionId]);
            const isDisabled = typeof action.disabled === 'function'
              ? action.disabled({
                  user: row,
                  canEdit: canEdit(row),
                  currentUser,
                  extraContext,
                  t,
                })
              : false;

            return (
              <Button
                key={`${action.key}-${row.id}`}
                size="small"
                variant="outlined"
                onClick={() => runRowAction(action, row)}
                disabled={isBusy || isDisabled}
                sx={actionButtonSx}
              >
                {typeof action.label === 'function'
                  ? action.label({ user: row, t, currentUser, canEdit: canEdit(row) })
                  : action.label}
              </Button>
            );
          })}

          {showDeleteAction && (
            <Tooltip title={t('Common.DELETE', 'Delete')}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(row.id)}
                  disabled={!canDelete(row)}
                  sx={actionButtonSx}
                >
                  {t('Common.DELETE', 'Delete')}
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      ),
    };

    return [...baseColumns, ...mappedExtraColumns, actionColumn];
  }, [
    t,
    roles,
    showNewColumn,
    showSuccessfulLoginColumn,
    showRoleColumn,
    showDeleteAction,
    visibleExtraColumns,
    visibleRowActions,
    listContext,
    rowActionLoading,
    currentUser,
    extraContext,
    loadUsers,
    canEdit,
    canDelete,
  ]);

  const sortedUsers = useMemo(() => {
    const col = columns.find((c) => c.field === sortField);
    return [...filteredUsers].sort((a, b) => {
      const aVal = col?.valueGetter ? col.valueGetter(a) : (a[sortField] ?? '');
      const bVal = col?.valueGetter ? col.valueGetter(b) : (b[sortField] ?? '');
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredUsers, sortField, sortDir, columns]);

  const pagedUsers = useMemo(
    () => sortedUsers.slice(page * pageSize, page * pageSize + pageSize),
    [sortedUsers, page, pageSize],
  );

  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>{t('UserList.TITLE', 'All Users')}</Typography>

      <Box sx={{ mb: 2, maxWidth: 420 }}>
        <TextField
          fullWidth
          size="small"
          label={t('Common.SEARCH', 'Search')}
          placeholder={t('UserList.SEARCH_PLACEHOLDER', 'Search users...')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{t(error)}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <Box sx={{ width: '100%' }}>
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell
                      key={col.field}
                      align={col.headerAlign || col.align || 'left'}
                      sortDirection={sortField === col.field ? sortDir : false}
                      sx={{ minWidth: col.minWidth, fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {col.sortable !== false ? (
                        <TableSortLabel
                          active={sortField === col.field}
                          direction={sortField === col.field ? sortDir : 'asc'}
                          onClick={() => handleSortClick(col.field)}
                        >
                          {col.headerName}
                        </TableSortLabel>
                      ) : (
                        col.headerName
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      align="center"
                      sx={{ py: 4, color: 'text.secondary' }}
                    >
                      {t('UserList.NO_USERS', 'No users found.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedUsers.map((row) => (
                    <TableRow key={row.id} hover>
                      {columns.map((col) => (
                        <TableCell
                          key={col.field}
                          align={col.align || 'left'}
                          sx={{ verticalAlign: 'top', py: 1 }}
                        >
                          {col.renderCell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={sortedUsers.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Box>
      )}
    </Box>
  );
}
