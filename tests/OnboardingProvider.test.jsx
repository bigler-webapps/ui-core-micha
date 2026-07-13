// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const onboardingApi = vi.hoisted(() => ({
  getOnboardingStepConfig: vi.fn(),
}));
const notificationsApi = vi.hoisted(() => ({
  getNotificationPreferences: vi.fn(),
}));

vi.mock('../src/onboarding/api', () => onboardingApi);
vi.mock('../src/notifications/api', () => notificationsApi);

import { AuthContext } from '../src/auth/AuthContext';
import { OnboardingProvider, useOnboarding } from '../src/onboarding/OnboardingProvider';

function Probe() {
  const onboarding = useOnboarding();
  return <span data-testid="email-opted-in">{String(onboarding?.ctx.emailOptedIn)}</span>;
}

function renderProvider() {
  return render(
    <AuthContext.Provider value={{ user: { id: 1 } }}>
      <OnboardingProvider><Probe /></OnboardingProvider>
    </AuthContext.Provider>,
  );
}

describe('OnboardingProvider notification preferences', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    onboardingApi.getOnboardingStepConfig.mockResolvedValue([]);
  });

  it('populates emailOptedIn from notification preferences', async () => {
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: true });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('email-opted-in').textContent).toBe('true'));
    expect(notificationsApi.getNotificationPreferences).toHaveBeenCalledOnce();
  });

  it('defaults emailOptedIn to false when notification preferences cannot be loaded', async () => {
    notificationsApi.getNotificationPreferences.mockRejectedValue(new Error('unavailable'));

    renderProvider();

    await waitFor(() => expect(notificationsApi.getNotificationPreferences).toHaveBeenCalledOnce());
    expect(screen.getByTestId('email-opted-in').textContent).toBe('false');
  });
});
