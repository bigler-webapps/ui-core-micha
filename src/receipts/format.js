import { intlLocale } from '../billing/format';

export function formatReceiptAmount(total, currency, language) {
  if (typeof total !== 'string' || !total.trim()) return total || '';
  const n = Number(total); if (!Number.isFinite(n)) return total;
  const candidate = typeof currency === 'string' ? currency.toUpperCase() : '';
  let code = 'USD';
  try { const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : null; if (/^[A-Z]{3}$/.test(candidate) && (!supported || supported.includes(candidate))) { new Intl.NumberFormat(intlLocale(language), { style: 'currency', currency: candidate }); code = candidate; } } catch { code = 'USD'; }
  try { return new Intl.NumberFormat(intlLocale(language), { style: 'currency', currency: code }).format(n); } catch { return total; }
}
export function formatReceiptDate(iso, language) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  const date = new Date(`${iso}T00:00:00Z`); if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return iso;
  return new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'short', timeZone: 'UTC' }).format(date);
}
export function isEmptyValue(value) { return value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0); }
export function receiptValueEqual(key, a, b) {
  if (key === 'items') return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => Object.keys(item || {}).every((k) => String(item[k] ?? '').trim().toLowerCase() === String(b[i]?.[k] ?? '').trim().toLowerCase()));
  if (key === 'total' && a !== '' && b !== '' && Number.isFinite(Number(a)) && Number.isFinite(Number(b))) return Number(a) === Number(b);
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}
