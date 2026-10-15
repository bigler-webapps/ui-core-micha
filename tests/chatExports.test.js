import { describe, expect, it } from 'vitest';
import { ChatWorkspace, ChatList, ChatThread, ChatComposer, ModelPicker, MarkdownReply, useChatSocket, createChatApi, defaultChatApi, chatTranslations } from '../src/index';
describe('chat exports', () => { it('exports the public chat surface', () => { for (const value of [ChatWorkspace, ChatList, ChatThread, ChatComposer, ModelPicker, MarkdownReply, useChatSocket, createChatApi, defaultChatApi, chatTranslations]) expect(value).toBeDefined(); }); });
