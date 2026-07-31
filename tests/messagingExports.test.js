import { describe, expect, it } from 'vitest';
import { AttachmentList, Composer, ConversationLaunchers, ConversationList, DirectMessageLauncher, MessageBubble, MessagingProvider, MessagingScopeConfig, messagingTranslations, PollCard, ReactionBar, ReadTicks, Thread, useMessaging } from '../src/index';

describe('messaging barrel exports', () => {
  it('exports the provider, hook, standalone list and launchers', () => {
    expect(MessagingProvider).toBeDefined();
    expect(useMessaging).toBeDefined();
    expect(ConversationList).toBeDefined();
    expect(ConversationLaunchers).toBeDefined();
    expect(DirectMessageLauncher).toBeDefined();
    expect(Thread).toBeDefined();
    expect(MessageBubble).toBeDefined();
    expect(ReadTicks).toBeDefined();
    expect(Composer).toBeDefined();
    expect(AttachmentList).toBeDefined();
    expect(ReactionBar).toBeDefined();
    expect(PollCard).toBeDefined();
    expect(MessagingScopeConfig).toBeDefined();
    expect(messagingTranslations).toBeDefined();
  });
});
