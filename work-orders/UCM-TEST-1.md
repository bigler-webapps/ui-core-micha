# UCM-TEST-1: A kit integration check every app runs in its own suite

# A. Envelope, authored by the Expertenchat

## Goal & expected outcome

The kit's auth screens are the same code in every app, so their behaviour is accepted once, in the kit.
What differs per app is **how the app wires the kit in**: its i18n setup, its providers around the kit's
pages, the `i18next` instance the kit reads. Today each bump order writes its own tests for that, app by
app, and the operator walked the same auth flows by hand in every app.

After this order the kit ships **one exported check**, `checkKitIntegration`, that an app calls from a
single test in its own suite. It returns findings in the style of `assertThemeComplete`: an empty list
means the app's wiring is sound. Every later bump in every app then re-checks the wiring automatically.

**Operator decisions (2026-10-01):** the check lives centrally in the kit, not as copies per app; a
separate, automated staging smoke covers the runtime (`workflow-templates` `WFT-CI-31`); bumps already
in flight are not held up, and apps adopt the check with their next bump.

## Context the operator established

- **Precedent for the shape:** `assertThemeComplete(theme)` returns `{ findings }`, is exported from the
  package root (`src/index.js:12`), and apps assert `findings` equals `[]`.
- **What apps load from the kit for i18n:** `uiCoreTranslations` (`src/i18n/uiCoreTranslations.js`),
  which spreads the auth, charts, messaging, notifications, onboarding, section-nav and user-menu
  catalogues. Apps spread it into their own i18next resources at start-up, **kit keys last** (e.g.
  `survey_app/frontend/i18n/index.js`).
- **Which `i18next` the kit reads:** `apiClient` imports the **default** `i18next` instance
  (`src/auth/apiClient.jsx:2,13`) to send `Accept-Language`. Kit components read `t` and `i18n` from
  `useTranslation()` (e.g. `src/pages/LoginPage.jsx:30`). `i18next`/`react-i18next` are peer
  dependencies.
- **What the per-app bump orders tested by hand** (`survey_app` `SVA-DEP-1`/`SVA-DEP-2`): the kit's
  `SignUpPage` and `PasswordInvitePage` render inside the app's providers
  (`survey_app/frontend/src/AuthRoutesIntegration.test.jsx`), and `i18n.exists('Auth.field.email.invalid')`
  holds in the app's own i18n.
- **The defect this guards against end to end:** a login with a malformed e-mail showed the raw code
  `invalid` (`UCM-AUTH-10`). The kit's resolver fixes it, but only if the app's i18n carries the kit's
  keys and the kit's pages run on the app's instance.
- **Consumers measured 2026-09-30:** every consumer runs `vitest` with jsdom. Some mount `LoginPage`
  twice (`webshop-guenter` also in `src/pages/pwa/StaffLoginPage.jsx`). Several mock `react-i18next`
  globally in some test files.

## The check (decided)

`checkKitIntegration({ i18n, wrapper, pages })` -> `Promise<{ findings }>`, exported from the package
root. `i18n` is the app's own instance, `wrapper` the app's own provider component (whatever the app
puts around its routes), `pages` the kit pages the app mounts (default: the kit's auth pages that the
app imports). Each finding names its check and a reason. Four checks:

1. **Catalogue.** Every key in `uiCoreTranslations` resolves through the app's `i18n` in every language
   that both the kit ships (`de`/`en`/`fr`/`sw`) and the app supports. A missing key is one finding,
   with key and language.
2. **Instance.** The default `i18next` instance is initialised and is the instance the app passed in.
   Otherwise the finding says what will break: `Accept-Language` is missing or wrong.
