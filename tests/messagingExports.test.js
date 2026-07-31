import { describe, expect, it } from 'vitest';
import { MessagingProvider, useMessaging } from '../src/index';

describe('messaging barrel exports', () => {
  it('exports the provider and hook', () => {
    expect(MessagingProvider).toBeDefined();
    expect(useMessaging).toBeDefined();
  });
});
