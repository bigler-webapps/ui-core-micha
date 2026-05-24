import { 
  getPasskeyRegistrationOptions, 
  completePasskeyRegistration, 
  getPasskeyLoginOptions, 
  completePasskeyLogin, 
  fetchCurrentUser,
  authenticateWithMFA 
} from '../auth/authApi';

import { 
    ensureWebAuthnSupport, 
    serializeCredential 
} from '../utils/webauthn';
import { normaliseApiError } from '../utils/auth-errors';
import apiClient from '../auth/apiClient';
import { HEADLESS_BASE } from '../auth/authConfig'; 

// HILFSFUNKTION: Entpackt die Optionen, falls sie in 'publicKey' stecken
function resolveWebAuthnOptions(options) {
    if (options && options.publicKey) {
        return options.publicKey;
    }
    return options;
}

export async function registerPasskey(name = 'Passkey') {
  ensureWebAuthnSupport();

  // 1. Options vom Server
  const optionsEnvelope = await getPasskeyRegistrationOptions();
  // optionsEnvelope ist bei dir: { publicKey: { ... } } oder { creation_options: { publicKey: {...} } }

  // Extrahiere die eigentlichen publicKey-Options
  const publicKeyJson =
    (optionsEnvelope.creation_options && optionsEnvelope.creation_options.publicKey) ||
    optionsEnvelope.publicKey ||
    optionsEnvelope;

  let credential;
  try {
    const publicKey = window.PublicKeyCredential.parseCreationOptionsFromJSON(
      publicKeyJson,
    );
    // Wichtig: create({ publicKey: ... })
    credential = await navigator.credentials.create({ publicKey });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw normaliseApiError(
        new Error('Auth.PASSKEY_CANCELLED'),
        'Auth.PASSKEY_CANCELLED',
      );
    }
    throw normaliseApiError(err, 'Auth.PASSKEY_CREATE_FAILED');
  }

  const credentialJson = serializeCredential(credential);
  return completePasskeyRegistration(credentialJson, name);
}

export async function loginWithPasskey() {
    ensureWebAuthnSupport();
    
    // 1. Get Challenge
    const requestOptions = await getPasskeyLoginOptions();
    
    // 2. Browser Sign
    let assertion;
    try {
        // FIX: Erst entpacken
        const optionsJson = resolveWebAuthnOptions(requestOptions);
        
        // Dann parsen
        const publicKeyOptions =
          window.PublicKeyCredential.parseRequestOptionsFromJSON(optionsJson);
        assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });
    } catch (err) {
         if (err.name === 'NotAllowedError') {
            throw normaliseApiError(new Error('Auth.PASSKEY_CANCELLED'), 'Auth.PASSKEY_CANCELLED');
         }
         throw err;
    }

    // 3. Complete
    const credentialJson = serializeCredential(assertion);
    await completePasskeyLogin(credentialJson);
    
    // 4. Reload User
    return fetchCurrentUser();
}

/**
 * WebAuthn als 2. Faktor nutzen (wenn Passwort schon eingegeben wurde).
 */
export async function authenticateMfaWithPasskey() {
    ensureWebAuthnSupport();

    let requestOptions;
    try {
        const url = typeof HEADLESS_BASE !== 'undefined' 
            ? `${HEADLESS_BASE}/auth/2fa/authenticate`
            : '/api/auth/browser/v1/auth/2fa/authenticate';

        const res = await apiClient.get(url);
        // Allauth liefert oft: { data: { request_options: { publicKey: ... } } }
        const data = res.data?.data || res.data;
        requestOptions = data.request_options || data;
    } catch (err) {
        throw normaliseApiError(err, 'Auth.MFA_CHALLENGE_FAILED');
    }

    if (!requestOptions) {
        throw new Error('No WebAuthn challenge received for MFA.');
    }

    // 2. Browser Sign
    let assertion;
    try {
        // FIX: Erst entpacken
        const optionsJson = resolveWebAuthnOptions(requestOptions);
        
        // Dann parsen
        const publicKeyOptions = window.PublicKeyCredential.parseRequestOptionsFromJSON(optionsJson);
        
        // Dann wrappen
        assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });
    } catch (err) {
         if (err.name === 'NotAllowedError') {
            throw normaliseApiError(new Error('Auth.PASSKEY_CANCELLED'), 'Auth.PASSKEY_CANCELLED');
         }
         throw err;
    }

    // 3. Authenticate via existing API function
    const credentialJson = serializeCredential(assertion);
    return authenticateWithMFA({ credential: credentialJson });
}

function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function submitSocialRedirectForm({ provider, callbackUrl, csrfToken, process }) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${HEADLESS_BASE}/auth/provider/redirect`;
  form.style.display = 'none';

  const fields = {
    provider,
    process,
    callback_url: callbackUrl,
    csrfmiddlewaretoken: csrfToken,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export async function startSocialLogin(provider, options = {}) {
  if (typeof window === 'undefined') {
    throw normaliseApiError(
      new Error('Auth.SOCIAL_LOGIN_NOT_IN_BROWSER'), 
      'Auth.SOCIAL_LOGIN_NOT_IN_BROWSER'
    );
  }

  try {
    // Ensures csrftoken cookie exists before form POST.
    await apiClient.get('/api/csrf/');
  } catch {
    // Continue; token might already be present.
  }

  const csrfToken = getCsrfTokenFromCookie();
  if (!csrfToken) {
    throw normaliseApiError(
      new Error('Auth.SOCIAL_LOGIN_FAILED'),
      'Auth.SOCIAL_LOGIN_FAILED',
    );
  }

  const process = options.process === 'connect' ? 'connect' : 'login';
  const originUrl = new URL(window.location.origin);
  if (originUrl.hostname.startsWith('www.')) {
    originUrl.hostname = originUrl.hostname.slice(4);
  }

  // S62: Same-Origin-Validation für `callbackUrl`. Verhindert, dass künftige
  // Konsumenten mit tainted Wert (z.B. `?next=https://evil.example/`) einen
  // Open-Redirect via OAuth-Callback-Pfad erzeugen. Caller heute safe
  // (`options.callbackUrl` wird nur intern gesetzt), aber defensive depth.
  let callbackUrl = `${originUrl.origin}/login`;
  if (options.callbackUrl) {
    try {
      const candidate = new URL(options.callbackUrl, window.location.origin);
      if (candidate.origin === originUrl.origin) {
        callbackUrl = candidate.toString();
      } else {
        // Cross-origin → silent fallback auf Default; OAuth-Flows laufen
        // weiter, nur ohne tainted URL. Symptom-Diagnose via Console-Warning.
        // eslint-disable-next-line no-console
        console.warn(
          `[startSocialLogin] callbackUrl cross-origin rejected: ${candidate.origin} != ${originUrl.origin}. Falling back to /login.`
        );
      }
    } catch {
      // Invalid URL → fallback, gleiche Rationale.
      // eslint-disable-next-line no-console
      console.warn('[startSocialLogin] callbackUrl is not a valid URL — falling back to /login.');
    }
  }
  submitSocialRedirectForm({ provider, callbackUrl, csrfToken, process });
}
