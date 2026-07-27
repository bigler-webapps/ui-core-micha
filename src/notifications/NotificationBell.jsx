import { useState } from 'react';

import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  Badge,
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useNotifications } from './NotificationsProvider';

export function NotificationBell({ resolveLink }) {
  const { t } = useTranslation();
  const { notifications, unreadCount, markSeen } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const unreadIds = notifications
    .filter((notification) => !notification.seen && !notification.dismissed && notification.id != null)
    .map((notification) => notification.id);

  const handleItemClick = (notification) => {
    if (notification.id != null) markSeen([notification.id]);
    setAnchorEl(null);
    if (resolveLink && notification.content?.link) resolveLink(notification.content.link);
  };

  return (
    <>
      <IconButton
        aria-label={t('NotificationBell.TITLE')}
        color="inherit"
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        onClose={() => setAnchorEl(null)}
        open={open}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      >
        <Box sx={{ minWidth: 320 }}>
          <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
            <Typography variant="subtitle1">{t('NotificationBell.TITLE')}</Typography>
            {unreadIds.length > 0 && (
              <Button onClick={() => markSeen(unreadIds)} size="small">
                {t('NotificationBell.MARK_ALL')}
              </Button>
            )}
          </Box>
          {notifications.length === 0 ? (
            <Typography sx={{ px: 2, py: 2 }} variant="body2">
              {t('NotificationBell.EMPTY')}
            </Typography>
          ) : (
            <List dense disablePadding>
              {notifications.map((notification) => (
                <ListItemButton key={notification.id ?? notification.notification_id} onClick={() => handleItemClick(notification)}>
                  <ListItemText
                    primary={t(notification.content?.title_key, notification.content?.params || {})}
                    secondary={notification.content?.body_key
                      ? t(notification.content.body_key, notification.content.params || {})
                      : undefined}
                    slotProps={{ primary: { fontWeight: notification.seen || notification.dismissed ? 'regular' : 'bold' } }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Menu>
    </>
  );
}
