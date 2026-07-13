import { describe, expect, it } from 'vitest';
import { UNIVERSAL_STEP_DESCRIPTORS } from '../src/onboarding/OnboardingProvider';

const cookieConsentDescriptor = UNIVERSAL_STEP_DESCRIPTORS.find((step) => step.id === 'cookie_consent');

describe('cookie_consent descriptor condition', () => {
  it('is active when the user has not accepted the privacy statement, regardless of cookies', () => {
    expect(cookieConsentDescriptor.condition({
      user: { accepted_privacy_statement: false, accepted_convenience_cookies: false },
    })).toBe(true);
    expect(cookieConsentDescriptor.condition({
      user: { accepted_privacy_statement: false, accepted_convenience_cookies: true },
    })).toBe(true);
  });

  it('is inactive once the privacy statement is accepted, even if cookies were declined', () => {
    expect(cookieConsentDescriptor.condition({
      user: { accepted_privacy_statement: true, accepted_convenience_cookies: false },
    })).toBe(false);
  });

  it('is inactive with no user', () => {
    expect(cookieConsentDescriptor.condition({ user: null })).toBe(false);
  });
});
