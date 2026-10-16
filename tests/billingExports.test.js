import { describe, expect, it } from 'vitest';
import { AccessEndedBanner, TokenBalanceBadge, TokenCostPreview, billingTranslations, createBillingApi, defaultBillingApi, useBilling } from '../src/index';

describe('billing exports', () => {
  it('exports the chunk-A public surface', () => {
    for (const value of [AccessEndedBanner, TokenBalanceBadge, TokenCostPreview, billingTranslations, createBillingApi, defaultBillingApi, useBilling]) expect(value).toBeDefined();
  });
});
