export const RECEIPT_ERROR_CODES = ['consent_required', 'unsupported_file_type', 'file_too_large', 'invalid_request', 'nothing_recognised', 'spend_cap_reached', 'count_limit_reached', 'provider_unavailable', 'authentication_required'];
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.heic,.heif,.pdf';
export const RECEIPT_FIELD_KEYS = ['merchant', 'date', 'total', 'currency', 'payment_method', 'account', 'items'];
export const receiptsApiUrls = (base = '/api/receipts/') => { const root = base.replace(/\/$/, '') + '/'; return { consent: root + 'consent/', read: root + 'read/' }; };
