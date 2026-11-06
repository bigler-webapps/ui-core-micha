import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from 'react-i18next';

import { usePrivacy } from './PrivacyProvider';
import { PrivacySettingsLink } from './PrivacySettingsLink';
import { useLegalEntries } from './legalEntries';

export const PUBLIC_FOOTER_ROOT_SX = {
  boxSizing: 'border-box',
  width: '100%',
  borderTop: 1,
  borderColor: 'divider',
  px: { xs: 2, sm: 4 },
  pt: 3,
  pb: 2.5,
  bgcolor: 'background.paper',
};

export const PUBLIC_FOOTER_TOP_ROW_SX = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  justifyContent: 'space-between',
  gap: { xs: 0, sm: 3 },
};

export const PUBLIC_FOOTER_IDENTITY_SX = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
  flexShrink: 0,
  mb: { xs: 2, sm: 0 },
};

export const PUBLIC_FOOTER_COPYRIGHT_SX = {
  color: 'text.secondary',
  fontSize: '0.75rem',
  lineHeight: 1.4,
};

export const PUBLIC_FOOTER_NAV_SX = {
  display: { xs: 'grid', sm: 'flex' },
  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'none' },
  justifyContent: { xs: 'start', sm: 'flex-end' },
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: { xs: '4px 16px', sm: '8px 22px' },
  minWidth: 0,
};

export const PUBLIC_FOOTER_LEGAL_LINK_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  minWidth: 0,
  minHeight: { xs: 44, sm: 36 },
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

export const PUBLIC_FOOTER_SETTINGS_ROW_SX = {
  display: 'flex',
  justifyContent: { xs: 'flex-start', sm: 'flex-end' },
  mt: { xs: 2, sm: 1 },
  pt: { xs: 1.5, sm: 0 },
  borderTop: { xs: '1px solid', sm: 0 },
  borderColor: 'divider',
};

export const PUBLIC_FOOTER_SETTINGS_LINK_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1,
  minHeight: { xs: 44, sm: 36 },
  px: 0,
  color: 'primary.main',
  fontSize: '0.8125rem',
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
  const canOpenSettings = showSettings && privacy && privacy.status !== 'unconfigured';

  return (
    <Box
      {...footerProps}
      component="footer"
      className={className}
      sx={sx ? [PUBLIC_FOOTER_ROOT_SX, sx] : PUBLIC_FOOTER_ROOT_SX}
    >
      <Box sx={PUBLIC_FOOTER_TOP_ROW_SX}>
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
        </Box>
      </Box>
      {canOpenSettings ? (
        <Box sx={PUBLIC_FOOTER_SETTINGS_ROW_SX}>
          <PrivacySettingsLink sx={PUBLIC_FOOTER_SETTINGS_LINK_SX}>
            <TuneIcon fontSize="small" aria-hidden="true" />
            {t('Privacy.LEGAL_SETTINGS')}
          </PrivacySettingsLink>
        </Box>
      ) : null}
    </Box>
  );
}

export default PublicFooter;
