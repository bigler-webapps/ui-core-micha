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
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { AuthContext } from './AuthContext';
import { calculateContrastRatio } from '../theme';

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
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const avatarBackground = theme.palette.primary.main;
  // True white/black (theme.palette.common.*, always present on any MUI theme,
  // never a source-level literal), not background.paper/ink.primary: contrast
  // against true white and true black multiplies to a constant 21 regardless
  // of the background's luminance, so max(contrastWhite, contrastBlack) is
  // mathematically guaranteed to be >= sqrt(21) =~ 4.58 for ANY primary.main a
  // consumer sets -- a near-black token like ink.primary (#212529, luminance
  // ~0.018, not 0) does not carry that guarantee and left a real gap for a
  // medium-luminance primary (caught by ui_reviewer, neither required test
  // exercised the fallback branch that gap lived in).
  const avatarText = calculateContrastRatio(theme.palette.common.white, avatarBackground) >= 4.5
    ? theme.palette.common.white
    : theme.palette.common.black;

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
        <Avatar
          src={avatarSrc}
          sx={{
            width: 32,
            height: 32,
            fontSize: '0.8rem',
            bgcolor: avatarBackground,
            color: avatarText,
          }}
        >
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
