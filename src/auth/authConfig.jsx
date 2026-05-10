// src/auth/authConfig.js

// Basis-Pfad für die Headless-Allauth-API
export const AUTH_BASE = '/api/auth';

// Variante (z. B. "browser" oder später "app")
export const HEADLESS_VARIANT = 'browser';

// Version der Headless-API
export const HEADLESS_VERSION = 'v1';

// Vollständige Basis-URL für Auth-Calls zu allauth.headless
export const HEADLESS_BASE = `${AUTH_BASE}/${HEADLESS_VARIANT}/${HEADLESS_VERSION}`;

// Eigene User-API
export const USERS_BASE = '/api/users';

// NEU: Access-Code-API (kommt aus der Lib)
export const ACCESS_CODES_BASE = '/api/access-codes';

// CSRF-Endpoint (Django-View csrf_token_view)
export const CSRF_URL = '/api/csrf/';

// Konfiguration der Social-Provider
export const SOCIAL_PROVIDERS = {
  google: 'google',
  microsoft: 'microsoft',
};

// Feature-Flags (falls du später Dinge toggeln willst)
export const FEATURES = {
  passkeysEnabled: true,  // kannst du später auf true setzen
  mfaEnabled: true,
};
