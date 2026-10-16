export function formatPrice(amountCents, language, currency = 'USD') {
  if (!Number.isFinite(amountCents)) return '';
  const candidate = typeof currency === 'string' ? currency.toUpperCase() : '';
  let validCurrency = 'USD';
  try {
    const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : null;
    if (/^[A-Z]{3}$/.test(candidate) && (!supported || supported.includes(candidate))) {
      new Intl.NumberFormat(language, { style: 'currency', currency: candidate });
      validCurrency = candidate;
    }
  } catch { /* use USD for unknown currency codes */ }
  return new Intl.NumberFormat(language, { style: 'currency', currency: validCurrency }).format(amountCents / 100);
}

export function formatTokens(count, language) {
  if (!Number.isFinite(count)) return '';
  return new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(count);
}

export function formatDate(iso, language) {
  if (typeof iso !== 'string' || !iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}

export function formatDateTime(iso, language) {
  if (typeof iso !== 'string' || !iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(language, { dateStyle: 'long', timeStyle: 'short' }).format(date);
}
