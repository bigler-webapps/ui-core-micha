import { describe, expect, it } from 'vitest';
import { PlanPicker, SubscriptionSection, TokenBalanceBadge, TokenCostPreview, AccessEndedBanner, useBilling, createBillingApi, defaultBillingApi, billingTranslations } from '../src/index';

describe('public billing exports', () => {
  it('exports the shared subscription and token surfaces', () => {
    for (const value of [PlanPicker, SubscriptionSection, TokenBalanceBadge, TokenCostPreview, AccessEndedBanner, useBilling, createBillingApi, defaultBillingApi, billingTranslations]) expect(value).toBeDefined();
  });
});
