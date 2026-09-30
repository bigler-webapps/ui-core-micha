// src/utils/auth-errors.js
export function extractErrorInfo(error) {
  const status = error.response?.status ?? null;
  const data = error.response?.data ?? null;

  if (!data) {
    return {
      status,
      code: null,
      field: null,
      i18nKey: null,
      message: null,
      raw: null,
    };
  }

  // Allauth Headless structure often nests errors in "errors" array or "status" key
  if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0] || {};
      return {
        status,
        code: first.code ?? null,
        field: first.field ?? first.param ?? null,
        i18nKey: first.i18nKey ?? null,
        message: first.message,
        raw: data,
      };
  }

  if (typeof data.code === 'string') {
    return {
      status,
      code: data.code,
      field: data.field ?? null,
      i18nKey: data.i18nKey ?? null,
      message: data.message ?? data.detail,
      raw: data,
    };
  }
  
  // Fallback for generic Django errors
  if (typeof data.detail === 'string') {
    return {
      status,
      code: null,
      field: data.field ?? null,
      i18nKey: data.i18nKey ?? null,
      message: data.detail,
      raw: data,
    };
  }

  return {
    status,
    code: null,
    field: data.field ?? null,
    i18nKey: data.i18nKey ?? null,
    message: data.message,
    raw: data,
  };
}

export function normaliseApiError(error, defaultCode = 'Auth.GENERIC_ERROR') {
  const info = extractErrorInfo(error);
  const code = info.code || defaultCode;
  const message = info.message || code || defaultCode;

  const err = new Error(message);
  err.code = code;
  err.field = info.field;
  err.i18nKey = info.i18nKey;
  err.backendMessage = info.message;
  err.status = info.status;
  err.raw = info.raw;
  return err;
}
