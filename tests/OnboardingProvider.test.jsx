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

function ActiveStepsProbe() {
  const onboarding = useOnboarding();
  return <span data-testid="active-steps">{onboarding?.activeSteps.map((step) => step.id).join(',')}</span>;
}

function renderProvider({ extraContext, extraSteps, children = <Probe /> } = {}) {
  return render(
    <AuthContext.Provider value={{
      user: {
        id: 1,
        accepted_privacy_statement: true,
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
    }}>
      <OnboardingProvider extraContext={extraContext} extraSteps={extraSteps}>{children}</OnboardingProvider>
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

describe('OnboardingProvider extra context', () => {
  const unreadMessagesCondition = vi.fn((ctx) => (ctx.unreadCount || 0) > 0);
  const unreadMessagesStep = {
    id: 'unread_messages',
    condition: unreadMessagesCondition,
    persistDismissed: false,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    onboardingApi.getOnboardingStepConfig.mockResolvedValue([]);
    notificationsApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: true });
  });

  it('shows an app step when its extra context condition is met', async () => {
    renderProvider({
      extraContext: { unreadCount: 2 },
      extraSteps: [unreadMessagesStep],
      children: <ActiveStepsProbe />,
    });

    await waitFor(() => expect(screen.getByTestId('active-steps').textContent).toContain('unread_messages'));
  });

  it.each([
    ['zero', { unreadCount: 0 }],
    ['omitted', undefined],
  ])('does not show an app step when unreadCount is %s', async (_label, extraContext) => {
    renderProvider({
      extraContext,
      extraSteps: [unreadMessagesStep],
      children: <ActiveStepsProbe />,
    });

    await waitFor(() => expect(unreadMessagesCondition).toHaveBeenCalled());
    expect(screen.getByTestId('active-steps').textContent).not.toContain('unread_messages');
  });
});
