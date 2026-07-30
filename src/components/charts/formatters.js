import { useTranslation } from 'react-i18next';

export function formatPercentage(value, locale, options = {}) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
}

export function formatCompact(value, locale, options = {}) {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
}

export function formatRatio(value, locale, options = {}) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/** Creates locale-aware formatter functions for use in chart axes and tooltips. */
export function createChartFormatters(locale) {
  return {
    percentage: (value, options) => formatPercentage(value, locale, options),
    compact: (value, options) => formatCompact(value, locale, options),
    ratio: (value, options) => formatRatio(value, locale, options),
  };
}

/** Resolves formatter locale from the active react-i18next instance. */
export function useChartFormatters() {
  const { i18n } = useTranslation();
  return createChartFormatters(i18n.language);
}
