import React, { useState } from 'react';
import { Badge, Box, Button, Collapse, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, List, ListItem, ListItemButton, ListItemText, Menu, MenuItem, Stack, TextField } from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * The chat list: active chats, then an "Archived" entry that expands the archived ones (read-only, restorable).
 * Rename, Archive/Restore and Delete sit in each row's overflow menu; Delete asks for confirmation first.
 */
export function ChatList({ chats = [], archivedChats = [], activeId, hasMore = false, onSelect, onNew, onRename, onArchive, onRestore, onDelete, onLoadMore, sx }) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(null); // { anchor, chat, archived }
  const [dialog, setDialog] = useState(null); // { kind: 'rename' | 'delete', chat }
  const [title, setTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const openMenu = (event, chat, archived) => { event.stopPropagation(); setMenu({ anchor: event.currentTarget, chat, archived }); };
  const closeMenu = () => setMenu(null);
  const startRename = () => { setTitle(menu.chat.title || ''); setDialog({ kind: 'rename', chat: menu.chat }); closeMenu(); };
  const startDelete = () => { setDialog({ kind: 'delete', chat: menu.chat }); closeMenu(); };
  const toggleArchive = () => { (menu.archived ? onRestore : onArchive)?.(menu.chat); closeMenu(); };
  const closeDialog = () => setDialog(null);
  const confirmRename = () => { onRename?.(dialog.chat, title.trim()); closeDialog(); };
  const confirmDelete = () => { onDelete?.(dialog.chat); closeDialog(); };

  const row = (chat, archived) => (
    <ListItem
      key={chat.id}
      disablePadding
      secondaryAction={<IconButton edge="end" aria-label={t('Chat.actions')} onClick={(event) => openMenu(event, chat, archived)} sx={{ width: 40, height: 40 }}><MoreVert fontSize="small" /></IconButton>}
    >
      <ListItemButton selected={chat.id === activeId} onClick={() => onSelect?.(chat)} sx={{ minHeight: 48, pr: 6 }}>
        <ListItemText primary={chat.title || t('Chat.untitled')} slotProps={{ primary: { noWrap: true } }} />
      </ListItemButton>
    </ListItem>
  );

  return (
    <Stack sx={{ minWidth: 0, height: '100%', overflowY: 'auto', ...sx }} component="nav" aria-label={t('Chat.chats')}>
      <Box sx={{ p: 1.5 }}>
        <Button fullWidth variant="contained" onClick={onNew} sx={{ minHeight: 40 }}>{t('Chat.newChat')}</Button>
      </Box>
      <List disablePadding>{chats.map((chat) => row(chat, false))}</List>
      {hasMore ? <Button onClick={onLoadMore} sx={{ minHeight: 40 }}>{t('Chat.loadMore')}</Button> : null}
      {archivedChats.length > 0 ? (
        <>
          <Button color="inherit" onClick={() => setShowArchived((value) => !value)} aria-expanded={showArchived} sx={{ justifyContent: 'space-between', px: 2, minHeight: 48 }}>
            {t('Chat.archived')}
            <Badge color="default" badgeContent={archivedChats.length} sx={{ mr: 1.5 }} />
          </Button>
          <Collapse in={showArchived} unmountOnExit><List disablePadding>{archivedChats.map((chat) => row(chat, true))}</List></Collapse>
        </>
      ) : null}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={closeMenu}>
        <MenuItem onClick={startRename}>{t('Chat.rename')}</MenuItem>
        <MenuItem onClick={toggleArchive}>{menu?.archived ? t('Chat.restore') : t('Chat.archive')}</MenuItem>
        <MenuItem onClick={startDelete}>{t('Chat.delete')}</MenuItem>
      </Menu>

      <Dialog open={dialog?.kind === 'rename'} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>{t('Chat.rename')}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="dense" value={title} onChange={(event) => setTitle(event.target.value)} slotProps={{ htmlInput: { 'aria-label': t('Chat.renameLabel'), maxLength: 120 } }} onKeyDown={(event) => { if (event.key === 'Enter' && title.trim()) confirmRename(); }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t('Chat.cancel')}</Button>
          <Button variant="contained" disabled={!title.trim()} onClick={confirmRename}>{t('Chat.save')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog?.kind === 'delete'} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>{t('Chat.delete')}</DialogTitle>
        <DialogContent><DialogContentText>{t('Chat.deleteConfirm')}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t('Chat.cancel')}</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>{t('Chat.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default ChatList;
