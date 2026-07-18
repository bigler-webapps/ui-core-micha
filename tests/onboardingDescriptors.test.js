import { describe, expect, it } from 'vitest';
import { UNIVERSAL_STEP_DESCRIPTORS } from '../src/onboarding/OnboardingProvider';
import { selectActiveSteps } from '../src/onboarding/stepSelection';

const cookieConsentDescriptor = UNIVERSAL_STEP_DESCRIPTORS.find((step) => step.id === 'cookie_consent');
const browserPushDescriptor = UNIVERSAL_STEP_DESCRIPTORS.find((step) => step.id === 'browser_push');
const pwaInstallDescriptor = UNIVERSAL_STEP_DESCRIPTORS.find((step) => step.id === 'pwa_install');

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
  it('is active by default only when neither supported channel is configured', () => {
    expect(browserPushDescriptor.condition({
      pushState: { supported: true, subscribed: false },
      emailOptedIn: false,
    })).toBe(true);
    expect(browserPushDescriptor.condition({
      pushState: { supported: true, subscribed: false },
      emailOptedIn: true,
    })).toBe(false);
    expect(browserPushDescriptor.condition({
      pushState: { supported: true, subscribed: true },
      emailOptedIn: false,
    })).toBe(false);
  });

  it('keeps the legacy condition when configured for all-channels', () => {
    expect(browserPushDescriptor.condition({
      browserPush: { nagUntil: 'all-channels' },
      pushState: { supported: true, subscribed: false },
      emailOptedIn: true,
    })).toBe(true);
    expect(browserPushDescriptor.condition({
      browserPush: { nagUntil: 'all-channels' },
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

describe('pwa_install descriptor condition', () => {
  it('is inactive when the app has not opted in, even if the device could install', () => {
    expect(pwaInstallDescriptor.condition({
      pwaInstallEnabled: false,
      pwaInstall: { deferredPrompt: {}, isStandalone: false, isIos: false },
    })).toBe(false);
  });

  it('is active when opted in and Android/Chrome captured a deferred install prompt', () => {
    expect(pwaInstallDescriptor.condition({
      pwaInstallEnabled: true,
      pwaInstall: { deferredPrompt: {}, isStandalone: false, isIos: false },
    })).toBe(true);
  });

  it('is active when opted in on iOS (no deferred prompt exists there, only the hint)', () => {
    expect(pwaInstallDescriptor.condition({
      pwaInstallEnabled: true,
      pwaInstall: { deferredPrompt: null, isStandalone: false, isIos: true },
    })).toBe(true);
  });

  it('is inactive when opted in but neither a deferred prompt nor iOS applies', () => {
    expect(pwaInstallDescriptor.condition({
      pwaInstallEnabled: true,
      pwaInstall: { deferredPrompt: null, isStandalone: false, isIos: false },
    })).toBe(false);
  });

  it('is inactive once already running standalone, regardless of opt-in or device capability', () => {
    expect(pwaInstallDescriptor.condition({
      pwaInstallEnabled: true,
      pwaInstall: { deferredPrompt: {}, isStandalone: true, isIos: false },
    })).toBe(false);
    expect(pwaInstallDescriptor.condition({
      pwaInstallEnabled: true,
      pwaInstall: { deferredPrompt: null, isStandalone: true, isIos: true },
    })).toBe(false);
  });

  it('is inactive with no pwaInstall context at all', () => {
    expect(pwaInstallDescriptor.condition({ pwaInstallEnabled: true })).toBe(false);
  });
});
