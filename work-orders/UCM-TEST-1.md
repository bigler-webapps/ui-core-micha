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

*Placeholder. The Orchestrator fills the context package, the absolute working directory, the
progress contract and the preamble block on `git pull`, per `AGENTS.md` -> "Work Order". Do not
dispatch while this placeholder stands.*

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
