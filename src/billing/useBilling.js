import { useCallback, useEffect, useState } from 'react';
import { BILLING_SOURCES, BILLING_STATUSES } from './wire';

const validMe = (me) => {
  const access = me?.access;
  return Boolean(access && typeof access === 'object' && !Array.isArray(access)
    && [BILLING_STATUSES.ACTIVE, BILLING_STATUSES.READ_ONLY].includes(access.status)
    && [BILLING_SOURCES.SUBSCRIPTION, BILLING_SOURCES.TEAM, BILLING_SOURCES.FREE, BILLING_SOURCES.NONE].includes(access.source)
    && (access.ends_at === null || typeof access.ends_at === 'string'));
};

export function useBilling(api) {
  const [state, setState] = useState('loading');
  const [me, setMe] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);
  const reload = useCallback(() => { setState('loading'); setReloadCount((count) => count + 1); }, []);

  useEffect(() => {
    let live = true;
    setState('loading');
    Promise.resolve().then(() => api.getMe()).then((result) => {
      if (!live) return;
      if (!validMe(result)) { setMe(null); setState('error'); return; }
      setMe(result);
      setState('ready');
    }).catch(() => { if (live) { setMe(null); setState('error'); } });
    return () => { live = false; };
  }, [api, reloadCount]);

  return { state, me, reload };
}
