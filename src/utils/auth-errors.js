// src/utils/auth-errors.js
export function extractErrorInfo(error) {
  const status = error.response?.status ?? null;
  const data = error.response?.data ?? null;

  if (!data) {
    return { status, code: null, message: error.message || null, raw: null };
  }

  // Allauth Headless structure often nests errors in "errors" array or "status" key
  if (Array.isArray(data.errors) && data.errors.length > 0) {
      // Pick the first error code
      const first = data.errors[0];
      return { status, code: first.code, message: first.message, raw: data };
  }

  if (typeof data.code === 'string') {
    return { status, code: data.code, message: null, raw: data };
  }
  
  // Fallback for generic Django errors
  if (typeof data.detail === 'string') {
    return { status, code: 'GENERIC', message: data.detail, raw: data };
  }

  return { status, code: null, message: null, raw: data };
}

export function normaliseApiError(error, defaultCode = 'Auth.GENERIC_ERROR') {
  const info = extractErrorInfo(error);
  const code = info.code || defaultCode;
  const message = info.message || code || defaultCode;

  const err = new Error(message);
  err.code = code;
  err.status = info.status;
  err.raw = info.raw;
  return err;
}