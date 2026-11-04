// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const activeLocale = vi.hoisted(() => ({ language: 'en' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key, values = {}) => {
    const translations = {
      en: {
        'Billing.DECLARATION_KIND_LABEL': 'Declaration', 'Billing.DECLARATION_CANCELLATION': 'Cancellation', 'Billing.DECLARATION_WITHDRAWAL': 'Withdrawal', 'Billing.DECLARATION_NAME': 'Full name', 'Billing.DECLARATION_EMAIL': 'Email address', 'Billing.DECLARATION_CONTRACT_HINT': 'Contract details', 'Billing.DECLARATION_REQUESTED_END_DATE': 'Requested end date', 'Billing.DECLARATION_REASON': 'Reason', 'Billing.DECLARATION_MESSAGE': 'Message', 'Billing.DECLARATION_SUBMIT': 'Submit declaration', 'Billing.DECLARATION_SUBMITTING': 'Submitting', 'Billing.DECLARATION_RECEIVED': 'Declaration received', 'Billing.DECLARATION_REFERENCE': 'Reference: {{reference}}', 'Billing.DECLARATION_RECEIVED_AT': 'Received on {{date}}', 'Billing.DECLARATION_SAVE': 'Save acknowledgement', 'Billing.DECLARATION_PRINT': 'Print', 'Billing.DECLARATION_REQUIRED': 'This field is required', 'Billing.DECLARATION_INVALID_EMAIL': 'Enter a valid email address', 'Billing.DECLARATION_TOO_LONG': 'This text is too long', 'Billing.DECLARATION_REASON_REQUIRED': 'Enter a reason for an extraordinary cancellation', 'Billing.DECLARATION_ERROR': 'The declaration could not be submitted', 'Billing.DECLARATION_CONFIRM_TITLE': 'Confirm the declaration email', 'Billing.DECLARATION_CONFIRM': 'Confirm email', 'Billing.DECLARATION_CONFIRM_SUCCESS': 'Declaration {{reference}} confirmed', 'Billing.DECLARATION_CONFIRM_ERROR': 'This confirmation link could not be verified', 'Billing.CANCEL_TYPE_LABEL': 'Cancellation type', 'Billing.CANCEL_ORDINARY': 'Ordinary cancellation', 'Billing.CANCEL_EXTRAORDINARY': 'Extraordinary cancellation', 'Billing.LOADING': 'Loading',
      },
      de: {
        'Billing.DECLARATION_KIND_LABEL': 'Erklärung', 'Billing.DECLARATION_CANCELLATION': 'Kündigung', 'Billing.DECLARATION_WITHDRAWAL': 'Widerruf', 'Billing.DECLARATION_NAME': 'Vor- und Nachname', 'Billing.DECLARATION_EMAIL': 'E-Mail-Adresse', 'Billing.DECLARATION_CONTRACT_HINT': 'Vertragsangabe', 'Billing.DECLARATION_REQUESTED_END_DATE': 'Gewünschtes Vertragsende', 'Billing.DECLARATION_REASON': 'Begründung', 'Billing.DECLARATION_MESSAGE': 'Nachricht', 'Billing.DECLARATION_SUBMIT': 'Erklärung absenden', 'Billing.DECLARATION_SUBMITTING': 'Wird übermittelt', 'Billing.DECLARATION_RECEIVED': 'Erklärung eingegangen', 'Billing.DECLARATION_REFERENCE': 'Referenz: {{reference}}', 'Billing.DECLARATION_RECEIVED_AT': 'Eingegangen am {{date}}', 'Billing.DECLARATION_SAVE': 'Bestätigung speichern', 'Billing.DECLARATION_PRINT': 'Drucken', 'Billing.DECLARATION_REQUIRED': 'Dieses Feld ist erforderlich', 'Billing.DECLARATION_INVALID_EMAIL': 'Bitte geben Sie eine gültige E-Mail-Adresse ein', 'Billing.DECLARATION_TOO_LONG': 'Der Text ist zu lang', 'Billing.DECLARATION_REASON_REQUIRED': 'Bitte geben Sie eine Begründung ein', 'Billing.DECLARATION_ERROR': 'Die Erklärung konnte nicht übermittelt werden', 'Billing.DECLARATION_CONFIRM_TITLE': 'E-Mail-Adresse für die Erklärung bestätigen', 'Billing.DECLARATION_CONFIRM': 'E-Mail bestätigen', 'Billing.DECLARATION_CONFIRM_SUCCESS': 'Erklärung {{reference}} bestätigt', 'Billing.DECLARATION_CONFIRM_ERROR': 'Dieser Bestätigungslink konnte nicht überprüft werden', 'Billing.CANCEL_TYPE_LABEL': 'Art der Kündigung', 'Billing.CANCEL_ORDINARY': 'Ordentliche Kündigung', 'Billing.CANCEL_EXTRAORDINARY': 'Ausserordentliche Kündigung', 'Billing.LOADING': 'Wird geladen',
      },
    };
    let result = translations[activeLocale.language]?.[key] || key;
    for (const [name, value] of Object.entries(values || {})) result = result.replaceAll(`{{${name}}}`, String(value));
    return result;
  },
  i18n: activeLocale,
}) }));

