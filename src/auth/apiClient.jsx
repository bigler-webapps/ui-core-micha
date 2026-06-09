import axios from "axios";
import { CSRF_URL } from "./authConfig";
import { requestReauth } from "./reauth";

const apiClient = axios.create({
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

let redirectingToLogin = false;

function isBrowser() {
  return typeof window !== "undefined";
}

// Routen, die OHNE Login funktionieren müssen. Library-eigene Pfade sind eingefroren
// und können nicht entfernt werden — sonst würde z. B. `removePublicPath("/login")`
// auf der Login-Page selbst einen Redirect-Loop auslösen.
const BUILTIN_PUBLIC_PATHS = Object.freeze([
  "/login",
  "/signup",
  "/reset-request-password",
  "/invite",                 // /invite/:uid/:token
  "/reset",                  // /reset/:uid/:token
  "/welcome",
]);

const CONSUMER_PUBLIC_PATHS = new Set();

/**
 * Register an additional public path so a 401 on that route does not auto-redirect
 * to `/login`. Typical use: a public landing on `/` in an otherwise authenticated app.
 *
 * MUST be called before the AuthProvider mounts (i.e. before `ReactDOM.render`).
 * Calling it later won't help the bootstrap probe which fires on AuthProvider mount.
 */
export function addPublicPath(path) {
  if (typeof path === "string" && path) {
    CONSUMER_PUBLIC_PATHS.add(path);
  }
}

/** Remove a consumer-added public path. Library-internal paths are protected. */
export function removePublicPath(path) {
  CONSUMER_PUBLIC_PATHS.delete(path);
}

function isPublicSitePath(pathname) {
  return pathname === "/sites" || pathname.startsWith("/sites/");
}

// Match rule: an entry of exactly "/" requires strict equality (avoids matching
// every path with startsWith). Other entries keep the looser prefix match so
// dynamic routes like /invite/:uid/:token still work.
function matchesPublicPath(pathname, entry) {
  if (entry === "/") return pathname === "/";
  return pathname.startsWith(entry);
}

function redirectToLoginOnce() {
  if (!isBrowser()) return;

  const currentPath = window.location.pathname;

  const isPublicPage =
    isPublicSitePath(currentPath) ||
    BUILTIN_PUBLIC_PATHS.some((path) => matchesPublicPath(currentPath, path)) ||
    Array.from(CONSUMER_PUBLIC_PATHS).some((path) => matchesPublicPath(currentPath, path));

  // Wenn ja: NICHT weiterleiten. Der 401 Fehler wird an die Komponente durchgereicht.
  if (isPublicPage) return;

  if (redirectingToLogin) return;
  
  redirectingToLogin = true;
  
  // Wir speichern die aktuelle Seite, um nach dem Login zurückzukehren
  // (außer wir sind schon auf Login)
  if (!currentPath.startsWith("/login")) {
      // Optional: ?next=... Logik
      // window.location.assign(`/login?next=${encodeURIComponent(currentPath)}`);
      window.location.assign("/login");
  } else {
      window.location.assign("/login");
  }
}

function extractAuthSignal(data) {
  if (!data) {
    return { code: null, i18nKey: null };
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return extractAuthSignal(parsed);
    } catch {
      return { code: null, i18nKey: null };
    }
  }

  if (typeof data !== "object") {
    return { code: null, i18nKey: null };
  }

  if (typeof data.code === "string" || typeof data.i18nKey === "string") {
    return {
      code: typeof data.code === "string" ? data.code : null,
      i18nKey: typeof data.i18nKey === "string" ? data.i18nKey : null,
    };
  }

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0] || {};
    return {
      code: typeof first.code === "string" ? first.code : null,
      i18nKey: typeof first.i18nKey === "string" ? first.i18nKey : null,
    };
  }

  if (data.detail && typeof data.detail === "object") {
    return {
      code: typeof data.detail.code === "string" ? data.detail.code : null,
      i18nKey: typeof data.detail.i18nKey === "string" ? data.detail.i18nKey : null,
    };
  }

  return { code: null, i18nKey: null };
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status ?? null;
    const data = error?.response?.data ?? {};
    const { code, i18nKey } = extractAuthSignal(data);

    const isAuthStatus = status === 401 || status === 403;
    const isNotAuthenticated =
      code === "not_authenticated" || i18nKey === "auth.not_authenticated";

    // Reauthentication gate: allauth returns 401 + flows[{id:"reauthenticate"}]
    // when the session is stale before a sensitive operation (e.g. adding a passkey).
    // Show the password-confirm modal, wait for it to complete, then retry once.
    const flows = data?.data?.flows ?? data?.flows ?? [];
    const needsReauth =
      status === 401 &&
      Array.isArray(flows) &&
      flows.some((f) => f.id === "reauthenticate");

    if (needsReauth && !error.config?._reauthRetried) {
      try {
        await requestReauth();
        return apiClient({ ...error.config, _reauthRetried: true });
      } catch {
        return Promise.reject(error);
      }
    }

    // Per-request opt-out: bootstrap probes (e.g. fetchCurrentUser on app start)
    // expect to handle 401 silently and must not trigger a redirect-on-mount.
    // Carried as an axios config property, so it never travels to the backend
    // (would otherwise trigger a CORS preflight on cross-origin requests).
    const skipRedirect = error?.config?.skipAuthRedirect === true;

    if (isAuthStatus && isNotAuthenticated && !skipRedirect) {
      redirectToLoginOnce();
    }
    return Promise.reject(error);
  }
);

function getCookie(name) {
  if (!isBrowser() || !document.cookie) return null;
  const xsrfCookies = document.cookie.split(';')
    .map(c => c.trim())
    .filter(c => c.startsWith(name + '='));
  if (xsrfCookies.length === 0) return null;
  return decodeURIComponent(xsrfCookies[0].split('=')[1]);
}

export async function ensureCsrfToken() {
  if (getCookie("csrftoken")) {
      return;
  }
  try {
    await apiClient.get(CSRF_URL);
  } catch (err) {
    console.warn("CSRF Initialization failed", err);
  }
}

export default apiClient;
