// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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
  fireEvent.click(screen.getByRole('button', { name: 'Auth.SIGNUP_SUBMIT' }));
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
});