3. **Render.** Each page in `pages` renders inside `wrapper` without throwing, and no rendered text
   node is a raw kit key (`Auth.*` or another key of the kit's catalogues) or a bare backend code. The
   check stubs the kit's `apiClient` transport for its own duration, so no request leaves the test, and
   restores it afterwards.
4. **Error text.** `LoginPage` inside `wrapper` receives, through that stub, exactly the allauth response
   from the original defect (`400`, `errors[0] = {code: "invalid", param: "email", message: ...}`). The
   shown text equals the app-language text of `Auth.field.email.invalid`.

## Scope + non-goals

In scope: the function and its four checks; its export from the package root; a `README.md` section
"Consumer integration check" with the one-line test an app writes; `CHANGELOG.md`; a **minor** release.

Non-goals:
- No change in any app. Adoption happens per app with its next bump, as its own row.
- No runtime dependency added for consumers. Rendering uses the existing peers (`react`, `react-dom`).
- No check of the app's test mocks. A suite whose mocks lack `i18n` still fails in that suite, as today.
- No replacement for the kit's own tests. They keep owning the kit's behaviour.
- No staging or browser check (`WFT-CI-31`).

## Tier · precondition / gate

- **Tier 3 · tests: each of the four checks with a passing and a failing case; the kit's existing auth
  and i18n tests.** A change inside shared-core, on the auth surface.
- Precondition: none.
- Downstream: every app adopts it with its next kit bump. `WFT-CI-31` is independent of this order.

## Risks

- **A check that cannot fail is decoration.** Each check needs a test showing it reports the specific
  defect: a missing key, a second `i18next` instance, a wrapper that throws, a raw code on screen.
- **The transport stub must not leak.** If it is not restored, it silently swallows the requests of the
  tests that run after it. Restore it even when a check throws.
- **Kit keys that the app intentionally leaves untranslated** for a language it does not offer must not
  become findings. Hence "languages both support" in check 1.
- **Locally, importing the kit's root module crashes vitest's worker pool on this workstation**
  (`fitness-monitor` `FM-15`). That is an environment issue: CI is the evidence. The check itself must not
  add to the import weight of tests that do not call it.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

Kit test suite, one new file:

1. A correctly wired fixture app (own `i18n` with `uiCoreTranslations`, a provider wrapper) -> `findings`
   equals `[]`.
2. One key removed from the fixture's resources -> exactly one catalogue finding naming that key and
   language.
3. The fixture passes a separate `i18next` instance -> an instance finding.
4. A wrapper that throws -> a render finding naming the page.
5. The resolver bypassed (a fixture that shows `err.code`) -> an error-text finding.
6. After the check, a request through `apiClient` is no longer stubbed.

Run, do not write: the kit's existing auth and i18n tests.

## Parity guardrail

No change to any existing export, component or behaviour. The function is new and test-only in purpose.

---

# B. Implementation map, filled by the Orchestrator and ADDRESSED TO THE IMPLEMENTER

## Context package

### Where this lives, and what it may depend on

- New file `src/testing/checkKitIntegration.js` (new subdirectory, mirroring how `src/theme/` groups
  `assertThemeComplete`). Export `checkKitIntegration` from `src/index.js` at the root, next to the
  existing theme-completeness exports (line ~10-21) — same section-style comment, same pattern.
- **Hard constraint from the Non-goals: "Rendering uses the existing peers (react, react-dom)" —
  this explicitly does NOT include `@testing-library/react`.** Every existing kit test uses RTL, but
  RTL is a devDependency of THIS repo, not a declared peer dependency — if the shipped function
  imported it, every consuming app would need RTL in its own `node_modules` at the exact version
  this kit expects, silently, which is exactly the "no runtime dependency added for consumers" this
  WO forbids. Render with plain `react-dom/client` (`createRoot`) and `act` from `react` — verified
  now: `import { act } from 'react'` resolves and is a function on this repo's installed React
  `19.2.6` (`node -e "console.log(typeof require('react').act)"` → `function`), so use that import,
  not the legacy `react-dom/test-utils` path. Read rendered output via plain
  DOM (`container.textContent`, `document.createTreeWalker`), not `screen`/`within`.
- `react-router-dom` (`^7.15.1`) and `axios` (`^1.16.1`) ARE existing peers — safe to import
  `MemoryRouter` and to manipulate the shared `apiClient` axios instance directly.

### The four checks, in the order the Envelope lists them

1. **Catalogue.** Import `{ uiCoreTranslations }` from `'../i18n/uiCoreTranslations'`. For each key,
   for each language in the INTERSECTION of the kit's shipped languages
   (`['de','en','fr','sw']`) and the app's own supported languages, assert
   `i18n.exists(key, { lng: lang })` — **not** `i18n.exists(key)` alone, which only checks the
   CURRENT active language; i18next's `exists`/`t` both accept an `lng` option to check a specific
   language without switching the instance's active one (verify this against the installed
   `i18next` version's own typings/source before relying on it — do not assume from memory).
   Derive "the app's own supported languages" with this priority (first one that yields a
   non-empty array): `i18n.options?.supportedLngs` (filter out falsy entries and the literal
   string `'cimode'`, which i18next auto-adds) → `Object.keys(i18n.options?.resources || {})` →
   `i18n.languages` (least reliable, only the currently-resolved fallback chain — last resort).
   One finding per missing `(key, lang)` pair, naming both.
2. **Instance.** Import the kit's OWN default `i18next` singleton (`import i18next from 'i18next'`
   — the exact same import `src/auth/apiClient.jsx` already uses). Finding if `!i18next.isInitialized`
   OR `i18n !== i18next` (reference inequality — the whole point is catching an app that created a
   SEPARATE instance via `i18next.createInstance()` and wrapped its tree in its own
   `I18nextProvider`, which is exactly the Risk `UCM-AUTH-10` named: the kit's `apiClient` would then
   send `Accept-Language` from an uninitialized, different instance). Name what breaks in the
   reason text (`Accept-Language` will be missing or wrong) — do not just say "mismatch".
