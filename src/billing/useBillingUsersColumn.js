import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultBillingApi } from './api';
import { BillingAccessCell, BillingAccessError, accountAccessText } from './BillingAccessCell';
import { FreeAccessSwitch } from './FreeAccessSwitch';
import { useOperatorAccounts } from './useOperatorAccounts';

const defaultIsOperator = ({ user }) => user?.is_superuser === true;
const userName = (user) => [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || user?.email || user?.username || '';

export function useBillingUsersColumn({ api = defaultBillingApi, enabled = true, isOperator = defaultIsOperator } = {}) {
  const { t, i18n } = useTranslation();
  const billing = useOperatorAccounts(api, { enabled });
  const [planNames, setPlanNames] = useState({});
  // Plan names are loaded once per activation; reading `api` through a ref keeps an inline `api` object from
  // refetching on every render.
  const apiRef = useRef(api);
  apiRef.current = api;
  useEffect(() => {
    let active = true;
    const getMe = apiRef.current?.getMe;
    if (!enabled || typeof getMe !== 'function') { setPlanNames({}); return () => { active = false; }; }
    Promise.resolve().then(() => getMe.call(apiRef.current)).then((me) => {
      if (!active) return;
      setPlanNames(Object.fromEntries((Array.isArray(me?.plans) ? me.plans : []).filter((plan) => plan?.key && plan?.name).map((plan) => [plan.key, plan.name])));
    }).catch(() => { if (active) setPlanNames({}); });
    return () => { active = false; };
  }, [enabled]);
  const extraColumns = useMemo(() => billing.status === 'error' ? [{
    key: 'billing-access', label: t('Billing.OP_ACCESS'), minWidth: 260,
    renderCell: () => React.createElement(BillingAccessError, { onRetry: billing.reload }),
    getSortValue: () => '', getSearchValue: () => '',
  }] : billing.status !== 'ready' ? [] : (() => {
    const statusFor = ({ user, account }) => accountAccessText(account, t, i18n.language, { planNames, isOperator: isOperator({ user, account }) });
    return [{
      key: 'billing-access', label: t('Billing.OP_ACCESS'), minWidth: 180,
      renderCell: ({ user }) => React.createElement(BillingAccessCell, { account: billing.accounts.get(user?.id), planNames, isOperator: isOperator({ user, account: billing.accounts.get(user?.id) }) }),
      getSortValue: (context) => statusFor({ ...context, account: billing.accounts.get(context.user?.id) }),
      getSearchValue: (context) => statusFor({ ...context, account: billing.accounts.get(context.user?.id) }),
    }, {
      key: 'billing-free-access', label: t('Billing.OP_NO_SUBSCRIPTION'), minWidth: 112, align: 'center',
      renderCell: ({ user }) => {
        const account = billing.accounts.get(user?.id);
        const operator = isOperator({ user, account });
        const source = account?.access?.source;
        if (!account || operator || source === 'subscription' || source === 'team' || (source !== 'free' && account.access?.status !== 'read_only')) return '–';
        return React.createElement(FreeAccessSwitch, { account, api, name: userName(user), hideLabel: true, onChanged: (answer) => billing.setFreeAccess(user.id, answer) });
      },
      getSortValue: () => '', getSearchValue: () => '',
    }];
  })(), [billing.status, billing.accounts, billing.setFreeAccess, billing.reload, api, t, i18n.language, planNames, isOperator]);
  return { status: billing.status, extraColumns, reload: billing.reload };
}

export default useBillingUsersColumn;
