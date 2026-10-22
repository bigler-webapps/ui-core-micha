// src/auth/AuthContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { ensureCsrfToken } from './apiClient'; // <--- IMPORT ADDED
import {
  fetchAuthMethods,
  fetchCurrentUser,
  fetchBootstrap,
  logoutSession,
} from './authApi';
import { ReauthModal } from './ReauthModal';

export const AuthContext = createContext(null);

const DEFAULT_AUTH_METHODS = {
  password_login: true,
  password_reset: true,
  signup: true,
  signup_modes: ['self_signup_access_code'],
  turnstile_site_key: '',
  password_change: true,
  social_login: true,
  social_providers: ['google', 'microsoft'],
  passkey_login: true,
  passkeys_manage: true,
  mfa_totp: true,
  mfa_recovery_codes: true,
  mfa_enabled: true,
  required_auth_factor_count: 1,
  two_factor_required: false,
  qr_signup_enabled: false,
};

export const AuthProvider = ({ children, bootstrap = false }) => {
  const [user, setUser] = useState(null);
  const [authMethods, setAuthMethods] = useState(DEFAULT_AUTH_METHODS);
  const [loading, setLoading] = useState(true);
  const [notificationSeed, setNotificationSeed] = useState(null);
  const [bootstrapExtensions, setBootstrapExtensions] = useState({});

  const consumeBootstrapNotificationSeed = useCallback(() => {
    setNotificationSeed(null);
  }, []);

  const mapUserFromApi = (data) => {
    const profile = data?.profile || {};
    return {
      ...data,
      id: data?.id,
      username: data?.username,
      email: data?.email,
      first_name: data?.first_name,
      last_name: data?.last_name,
      role: data?.role ?? profile?.role ?? null,
      language: data?.language ?? profile?.language ?? 'en',
      is_superuser: Boolean(data?.is_superuser),
      is_new: Boolean(data?.is_new ?? profile?.is_new),
      is_invited: Boolean(data?.is_invited ?? profile?.is_invited),
      accepted_privacy_statement: Boolean(
        data?.accepted_privacy_statement ?? profile?.accepted_privacy_statement
      ),
      accepted_convenience_cookies: Boolean(
        data?.accepted_convenience_cookies ?? profile?.accepted_convenience_cookies
      ),
      is_support_agent: Boolean(data?.is_support_agent ?? profile?.is_support_agent),
      support_contact_id: data?.support_contact_id ?? profile?.support_contact_id ?? null,
      security_state: data?.security_state,
      available_roles: data?.available_roles || [],
      ui_permissions: data?.ui_permissions || {},
      can_manage_support_agents: Boolean(data?.can_manage_support_agents),
      can_manage: Boolean(data?.can_manage),
      is_active: data?.is_active,
      successful_login: Boolean(data?.successful_login ?? data?.last_login),
      last_login: data?.last_login,
      date_joined: data?.date_joined,
    };
  };

  useEffect(() => {
    let isMounted = true;

    const initSeparateAuth = async () => {
      try {
        // 1) Ensure CSRF cookie exists using the specific client
        await ensureCsrfToken();

        // 2) Both calls depend on CSRF, but not on each other. Await both settlements
        // so loading stays true until the complete auth bootstrap has finished.
        const [methodsResult, userResult] = await Promise.allSettled([
          fetchAuthMethods(),
          fetchCurrentUser(),
        ]);

        // Keep defaults when the public auth-methods request fails.
        if (methodsResult.status === 'fulfilled') {
          const methods = methodsResult.value;
          if (isMounted && methods && typeof methods === 'object') {
            setAuthMethods((prev) => ({ ...prev, ...methods }));
          }
        }

        // Preserve the previous unauthenticated/error handling for current-user.
        if (userResult.status === 'rejected') {
          throw userResult.reason;
        }

        const data = userResult.value;
        if (isMounted) {
          setUser(mapUserFromApi(data));
        }
      } catch (err) {
        // Silent failure on 401/403 is expected (user not logged in)
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const initAuth = async () => {
      if (!bootstrap) {
        await initSeparateAuth();
        return;
      }

      try {
        const data = await fetchBootstrap(bootstrap === true ? '/api/bootstrap/' : bootstrap);
        if (!isMounted) return;
        const mappedUser = data?.user ? mapUserFromApi(data.user) : null;
        const methods = data?.auth_methods;
        if (methods && typeof methods === 'object') {
          setAuthMethods((prev) => ({ ...prev, ...methods }));
        }
        setUser(mappedUser);
        setBootstrapExtensions(data?.extensions && typeof data.extensions === 'object'
          ? data.extensions : {});
        setNotificationSeed(mappedUser && data?.notifications
          ? { userId: mappedUser.id, notifications: data.notifications }
          : null);
        setLoading(false);
      } catch (error) {
        if (isMounted) {
          setBootstrapExtensions({});
          setNotificationSeed(null);
          await initSeparateAuth();
        }
      }
    };

    initAuth();

    return () => { isMounted = false; };
  }, [bootstrap]);

  // Bootstrap data belongs to the person it was loaded for; drop it when the session changes hands.
  const clearBootstrapData = () => {
    setBootstrapExtensions({});
    setNotificationSeed(null);
  };

  const login = (userData) => {
    const mapped = mapUserFromApi(userData);
    if (user && mapped.id !== user.id) clearBootstrapData();
    setUser((prev) => ({
      ...prev,
      ...mapped,
    }));
  };

  const refreshUser = async () => {
    const data = await fetchCurrentUser();
    if (data) setUser(mapUserFromApi(data));
  };

  const logout = async () => {
    try {
      await logoutSession();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error during logout:', error);
    } finally {
      clearBootstrapData();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authMethods,
        loading,
        login,
        logout,
        refreshUser,
        bootstrapNotificationSeed: notificationSeed,
        consumeBootstrapNotificationSeed,
        bootstrapExtensions,
      }}
    >
      {children}
      <ReauthModal />
    </AuthContext.Provider>
  );
};

export function useBootstrapExtension(name) {
  const context = React.useContext(AuthContext);
  const payload = context?.bootstrapExtensions?.[name];
  return payload == null ? undefined : payload;
}
