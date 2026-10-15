import { describe, expect, it } from 'vitest';
import { ChatWorkspace, ChatList, ChatThread, ChatComposer, ModelPicker, useChatSocket, createChatApi, defaultChatApi, CHAT_KIT_SX_REGISTRY } from '../src/entries/chat';
import { MarkdownReply } from '../src/entries/markdown';
import { chatTranslations } from '../src/index';
describe('chat exports', () => { it('exports the public chat surface', () => { for (const value of [ChatWorkspace, ChatList, ChatThread, ChatComposer, ModelPicker, MarkdownReply, useChatSocket, createChatApi, defaultChatApi, CHAT_KIT_SX_REGISTRY, chatTranslations]) expect(value).toBeDefined(); }); });
