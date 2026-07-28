import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const TURNSTILE_SCRIPT_SELECTOR = 'script[data-turnstile-api="true"]';

let turnstileScriptPromise;

function loadTurnstileScript() {
  if (window.turnstile?.render) {
    return Promise.resolve(window.turnstile);
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      let script = document.querySelector(TURNSTILE_SCRIPT_SELECTOR);
      if (!script) {
        script = document.createElement('script');
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.dataset.turnstileApi = 'true';
        document.head.appendChild(script);
      }

      script.addEventListener('load', () => {
        if (window.turnstile?.render) {
          resolve(window.turnstile);
        } else {
          reject(new Error('Turnstile did not initialize.'));
        }
      }, { once: true });
      script.addEventListener('error', () => {
        reject(new Error('Turnstile could not be loaded.'));
      }, { once: true });
    });
  }

  return turnstileScriptPromise;
}

export const TurnstileWidget = forwardRef(function TurnstileWidget(
  { siteKey, onToken },
  ref,
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const reset = useCallback(() => {
    if (widgetIdRef.current !== null && window.turnstile?.reset) {
      window.turnstile.reset(widgetIdRef.current);
    }
    onTokenRef.current('');
  }, []);

  useImperativeHandle(ref, () => ({ reset }), [reset]);

  useEffect(() => {
    if (!siteKey) return undefined;

    let cancelled = false;
    loadTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': reset,
          'error-callback': () => onTokenRef.current(''),
        });
      })
      .catch(() => {
        if (!cancelled) onTokenRef.current('');
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, reset]);

  if (!siteKey) return null;

  return <div ref={containerRef} data-testid="turnstile-widget" />;
});