import { DeclarationForm } from '../src/billing/DeclarationForm';
import { DeclarationConfirm } from '../src/billing/DeclarationConfirm';

let savedBlob;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  activeLocale.language = 'en';
  savedBlob = null;
  vi.stubGlobal('Blob', class TestBlob { constructor(parts) { this.content = parts.join(''); } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((blob) => { savedBlob = blob; return 'blob:declaration'; }) });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  cleanup();
  if (originalCreateObjectURL === undefined) delete URL.createObjectURL;
  else Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
  if (originalRevokeObjectURL === undefined) delete URL.revokeObjectURL;
  else Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
  vi.unstubAllGlobals();
});

const fillContact = () => {
  fireEvent.change(screen.getByRole('textbox', { name: /Full name|Vor- und Nachname/ }), { target: { value: 'Alex Example' } });
  fireEvent.change(screen.getByRole('textbox', { name: /Email address|E-Mail-Adresse/ }), { target: { value: 'alex@example.test' } });
};

describe('public declaration form', () => {
  it('validates required fields, extraordinary reasons and length limits', async () => {
    const api = { primeDeclarationCsrf: vi.fn(), submitDeclaration: vi.fn() };
    render(<DeclarationForm api={api} />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit declaration' }));
    expect(screen.getAllByText('This field is required')).toHaveLength(2);
    expect(api.submitDeclaration).not.toHaveBeenCalled();
    fillContact();
    fireEvent.click(screen.getByLabelText('Extraordinary cancellation'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit declaration' }));
    expect(await screen.findByText('Enter a reason for an extraordinary cancellation')).toBeTruthy();
    expect(api.submitDeclaration).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /Full name/ }).maxLength).toBe(200);
    expect(screen.getByRole('textbox', { name: /Email address/ }).maxLength).toBe(254);
    expect(screen.getByRole('textbox', { name: /Contract details/ }).maxLength).toBe(200);
    fireEvent.change(screen.getByRole('textbox', { name: /Reason/ }), { target: { value: 'x'.repeat(2001) } });
    expect(screen.getByRole('textbox', { name: /Reason/ }).maxLength).toBe(2000);
    fireEvent.change(screen.getByRole('textbox', { name: /Message/ }), { target: { value: 'x'.repeat(2001) } });
    expect(screen.getByRole('textbox', { name: /Message/ }).maxLength).toBe(2000);
    fireEvent.click(screen.getByRole('button', { name: 'Submit declaration' }));
    expect(await screen.findAllByText('This text is too long')).toHaveLength(2);
    expect(api.submitDeclaration).not.toHaveBeenCalled();
  });

  it.each(['cancellation', 'withdrawal'])('submits a %s declaration once and shows a saveable acknowledgement', async (kind) => {
    let finish;
    const api = {
      primeDeclarationCsrf: vi.fn().mockResolvedValue({}),
      submitDeclaration: vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve; })),
    };
    render(<DeclarationForm api={api} kind={kind} legalNotice={<span>Seller information</span>} />);
    fillContact();
    fireEvent.change(screen.getByLabelText('Contract details'), { target: { value: 'Order 42' } });
    const submit = screen.getByRole('button', { name: 'Submit declaration' });
    fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(api.primeDeclarationCsrf).toHaveBeenCalledOnce());
    await waitFor(() => expect(api.submitDeclaration).toHaveBeenCalledOnce());
    const body = api.submitDeclaration.mock.calls[0][0];
    expect(body).toMatchObject({ kind, name: 'Alex Example', email: 'alex@example.test', contract_hint: 'Order 42' });
    if (kind === 'cancellation') expect(body).toMatchObject({ cancellation_type: 'ordinary' });
    else expect(body).not.toHaveProperty('cancellation_type');
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    finish({ reference: 'D-123', kind, received_at: '2026-02-03T10:00:00Z', submitted: { email: 'another-account@example.test' } });
    expect(await screen.findByText('Declaration received')).toBeTruthy();
    expect(screen.getByText('Reference: D-123')).toBeTruthy();
    expect(screen.getByText(/Received on/)).toBeTruthy();
    expect(screen.getByText('Alex Example')).toBeTruthy();
    expect(screen.getByText('alex@example.test')).toBeTruthy();
    expect(screen.queryByText('another-account@example.test')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save acknowledgement' }));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(savedBlob).toBeTruthy();
    expect(savedBlob.content || savedBlob.parts?.join('') || '').toContain('D-123');
    expect(savedBlob.content || savedBlob.parts?.join('') || '').toContain('Alex Example');
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });

  it('switches kind and submits an extraordinary cancellation with its date and reason', async () => {
    const api = { primeDeclarationCsrf: vi.fn().mockResolvedValue({}), submitDeclaration: vi.fn().mockResolvedValue({ reference: 'D-9', received_at: '2026-02-03T10:00:00Z' }) };
    const { unmount } = render(<DeclarationForm api={api} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Withdrawal' }));
    expect(screen.queryByRole('radiogroup', { name: 'Cancellation type' })).toBeNull();
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'Submit declaration' }));
    await waitFor(() => expect(api.submitDeclaration).toHaveBeenCalledOnce());
    expect(api.submitDeclaration.mock.calls[0][0]).toMatchObject({ kind: 'withdrawal' });
    unmount();

    const api2 = { primeDeclarationCsrf: vi.fn().mockResolvedValue({}), submitDeclaration: vi.fn().mockResolvedValue({ reference: 'D-10', received_at: '2026-02-03T10:00:00Z' }) };
    render(<DeclarationForm api={api2} />);
    expect(screen.getByRole('radiogroup', { name: 'Cancellation type' })).toBeTruthy();
    fillContact();
    fireEvent.click(screen.getByRole('radio', { name: 'Extraordinary cancellation' }));
    fireEvent.change(screen.getByLabelText('Requested end date'), { target: { value: '2026-03-31' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Reason/ }), { target: { value: 'Service no longer provided' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit declaration' }));
    await waitFor(() => expect(api2.submitDeclaration).toHaveBeenCalledOnce());
    expect(api2.submitDeclaration.mock.calls[0][0]).toMatchObject({ kind: 'cancellation', cancellation_type: 'extraordinary', requested_end_date: '2026-03-31', reason: 'Service no longer provided' });
    const heading = await screen.findByText('Declaration received');
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('localises the saved acknowledgement', async () => {
    activeLocale.language = 'de';
    const api = { primeDeclarationCsrf: vi.fn().mockResolvedValue({}), submitDeclaration: vi.fn().mockResolvedValue({ reference: 'D-11', received_at: '2026-02-03T10:00:00Z' }) };
    render(<DeclarationForm api={api} kind="withdrawal" />);
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'Erklärung absenden' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Bestätigung speichern' }));
    expect(savedBlob.content).toContain('Referenz: D-11');
    expect(savedBlob.content).toContain('Vor- und Nachname: Alex Example');
    expect(savedBlob.content).not.toContain('Reference:');
  });

  it('keeps typed values after a network failure and retries without priming CSRF again', async () => {
    const api = {
      primeDeclarationCsrf: vi.fn().mockResolvedValue({}),
      submitDeclaration: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ reference: 'D-456', received_at: '2026-02-03T10:00:00Z' }),
    };
    render(<DeclarationForm api={api} kind="withdrawal" />);
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'Submit declaration' }));
    expect(await screen.findByText('The declaration could not be submitted')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /Full name/ }).value).toBe('Alex Example');
    expect(screen.getByRole('textbox', { name: /Email address/ }).value).toBe('alex@example.test');
    fireEvent.click(screen.getByRole('button', { name: 'Submit declaration' }));
    expect(await screen.findByText('Reference: D-456')).toBeTruthy();
    expect(api.primeDeclarationCsrf).toHaveBeenCalledOnce();
    expect(api.submitDeclaration).toHaveBeenCalledTimes(2);
  });

  it('renders its fields in German and English', () => {
    const api = { primeDeclarationCsrf: vi.fn(), submitDeclaration: vi.fn() };
    const { unmount } = render(<DeclarationForm api={api} />);
    expect(screen.getByRole('textbox', { name: /Full name/ })).toBeTruthy();
    unmount();
    activeLocale.language = 'de';
    render(<DeclarationForm api={api} />);
    expect(screen.getByRole('textbox', { name: /Vor- und Nachname/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Erklärung absenden' })).toBeTruthy();
  });
});

describe('public declaration confirmation', () => {
  it('posts only on explicit confirmation, then shows success and ignores a second click', async () => {
    let finish;
    const onDone = vi.fn();
    const api = { confirmDeclaration: vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve; })) };
    render(<DeclarationConfirm api={api} token="confirm-token" onDone={onDone} />);
    expect(api.confirmDeclaration).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: 'Confirm email' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(api.confirmDeclaration).toHaveBeenCalledOnce();
    expect(api.confirmDeclaration).toHaveBeenCalledWith('confirm-token');
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    finish({ declaration: { reference: 'D-789' } });
    expect(await screen.findByText('Declaration D-789 confirmed')).toBeTruthy();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('shows a generic error for an invalid token', async () => {
    const api = { confirmDeclaration: vi.fn().mockRejectedValue({ response: { status: 400, data: { code: 'invalid_token' } } }) };
    render(<DeclarationConfirm api={api} token="bad-token" />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email' }));
    expect(await screen.findByText('This confirmation link could not be verified')).toBeTruthy();
    expect(screen.queryByText('invalid_token')).toBeNull();
    expect(api.confirmDeclaration).toHaveBeenCalledOnce();
  });
});
