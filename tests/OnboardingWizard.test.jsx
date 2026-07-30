// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params && Object.keys(params).length ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

const onboardingModule = vi.hoisted(() => ({ useOnboarding: vi.fn() }));
vi.mock('../src/onboarding/OnboardingProvider', () => onboardingModule);

import { AuthContext } from '../src/auth/AuthContext';
import { OnboardingWizard } from '../src/onboarding/OnboardingWizard';

function StepBody({ onComplete, onDismiss }) {
  return (
    <div>
      <button onClick={onComplete}>step-complete</button>
      <button onClick={onDismiss}>step-dismiss</button>
    </div>
  );
}

function makeStep(overrides = {}) {
  return {
    id: 'step-1',
    blocking: false,
    persistDismissed: false,
    Component: StepBody,
    ...overrides,
  };
}

function renderWizard({ onboarding, refreshUser = vi.fn().mockResolvedValue() } = {}) {
  onboardingModule.useOnboarding.mockReturnValue(onboarding);
  return render(
    <AuthContext.Provider value={{ refreshUser }}>
      <OnboardingWizard />
    </AuthContext.Provider>,
  );
}

describe('OnboardingWizard regression guard (NOTIF-12 shell extraction)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nothing when there is no active step', () => {
    renderWizard({ onboarding: { activeSteps: [], markStepSeen: vi.fn(), dismissStep: vi.fn(), ctx: {} } });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the single-step SETUP title with no progress bar for exactly one step', () => {
    renderWizard({ onboarding: {
      activeSteps: [makeStep()],
      markStepSeen: vi.fn(),
      dismissStep: vi.fn(),
      ctx: {},
    } });

    expect(screen.getByText('Onboarding.SETUP')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows the step counter and progress bar across multiple steps, advancing on completion', () => {
    renderWizard({ onboarding: {
      activeSteps: [makeStep({ id: 'a' }), makeStep({ id: 'b' })],
      markStepSeen: vi.fn(),
      dismissStep: vi.fn(),
      ctx: {},
    } });

    expect(screen.getByText('Onboarding.STEP_COUNTER:{"current":1,"total":2}')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'step-complete' }));

    expect(screen.getByText('Onboarding.STEP_COUNTER:{"current":2,"total":2}')).toBeTruthy();
  });

  it('marks the current step seen and session-dismisses it once completed, revealing the next step', () => {
    const markStepSeen = vi.fn();
    renderWizard({ onboarding: {
      activeSteps: [makeStep({ id: 'a' }), makeStep({ id: 'b' })],
      markStepSeen,
      dismissStep: vi.fn(),
      ctx: {},
    } });

    expect(markStepSeen).toHaveBeenCalledWith('a');

    fireEvent.click(screen.getByRole('button', { name: 'step-complete' }));

    expect(markStepSeen).toHaveBeenCalledWith('b');
  });

  it('disables escape-key close for a blocking step', () => {
    renderWizard({ onboarding: {
      activeSteps: [makeStep({ blocking: true })],
      markStepSeen: vi.fn(),
      dismissStep: vi.fn(),
      ctx: {},
    } });

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('calls dismissStep only when the dismissed step is persistDismissed', () => {
    const dismissStep = vi.fn();
    renderWizard({ onboarding: {
      activeSteps: [makeStep({ persistDismissed: true })],
      markStepSeen: vi.fn(),
      dismissStep,
      ctx: {},
    } });

    fireEvent.click(screen.getByRole('button', { name: 'step-dismiss' }));

    expect(dismissStep).toHaveBeenCalledWith('step-1');
  });

  it('does not call dismissStep for a non-persistDismissed step on dismiss', () => {
    const dismissStep = vi.fn();
    renderWizard({ onboarding: {
      activeSteps: [makeStep({ persistDismissed: false })],
      markStepSeen: vi.fn(),
      dismissStep,
      ctx: {},
    } });

    fireEvent.click(screen.getByRole('button', { name: 'step-dismiss' }));

    expect(dismissStep).not.toHaveBeenCalled();
  });
});
