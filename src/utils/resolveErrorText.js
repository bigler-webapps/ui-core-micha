import { extractErrorInfo } from './auth-errors';

export function resolveErrorText(i18n, err, defaultKey) {
  // API helpers normally throw normalized errors. Keeping this small boundary
  // adapter also makes the resolver safe for callers that pass an Axios error
  // directly (for example, an app-level wrapper around a kit API call).
  const info = err?.response ? extractErrorInfo(err) : null;
  const resolvedErr = info
    ? {
        ...err,
        code: info.code || err.code,
        field: info.field,
        i18nKey: info.i18nKey,
        backendMessage: info.message,
      }
    : err;
  const exists = (key) => Boolean(key) && i18n.exists(key);

  if (!resolvedErr) return i18n.t(defaultKey);
  if (exists(resolvedErr.i18nKey)) return i18n.t(resolvedErr.i18nKey);
  if (resolvedErr.field && resolvedErr.code) {
    const fieldKey = `Auth.field.${resolvedErr.field}.${resolvedErr.code}`;
    if (exists(fieldKey)) return i18n.t(fieldKey);
  }
  if (exists(resolvedErr.code)) return i18n.t(resolvedErr.code);
  if (resolvedErr.backendMessage) return resolvedErr.backendMessage;
  return i18n.t(defaultKey);
}
