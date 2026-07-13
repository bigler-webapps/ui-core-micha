// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const authApi = vi.hoisted(() => ({
  fetchCookieStatement: vi.fn(),
  fetchPrivacyStatement: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

import { CookieConsentStep } from '../src/onboarding/steps/CookieConsentStep';

describe('CookieConsentStep (combined privacy + cookies)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.fetchPrivacyStatement.mockResolvedValue('privacy text');
    authApi.fetchCookieStatement.mockResolvedValue('cookie text');
    authApi.updateUserProfile.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('does not submit while the privacy checkbox is unchecked', async () => {
    const onComplete = vi.fn();
    render(<CookieConsentStep onComplete={onComplete} />);

    const button = screen.getByRole('button', { name: 'Onboarding.CONTINUE' });
    expect(button.disabled).toBe(true);
    fireEvent.click(button);

    await waitFor(() => expect(authApi.updateUserProfile).not.toHaveBeenCalled());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('submits both fields with cookies unchecked (privacy only)', async () => {
    const onComplete = vi.fn();
    render(<CookieConsentStep onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Onboarding.PRIVACY_AGREEMENT_LABEL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Onboarding.CONTINUE' }));

    await waitFor(() => expect(authApi.updateUserProfile).toHaveBeenCalledWith({
      accepted_privacy_statement: true,
      accepted_convenience_cookies: false,
    }));
    expect(onComplete).toHaveBeenCalled();
  });

  it('submits both fields with cookies checked', async () => {
    const onComplete = vi.fn();
    render(<CookieConsentStep onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Onboarding.PRIVACY_AGREEMENT_LABEL' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Onboarding.COOKIES_OPT_IN_LABEL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Onboarding.CONTINUE' }));

    await waitFor(() => expect(authApi.updateUserProfile).toHaveBeenCalledWith({
      accepted_privacy_statement: true,
      accepted_convenience_cookies: true,
    }));
    expect(onComplete).toHaveBeenCalled();
  });
});
