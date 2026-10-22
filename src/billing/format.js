// The kit's own language codes (for example de_informal) are not valid Intl locales; use the base language.
export function intlLocale(language) {
  return typeof language === 'string' && language ? language.split('_')[0] : undefined;
}

export function formatPrice(amountCents, language, currency = 'USD') {
  if (!Number.isFinite(amountCents)) return '';
  const candidate = typeof currency === 'string' ? currency.toUpperCase() : '';
  let validCurrency = 'USD';
  try {
    const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : null;
    if (/^[A-Z]{3}$/.test(candidate) && (!supported || supported.includes(candidate))) {
      new Intl.NumberFormat(intlLocale(language), { style: 'currency', currency: candidate });
      validCurrency = candidate;
    }
  } catch { /* use USD for unknown currency codes */ }
  return new Intl.NumberFormat(intlLocale(language), { style: 'currency', currency: validCurrency }).format(amountCents / 100);
}

export function formatTokens(count, language) {
  if (!Number.isFinite(count)) return '';
  return new Intl.NumberFormat(intlLocale(language), { maximumFractionDigits: 0 }).format(count);
}

export function formatUsdMicros(micros, language, { fractionDigits = 2 } = {}) {
  if (!Number.isFinite(micros)) return '';
  return new Intl.NumberFormat(intlLocale(language), {
    style: 'currency', currency: 'USD', minimumFractionDigits: fractionDigits === 2 ? 2 : 0,
    maximumFractionDigits: fractionDigits,
  }).format(micros / 1_000_000);
}

export function formatDate(iso, language) {
  if (typeof iso !== 'string' || !iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(language), { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}

export function formatShortDate(iso, language) {
  if (typeof iso !== 'string' || !iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(language), { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' }).format(date);
}

export function formatDateTime(iso, language) {
  if (typeof iso !== 'string' || !iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'long', timeStyle: 'short' }).format(date);
}
