import { createKitSxEntry } from '../theme/kitSxEntry';
import {
  CHAT_COMPOSER_STANDARD_ROOT_SX, CHAT_COMPOSER_INPUT_SX, CHAT_COMPOSER_COMPACT_ROOT_SX, CHAT_COMPOSER_CONTEXT_ROW_SX,
  CHAT_COMPOSER_CONTEXT_SX, CHAT_COMPOSER_CONTEXT_ACTIONS_SX, CHAT_COMPOSER_INPUT_ROW_SX,
  CHAT_COMPOSER_COMPACT_FIELD_SX, CHAT_COMPOSER_ACTION_SX, CHAT_COMPOSER_SEND_SX, CHAT_COMPOSER_NOTICE_SX,
  CHAT_COMPOSER_NOTICE_TEXT_SX, CHAT_COMPOSER_NOTICE_ACTION_SX, CHAT_COMPOSER_NOTICE_CLOSE_SX, CHAT_COMPOSER_USAGE_METER_SX,
} from './ChatComposer';
import { CHAT_LIST_ARCHIVED_ACTION_SX, CHAT_LIST_ROW_ACTION_SX } from './ChatList';
import { CHAT_THREAD_NOTICE_SX, CHAT_THREAD_TOOL_CHIP_SX, CHAT_THREAD_TOOL_STEPS_SX, CHAT_THREAD_SCROLL_SX, CHAT_THREAD_TURN_SX } from './ChatThread';
import { CHAT_WORKSPACE_SIDE_PANEL_SX } from './ChatWorkspace';
import { CHAT_MODEL_TRIGGER_SX, CHAT_MODEL_TRIGGER_SHORT_SX, CHAT_MODEL_ENTRY_SX, CHAT_MODEL_ENTRY_CONTENT_SX, CHAT_MODEL_COST_SX, CHAT_MODEL_EFFORT_SX, CHAT_MODEL_CLOSE_SX, CHAT_MODEL_PANEL_SX, CHAT_MODEL_PANEL_SHEET_SX } from './ModelPicker';

