export function formatPrice(amountCents, language) {
  if (!Number.isFinite(amountCents)) return '';
  return new Intl.NumberFormat(language, { style: 'currency', currency: 'USD' }).format(amountCents / 100);
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
