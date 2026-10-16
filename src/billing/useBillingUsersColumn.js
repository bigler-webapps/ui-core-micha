import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultBillingApi } from './api';
import { BillingAccessCell, accountAccessText } from './BillingAccessCell';
import { useOperatorAccounts } from './useOperatorAccounts';

export function useBillingUsersColumn({ api = defaultBillingApi, enabled = true } = {}) {
  const { t, i18n } = useTranslation();
  const billing = useOperatorAccounts(api, { enabled });
  const extraColumns = useMemo(() => billing.status !== 'ready' ? [] : [{
    key: 'billing-access', label: t('Billing.OP_ACCESS'), minWidth: 260,
    renderCell: ({ user }) => React.createElement(BillingAccessCell, { account: billing.accounts.get(user?.id), api, onChanged: (answer) => billing.setFreeAccess(user.id, answer) }),
    getSortValue: ({ user }) => accountAccessText(billing.accounts.get(user?.id), t, i18n.language),
    getSearchValue: ({ user }) => accountAccessText(billing.accounts.get(user?.id), t, i18n.language),
  }], [billing.status, billing.accounts, billing.setFreeAccess, api, t, i18n.language]);
  return { status: billing.status, extraColumns, reload: billing.reload };
}

export default useBillingUsersColumn;
