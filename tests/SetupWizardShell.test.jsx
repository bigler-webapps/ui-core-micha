// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (key === 'Onboarding.STEP_COUNTER' ? `Step ${params.current} of ${params.total}` : key),
  }),
}));

import { SetupWizardShell } from '../src/onboarding/SetupWizardShell';

afterEach(() => cleanup());

const STEPS = [
  { id: 'account', label: 'Account' },
  { id: 'profile', label: 'Profile' },
  { id: 'review', label: 'Review' },
];

function ControlledWizard({ busy = false, error, onPrimary = vi.fn(), primaryForm }) {
  const [current, setCurrent] = useState('account');
  const [draft, setDraft] = useState('');
  return (
    <SetupWizardShell
      steps={STEPS}
      currentStepId={current}
      completedStepIds={current === 'profile' ? ['account'] : []}
      reachableStepIds={current === 'profile' ? ['account'] : []}
      onSelectStep={setCurrent}
      title={current === 'profile' ? 'Complete your profile' : undefined}
      onBack={current === 'profile' ? () => setCurrent('account') : undefined}
      backLabel="Back"
      onPrimary={primaryForm ? undefined : onPrimary}
      primaryForm={primaryForm}
      primaryLabel="Next"
      busy={busy}
      error={error}
    >
      {current === 'account' ? (
        <input aria-label="Draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
      ) : (
        <p data-testid="draft-copy">{draft}</p>
      )}
      <button type="button" onClick={() => setCurrent('profile')}>Host next</button>
    </SetupWizardShell>
  );
}

describe('SetupWizardShell', () => {
  it('keeps the host draft across steps and marks the current, completed and unreachable steps', () => {
    render(<ControlledWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Draft' }), { target: { value: 'kept value' } });
    fireEvent.click(screen.getByRole('button', { name: 'Host next' }));

    expect(screen.getByTestId('draft-copy').textContent).toBe('kept value');
    expect(screen.getByRole('button', { name: 'Profile' }).getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('Step 2 of 3').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('button', { name: 'Review' }).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('textbox', { name: 'Draft' }).value).toBe('kept value');

    fireEvent.click(screen.getByRole('button', { name: 'Host next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Account, Onboarding.COMPLETED' }));
    expect(screen.getByRole('textbox', { name: 'Draft' }).value).toBe('kept value');
  });

  it('defaults the title to the step label and lets the host override it', () => {
    render(<ControlledWizard />);
    expect(screen.getByRole('heading', { level: 1, name: 'Account' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Host next' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Complete your profile' })).toBeTruthy();
  });

  it('moves focus to the new title on a step change, not on first render, and to a new error', async () => {
    const view = render(<ControlledWizard />);
    expect(document.activeElement).toBe(document.body);

    fireEvent.click(screen.getByRole('button', { name: 'Host next' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Complete your profile' })));

    view.rerender(<ControlledWizard error="Something failed" />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')));
  });

  it('ignores the primary action while busy and while its promise is pending', async () => {
    const busyAction = vi.fn();
    const busyView = render(<ControlledWizard busy onPrimary={busyAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(busyAction).not.toHaveBeenCalled();
    busyView.unmount();

    let resolve;
    const action = vi.fn(() => new Promise((done) => { resolve = done; }));
    render(<ControlledWizard onPrimary={action} />);
    const next = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(action).toHaveBeenCalledTimes(1);
    expect(next.disabled).toBe(true);

    resolve();
    await waitFor(() => expect(next.disabled).toBe(false));
  });

  it('submits a content form natively through primaryForm', () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <SetupWizardShell steps={STEPS} currentStepId="account" primaryForm="step-form" primaryLabel="Next">
        <form id="step-form" onSubmit={onSubmit}>
          <input aria-label="Name" />
        </form>
      </SetupWizardShell>,
    );
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next.getAttribute('type')).toBe('submit');
    expect(next.getAttribute('form')).toBe('step-form');
    fireEvent.click(next);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
