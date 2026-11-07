import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from 'react-i18next';

import { usePrivacy } from './PrivacyProvider';
import { PrivacySettingsLink } from './PrivacySettingsLink';
import { useLegalEntries } from './legalEntries';

// One compact line at the end of the page: identity on the left, legal links and the privacy settings entry on the
// right. It wraps on narrow screens instead of growing into blocks. `mt: auto` lets it sit at the bottom of a
// column-flex page without any extra layout in the host.
export const PUBLIC_FOOTER_ROOT_SX = {
  boxSizing: 'border-box',
  width: '100%',
  flexShrink: 0,
  mt: 'auto',
  borderTop: 1,
  borderColor: 'divider',
  px: { xs: 2, sm: 4 },
  py: { xs: 0.5, sm: 1 },
  bgcolor: 'background.paper',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: { xs: 'center', sm: 'space-between' },
  columnGap: 3,
  rowGap: 0,
};

// On a phone the identity (logo, tagline, copyright) is dropped: the header already carries the brand and the
// footer stays a compact row of links.
export const PUBLIC_FOOTER_IDENTITY_SX = {
  display: { xs: 'none', sm: 'flex' },
  alignItems: 'center',
  gap: 1.25,
  flexShrink: 0,
  minHeight: 32,
};

export const PUBLIC_FOOTER_COPYRIGHT_SX = {
  color: 'text.secondary',
  fontSize: '0.75rem',
  lineHeight: 1.4,
};

export const PUBLIC_FOOTER_NAV_SX = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: { xs: 'center', sm: 'flex-end' },
  alignItems: 'center',
  columnGap: { xs: 1.5, sm: 2.75 },
  rowGap: 0,
  minWidth: 0,
  width: { xs: '100%', sm: 'auto' },
};

export const PUBLIC_FOOTER_LEGAL_LINK_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  minWidth: 0,
  minHeight: { xs: 28, sm: 32 },
  color: 'text.secondary',
  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
  lineHeight: 1.35,
  overflowWrap: 'anywhere',
  textDecoration: 'none',
  '&:hover': {
    color: 'primary.main',
    textDecoration: 'underline',
  },
};

export const PUBLIC_FOOTER_SETTINGS_LINK_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  minHeight: { xs: 28, sm: 32 },
  px: 0,
  color: 'primary.main',
  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
};

export function PublicFooter({
  brand,
  copyright,
  legalOrigin,
  appId,
  documents,
  extraLinks,
  fallbackLanguage = 'en',
  showSettings = true,
  ...props
}) {
  const { t } = useTranslation();
  const privacy = usePrivacy();
  const entries = useLegalEntries({ legalOrigin, appId, documents, extraLinks, fallbackLanguage });
  const { className, sx, ...footerProps } = props;
  const canOpenSettings = showSettings && privacy?.status === 'ready' && privacy.hasOptionalPurposes;

  return (
    <Box
      {...footerProps}
      component="footer"
      className={className}
      sx={sx ? [PUBLIC_FOOTER_ROOT_SX, sx] : PUBLIC_FOOTER_ROOT_SX}
    >
      <Box sx={PUBLIC_FOOTER_IDENTITY_SX}>
        {brand}
        {copyright !== undefined && copyright !== null ? (
          <Typography component="small" sx={PUBLIC_FOOTER_COPYRIGHT_SX}>{copyright}</Typography>
        ) : null}
      </Box>
      <Box component="nav" aria-label={t('Privacy.FOOTER_NAV')} sx={PUBLIC_FOOTER_NAV_SX}>
        {entries.map(({ id, label, href }) => (
          <Link key={id} href={href} underline="none" sx={PUBLIC_FOOTER_LEGAL_LINK_SX}>
            {label}
          </Link>
        ))}
        {canOpenSettings ? (
          <PrivacySettingsLink sx={PUBLIC_FOOTER_SETTINGS_LINK_SX}>
            <TuneIcon fontSize="small" aria-hidden="true" />
            {t('Privacy.LEGAL_SETTINGS')}
          </PrivacySettingsLink>
        ) : null}
      </Box>
    </Box>
  );
}

export default PublicFooter;
