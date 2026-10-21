// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const authApi = vi.hoisted(() => ({
  fetchPrivacyStatement: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { exists: () => false, t: (key) => key } }),
}));

import { AuthContext } from '../src/auth/AuthContext';
import { ProfileStepContent } from '../src/components/ProfileStepContent';

const DOCUMENT = { app: 'demo', version: 'v2', url: 'https://example.test/terms' };

const makeUser = (patch = {}) => ({
  id: 1,
  email: 'a@example.test',
  username: 'a',
  first_name: 'First',
  last_name: 'Last',
  accepted_privacy_statement: false,
  accepted_convenience_cookies: false,
  ...patch,
});

function makeTermsApi({ accepted = false, acceptResult } = {}) {
  return {
    getAcceptance: vi.fn().mockResolvedValue({ document: DOCUMENT, accepted, accepted_at: null }),
    accept: vi.fn().mockImplementation(acceptResult || (() => Promise.resolve({ document: DOCUMENT, accepted: true, accepted_at: 'now' }))),
  };
}

function renderProfile({ user = makeUser(), login = vi.fn(), ...props } = {}) {
  const onComplete = vi.fn();
  const view = render(
    <AuthContext.Provider value={{ user, login }}>
      <ProfileStepContent onComplete={onComplete} {...props} />
    </AuthContext.Provider>,
  );
  return { ...view, onComplete, login };
}

const requiredCheckbox = () => screen.getAllByRole('checkbox')[0];
const cookiesCheckbox = () => screen.getAllByRole('checkbox')[1];
const firstName = () => screen.getByRole('textbox', { name: /Profile.FIRST_NAME_LABEL/ });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Profile.SAVE_BUTTON' }));

