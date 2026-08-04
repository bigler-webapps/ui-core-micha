import { useContext, useState } from 'react';

import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { AuthContext } from './AuthContext';

function getInitials(user) {
  if (!user) return '';
  const first = user.first_name?.trim()?.[0];
  const last = user.last_name?.trim()?.[0];
  if (first || last) return `${first || ''}${last || ''}`.toUpperCase();
  return (user.username?.trim()?.[0] || '').toUpperCase();
}

function getDisplayName(user) {
  if (!user) return '';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.username || '';
}

export function UserMenu({ resolveLink, items = [], profileLink = '/account', avatarSrc }) {
  const { t } = useTranslation();
  const { user, logout } = useContext(AuthContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClose = () => setAnchorEl(null);

  const handleProfile = () => {
    handleClose();
    resolveLink?.(profileLink);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const handleItemSelect = (item) => {
    handleClose();
    item.onSelect?.();
  };

  return (
    <>
      <IconButton
        aria-label={t('UserMenu.TITLE')}
        color="inherit"
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <Avatar src={avatarSrc} sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
          {avatarSrc ? null : getInitials(user)}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        onClose={handleClose}
        open={open}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      >
        <Box sx={{ minWidth: 240, px: 2, py: 1 }}>
          <Typography variant="subtitle1" noWrap>{getDisplayName(user)}</Typography>
          {/* A user with no first/last name falls back to username as the
              display name above — some hosts' usernames are the email
              address itself, which would otherwise repeat the same text
              on both lines. */}
          {user?.email && user.email !== getDisplayName(user) && (
            <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
          )}
        </Box>
        <Divider />
        <MenuItem onClick={handleProfile}>{t('UserMenu.PROFILE')}</MenuItem>
        {items.length > 0 && <Divider />}
        {items.map((item) => (
          <MenuItem key={item.id} onClick={() => handleItemSelect(item)}>
            {item.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleLogout}>{t('UserMenu.LOGOUT')}</MenuItem>
      </Menu>
    </>
  );
}

export default UserMenu;
