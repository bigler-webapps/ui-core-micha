import apiClient from './apiClient';
import { HEADLESS_BASE, USERS_BASE, ACCESS_CODES_BASE } from './authConfig';
import { normaliseApiError } from '../utils/auth-errors'; // Beachte den Pfad zu deiner errors.js

// --- Internal Helper for CSRF ---
function getCsrfToken() {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

// -----------------------------
// Session & User Core
// -----------------------------

export async function fetchCurrentUser() {
  // Bootstrap-Probe: 401 darf nicht in einen Login-Redirect umschlagen,
  // damit Public-Landings auf "/" sichtbar bleiben. `skipAuthRedirect` ist eine
  // client-seitige axios-Config-Property und wird nicht ans Backend gesendet.
  const res = await apiClient.get(`${USERS_BASE}/current/`, {
    skipAuthRedirect: true,
  });
  return res.data;
}

export async function fetchAuthMethods() {
  const res = await apiClient.get('/api/auth-methods/');
  return res.data || {};
}

export async function fetchAuthPolicy() {
  try {
    const res = await apiClient.get(`${USERS_BASE}/auth-policy/`);
    return res.data || {};
  } catch (error) {
    throw normaliseApiError(error, 'Auth.AUTH_POLICY_FETCH_FAILED');
  }
}

export async function updateAuthPolicy(payload) {
  try {
    const res = await apiClient.patch(`${USERS_BASE}/auth-policy/`, payload);
    return res.data || {};
  } catch (error) {
    throw normaliseApiError(error, 'Auth.AUTH_POLICY_UPDATE_FAILED');
  }
}

export async function updateUserProfile(data) {
  try {
    const res = await apiClient.patch(`${USERS_BASE}/current/`, data);
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.PROFILE_UPDATE_FAILED');
  }
}

function normalizeStatementText(data) {
  if (typeof data === 'string') return data;
  if (data && typeof data.content === 'string') return data.content;
  return '';
}

export async function fetchPrivacyStatement() {
  const res = await apiClient.get('/api/utils/privacy/');
  return normalizeStatementText(res.data);
}

export async function fetchCookieStatement() {
  const res = await apiClient.get('/api/utils/cookie/');
  return normalizeStatementText(res.data);
}

export async function fetchHeadlessSession() {
  const res = await apiClient.get(`${HEADLESS_BASE}/auth/session`);
  return res.data;
}

export async function logoutSession() {
  try {
    const headers = {};
    const token = getCsrfToken();
    if (token) headers['X-CSRFToken'] = token;

    await apiClient.delete(`${HEADLESS_BASE}/auth/session`, { headers });
  } catch (error) {
    // 401/404 beim Logout ignorieren wir
    if (error.response && [401, 404, 410].includes(error.response.status)) return;
    console.error('Logout error:', error);
  }
}

// -----------------------------
// Authentication: Password & MFA
// -----------------------------

export async function loginWithPassword(email, password) {
  try {
    await apiClient.post(`${HEADLESS_BASE}/auth/login`, { email, password });
    // Nach erfolgreichem Login User holen
    const user = await fetchCurrentUser();
    return { user, needsMfa: false };
  } catch (error) {
    const status = error.response?.status;
    const body = error.response?.data;
    
    // Prüfen auf Allauth Headless MFA Flow (401 + flows)
    const flows = body?.data?.flows || body?.flows || [];
    const mfaFlow = Array.isArray(flows) ? flows.find((f) => f.id === 'mfa_authenticate') : null;

    if (status === 401 && mfaFlow && mfaFlow.is_pending) {
      return { needsMfa: true, availableTypes: mfaFlow.types || [] };
    }
    
    // 409 = Already logged in
    if (status === 409) {
        const user = await fetchCurrentUser();
        return { user, needsMfa: false };
    }

    throw normaliseApiError(error, 'Auth.LOGIN_FAILED');
  }
}

export async function authenticateWithMFA({ code, credential }) {
  const payload = {};
  if (code) payload.code = code;
  if (credential) payload.credential = credential;

  try {
    const res = await apiClient.post(`${HEADLESS_BASE}/auth/2fa/authenticate`, payload);
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.MFA_AUTHENTICATE_FAILED');
  }
}

// -----------------------------
// Password Management
// -----------------------------

export async function requestPasswordReset(email) {
  try {
    await apiClient.post(`${USERS_BASE}/reset-request/`, { email });
  } catch (error) {
    throw normaliseApiError(error, 'Auth.RESET_REQUEST_FAILED');
  }
}

export async function resetPasswordWithKey(key, newPassword) {
  try {
    await apiClient.post(`${HEADLESS_BASE}/auth/password/reset/key`, { key, password: newPassword });
  } catch (error) {
    throw normaliseApiError(error, 'Auth.RESET_WITH_KEY_FAILED');
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    await apiClient.post(`${HEADLESS_BASE}/account/password/change`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  } catch (error) {
    throw normaliseApiError(error, 'Auth.PASSWORD_CHANGE_FAILED');
  }
}

// Custom UID/Token Reset Flow
export async function verifyResetToken(uid, token) {
  try {
    const res = await apiClient.get(`${USERS_BASE}/password-reset/${uid}/${token}/`);
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.RESET_LINK_INVALID');
  }
}

export async function setNewPassword(uid, token, newPassword) {
  try {
    const res = await apiClient.post(`${USERS_BASE}/password-reset/${uid}/${token}/`, { new_password: newPassword });
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.RESET_PASSWORD_FAILED');
  }
}

// -----------------------------
// WebAuthn / Passkeys (API Calls Only)
// -----------------------------

export async function getPasskeyRegistrationOptions() {
  const res = await apiClient.get(`${HEADLESS_BASE}/account/authenticators/webauthn`, {
    params: { passwordless: true }
  });
  // Extrahiere nested data Struktur von Allauth
  const data = res.data?.data || res.data;
  return data.creation_options || data;
}

export async function completePasskeyRegistration(credentialJson, name) {
  const res = await apiClient.post(`${HEADLESS_BASE}/account/authenticators/webauthn`, {
    credential: credentialJson,
    name
  });
  return res.data;
}

export async function getPasskeyLoginOptions() {
  const res = await apiClient.get(`${HEADLESS_BASE}/auth/webauthn/login`);
  const data = res.data?.data || res.data;
  return data.request_options || data;
}

export async function completePasskeyLogin(credentialJson) {
  const res = await apiClient.post(`${HEADLESS_BASE}/auth/webauthn/login`, {
    credential: credentialJson
  });
  return res.data;
}

export async function fetchPasskeys() {
  try {
    const res = await apiClient.get(`${USERS_BASE}/passkeys/`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    throw normaliseApiError(error, 'Auth.PASSKEY_LIST_FAILED');
  }
}

export async function deletePasskey(id) {
  try {
    await apiClient.delete(`${USERS_BASE}/passkeys/${id}/`);
  } catch (error) {
    throw normaliseApiError(error, 'Auth.PASSKEY_DELETE_FAILED');
  }
}

// -----------------------------
// Authenticators (TOTP & Recovery)
// -----------------------------

export async function fetchAuthenticators() {
  const res = await apiClient.get(`${HEADLESS_BASE}/account/authenticators`);
  const body = res.data || {};
  return Array.isArray(body.data) ? body.data : (Array.isArray(body) ? body : []);
}

export async function requestTotpKey() {
  try {
    const res = await apiClient.get(`${HEADLESS_BASE}/account/authenticators/totp`);
    const data = res.data?.data || res.data;
    return { exists: true, authenticator: data };
  } catch (error) {
    // 404 bedeutet: Noch kein TOTP eingerichtet -> Wir bekommen das Secret zum Einrichten
    if (error.response?.status === 404) {
      const meta = error.response.data?.meta || {};
      return {
        exists: false,
        secret: meta.secret,
        key_uri: meta.totp_url || meta.totp_uri || meta.key_uri,
      };
    }
    throw normaliseApiError(error, 'Auth.TOTP_REQUEST_FAILED');
  }
}

export async function activateTotp(code) {
  try {
    await apiClient.post(`${HEADLESS_BASE}/account/authenticators/totp`, { code });
  } catch (error) {
    throw normaliseApiError(error, 'Auth.TOTP_ACTIVATE_FAILED');
  }
}

export async function deactivateTotp() {
  try {
    await apiClient.delete(`${HEADLESS_BASE}/account/authenticators/totp`);
  } catch (error) {
    throw normaliseApiError(error, 'Auth.TOTP_DEACTIVATE_FAILED');
  }
}

export async function fetchRecoveryCodes() {
  try {
    // Versuch, Codes zu laden
    const res = await apiClient.get(`${HEADLESS_BASE}/account/authenticators/recovery-codes`);
    return res.data?.data || res.data;
  } catch (error) {
    // 404 -> Noch keine Codes -> Generieren
    if (error.response?.status === 404) {
      const resPost = await apiClient.post(`${HEADLESS_BASE}/account/authenticators/recovery-codes`, {});
      return resPost.data?.data || resPost.data;
    }
    throw normaliseApiError(error, 'Auth.RECOVERY_CODES_FETCH_FAILED');
  }
}

export async function generateRecoveryCodes() {
  try {
    const res = await apiClient.post(`${HEADLESS_BASE}/account/authenticators/recovery-codes`, {});
    return res.data?.data || res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.RECOVERY_CODES_GENERATE_FAILED');
  }
}

// -----------------------------
// Invitations & Access Codes
// -----------------------------

export async function fetchAccessCodes() {
  try {
    const res = await apiClient.get(`${ACCESS_CODES_BASE}/`);
    return res.data || [];
  } catch (error) {
    throw normaliseApiError(error, 'Auth.ACCESS_CODE_LIST_FAILED');
  }
}

export async function createAccessCode(code) {
  try {
    const res = await apiClient.post(`${ACCESS_CODES_BASE}/`, { code });
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.ACCESS_CODE_SAVE_FAILED');
  }
}

export async function deleteAccessCode(id) {
  try {
    await apiClient.delete(`${ACCESS_CODES_BASE}/${id}/`);
  } catch (error) {
    throw normaliseApiError(error, 'Auth.ACCESS_CODE_DELETE_FAILED');
  }
}

export async function validateAccessCode(code) {
  try {
    const res = await apiClient.post(`${ACCESS_CODES_BASE}/validate/`, { code });
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.ACCESS_CODE_INVALID_OR_INACTIVE');
  }
}

export async function sendAdminInvite(email) {
  try {
    const res = await apiClient.post(`${USERS_BASE}/invite/`, { email });
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.INVITE_FAILED');
  }
}

export async function submitRegistrationRequest({
  email,
  mode,
  accessCode,
  registrationContextToken,
  registrationContext,
}) {
  const payload = { email, mode };
  if (accessCode) payload.access_code = accessCode;
  if (registrationContextToken) {
    payload.registration_context_token = registrationContextToken;
  }
  if (registrationContext) {
    payload.registration_context = registrationContext;
  }

  try {
    const res = await apiClient.post(`${USERS_BASE}/register-request/`, payload);
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.INVITE_FAILED');
  }
}

export async function createSignupQr(payload = {}) {
  try {
    const res = await apiClient.post(`${USERS_BASE}/signup-qr/`, payload);
    return res.data || {};
  } catch (error) {
    throw normaliseApiError(error, 'Auth.SIGNUP_QR_CREATE_FAILED');
  }
}

// -----------------------------
// Recovery Support (Admin/Support Side)
// -----------------------------

export async function requestMfaSupportHelp(emailOrIdentifier, message = '') {
  const res = await apiClient.post(`${USERS_BASE}/mfa/support-help/`, {
    email: emailOrIdentifier,
    message
  });
  return res.data;
}

export async function fetchRecoveryRequests(status = 'pending') {
  const res = await apiClient.get('/api/support/recovery-requests/', { params: { status } });
  return res.data;
}

export async function approveRecoveryRequest(id, supportNote) {
  const res = await apiClient.post(`/api/support/recovery-requests/${id}/approve/`, {
    support_note: supportNote || ''
  });
  return res.data;
}

export async function rejectRecoveryRequest(id, supportNote) {
  const res = await apiClient.post(`/api/support/recovery-requests/${id}/reject/`, {
    support_note: supportNote || ''
  });
  return res.data;
}

export async function loginWithRecoveryPassword(email, password, token) {
  try {
    await apiClient.post(`/api/support/recovery-requests/recovery-login/${token}/`, {
      email,
      password
    });
  } catch (error) {
    throw normaliseApiError(error, 'Auth.RECOVERY_LOGIN_FAILED');
  }
  const user = await fetchCurrentUser();
  return { user, needsMfa: false };
}
/**
 * Ruft eine Liste von Benutzern ab (oft mit Pagination/Search).
 * Backend: GET /api/users/
 */
export async function fetchUsersList(params = {}) {
  try {
    // params kann { page: 1, search: "...", ordering: "email" } enthalten
    const res = await apiClient.get(`${USERS_BASE}/`, { params });
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.USER_LIST_FAILED');
  }
}

/**
 * Löscht einen Benutzer.
 * Backend: DELETE /api/users/{id}/
 */
export async function deleteUser(userId) {
  try {
    await apiClient.delete(`${USERS_BASE}/${userId}/`);
  } catch (error) {
    throw normaliseApiError(error, 'Auth.USER_DELETE_FAILED');
  }
}

/**
 * Aktualisiert die Rolle eines Benutzers über die Custom Action.
 * Backend: PATCH /api/users/{id}/update-role/
 */
export async function updateUserRole(userId, newRole) {
  try {
    const res = await apiClient.patch(`${USERS_BASE}/${userId}/update-role/`, {
      role: newRole,
    });
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.USER_ROLE_UPDATE_FAILED');
  }
}

/**
 * Aktualisiert den Support-Status (z.B. is_support_agent Flag).
 * Backend: PATCH /api/users/{id}/ (Standard DRF Update mit Nested Profile)
 */
export async function updateUserSupportStatus(userId, isSupportAgent) {
  try {
    // Backend expects flat field names, DRF maps via `source="profile.is_support_agent"`
    const payload = {
      is_support_agent: isSupportAgent,
    };
    const res = await apiClient.patch(`${USERS_BASE}/${userId}/`, payload);
    return res.data;
  } catch (error) {
    throw normaliseApiError(error, 'Auth.USER_SUPPORT_UPDATE_FAILED');
  }
}
