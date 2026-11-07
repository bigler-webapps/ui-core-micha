import React from 'react';
import { Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { usePrivacy } from './PrivacyProvider';

export function PrivacySettingsLink({ children, ...props }) {
  const privacy = usePrivacy();
  const { t } = useTranslation();
  if (!privacy || privacy.status !== 'ready' || !privacy.hasOptionalPurposes) return null;
  return (
    <Link
      component="button"
      type="button"
      onClick={privacy.openSettings}
      {...props}
    >
      {children || t('Privacy.SETTINGS')}
    </Link>
  );
}

export default PrivacySettingsLink;
