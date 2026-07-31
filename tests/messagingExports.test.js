import { describe, expect, it } from 'vitest';
import { ConversationLaunchers, ConversationList, MessagingProvider, messagingTranslations, useMessaging } from '../src/index';

describe('messaging barrel exports', () => {
  it('exports the provider, hook, standalone list and launchers', () => {
    expect(MessagingProvider).toBeDefined();
    expect(useMessaging).toBeDefined();
    expect(ConversationList).toBeDefined();
    expect(ConversationLaunchers).toBeDefined();
    expect(messagingTranslations).toBeDefined();
  });
});
