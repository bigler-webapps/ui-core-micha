// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';

const authApi = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  fetchUsersList: vi.fn(),
  sendAdminInvite: vi.fn(),
  updateUserRole: vi.fn(),
}));

vi.mock('../src/auth/authApi', () => authApi);

import { authTranslations } from '../src/i18n/authTranslations';
import { BulkInviteCsvTab } from '../src/components/BulkInviteCsvTab';
import { UserInviteComponent } from '../src/components/UserInviteComponent';
import { UserListComponent } from '../src/components/UserListComponent';

const germanResources = Object.fromEntries(
  Object.entries(authTranslations).map(([key, value]) => [key, value.de]),
);
const englishResources = Object.fromEntries(
  Object.entries(authTranslations).map(([key, value]) => [key, value.en]),
);
const i18n = i18next.createInstance();
i18n.init({
  lng: 'de',
  fallbackLng: 'de',
  resources: { de: { translation: germanResources } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});
const englishI18n = i18next.createInstance();
englishI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: englishResources } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

const ENGLISH_DEFAULTS = [
  'All Users',
  'Search',
  'Search users...',
  'Rows per page:',
  'of 1',
  'Successful Login',
  'Are you sure you want to delete this user?',
  'Invite a new user',
  'Bulk Invite via CSV',
  'Upload a CSV file containing email addresses. Header "email" is supported.',
  'Upload CSV',
  'Send Invites',
  'Invitation sent.',
];

function withGermanI18n(children) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

function withEnglishI18n(children) {
  return <I18nextProvider i18n={englishI18n}>{children}</I18nextProvider>;
}

function expectNoEnglishDefaults() {
  const text = document.body.textContent;
  for (const english of ENGLISH_DEFAULTS) {
    expect(text).not.toContain(english);
  }
}

describe('German user and invite screen translations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.fetchUsersList.mockResolvedValue([
      {
        id: 1,
        email: 'person@example.com',
        first_name: 'Ada',
        role: 'student',
        is_new: true,
        successful_login: true,
      },
    ]);
    authApi.sendAdminInvite.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the empty-list and CSV-error strings in German too', async () => {
    authApi.fetchUsersList.mockResolvedValue([]);
    render(withGermanI18n(<UserListComponent currentUser={{ id: 99, is_superuser: true, role: 'admin' }} />));
    await waitFor(() => expect(screen.getByText('Keine Benutzer gefunden.')).toBeTruthy());

    cleanup();

    render(withGermanI18n(<BulkInviteCsvTab inviteFn={vi.fn()} />));
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: { files: [new File([''], 'empty.csv', { type: 'text/csv' })] },
    });
    await waitFor(() => expect(screen.getByText('Keine gültigen E-Mail-Adressen in der CSV-Datei gefunden.')).toBeTruthy());
    expectNoEnglishDefaults();
  });

  it('renders UserListComponent in German, including pagination and action feedback', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(withGermanI18n(
      <UserListComponent
        currentUser={{ id: 99, is_superuser: true, role: 'admin' }}
        extraRowActions={[{
          key: 'failing-action',
          label: 'Aktion',
          onClick: () => Promise.reject({}),
        }]}
      />,
    ));

    await waitFor(() => expect(screen.getByText('Alle Benutzer')).toBeTruthy());
    expect(screen.getByLabelText('Suche')).toBeTruthy();
    expect(screen.getByPlaceholderText('Benutzer suchen...')).toBeTruthy();
    expect(screen.getByText('1–1 von 1')).toBeTruthy();
    for (const german of ['Neu', 'Erfolgreiche Anmeldung', 'Rolle', 'Aktionen', 'Zeilen pro Seite:', 'Löschen']) {
      expect(screen.getByText(german)).toBeTruthy();
    }

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    expect(confirm).toHaveBeenCalledWith('Möchten Sie diesen Benutzer wirklich löschen?');

    fireEvent.click(screen.getByRole('button', { name: 'Aktion' }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Vorgang fehlgeschlagen.'));
    expectNoEnglishDefaults();
  });

  it('renders the pagination range in English when the locale is English', async () => {
    render(withEnglishI18n(<UserListComponent currentUser={{ id: 99, is_superuser: true, role: 'admin' }} />));

    await waitFor(() => expect(screen.getByText('1–1 of 1')).toBeTruthy());
  });

  it('actually goes through the translation key, not a coincidental match with MUI\'s own default', async () => {
    // The real English wording is deliberately identical to MUI's own hardcoded default text
    // (both "{from}-{to} of {count}"), so the assertion above would still pass even if
    // labelDisplayedRows were reverted to unset entirely. Swap in a distinctive marker for just
    // this one key to prove the render genuinely resolves it through i18next, not MUI's fallback
    // (UCM-I18N-5 review, tests lens).
    const markerI18n = i18next.createInstance();
    markerI18n.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: {
          translation: { ...englishResources, 'UserList.DISPLAYED_ROWS': '__MARKER__ {{from}}-{{to}}/{{count}}' },
        },
      },
      keySeparator: false,
      nsSeparator: false,
      interpolation: { escapeValue: false },
    });

    render(
      <I18nextProvider i18n={markerI18n}>
        <UserListComponent currentUser={{ id: 99, is_superuser: true, role: 'admin' }} />
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByText('__MARKER__ 1-1/1')).toBeTruthy());
  });

  it('renders UserInviteComponent in German and translates the success message', async () => {
    render(withGermanI18n(<UserInviteComponent />));

    expect(screen.getByText('Neuen Benutzer einladen')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Einladen' }));

    await waitFor(() => expect(screen.getByText('Einladung gesendet.')).toBeTruthy());
    expectNoEnglishDefaults();
  });

  it('renders BulkInviteCsvTab in German with translated progress and table copy', async () => {
    render(withGermanI18n(
      <BulkInviteCsvTab inviteFn={vi.fn().mockResolvedValue({})} />,
    ));

    expect(screen.getByText('Masseneinladung per CSV')).toBeTruthy();
    expect(screen.getByText('CSV-Datei mit E-Mail-Adressen hochladen. Header "email" wird unterstützt.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CSV hochladen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Einladungen senden' })).toBeTruthy();

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: { files: [new File(['email\nperson@example.com'], 'users.csv', { type: 'text/csv' })] },
    });
    await waitFor(() => expect(screen.getByText('1 E-Mail-Adressen geladen')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Einladungen senden' }));
    await waitFor(() => expect(screen.getByText('1 / 1 Einladungen gesendet.')).toBeTruthy());
    for (const german of ['Einladung gesendet.', 'Erfolgreich', 'Status', 'Details']) {
      expect(screen.getByText(german)).toBeTruthy();
    }
    expect(document.body.textContent).toContain('1 / 1 verarbeitet');
    expect(document.body.textContent).toContain('1 erfolgreich');
    expectNoEnglishDefaults();
  });
});
