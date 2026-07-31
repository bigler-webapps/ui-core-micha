import { useMemo, useState } from 'react';
import { Archive, Campaign, Groups, MoreVert, NotificationsOff, Person } from '@mui/icons-material';
import { Badge, Box, Button, CircularProgress, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useMessaging } from './MessagingProvider';
import { ConversationLaunchers } from './ConversationLaunchers';

function titleOf(conversation, t) { return conversation.title || conversation.other_user?.display_name || conversation.other_user?.username || t('MessagingList.UNTITLED'); }
function ordered(conversations) {
  return [...conversations].sort((left, right) => new Date(right.last_message_at || 0) - new Date(left.last_message_at || 0));
}
// jg's ConversationList renders a distinct icon per conversation kind so a
// user can identify type/person at a glance (getConversationAvatar); that
// glanceable identification is a feature, not layout, so it's reproduced
// here rather than left as a generic archive-status glyph.
function KindIcon({ conversation }) {
  if (conversation.kind === 'broadcast') return <Campaign fontSize="small" />;
  if (conversation.kind === 'group' || conversation.kind === 'managed' || conversation.kind === 'object_thread') return <Groups fontSize="small" />;
  return <Person fontSize="small" />;
}

/** A standalone, provider-backed list; scope picker metadata is supplied as launcher props. */
export function ConversationList({ onOpen, groupLaunchers, broadcastLauncher, autoOpenBroadcast = false, includeArchived = false }) {
  const { t } = useTranslation();
  const { cache, activeConversationId, loadMoreConversations, setConversationArchived, setConversationPreferences, markConversationRead } = useMessaging();
  const [menuConversation, setMenuConversation] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const conversations = useMemo(() => ordered(Object.values(cache.conversations).filter((item) => includeArchived || !item.archived_at && !item.archived)), [cache.conversations, includeArchived]);
  const unreadFor = (conversation) => conversation.unread_count ?? cache.unread.by_conversation?.[conversation.id] ?? 0;
  // Once opened, the broadcast conversation becomes a normal, recency-sorted
  // row with real unread/preview state — hide the static launcher so it isn't
  // shown twice (button + list row) with the button's stale, unread-less copy.
  const broadcastAlreadyOpened = useMemo(() => Object.values(cache.conversations).some((item) => item.kind === 'broadcast'), [cache.conversations]);

  const loadMore = async () => {
    setLoadingMore(true); setError(null);
    try { await loadMoreConversations(); } catch { setError(t('MessagingList.LOAD_ERROR')); } finally { setLoadingMore(false); }
  };
  const closeMenu = () => { setMenuConversation(null); setMenuAnchor(null); };
  const archive = async () => {
    try { await setConversationArchived(menuConversation.id, true); } catch { setError(t('MessagingList.ARCHIVE_ERROR')); }
    closeMenu();
  };
  const toggleMute = async () => {
    try { await setConversationPreferences(menuConversation.id, { muted: !menuConversation.muted }); } catch { setError(t('MessagingList.PREFERENCES_ERROR')); }
    closeMenu();
  };

  return (
    <Stack spacing={1}>
      <ConversationLaunchers groupLaunchers={groupLaunchers} broadcastLauncher={broadcastAlreadyOpened ? null : broadcastLauncher} autoOpenBroadcast={autoOpenBroadcast && !broadcastAlreadyOpened} onOpen={onOpen} />
      {error && <Typography color="error" role="alert">{error}</Typography>}
      {!conversations.length ? <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">{t('MessagingList.EMPTY')}</Typography></Box> : (
        <List disablePadding aria-label={t('MessagingList.LABEL')}>
          {conversations.map((conversation) => {
            const unread = unreadFor(conversation);
            const archived = Boolean(conversation.archived || conversation.archived_at);
            return <ListItemButton key={conversation.id} selected={conversation.id === activeConversationId} onClick={() => { markConversationRead(conversation.id).catch(() => {}); onOpen?.(conversation); }} sx={{ minHeight: 64, opacity: archived ? 0.6 : 1 }}>
              <Badge color="error" badgeContent={unread || null} max={99} sx={{ mr: 2 }}>
                {archived ? <Archive fontSize="small" color="disabled" /> : <KindIcon conversation={conversation} />}
              </Badge>
              <ListItemText primary={titleOf(conversation, t)} secondary={conversation.last_message?.body || t('MessagingList.NO_MESSAGES')} primaryTypographyProps={{ fontWeight: unread ? 700 : 400, noWrap: true }} secondaryTypographyProps={{ noWrap: true }} />
              <IconButton aria-label={t('MessagingList.ACTIONS')} onClick={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); setMenuConversation(conversation); }}><MoreVert /></IconButton>
            </ListItemButton>;
          })}
        </List>
      )}
      {cache.cursors.conversations && <Button onClick={loadMore} disabled={loadingMore}>{loadingMore ? <CircularProgress size={18} /> : t('MessagingList.LOAD_MORE')}</Button>}
      <Menu anchorEl={menuAnchor} open={Boolean(menuConversation)} onClose={closeMenu}>
        <MenuItem onClick={toggleMute}><NotificationsOff fontSize="small" sx={{ mr: 1 }} />{menuConversation?.muted ? t('MessagingList.UNMUTE') : t('MessagingList.MUTE')}</MenuItem>
        <MenuItem onClick={archive}><Archive fontSize="small" sx={{ mr: 1 }} />{t('MessagingList.ARCHIVE')}</MenuItem>
      </Menu>
    </Stack>
  );
}
