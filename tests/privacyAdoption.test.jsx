// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const onboardingApi = vi.hoisted(() => ({ getOnboardingStepConfig: vi.fn() }));
const notificationApi = vi.hoisted(() => ({ getNotificationPreferences: vi.fn() }));
const profileApi = vi.hoisted(() => ({
  fetchPrivacyStatement: vi.fn(),
  fetchCookieStatement: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('../src/onboarding/api', () => onboardingApi);
vi.mock('../src/notifications/api', () => notificationApi);
vi.mock('../src/auth/authApi', () => profileApi);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', exists: () => false, t: (key) => key },
  }),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { OnboardingProvider, useOnboarding } from '../src/onboarding/OnboardingProvider';
import { ProfileComponent } from '../src/components/ProfileComponent';
import { ProfileStepContent } from '../src/components/ProfileStepContent';
import { CookieConsentStep } from '../src/onboarding/steps/CookieConsentStep';
import { PrivacyProvider } from '../src/privacy/PrivacyProvider';
import { PrivacyNoticeLink } from '../src/privacy/PrivacyNoticeLink';
import { makeChoices, makePrivacyManifest } from './privacyTestUtils';

function onboardingApiClient() {
  return {
    getManifest: vi.fn(async () => makePrivacyManifest()),
    getChoices: vi.fn(async () => makeChoices(makePrivacyManifest(), {})),
    primeCsrf: vi.fn(async () => {}),
    saveChoices: vi.fn(async () => makeChoices(makePrivacyManifest(), {})),
  };
}

function ActiveSteps() {
  const onboarding = useOnboarding();
  return <output data-testid="steps">{onboarding?.activeSteps.map((step) => step.id).join(',')}</output>;
}

function ProfileTestProvider({ children, api = onboardingApiClient() }) {
  return <PrivacyProvider api={api}>{children}</PrivacyProvider>;
}

const baseUser = {
  id: 1,
  username: 'ada',
  email: 'ada@example.test',
  first_name: 'Ada',
  last_name: 'Lovelace',
  accepted_privacy_statement: false,
  accepted_convenience_cookies: true,
};

beforeEach(() => {
  onboardingApi.getOnboardingStepConfig.mockResolvedValue([]);
  notificationApi.getNotificationPreferences.mockResolvedValue({ email_opt_in: false });
  profileApi.fetchPrivacyStatement.mockResolvedValue('Legacy privacy statement');
  profileApi.fetchCookieStatement.mockResolvedValue('Legacy cookie statement');
  profileApi.updateUserProfile.mockImplementation(async (payload) => ({ ...baseUser, ...payload }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('explicit central privacy adoption', () => {
  it('drops only the privacy onboarding prompt in central mode and keeps the legacy default', async () => {
    const user = { ...baseUser, last_name: '' };
    const renderOnboarding = (privacyMode) => render(
      <AuthContext.Provider value={{ user }}>
        <OnboardingProvider privacyMode={privacyMode}><ActiveSteps /></OnboardingProvider>
      </AuthContext.Provider>,
    );

    const legacy = renderOnboarding(undefined);
    await waitFor(() => expect(screen.getByTestId('steps').textContent).toContain('cookie_consent'));
    expect(screen.getByTestId('steps').textContent).toContain('complete_name');
    legacy.unmount();

    renderOnboarding('central');
    await waitFor(() => expect(screen.getByTestId('steps').textContent).toContain('complete_name'));
    expect(screen.getByTestId('steps').textContent).not.toContain('cookie_consent');
    expect(screen.getByTestId('steps').textContent).toContain('browser_push');
  });

  it('removes the privacy/cookie controls and omits both profile fields in central ProfileComponent mode', async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <ProfileTestProvider>
        <AuthContext.Provider value={{ user: baseUser, loading: false }}>
          <ProfileComponent privacyMode="central" onSubmit={onSubmit} showStatements />
        </AuthContext.Provider>
      </ProfileTestProvider>,
    );
    expect(await screen.findByRole('link', { name: 'Privacy.NOTICE_LINK' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Profile.SAVE_BUTTON' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith({ first_name: 'Ada', last_name: 'Lovelace' });
    expect(profileApi.fetchPrivacyStatement).not.toHaveBeenCalled();
    expect(profileApi.fetchCookieStatement).not.toHaveBeenCalled();
  });

  it('keeps legacy profile controls and fields in the default mode', async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <AuthContext.Provider value={{ user: baseUser, loading: false }}>
        <ProfileComponent onSubmit={onSubmit} showStatements={false} />
      </AuthContext.Provider>,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Profile.SAVE_BUTTON' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      accepted_privacy_statement: false,
      accepted_convenience_cookies: true,
    }));
  });

  it('completes names in central ProfileStepContent without terms or privacy checkbox or draft fields', async () => {
    const onComplete = vi.fn();
    const onDraftChange = vi.fn();
    function ProfileHost() {
      const [draft, setDraft] = useState({
        identity: baseUser.id,
        values: { firstName: 'Old draft', lastName: 'Old name', acceptedPrivacy: true, acceptedCookies: true },
        editedFields: ['acceptedPrivacy', 'acceptedCookies'],
      });
      return (
        <ProfileTestProvider>
          <AuthContext.Provider value={{ user: baseUser, login: vi.fn() }}>
            <ProfileStepContent privacyMode="central" draft={draft} onComplete={onComplete} onDraftChange={(next) => { onDraftChange(next); setDraft(next); }} />
          </AuthContext.Provider>
        </ProfileTestProvider>
      );
    }
    render(
      <ProfileHost />,
    );
    expect(await screen.findByRole('link', { name: 'Privacy.NOTICE_LINK' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Profile.FIRST_NAME_LABEL' }), { target: { value: 'Ada edit' } });
    expect(onDraftChange.mock.calls.at(-1)[0].values).toEqual(expect.objectContaining({ firstName: 'Ada edit', lastName: 'Lovelace' }));
    expect(onDraftChange.mock.calls.at(-1)[0].values).not.toHaveProperty('acceptedPrivacy');
    expect(onDraftChange.mock.calls.at(-1)[0].values).not.toHaveProperty('acceptedCookies');
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(profileApi.updateUserProfile).toHaveBeenCalledWith({ first_name: 'Ada edit', last_name: 'Lovelace' });
  });

  it('keeps actual terms acceptance separate in central mode', async () => {
    const termsApi = {
      getAcceptance: vi.fn(async () => ({
        document: { version: 'terms-v2', url: 'https://example.test/terms' }, accepted: false,
      })),
      accept: vi.fn(async () => ({ document: { version: 'terms-v2' }, accepted: true })),
    };
    const onComplete = vi.fn();
    render(
      <ProfileTestProvider>
        <AuthContext.Provider value={{ user: baseUser, login: vi.fn() }}>
          <ProfileStepContent privacyMode="central" termsEnabled termsApi={termsApi} onComplete={onComplete} />
        </AuthContext.Provider>
      </ProfileTestProvider>,
    );
    const termsCheckbox = await screen.findByRole('checkbox');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Privacy.NOTICE_LINK' })).toBeTruthy();
    fireEvent.click(termsCheckbox);
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(profileApi.updateUserProfile).toHaveBeenCalledWith({ first_name: 'Ada', last_name: 'Lovelace' });
    expect(termsApi.accept).toHaveBeenCalledWith('terms-v2');
  });

  it('preserves the legacy CookieConsentStep behavior and public export', async () => {
    const onComplete = vi.fn();
    render(<CookieConsentStep onComplete={onComplete} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    const continueButton = screen.getByRole('button', { name: 'Onboarding.CONTINUE' });
    expect(continueButton.disabled).toBe(true);
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(continueButton);
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(profileApi.updateUserProfile).toHaveBeenCalledWith({
      accepted_privacy_statement: true,
      accepted_convenience_cookies: true,
    });
  });
});
