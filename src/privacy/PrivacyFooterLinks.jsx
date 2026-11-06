import React from 'react';
import { Box, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { PrivacySettingsLink } from './PrivacySettingsLink';

const LEGAL_SLUGS = ['privacy', 'terms', 'data-processing', 'cancellation'];
const APP_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * Document language for the central legal reader. Only verified DE/EN documents exist: every other UI
 * language links an explicitly supported fallback and never a manufactured translation.
 */
export function legalDocumentLanguage(uiLanguage, fallback = 'en') {
  const base = String(uiLanguage || '').toLowerCase().split(/[-_]/)[0];
  if (base === 'de' || base === 'en') return base;
  return fallback === 'de' ? 'de' : 'en';
}

/**
 * `<origin>/legal/<slug>?app=<id>&lang=<de|en>` — the stable link contract of the bigler-consult legal reader.
 * Pure and static: it needs no privacy API, so legal hyperlinks survive a failed settings request.
 * Returns null for an unsafe origin, unknown slug or malformed application id (no account or page data is ever added).
 */
export function buildLegalReaderUrl({ origin, slug, appId, lang }) {
  if (!LEGAL_SLUGS.includes(slug) || !APP_ID.test(String(appId || ''))) return null;
  let base;
  try {
    base = new URL(String(origin || ''));
  } catch {
    return null;
  }
  if ((base.protocol !== 'https:' && base.protocol !== 'http:') || base.username || base.password) return null;
  const query = new URLSearchParams({ app: appId, lang: lang === 'de' ? 'de' : 'en' });
  return `${base.origin}/legal/${slug}?${query.toString()}`;
}

/**
 * Persistent legal footer entries: Privacy notice and Terms (static reader links) plus the local
 * "Privacy settings" action. The settings action opens THIS app's shared settings (never the reader's) and is
 * hidden only when the host has not adopted the privacy module; the legal links are always rendered.
 */
export function PrivacyFooterLinks({
  legalOrigin,
  appId,
  documents = ['privacy', 'terms'],
  fallbackLanguage = 'en',
  showSettings = true,
  sx,
  ...props
}) {
  const { t, i18n } = useTranslation();
  const lang = legalDocumentLanguage(i18n?.language, fallbackLanguage);
  const labels = {
    privacy: t('Privacy.FOOTER_PRIVACY'),
    terms: t('Privacy.FOOTER_TERMS'),
    'data-processing': t('Privacy.FOOTER_DATA_PROCESSING'),
    cancellation: t('Privacy.FOOTER_CANCELLATION'),
  };
  const links = documents
    .map((slug) => ({ slug, href: buildLegalReaderUrl({ origin: legalOrigin, slug, appId, lang }) }))
    .filter((item) => item.href);
  return (
    <Box
      component="nav"
      aria-label={t('Privacy.FOOTER_NAV')}
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', ...sx }}
      {...props}
    >
      {links.map(({ slug, href }) => (
        <Link key={slug} href={href} variant="body2" underline="hover">
          {labels[slug]}
        </Link>
      ))}
      {showSettings ? <PrivacySettingsLink variant="body2" underline="hover" /> : null}
    </Box>
  );
}

export default PrivacyFooterLinks;
