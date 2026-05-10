// src/auth/components/SocialLoginButtons.jsx
import React from 'react';
import { Stack, Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SOCIAL_PROVIDERS } from '../auth/authConfig';

/**
 * Renders buttons for social login providers.
 * The caller passes a handler that receives the provider key.
 */
export function SocialLoginButtons({ onProviderClick, providers }) {
  const { t } = useTranslation();

  const handleClick = (provider) => {
    if (onProviderClick) {
      onProviderClick(provider);
    }
  };

  const activeProviders = Array.isArray(providers) && providers.length > 0
    ? providers
    : [SOCIAL_PROVIDERS.google, SOCIAL_PROVIDERS.microsoft];

  return (
    <Stack spacing={1.5}>
      {activeProviders.includes(SOCIAL_PROVIDERS.google) && (
        <Button
          variant="outlined"
          fullWidth
          onClick={() => handleClick(SOCIAL_PROVIDERS.google)}
          startIcon={
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '1px solid rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              G
            </Box>
          }
        >
          {t('Auth.LOGIN_SOCIAL_GOOGLE')}
        </Button>
      )}

      {activeProviders.includes(SOCIAL_PROVIDERS.microsoft) && (
        <Button
          variant="outlined"
          fullWidth
          onClick={() => handleClick(SOCIAL_PROVIDERS.microsoft)}
          startIcon={
            <Box
              sx={{
                width: 24,
                height: 24,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: '1px',
              }}
            >
              <Box sx={{ bgcolor: 'primary.main', opacity: 0.9 }} />
              <Box sx={{ bgcolor: 'primary.main', opacity: 0.7 }} />
              <Box sx={{ bgcolor: 'primary.main', opacity: 0.7 }} />
              <Box sx={{ bgcolor: 'primary.main', opacity: 0.9 }} />
            </Box>
          }
        >
          {t('Auth.LOGIN_SOCIAL_MICROSOFT')}
        </Button>
      )}
    </Stack>
  );
};

