import { useCallback, useEffect, useRef, useState } from 'react';

export function useReceiptConsent(api) {
  const [status, setStatus] = useState('loading');
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const liveRef = useRef(true);
  const generation = useRef(0); // bumped when the api changes, so an answer of the old api can never count
  const reload = useCallback(() => { setGranted(false); setStatus('loading'); setError(false); setReloadCount((n) => n + 1); }, []);
  useEffect(() => {
    liveRef.current = true;
    let requestLive = true;
    generation.current += 1;
    setGranted(false); setStatus('loading'); // consent known for another api never carries over
    Promise.resolve().then(() => api.getConsent()).then((answer) => { if (requestLive) { setGranted(Boolean(answer?.granted)); setStatus('ready'); setError(false); } }).catch(() => { if (requestLive) { setStatus('error'); setError(true); } });
    return () => { requestLive = false; liveRef.current = false; };
  }, [api, reloadCount]);
  const set = useCallback(async (next) => {
    const mine = generation.current;
    setBusy(true); setError(false);
    if (!next) setGranted(false); // fail closed: a revocation takes effect at once, whatever the server answers
    try { const answer = await api.setConsent(Boolean(next)); if (!liveRef.current || mine !== generation.current) return false; setGranted(Boolean(answer?.granted)); setStatus('ready'); return Boolean(answer?.granted); }
    catch { if (liveRef.current && mine === generation.current) setError(true); return false; }
    finally { if (liveRef.current && mine === generation.current) setBusy(false); }
  }, [api]);
  return { status, granted, busy, error, set, reload };
}
