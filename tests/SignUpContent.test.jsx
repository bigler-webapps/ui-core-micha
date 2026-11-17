// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  submitRegistrationRequest: vi.fn(),
  startSocialLogin: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => ({ submitRegistrationRequest: mocks.submitRegistrationRequest }));
vi.mock('../src/utils/authService', () => ({ startSocialLogin: mocks.startSocialLogin }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (key === 'Auth.INVITE_SENT') return `sent:${params.email}`;
      if (params?.provider) return `${key}:${params.provider}`;
      return key;
    },
    i18n: { exists: () => false, t: (key) => key },
  }),
}));
vi.mock('../src/components/SocialLoginButtons', () => ({
  SocialLoginButtons: ({ onProviderClick }) => (
    <button type="button" onClick={() => onProviderClick('google')}>Google</button>
  ),
}));
vi.mock('../src/components/TurnstileWidget', async () => {
  const ReactModule = await import('react');
  return {
    TurnstileWidget: ReactModule.forwardRef(({ onToken }, ref) => {
      ReactModule.useImperativeHandle(ref, () => ({ reset: mocks.reset }));
      return <button type="button" onClick={() => onToken('captcha')}>captcha</button>;
    }),
  };
});

import { AuthContext } from '../src/auth/AuthContext';
import { SignUpContent } from '../src/components/SignUpContent';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const AUTH_METHODS = {
  signup_modes: ['self_signup_open'],
  turnstile_site_key: 'site',
  social_login: true,
  social_providers: ['google', 'microsoft'],
};

function renderSignUp(props = {}) {
  return render(
    <AuthContext.Provider value={{ authMethods: AUTH_METHODS }}>
      <SignUpContent {...props} />
    </AuthContext.Provider>,
  );
}

function submitEmail(email = 'a@example.test') {
  fireEvent.change(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ }), { target: { value: email } });
  fireEvent.click(screen.getByText('captcha'));
  fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT_OPEN' }));
}

