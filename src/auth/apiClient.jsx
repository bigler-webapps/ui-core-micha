import axios from "axios";
import { CSRF_URL } from "./authConfig";

const apiClient = axios.create({
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

let redirectingToLogin = false;

function isBrowser() {
  return typeof window !== "undefined";
}

// WICHTIG: Liste aller Routen, die OHNE Login funktionieren müssen.
// Beginnt der Pfad mit einem dieser Strings, wird kein Auto-Redirect ausgelöst.
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/reset-request-password", // Request Page
  "/invite",                 // Invite Link (/invite/:uid/:token)
  "/reset",                  // Reset Link (/reset/:uid/:token)
  "/welcome"                 // Optional: Falls Welcome auch öffentlich ist
];

function isPublicSitePath(pathname) {
  return pathname === "/sites" || pathname.startsWith("/sites/");
}

function redirectToLoginOnce() {
  if (!isBrowser()) return;

  const currentPath = window.location.pathname;

  // 1. Check: Sind wir auf einer öffentlichen Seite?
  const isPublicPage = isPublicSitePath(currentPath) || PUBLIC_PATHS.some(path => currentPath.startsWith(path));
  
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
  (error) => {
    const status = error?.response?.status ?? null;
    const data = error?.response?.data ?? {};
    const { code, i18nKey } = extractAuthSignal(data);

    const isAuthStatus = status === 401 || status === 403;
    const isNotAuthenticated =
      code === "not_authenticated" || i18nKey === "auth.not_authenticated";

    if (isAuthStatus && isNotAuthenticated) {
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
