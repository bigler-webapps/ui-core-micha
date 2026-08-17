// @vitest-environment jsdom
// AUTH-5: addPublicPath/matchesPublicPath/removePublicPath must accept a RegExp alongside a
// string, evaluated exclusively against pathname. Driven through the real response interceptor
// (not a reimplementation of matchesPublicPath) so these tests fail if the wiring, not just the
// matcher, breaks.
//
// The module keeps a `redirectingToLogin` latch that only resets on a real navigation, which
// never happens in jsdom — so each test re-imports a fresh module instance via
// vi.resetModules()/dynamic import, rather than sharing one import across the file.
import { beforeEach, describe, expect, it, vi } from 'vitest';

function notAuthenticatedError(status = 401) {
  return {
    response: {
      status,
      data: { code: 'not_authenticated' },
    },
    config: {},
  };
}

async function rejectThroughInterceptor(client, error) {
  const handler = client.interceptors.response.handlers.find(Boolean);
  try {
    await handler.rejected(error);
  } catch {
    // The interceptor always re-rejects after handling — expected, not the assertion.
  }
}

// jsdom's real `window.location` ties `pathname` to `history.pushState` through internal
// wiring that a deleted/replaced `location` object doesn't preserve, and `assign` is
// non-configurable so `vi.spyOn` can't touch it directly either. Sidestep both by installing a
// fully synthetic `location` this file controls end to end — the interceptor only ever reads
// `.pathname` and calls `.assign()`, so nothing else needs to be real.
function installLocationMock(initialPathname = '/') {
  const assign = vi.fn();
  delete window.location;
  window.location = { pathname: initialPathname, search: '', hash: '', assign };
  return assign;
}

function setPathname(pathname) {
  window.location.pathname = pathname;
}

describe('apiClient public-path registry (AUTH-5)', () => {
  let assignSpy;
  let apiClient;
  let addPublicPath;
  let removePublicPath;

  beforeEach(async () => {
    vi.resetModules();
    ({ default: apiClient, addPublicPath, removePublicPath } = await import('../src/auth/apiClient'));
    assignSpy = installLocationMock();
  });

  it('string registration still matches by prefix (regression)', async () => {
    setPathname('/custom-public');
    addPublicPath('/custom-public');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('a bare "/" registration does not match a deeper path via startsWith (regression)', async () => {
    addPublicPath('/');
    setPathname('/somewhere-else');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).toHaveBeenCalledWith('/login');
  });

  it('a registered RegExp matches the intended dynamic path', async () => {
    addPublicPath(/^\/[^/]+\/team$/);
    setPathname('/jg-bern/team');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('a non-matching path still redirects even with an unrelated RegExp registered', async () => {
    addPublicPath(/^\/[^/]+\/team$/);
    setPathname('/account');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).toHaveBeenCalledWith('/login');
  });

  it('the RegExp is tested against pathname, not the query string', async () => {
    // A pattern that would only match if the query string leaked into the tested value.
    setPathname('/blocked-page');
    window.location.search = '?next=/public';
    addPublicPath(/public/);

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).toHaveBeenCalledWith('/login');
  });

  it('the RegExp is tested against pathname, not the fragment', async () => {
    setPathname('/blocked-page');
    window.location.hash = '#panel';
    addPublicPath(/panel/);

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).toHaveBeenCalledWith('/login');
  });

  it('a pathname-anchored RegExp still matches when the URL also carries a query string', async () => {
    setPathname('/public');
    window.location.search = '?next=/admin';
    addPublicPath(/^\/public$/);

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('removePublicPath removes a RegExp entry by identity', async () => {
    const pattern = /^\/temp$/;
    addPublicPath(pattern);
    removePublicPath(pattern);
    setPathname('/temp');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).toHaveBeenCalledWith('/login');
  });

  it('removePublicPath does not remove a RegExp entry given only an equal-looking literal', async () => {
    addPublicPath(/^\/temp$/);
    removePublicPath(/^\/temp$/); // a different object, same source — must NOT remove the original
    setPathname('/temp');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('removePublicPath cannot remove a builtin path', async () => {
    removePublicPath('/login');
    setPathname('/login');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('a stateful (global-flag) RegExp matches consistently across repeated calls', async () => {
    // Without resetting lastIndex, a `g`-flagged RegExp would alternate
    // matched/unmatched across calls since it is reused from the module-level Set.
    addPublicPath(/^\/public$/g);
    setPathname('/public');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());
    expect(assignSpy).not.toHaveBeenCalled();

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('a RegExp entry in the registry does not break evaluation of string entries', async () => {
    addPublicPath(/^\/gallery\/\d+$/);
    addPublicPath('/custom-string');
    setPathname('/custom-string');

    await rejectThroughInterceptor(apiClient, notAuthenticatedError());

    expect(assignSpy).not.toHaveBeenCalled();
  });
});
