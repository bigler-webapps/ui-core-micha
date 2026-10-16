import { useCallback, useEffect, useRef, useState } from 'react';

const hiddenStatus = (error) => [401, 403, 404].includes(error?.response?.status);

export function useOperatorAccounts(api, { enabled = true } = {}) {
  const [status, setStatus] = useState(enabled ? 'loading' : 'idle');
  const [accounts, setAccounts] = useState(() => new Map());
  const [reloadCount, setReloadCount] = useState(0);
  const generation = useRef(0);
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  useEffect(() => {
    const current = ++generation.current;
    if (!enabled) { setStatus('idle'); setAccounts(new Map()); return () => { generation.current += 1; }; }
    setStatus('loading');
    setAccounts(new Map());
    const load = async () => {
      try {
        const merged = new Map();
        let page = 1; let count = Infinity;
        while (merged.size < count && page <= 50) {
          const result = await api.listOperatorAccounts({ page, pageSize: 100 });
          if (generation.current !== current) return;
          if (!Array.isArray(result?.results) || !Number.isInteger(result?.count) || result.count < 0) throw new Error('invalid_operator_accounts');
          count = result.count;
          for (const account of result.results) if (Number.isInteger(account?.user_id)) merged.set(account.user_id, account);
          setAccounts(new Map(merged));
          page += 1;
          if (result.results.length === 0) break;
        }
        if (generation.current === current) setStatus('ready');
      } catch (error) {
        if (generation.current !== current) return;
        setAccounts(new Map());
        setStatus(hiddenStatus(error) ? 'hidden' : 'error');
      }
    };
    load();
    return () => { generation.current += 1; };
  }, [api, enabled, reloadCount]);

  const setFreeAccess = useCallback((userId, answer) => {
    setAccounts((current) => {
      const previous = current.get(userId);
      if (!previous || !answer) return current;
      const updated = new Map(current);
      updated.set(userId, { ...previous, free_access: answer.free_access, access: answer.access });
      return updated;
    });
  }, []);

  return { status, accounts, reload, setFreeAccess };
}

export default useOperatorAccounts;