3. **Render.** For each page component in `pages` (default: `[LoginPage, SignUpPage,
   PasswordInvitePage]` — the three pages `UCM-AUTH-9`/`UCM-AUTH-10` actually touched, and the same
   set `survey_app`'s own `AuthRoutesIntegration.test.jsx` already covers by hand), render
   `<MemoryRouter><Wrapper><Page /></Wrapper></MemoryRouter>` into a fresh detached `div` (own
   `createRoot` per page, `root.unmount()` after each, even on failure — use try/finally per page,
   not one try around the whole loop, so one page's render failure doesn't skip scanning the rest).
   Wrap the render in `act(async () => { ... })` so effects/microtasks settle before you scan.
   Catch a throw during render → one finding naming the page's display name (`Page.displayName ||
   Page.name || 'page'`) and the error message; do NOT let it abort the whole check (catch per-page,
   continue the loop). If it didn't throw, walk every text node
   (`document.createTreeWalker(container, NodeFilter.SHOW_TEXT)`) and flag any whose TRIMMED content
   either (a) exactly equals a key in `uiCoreTranslations` (a literal untranslated key leaking to
   screen — the i18next missing-key echo), or (b) matches a bare lowercase/snake_case single-token
   shape with no spaces, e.g. `/^[a-z][a-z0-9_]*$/` and length > 2 (the exact shape of the original
   defect, a raw backend code like `invalid` — tune this pattern against Required Test #5's fixture
   until it fires on that fixture and not on ordinary rendered prose; do not accept the first regex
   that merely compiles). One finding per offending text node, naming the page and the text found.
4. **Error text.** This check is not driven by the `pages` array — it ALWAYS specifically exercises
   `LoginPage` (imported directly by this module), because it is testing the kit's resolver wiring
   through a real submit flow, not generic rendering. Render `LoginPage` the same way as check 3.
   Stub the credentials-login POST specifically — exact path, verified now:
   `/api/auth/browser/v1/auth/login` (`src/auth/authConfig.jsx`'s `HEADLESS_BASE` +
   `src/auth/authApi.jsx:99`'s `loginWithPassword`) — to reject with EXACTLY
   the operator's original defect shape:
   `{ response: { status: 400, data: { errors: [{ code: 'invalid', param: 'email', message: '<some
   backend text>' }] } } }` (a plain object is sufficient — `resolveErrorText`/`extractErrorInfo`
   only ever read `.response?.status`/`.response?.data` off the rejected value, nothing
   AxiosError-specific). Fill the email/password inputs via plain DOM (`input.value = '...'` +
   dispatching a real `input`/`change` `Event` so React's controlled-input `onChange` fires —
   `Object.getOwnPropertyDescriptor` trick may be needed to set a native input value in a way React
   notices; this is a well-known React-testing gotcha independent of any test-utility library, look
   it up if the naive `input.value = x; input.dispatchEvent(new Event('input'))` doesn't trigger the
   controlled state update) and submit (dispatch a `submit` Event on the form, or `.click()` the
   submit button). `await act(async () => { ...await flush... })` until the error text renders.
   Assert the rendered text equals `i18n.t('Auth.field.email.invalid')` evaluated in the APP's
   current active language (`i18n.language`), read via the SAME walk-and-scan helper check 3 uses
   (do not duplicate the scanning logic — factor it into one shared helper both checks call).

### Stubbing `apiClient` — must never leak, must restore even on throw

`apiClient` (`src/auth/apiClient.jsx`, default export, an axios instance) is shared, module-singleton
state — the SAME instance every kit page uses. Capture `const originalAdapter =
apiClient.defaults.adapter;` BEFORE check 3 starts, install a replacement
(`apiClient.defaults.adapter = async (config) => { ... }`) that, by default, REJECTS every request
(so check 3's page renders — which must not make real network calls at all — fail loudly if they
accidentally do, rather than hanging on a real fetch), and for check 4 specifically, additionally
matches on `config.url` to return the fixture rejection ONLY for the login endpoint
(`HEADLESS_BASE`-relative, check `src/auth/authApi.jsx`'s `loginWithPassword` for the exact path) and
the default reject-everything behaviour for anything else. **Wrap the ENTIRE checks 3+4 body in a
`try { ... } finally { apiClient.defaults.adapter = originalAdapter; }`** — the restore must run even
if a render throws an error this code doesn't catch, even if an `expect`-shaped helper you write
itself throws. This is Required Test #6's whole point and the Risk note's explicit warning.

### `README.md` — "Consumer integration check" section

One short section with the one-line test an app writes, e.g.:
```js
import { checkKitIntegration } from '@micha.bigler/ui-core-micha';
import i18n from '../i18n'; // the app's own initialised default i18next instance
import { AppProviders } from '../AppProviders'; // whatever the app wraps its routes in

it('kit integration is sound', async () => {
  const { findings } = await checkKitIntegration({ i18n, wrapper: AppProviders });
  expect(findings).toEqual([]);
});
```
Name the default `pages` set explicitly (`LoginPage`, `SignUpPage`, `PasswordInvitePage`) and that an
app can pass its own `pages` array to cover more/fewer pages.

### Test file — new, next to the existing kit tests (e.g. `tests/checkKitIntegration.test.js`)

Build ONE minimal fixture i18next instance + a trivial `Wrapper` (e.g. just renders `children`, or a
thin `AuthContext.Provider` with a fake user so `LoginPage`'s own context read doesn't throw) reused
across the 6 Required Tests, each test mutating ONE thing away from "correctly wired":
1. Correctly wired fixture (own real `i18next.createInstance()` seeded with `uiCoreTranslations` in
   all 4 kit languages, THIS instance also assigned as the global default — i.e. do not create a
   second competing instance for the "passing" case, since check 2 would then always fail; for a
   realistic "app's own instance IS the default" fixture either call `i18next.init(...)` on the
   real default singleton directly, matching how an app actually does it, or structure the fixture
   so the "instance" check specifically is satisfiable) → `findings` is `[]`.
2. Remove one key's resources for one language from the fixture → exactly one catalogue finding
   naming that key and language.
3. Pass a SEPARATE `i18next.createInstance()` as `i18n` instead of the default singleton → an
   instance finding.
4. A `wrapper` that throws during render → a render finding naming the page.
5. **The actual regression proof:** stub the login POST to reject with the operator's exact shape
   but WITHOUT going through the kit's resolver (simulate "the resolver bypassed" by using a fixture
   `LoginPage`-equivalent harness only if you must — more directly: this is best proven by reverting
   `resolveErrorText`'s field-key step locally, confirming check 4 then reports an error-text
   finding instead of passing, then restoring — narrate this in `PROGRESS` as the transient
   mutation proof, same pattern as `UCM-AUTH-11`/`UCM-THEME-15` in this repo, rather than leaving a
   permanently reverted copy in the committed suite).
6. After calling `checkKitIntegration(...)` once, assert `apiClient.defaults.adapter` is back to
   whatever it was before the call (capture the reference beforehand) — proves restoration even on
   the success path; also add a case that makes an internal step throw (e.g. a page whose render
   throws) and still assert the adapter was restored afterwards (the `try/finally` must cover the
   failure path too, not just the happy path).

Run, do not write: the kit's existing auth and i18n tests (grep `tests/` for
`i18nAggregate`/`authErrors`/`resolveErrorText`/`loginPageErrorResolution` — these are the
directly-dependent set the Orchestrator re-runs as the gate).

## Do-not-touch / invariants

- No change to any existing export, component, or behaviour (Parity guardrail) — this is a new,
  additive, test-only function.
- Do not add `@testing-library/react` (or any other new package) to `dependencies`,
  `peerDependencies`, or `devDependencies` for this function's own sake.
- Do not touch `apiClient.jsx`'s actual interceptors/exports — only reach into
  `apiClient.defaults.adapter` from the NEW module, temporarily, with a guaranteed restore.

---

# C. Orchestrator only, NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it: no
> reviewers, no verification run, no register edit, no `git add`/`commit`/`push`.

### Execution directive

Check `.claude/codex-status.md` first (newest-first; read it with `head`). No line for today means use
Codex. Before `git push`, run `git log origin/main..HEAD` and push only if every listed commit is this
order's (parallel sessions share this checkout).

### Review routing

Tier 3: independent `reviewer` (all configured lenses) and `ui_reviewer`, concurrent, one batch, before
the commit. No `sec_reviewer`: the function adds no runtime path, it only reads what is already there.

### Verification

Run the check once against a real consumer before release. `survey_app` is on `3.9.x` and has the closest
existing test (`frontend/src/AuthRoutesIntegration.test.jsx`). Do it from a scratch copy or a local pack,
never by committing to that repo. Name the result in the register Notiz.

### Register + commit + release

Row -> `done` with the review Notiz in the `AGENTS.md` shape and the published version. The publish
runs on push to `main` when `package.json`/`src/**` change; verify it through the job log
(`npm view` lags for provenance publishes). Adoption rows per app are added by the Expertenchat when
each app's next bump is scoped.

### Mini-handover

`Orchestrator: implement work-orders/UCM-TEST-1.md in ui-core-micha (main). git pull first, read the WO,
then follow orchestrate-codex.`
