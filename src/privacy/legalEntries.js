import { useTranslation } from 'react-i18next';

import { buildLegalReaderUrl, legalDocumentLanguage } from './PrivacyFooterLinks';

const DOCUMENT_LABEL_KEYS = {
  privacy: 'Privacy.LEGAL_PRIVACY',
  terms: 'Privacy.LEGAL_TERMS',
  'data-processing': 'Privacy.LEGAL_DATA_PROCESSING',
  cancellation: 'Privacy.LEGAL_CANCELLATION',
};

function isSafeExtraHref(href) {
  if (typeof href !== 'string') return false;
  // Backslashes and control characters are URL separators/ignored characters in browsers ("/\host" leaves the app).
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(href)) return false;
  if (href.startsWith('/')) return !href.startsWith('//');
  return /^https?:\/\//i.test(href);
}

/**
 * Ordered legal destinations for the current host. Central-reader links are static and do not
 * depend on a PrivacyProvider; app-local links are accepted only as relative paths or HTTP(S) URLs.
 */
export function useLegalEntries({
  legalOrigin,
  appId,
  documents = ['privacy', 'terms', 'data-processing'],
  extraLinks = [],
  fallbackLanguage = 'en',
} = {}) {
  const { t, i18n } = useTranslation();
  const lang = legalDocumentLanguage(i18n?.language, fallbackLanguage);
  const builtIn = documents
    .map((slug) => ({
      id: slug,
      label: DOCUMENT_LABEL_KEYS[slug] ? t(DOCUMENT_LABEL_KEYS[slug]) : '',
      href: buildLegalReaderUrl({ origin: legalOrigin, slug, appId, lang }),
    }))
    .filter((entry) => entry.href);
  const local = extraLinks
    .filter((entry) => entry && isSafeExtraHref(entry.href))
    .map(({ id, label, href }) => ({ id, label, href }));
  return [...builtIn, ...local];
}

export default useLegalEntries;
