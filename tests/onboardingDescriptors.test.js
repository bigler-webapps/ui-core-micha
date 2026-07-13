import { describe, expect, it } from 'vitest';
import { UNIVERSAL_STEP_DESCRIPTORS } from '../src/onboarding/OnboardingProvider';
import { selectActiveSteps } from '../src/onboarding/stepSelection';

const cookieConsentDescriptor = UNIVERSAL_STEP_DESCRIPTORS.find((step) => step.id === 'cookie_consent');
const browserPushDescriptor = UNIVERSAL_STEP_DESCRIPTORS.find((step) => step.id === 'browser_push');

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

describe('browser_push descriptor condition', () => {
  it('is active when push is supported and either channel remains unconfigured', () => {
    expect(browserPushDescriptor.condition({
      pushState: { supported: true, subscribed: false },
      emailOptedIn: true,
    })).toBe(true);
    expect(browserPushDescriptor.condition({
      pushState: { supported: true, subscribed: true },
      emailOptedIn: false,
    })).toBe(true);
  });

  it('is active when push is unsupported and email notifications are not enabled', () => {
    expect(browserPushDescriptor.condition({
      pushState: { supported: false, subscribed: false },
      emailOptedIn: false,
    })).toBe(true);
  });

  it('is inactive when push is unsupported with email notifications enabled or both channels are enabled', () => {
    expect(browserPushDescriptor.condition({
      pushState: { supported: false, subscribed: false },
      emailOptedIn: true,
    })).toBe(false);
    expect(browserPushDescriptor.condition({
      pushState: { supported: true, subscribed: true },
      emailOptedIn: true,
    })).toBe(false);
  });

  it('is excluded after persistent dismissal', () => {
    const activeSteps = selectActiveSteps(
      [browserPushDescriptor],
      { browser_push: true },
      { pushState: { supported: true, subscribed: false }, emailOptedIn: false },
      new Set(['browser_push']),
    );

    expect(activeSteps).toEqual([]);
  });
});