beforeEach(() => {
  authApi.updateUserProfile.mockImplementation((payload) => Promise.resolve(makeUser({ ...payload })));
  authApi.fetchPrivacyStatement.mockResolvedValue('Privacy statement text');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProfileStepContent with terms', () => {
  it.each([
    ['a provider-only user', makeUser()],
    ['a privacy-only user', makeUser({ accepted_privacy_statement: true })],
  ])('leaves the statement unchecked for %s without current-version evidence', async (_label, user) => {
    const termsApi = makeTermsApi();
    renderProfile({ user, termsEnabled: true, termsApi });
    await waitFor(() => expect(requiredCheckbox().disabled).toBe(false));
    expect(requiredCheckbox().checked).toBe(false);
  });

  it('pre-checks only when the server reports current-version terms and privacy acceptance', async () => {
    renderProfile({ user: makeUser({ accepted_privacy_statement: true }), termsEnabled: true, termsApi: makeTermsApi({ accepted: true }) });
    await waitFor(() => expect(requiredCheckbox().checked).toBe(true));
  });

  it('writes the profile, then accepts the offered version, and completes only after both', async () => {
    const termsApi = makeTermsApi();
    const { onComplete, login } = renderProfile({ termsEnabled: true, termsApi });
    await waitFor(() => expect(requiredCheckbox().disabled).toBe(false));

    fireEvent.change(firstName(), { target: { value: '  Edited ' } });
    fireEvent.click(requiredCheckbox());
    fireEvent.click(cookiesCheckbox());
    save();

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(authApi.updateUserProfile).toHaveBeenCalledWith({
      first_name: 'Edited',
      last_name: 'Last',
      accepted_privacy_statement: true,
      accepted_convenience_cookies: true,
    });
    expect(termsApi.accept).toHaveBeenCalledWith('v2');
    expect(login).toHaveBeenCalled();
  });

  it('keeps the cookie preference optional and independent of the statement', async () => {
    const termsApi = makeTermsApi();
    const { onComplete } = renderProfile({ termsEnabled: true, termsApi });
    await waitFor(() => expect(requiredCheckbox().disabled).toBe(false));

    fireEvent.click(cookiesCheckbox());
    expect(requiredCheckbox().checked).toBe(false);
    save();
    expect(screen.getByText('Auth.TERMS_PRIVACY_REQUIRED')).toBeTruthy();
    expect(authApi.updateUserProfile).not.toHaveBeenCalled();

    fireEvent.click(cookiesCheckbox());
    fireEvent.click(requiredCheckbox());
    save();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(authApi.updateUserProfile).toHaveBeenCalledWith(expect.objectContaining({ accepted_convenience_cookies: false }));
  });

  it('keeps the step incomplete on a stale version, shows the current document and keeps the names', async () => {
    const current = { ...DOCUMENT, version: 'v3', url: 'https://example.test/terms-v3' };
    const termsApi = makeTermsApi({
      acceptResult: () => Promise.reject({
        response: { status: 409, data: { detail: 'version_mismatch', document: current, accepted: false, accepted_at: null } },
      }),
    });
    const { onComplete } = renderProfile({ termsEnabled: true, termsApi });
    await waitFor(() => expect(requiredCheckbox().disabled).toBe(false));

    fireEvent.change(firstName(), { target: { value: 'Keep me' } });
    fireEvent.click(requiredCheckbox());
    save();

    await waitFor(() => expect(screen.getByText('Auth.TERMS_VERSION_CHANGED')).toBeTruthy());
    expect(onComplete).not.toHaveBeenCalled();
    expect(firstName().value).toBe('Keep me');
    expect(requiredCheckbox().checked).toBe(false);
    expect(screen.getByRole('link', { name: 'Auth.TERMS_LINK_LABEL' }).getAttribute('href')).toBe('https://example.test/terms-v3');

    termsApi.accept.mockResolvedValueOnce({ document: current, accepted: true, accepted_at: 'now' });
    fireEvent.click(requiredCheckbox());
    save();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(termsApi.accept).toHaveBeenLastCalledWith('v3');
  });

  it('completes when the stale-version answer says the current version is already accepted', async () => {
    const termsApi = makeTermsApi({
      acceptResult: () => Promise.reject({
        response: { status: 409, data: { detail: 'version_mismatch', document: { ...DOCUMENT, version: 'v3' }, accepted: true, accepted_at: 'then' } },
      }),
    });
    const { onComplete } = renderProfile({ termsEnabled: true, termsApi });
    await waitFor(() => expect(requiredCheckbox().disabled).toBe(false));
    fireEvent.click(requiredCheckbox());
    save();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it('does not complete when the acceptance write fails', async () => {
    const termsApi = makeTermsApi({ acceptResult: () => Promise.reject({ response: { status: 500 } }) });
    const { onComplete } = renderProfile({ termsEnabled: true, termsApi });
    await waitFor(() => expect(requiredCheckbox().disabled).toBe(false));

    fireEvent.click(requiredCheckbox());
    save();

    await waitFor(() => expect(screen.getByText('Auth.TERMS_ACCEPTANCE_FAILED')).toBeTruthy());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('fails closed when the app has no terms configured', async () => {
    const termsApi = {
      getAcceptance: vi.fn().mockRejectedValue({ response: { status: 404, data: { detail: 'terms_not_configured' } } }),
      accept: vi.fn(),
    };
    const { onComplete } = renderProfile({ termsEnabled: true, termsApi });

    await waitFor(() => expect(screen.getByText('Auth.TERMS_LOAD_FAILED')).toBeTruthy());
    expect(requiredCheckbox().disabled).toBe(true);
    save();
    expect(onComplete).not.toHaveBeenCalled();
    expect(termsApi.accept).not.toHaveBeenCalled();
  });

  it('makes no terms request when terms are not enabled', async () => {
    const termsApi = makeTermsApi();
    const { onComplete } = renderProfile({ user: makeUser({ accepted_privacy_statement: true }), termsApi });

    expect(requiredCheckbox().checked).toBe(true);
    save();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(termsApi.getAcceptance).not.toHaveBeenCalled();
    expect(termsApi.accept).not.toHaveBeenCalled();
  });

  it('keeps same-person edits across a refresh and resets the draft for another person', async () => {
    function Host() {
      const [draft, setDraft] = useState(null);
      const [user, setUser] = useState(makeUser());
      return (
        <AuthContext.Provider value={{ user, login: vi.fn() }}>
          <button type="button" onClick={() => setUser(makeUser({ last_name: 'Server refresh' }))}>refresh</button>
          <button type="button" onClick={() => setUser(makeUser({ id: 2, first_name: 'Other person' }))}>switch</button>
          <ProfileStepContent draft={draft} onDraftChange={setDraft} />
        </AuthContext.Provider>
      );
    }
    render(<Host />);

    fireEvent.change(firstName(), { target: { value: 'Local edit' } });
    fireEvent.click(screen.getByText('refresh'));
    expect(firstName().value).toBe('Local edit');
    expect(screen.getByRole('textbox', { name: /Profile.LAST_NAME_LABEL/ }).value).toBe('Server refresh');

    fireEvent.click(screen.getByText('switch'));
    expect(firstName().value).toBe('Other person');
  });

  it('ignores a second submit while the first is still saving', async () => {
    let resolveUpdate;
    authApi.updateUserProfile.mockImplementationOnce(() => new Promise((done) => { resolveUpdate = done; }));
    const { onComplete } = renderProfile({ user: makeUser({ accepted_privacy_statement: true }), formId: 'profile-step' });
    const form = document.getElementById('profile-step');

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(authApi.updateUserProfile).toHaveBeenCalledTimes(1);

    resolveUpdate(makeUser({ accepted_privacy_statement: true }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it('moves focus to a validation error', () => {
    renderProfile({ user: makeUser({ first_name: '' }) });
    save();
    expect(screen.getByText('Auth.PROFILE_NAME_REQUIRED')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('alert'));
    expect(authApi.updateUserProfile).not.toHaveBeenCalled();
  });

  it('submits through a host form id without its own button', async () => {
    const { onComplete } = renderProfile({ user: makeUser({ accepted_privacy_statement: true }), formId: 'profile-step' });
    expect(screen.queryByRole('button', { name: 'Profile.SAVE_BUTTON' })).toBeNull();
    fireEvent.submit(document.getElementById('profile-step'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });
});
