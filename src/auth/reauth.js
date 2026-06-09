// Promise broker for the reauthentication gate.
//
// When the response interceptor encounters a 401+reauthenticate, it calls
// requestReauth() and awaits the returned promise. The ReauthModal resolves
// or rejects that promise after the user submits (or cancels) the password
// dialog. Concurrent 401s share the same pending promise so only one modal
// ever appears.

let _pendingResolve = null;
let _pendingReject = null;
let _reauthPromise = null;
let _listeners = [];

export function requestReauth() {
  if (_reauthPromise) return _reauthPromise;
  _reauthPromise = new Promise((resolve, reject) => {
    _pendingResolve = resolve;
    _pendingReject = reject;
    _listeners.forEach(fn => fn(true));
  });
  return _reauthPromise;
}

export function resolveReauth() {
  const resolve = _pendingResolve;
  _pendingResolve = null;
  _pendingReject = null;
  _reauthPromise = null;
  _listeners.forEach(fn => fn(false));
  if (resolve) resolve();
}

export function rejectReauth(error) {
  const reject = _pendingReject;
  _pendingResolve = null;
  _pendingReject = null;
  _reauthPromise = null;
  _listeners.forEach(fn => fn(false));
  if (reject) reject(error || new Error('Reauthentication cancelled'));
}

export function subscribe(fn) {
  _listeners = [..._listeners, fn];
  return () => {
    _listeners = _listeners.filter(l => l !== fn);
  };
}