describe('SignUpContent', () => {
  it('reports only the email after an embedded signup and shows the confirmation instruction', async () => {
    const onSubmitted = vi.fn();
    mocks.submitRegistrationRequest.mockResolvedValue({ code: 'Auth.INVITE_SENT' });
    renderSignUp({ onSubmitted });

    submitEmail();

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('a@example.test'));
    expect(onSubmitted.mock.calls[0]).toHaveLength(1);
    expect(mocks.submitRegistrationRequest).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@example.test', mode: 'self_signup_open', turnstileToken: 'captcha' }),
    );
    expect(screen.getByText('sent:a@example.test')).toBeTruthy();
    expect(screen.getByText('Auth.CONFIRMATION_EMAIL_INSTRUCTION')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: /Auth.EMAIL_LABEL/ })).toBeNull();
  });

  it('starts the provider sign-in with the validated continuation and shows the transition', async () => {
    mocks.startSocialLogin.mockResolvedValue(undefined);
    renderSignUp({ showProviders: true, continuation: '/setup' });

    fireEvent.click(screen.getByText('Google'));

    await waitFor(() => expect(mocks.startSocialLogin).toHaveBeenCalledWith('google', { callbackUrl: '/setup' }));
    expect(screen.getByText('Auth.PROVIDER_TRANSITION:Google')).toBeTruthy();
  });

  it('hides the provider entry unless the host asks for it', () => {
    renderSignUp();
    expect(screen.queryByText('Google')).toBeNull();
  });

  it('resets Turnstile after a failed protected signup', async () => {
    mocks.submitRegistrationRequest.mockRejectedValueOnce({ code: 'Auth.INVITE_FAILED' });
    renderSignUp();

    submitEmail();

    await waitFor(() => expect(mocks.reset).toHaveBeenCalled());
    expect(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ })).toBeTruthy();
  });

  it('renders an accessible host field and submits its edited value', async () => {
    mocks.submitRegistrationRequest.mockResolvedValue({ code: 'Auth.INVITE_SENT' });
    const onSubmitted = vi.fn();
    function HostForm() {
      const [organization, setOrganization] = React.useState('');
      return (
        <AuthContext.Provider value={{ authMethods: AUTH_METHODS }}>
          <SignUpContent
            renderAdditionalField={({ disabled }) => (
              <label>Optional organization<input aria-label="Optional organization" disabled={disabled} name="organization" value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
            )}
            additionalRegistrationData={{ organization }}
            onSubmitted={onSubmitted}
          />
        </AuthContext.Provider>
      );
    }
    render(<HostForm />);

    const field = screen.getByRole('textbox', { name: 'Optional organization' });
    field.focus();
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: 'Research Lab' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ }), {
      target: { value: 'a@example.test' },
    });
    fireEvent.click(screen.getByText('captcha'));
    expect(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT_OPEN' }).type).toBe('submit');
    fireEvent.submit(field.closest('form'));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('a@example.test'));
    expect(mocks.submitRegistrationRequest).toHaveBeenCalledWith(expect.objectContaining({
      additionalRegistrationData: { organization: 'Research Lab' },
    }));
    expect(window.location.search).toBe('');
    expect(localStorage.length).toBe(0);
  });

  it('reaches the host field by keyboard and submits its edited value with Enter', async () => {
    mocks.submitRegistrationRequest.mockResolvedValue({ code: 'Auth.INVITE_SENT' });
    const onSubmitted = vi.fn();
    function HostForm() {
      const [organization, setOrganization] = React.useState('');
      return (
        <AuthContext.Provider value={{ authMethods: { signup_modes: ['self_signup_open'] } }}>
          <SignUpContent
            renderAdditionalField={({ disabled }) => (
              <label>Optional organization<input disabled={disabled} value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
            )}
            additionalRegistrationData={{ organization }}
            onSubmitted={onSubmitted}
          />
        </AuthContext.Provider>
      );
    }
    const keyboard = userEvent.setup();
    render(<HostForm />);
    await keyboard.tab();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ }));
    await keyboard.keyboard('keyboard@example.test');
    await keyboard.tab();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Optional organization' }));
    await keyboard.keyboard('Research Lab{Enter}');
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('keyboard@example.test'));
    expect(mocks.submitRegistrationRequest).toHaveBeenCalledWith(expect.objectContaining({
      additionalRegistrationData: { organization: 'Research Lab' },
    }));
  });

  it('passes the host value to the request helper and disables the field while submitting', async () => {
    let resolveRequest;
    mocks.submitRegistrationRequest.mockReturnValueOnce(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    renderSignUp({
      renderAdditionalField: ({ disabled }) => (
        <label>
          Optional organization
          <input aria-label="Optional organization" disabled={disabled} />
        </label>
      ),
      additionalRegistrationData: { organization: '' },
    });
    const field = screen.getByRole('textbox', { name: 'Optional organization' });
    fireEvent.change(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ }), {
      target: { value: 'a@example.test' },
    });
    fireEvent.click(screen.getByText('captcha'));
    fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT_OPEN' }));

    await waitFor(() => expect(field.disabled).toBe(true));
    expect(mocks.submitRegistrationRequest).toHaveBeenCalledWith(expect.objectContaining({
      additionalRegistrationData: { organization: '' },
    }));
    resolveRequest({ code: 'Auth.INVITE_SENT' });
    await waitFor(() => expect(field.disabled).toBe(false));
  });

  it('preserves retry after an extension submission error', async () => {
    mocks.submitRegistrationRequest
      .mockRejectedValueOnce({ code: 'Auth.INVITE_FAILED' })
      .mockResolvedValueOnce({ code: 'Auth.INVITE_SENT' });
    const onSubmitted = vi.fn();
    renderSignUp({
      renderAdditionalField: () => <label>Optional organization<input aria-label="Optional organization" /></label>,
      additionalRegistrationData: { organization: 'Research Lab' },
      onSubmitted,
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Auth.EMAIL_LABEL/ }), {
      target: { value: 'a@example.test' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Optional organization' }), {
      target: { value: 'Research Lab' },
    });
    fireEvent.click(screen.getByText('captcha'));
    fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT_OPEN' }));
    await screen.findByText('Auth.INVITE_FAILED');
    expect(screen.getByRole('textbox', { name: 'Optional organization' })).toBeTruthy();

    fireEvent.click(screen.getByText('captcha'));
    fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT_OPEN' }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('a@example.test'));
    expect(mocks.submitRegistrationRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({
      additionalRegistrationData: { organization: 'Research Lab' },
    }));
    expect(screen.getByText('Auth.CONFIRMATION_EMAIL_INSTRUCTION')).toBeTruthy();
  });
});