export const CHAT_KIT_SX_REGISTRY = [
  createKitSxEntry('ChatComposer.standardRoot', 'MuiStack', CHAT_COMPOSER_STANDARD_ROOT_SX, 'CHAT_COMPOSER_STANDARD_ROOT_SX'),
  createKitSxEntry('ChatWorkspace.sidePanel', 'MuiBox', CHAT_WORKSPACE_SIDE_PANEL_SX, 'CHAT_WORKSPACE_SIDE_PANEL_SX'),
  createKitSxEntry('ChatThread.scroll', 'MuiBox', CHAT_THREAD_SCROLL_SX, 'CHAT_THREAD_SCROLL_SX'),
  createKitSxEntry('ChatThread.turn', 'MuiBox', CHAT_THREAD_TURN_SX, 'CHAT_THREAD_TURN_SX'),
  createKitSxEntry('ChatComposer.input', 'MuiTextField', CHAT_COMPOSER_INPUT_SX, 'CHAT_COMPOSER_INPUT_SX'),
  createKitSxEntry('ChatComposer.compactRoot', 'MuiStack', CHAT_COMPOSER_COMPACT_ROOT_SX, 'CHAT_COMPOSER_COMPACT_ROOT_SX'),
  createKitSxEntry('ChatComposer.contextRow', 'MuiStack', CHAT_COMPOSER_CONTEXT_ROW_SX, 'CHAT_COMPOSER_CONTEXT_ROW_SX'),
  createKitSxEntry('ChatComposer.context', 'MuiBox', CHAT_COMPOSER_CONTEXT_SX, 'CHAT_COMPOSER_CONTEXT_SX'),
  createKitSxEntry('ChatComposer.contextActions', 'MuiBox', CHAT_COMPOSER_CONTEXT_ACTIONS_SX, 'CHAT_COMPOSER_CONTEXT_ACTIONS_SX'),
  createKitSxEntry('ChatComposer.inputRow', 'MuiStack', CHAT_COMPOSER_INPUT_ROW_SX, 'CHAT_COMPOSER_INPUT_ROW_SX'),
  createKitSxEntry('ChatComposer.compactField', 'MuiTextField', CHAT_COMPOSER_COMPACT_FIELD_SX, 'CHAT_COMPOSER_COMPACT_FIELD_SX'),
  createKitSxEntry('ChatComposer.action', 'MuiIconButton', CHAT_COMPOSER_ACTION_SX, 'CHAT_COMPOSER_ACTION_SX'),
  createKitSxEntry('ChatComposer.send', 'MuiIconButton', CHAT_COMPOSER_SEND_SX, 'CHAT_COMPOSER_SEND_SX'),
  createKitSxEntry('ChatComposer.notice', 'MuiBox', CHAT_COMPOSER_NOTICE_SX, 'CHAT_COMPOSER_NOTICE_SX'),
  createKitSxEntry('ChatComposer.noticeText', 'MuiBox', CHAT_COMPOSER_NOTICE_TEXT_SX, 'CHAT_COMPOSER_NOTICE_TEXT_SX'),
  createKitSxEntry('ChatComposer.noticeAction', 'MuiButton', CHAT_COMPOSER_NOTICE_ACTION_SX, 'CHAT_COMPOSER_NOTICE_ACTION_SX'),
  createKitSxEntry('ChatComposer.noticeClose', 'MuiIconButton', CHAT_COMPOSER_NOTICE_CLOSE_SX, 'CHAT_COMPOSER_NOTICE_CLOSE_SX'),
  createKitSxEntry('ChatComposer.usageMeter', 'MuiLinearProgress', CHAT_COMPOSER_USAGE_METER_SX, 'CHAT_COMPOSER_USAGE_METER_SX'),
  createKitSxEntry('ModelPicker.trigger', 'MuiButton', CHAT_MODEL_TRIGGER_SX, 'CHAT_MODEL_TRIGGER_SX'),
  createKitSxEntry('ModelPicker.triggerShort', 'MuiButton', CHAT_MODEL_TRIGGER_SHORT_SX, 'CHAT_MODEL_TRIGGER_SHORT_SX'),
  createKitSxEntry('ModelPicker.entry', 'MuiListItemButton', CHAT_MODEL_ENTRY_SX, 'CHAT_MODEL_ENTRY_SX'),
  createKitSxEntry('ModelPicker.entryContent', 'MuiBox', CHAT_MODEL_ENTRY_CONTENT_SX, 'CHAT_MODEL_ENTRY_CONTENT_SX'),
  createKitSxEntry('ModelPicker.cost', 'MuiTypography', CHAT_MODEL_COST_SX, 'CHAT_MODEL_COST_SX'),
  createKitSxEntry('ModelPicker.effort', 'MuiToggleButton', CHAT_MODEL_EFFORT_SX, 'CHAT_MODEL_EFFORT_SX'),
  createKitSxEntry('ModelPicker.close', 'MuiIconButton', CHAT_MODEL_CLOSE_SX, 'CHAT_MODEL_CLOSE_SX'),
  createKitSxEntry('ModelPicker.panel', 'MuiBox', CHAT_MODEL_PANEL_SX, 'CHAT_MODEL_PANEL_SX'),
  createKitSxEntry('ModelPicker.panelSheet', 'MuiBox', CHAT_MODEL_PANEL_SHEET_SX, 'CHAT_MODEL_PANEL_SHEET_SX'),
  createKitSxEntry('ChatList.rowAction', 'MuiIconButton', CHAT_LIST_ROW_ACTION_SX, 'CHAT_LIST_ROW_ACTION_SX'),
  createKitSxEntry('ChatList.archivedAction', 'MuiButton', CHAT_LIST_ARCHIVED_ACTION_SX, 'CHAT_LIST_ARCHIVED_ACTION_SX'),
  createKitSxEntry('ChatThread.toolChip', 'MuiChip', CHAT_THREAD_TOOL_CHIP_SX, 'CHAT_THREAD_TOOL_CHIP_SX'),
  createKitSxEntry('ChatThread.toolSteps', 'MuiStack', CHAT_THREAD_TOOL_STEPS_SX, 'CHAT_THREAD_TOOL_STEPS_SX'),
  createKitSxEntry('ChatThread.notice', 'MuiAlert', CHAT_THREAD_NOTICE_SX, 'CHAT_THREAD_NOTICE_SX'),
];
