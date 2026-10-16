import { createKitSxEntry } from '../theme/kitSxEntry';
import { CHAT_COMPOSER_INPUT_SX } from './ChatComposer';
import { CHAT_LIST_ARCHIVED_ACTION_SX, CHAT_LIST_ROW_ACTION_SX } from './ChatList';
import { CHAT_THREAD_NOTICE_SX, CHAT_THREAD_TOOL_CHIP_SX, CHAT_THREAD_TRIMMED_SX } from './ChatThread';
import { CHAT_MODEL_TRIGGER_SX, CHAT_MODEL_ENTRY_SX, CHAT_MODEL_EFFORT_SX, CHAT_MODEL_CLOSE_SX } from './ModelPicker';

export const CHAT_KIT_SX_REGISTRY = [
  createKitSxEntry('ChatComposer.input', 'MuiTextField', CHAT_COMPOSER_INPUT_SX, 'CHAT_COMPOSER_INPUT_SX'),
  createKitSxEntry('ModelPicker.trigger', 'MuiButton', CHAT_MODEL_TRIGGER_SX, 'CHAT_MODEL_TRIGGER_SX'),
  createKitSxEntry('ModelPicker.entry', 'MuiListItemButton', CHAT_MODEL_ENTRY_SX, 'CHAT_MODEL_ENTRY_SX'),
  createKitSxEntry('ModelPicker.effort', 'MuiToggleButton', CHAT_MODEL_EFFORT_SX, 'CHAT_MODEL_EFFORT_SX'),
  createKitSxEntry('ModelPicker.close', 'MuiIconButton', CHAT_MODEL_CLOSE_SX, 'CHAT_MODEL_CLOSE_SX'),
  createKitSxEntry('ChatList.rowAction', 'MuiIconButton', CHAT_LIST_ROW_ACTION_SX, 'CHAT_LIST_ROW_ACTION_SX'),
  createKitSxEntry('ChatList.archivedAction', 'MuiButton', CHAT_LIST_ARCHIVED_ACTION_SX, 'CHAT_LIST_ARCHIVED_ACTION_SX'),
  createKitSxEntry('ChatThread.toolChip', 'MuiChip', CHAT_THREAD_TOOL_CHIP_SX, 'CHAT_THREAD_TOOL_CHIP_SX'),
  createKitSxEntry('ChatThread.trimmed', 'MuiChip', CHAT_THREAD_TRIMMED_SX, 'CHAT_THREAD_TRIMMED_SX'),
  createKitSxEntry('ChatThread.notice', 'MuiAlert', CHAT_THREAD_NOTICE_SX, 'CHAT_THREAD_NOTICE_SX'),
];
