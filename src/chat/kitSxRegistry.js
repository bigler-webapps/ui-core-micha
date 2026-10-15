import { createKitSxEntry } from '../theme/kitSxEntry';
import { CHAT_LIST_ARCHIVED_ACTION_SX, CHAT_LIST_ROW_ACTION_SX } from './ChatList';
import { CHAT_THREAD_NOTICE_SX, CHAT_THREAD_TOOL_CHIP_SX } from './ChatThread';

export const CHAT_KIT_SX_REGISTRY = [
  createKitSxEntry('ChatList.rowAction', 'MuiIconButton', CHAT_LIST_ROW_ACTION_SX, 'CHAT_LIST_ROW_ACTION_SX'),
  createKitSxEntry('ChatList.archivedAction', 'MuiButton', CHAT_LIST_ARCHIVED_ACTION_SX, 'CHAT_LIST_ARCHIVED_ACTION_SX'),
  createKitSxEntry('ChatThread.toolChip', 'MuiChip', CHAT_THREAD_TOOL_CHIP_SX, 'CHAT_THREAD_TOOL_CHIP_SX'),
  createKitSxEntry('ChatThread.notice', 'MuiAlert', CHAT_THREAD_NOTICE_SX, 'CHAT_THREAD_NOTICE_SX'),
];
