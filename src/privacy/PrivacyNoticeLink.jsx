import React from 'react';
import { Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { usePrivacy } from './PrivacyProvider';
import { localeForManifest } from './PrivacyProvider';

export function safePrivacyDocumentUrl(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\\]/.test(value)) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.href;
    } catch { return null; }
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return null;
}

function documentReference(manifest, locale, documentId) {
  const documents = manifest?.notice?.documents || {};
  const id = documentId && documents[documentId]
    ? documentId
    : Object.keys(documents)[0];
  const localized = id ? documents[id]?.[locale] : null;
  if (typeof localized === 'string') return localized;
  return localized?.url || localized?.href || localized?.path || localized?.reference || null;
}

export function PrivacyNoticeLink({ documentId, children, ...props }) {
  const privacy = usePrivacy();
  const { t, i18n } = useTranslation();
  if (!privacy || privacy.status !== 'ready' || !privacy.manifest) return null;
  const locale = localeForManifest(privacy.manifest, i18n.language);
  const href = safePrivacyDocumentUrl(documentReference(privacy.manifest, locale, documentId));
  if (!href) return null;
  return (
    <Link {...props} href={href} target="_blank" rel="noopener noreferrer">
      {children || t('Privacy.NOTICE_LINK')}
    </Link>
  );
}

export default PrivacyNoticeLink;
