# UCM-AUTH-14 — Composable account and profile steps for a page-based setup wizard

## Part A — Envelope (everyone)

**Repository:** ui-core-micha, `main`. **Tier:** 3 (shared core and auth integration).
**Prototype:** the existing MAANA-APP-18 consolidated prototype; no new prototype.

### Goal and expected outcome

Let Maana compose signup, login, explicit terms acceptance and profile completion
inside one consistently single-column wizard without copying authentication logic
or changing the behaviour of existing UCM pages and dialog onboarding.

The operator approved the prototype's single-column direction, Google/Microsoft
entry and four data starting points, and requested these WOs on 2026-10-21.

### Delivery order and dependencies

1. [DCM-AUTH-12](../../django-core-micha/work-orders/DCM-AUTH-12.md) establishes and
   releases the terms-acceptance and checkout-context API contract.
2. **This WO follows it:** consume the released contract and publish an installable
   UCM minor release with the new optional component/client APIs.
3. [MAANA-APP-19](../../maana/work-orders/MAANA-APP-19.md) adopts both exact releases
   and supplies the Maana journey controller, persistence and business steps.

Existing UCM callers that do not use the new options must continue to work against
their existing DCM versions. New capabilities document their minimum DCM version.
No Maana implementation dependency is introduced into the library.

### Scope

**1. Controlled wizard presentation.**

- Provide a reusable page/inline shell with step title, progress, content, errors
  and actions, one consistent column and stable width at all six Maana steps.
- The host controls current/completed/reachable steps, back/next actions, busy
  state and draft state. The shell does not infer completion from a dismissed
  dialog or initiate project/import/payment operations.
- Preserve values on back/forward navigation through an explicit host-controlled
  state contract. Never retain passwords, verification tokens or another user's
  draft in generic persistent storage.
- Provide labelled progress/current step, keyboard-accessible navigation, focus
  movement to the new step or validation error, and predictable pending/error
  behaviour. Prevent accidental duplicate submit while an action is pending.
- Reuse the existing onboarding presentation where appropriate; preserve the
  authenticated dialog OnboardingProvider/OnboardingWizard public defaults and
  built-in steps. Do not make that provider an anonymous workflow engine.

**2. Embeddable account/profile content.**

- Extract or expose composable signup, confirmation, login and profile content from
  the existing full-page components. Keep current pages as working wrappers; share
  the existing auth controller, validation, error handling and security challenges.
- Include Google/Microsoft entry through existing provider services. Preserve an
  app's safe continuation target across login, email confirmation and provider
  callbacks; reject external/untrusted continuation destinations.
- Preserve the separate login after email confirmation, MFA/passkey/recovery and
  required-security flows. A continuation target must not bypass those checks.
- Provide optional terms-document display, an explicit affirmative input and the
  DCM-AUTH-12 acceptance client. Keep privacy and convenience-cookie state separate.
  The Maana combined required statement may submit terms and privacy separately;
  optional cookies remain independent and unchecked by default.
- Never precheck terms based on a provider login or privacy acceptance. Use the
  server's current-version acceptance result on resume. A failed/stale acceptance
  cannot appear as successfully completed; preserve unrelated profile edits.
- Preserve UCM-AUTH-13's same-user refresh protection and reset drafts across
  account boundaries. Ordinary pages must not request the opt-in terms API unless
  the host enables it.

**3. Billing client seam and release.**

Extend the existing billing client with the optional contextual checkout and
attempt-resolution contract delivered by DCM-AUTH-12. Existing
`startCheckout(planKey)` calls keep working. No Maana plan list or entitlement
decision belongs in UCM. Document component props/events, continuation, ownership
of state, minimum DCM release and backward-compatible examples. Add DE/EN strings
and publish a minor release; no consuming app pins are changed here.

### Visual specification, coverage and parity

Visual source:
[MAANA-APP-18](../../maana/work-orders/assets/MAANA-APP-18-consolidated.html),
wizard at `#setup`, accepted on 2026-10-21. Coverage here is only the reusable shell
and account/profile portions, not Maana's homepage, research workspace or branding.

**Parity guardrail:** the prototype governs visual/interaction shape only. Existing
auth policy, permissions and data contracts remain authoritative except for the
explicit additive capabilities in this envelope. Prototype simulation controls
are not product features. Real backend validation overrides simulated success.

**Replaces / removes:** duplicated page framing inside the new embedded variants;
duplicated auth implementation resulting from extraction. Existing public pages,
routes and dialog onboarding are not removed.

**Deliberately keeps:** full-page signup/login/confirmation wrappers, password reset,
passkey/MFA/recovery, auth-policy errors, generic profile/account administration,
existing dialog-only steps and host-controlled cookie behaviour.

**Token delta:** none. Use the existing app/theme tokens; no global theme change
and no shared Maana-specific logo or colour values.

**Copy list:** existing auth validation/error translations are retained. The
prototype's relevant product statement is: "Ich akzeptiere die Nutzungsbedingungen
und die Datenschutzerklärung." Optional control: "Komfort-Cookies erlauben
(optional)". Its auth instruction is "Öffne den Bestätigungslink in der E-Mail."
and provider transition is "Die Anmeldung erfolgt bei {provider}. Danach geht es
hier weiter." These have equivalent English translations. Do not ship prototype
simulation notices or add marketing/helper paragraphs. Maana supplies its step
labels and app-specific copy.

### Non-goals / do not touch

Maana project/import/plan logic, server-side wizard persistence, prices, global
design tokens, provider policy/configuration, auto-login after confirmation,
changes to other apps, infrastructure, CI and unrelated dependency upgrades.

### Required tests to write

- Controlled next/back navigation retains supplied draft data, enforces reachable
  steps, handles pending/errors and supplies keyboard/focus/current-step semantics.
- Existing page wrappers and dialog onboarding keep their default behaviour.
- Embedded email signup/confirmation/login and provider callbacks resume the safe
  host destination, including cancellation/retry; external targets are rejected.
- MFA/required-security continuation cannot be bypassed by a wizard return target.
- Terms remain unchecked without server evidence; stale/failing acceptance blocks
  completion; optional cookies are independent. Profile edits survive same-user
  refresh but do not cross users. Disabled opt-in makes no new API requests.
- Billing client preserves the old call shape and forwards/resolves the new context
  only as specified by DCM; no raw redirect target is accepted from UI state.
- DE/EN labels and errors resolve through the actual shared i18n setup.

### Risks

Extracting only the visual LoginForm and rebuilding its controller would omit
security flows; reuse the whole existing behaviour. Dialog onboarding completion
is not durable wizard progress. The shared shell must not impose Maana's business
state model on other consumers.

## Part B — Implementation map (addressed to the implementer)

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`.
The library is not a joined application: you are the single implementer and own
production code, focused Vitest tests and the dev-harness entry. This is a shared
checkout: preserve all foreign edits, including the untracked `scratchpad/` directory.

You own: the new modules under "Public interface contract" and the new test files
under "Required tests"; edits to `src/pages/LoginPage.jsx`, `src/pages/SignUpPage.jsx`,
`src/pages/SignupConfirmPage.jsx`, `src/components/ProfileComponent.jsx` (extraction
only), `src/billing/api.js`, `src/billing/wire.js`, `src/index.js`,
`src/i18n/authTranslations.ts`, `src/i18n/onboardingTranslations.ts`,
`dev/entries.jsx`, `dev/main.jsx`; new shared helper modules under `src/utils/` or
`src/auth/` where the map below asks for one shared implementation.

You do NOT edit: `package.json`, the lockfile, `CHANGELOG.md`, `README.md`,
`WORK_ORDERS.md`, CI, `src/onboarding/OnboardingProvider.jsx`,
`src/onboarding/OnboardingWizard.jsx`, `src/onboarding/WizardDialogShell.jsx`,
`src/onboarding/steps/**`, `src/billing/PlanPicker.jsx`,
`src/billing/SubscriptionSection.jsx`, `src/auth/apiClient.jsx`,
`src/auth/AuthContext.jsx`, `src/utils/authService.js`, theme files, existing tests
(except the narrow mock rule under "Invariants").

### Upstream contract (pinned)

Minimum DCM for every new option: **django-core-micha 3.16.0** (PyPI; landing commit
e4e54f2). Authority: `django-core-micha/docs/design/terms.md` and
`django-core-micha/docs/design/billing.md`, section "Contextual checkout and attempt
resolution (DCM-AUTH-12)" plus the omitted-context sentence under "Stripe plan sync and
payments" (DCM `main` at d94c4b7). The slice you need:

**Terms acceptance.** Mounted by each app at a prefix of its choice (documented example
`api/terms/`), so the client takes an `apiBase` (default `/api/terms/`).
Session-authenticated JSON, `no-store`, POST CSRF-protected (the shared `apiClient`
already sends the CSRF header).

- `GET <prefix>/` → `{"document": {"app", "version", "url"}, "accepted": bool, "accepted_at": iso|null}`
  for exactly the configured version and the signed-in person.
- `POST <prefix>/` with exactly `{"version": "<offered version>", "accept": true}` →
  201 (new) or 200 (already accepted, original `accepted_at`), body in the GET shape.
- Errors, in this check order, write nothing: 401 `authentication_required`;
  404 `terms_not_configured`; 400 `invalid_request`; 400 `unexpected_fields` (+`fields`)
  for any other key; 400 `acceptance_required`; 400 `version_required`;
  409 `version_mismatch` with `document`, `accepted`, `accepted_at` = what GET returns
  now. A CSRF failure is a 403.
- The browser never sends a timestamp, user, app or URL; the version sent is the one
  the server offered. Terms acceptance is never inferred from privacy, cookies, an
  existing account, a provider login or a checkout.

**Contextual checkout.** Existing `POST <billing>/checkout/`:

- Without `context` (absent or `null`): request `{"plan_key"}`, response `{"url"}` —
  unchanged; the existing `startCheckout(planKey)` call must stay byte-identical.
- With context: `{"plan_key", "context", "idempotency_key"}`. The key matches
  `[A-Za-z0-9_-]{16,64}`, belongs to ONE deliberate pay click, is reused unchanged when
  that request is retried after a network interruption; a new key is a new attempt.
  Response 200 `{"url", "attempt": {"reference", "context", "plan_key", "status",
  "created_at", "expires_at"}}`.
- Errors: 401 `authentication_required`; 400 `unknown_context`;
  400 `invalid_idempotency_key`; 400 `unknown_plan`; 409 `idempotency_key_reused`;
  409 `attempt_not_open` (+`attempt`; start a new attempt with a new key);
  502 `checkout_unavailable`. A 502 can also be Stripe's idempotency refusal after a
  configuration change: the client surfaces every error and never retries on its own.
- Return destinations come only from server configuration and carry
  `checkout_attempt=<reference>`; the browser never supplies a return URL.

**Attempt resolution.** `GET <billing>/checkout/attempts/<reference>/` → 200 same
`{"url", "attempt"}`; 404 `attempt_not_found` (unknown, malformed or foreign alike);
401. `url` is non-null only while the attempt is `open` and its session unexpired (it
resumes the same Stripe session after a cancellation — there is no cancel endpoint).
`status` ∈ `open | processing | paid | failed | expired`, forward only, changed only by
verified webhooks. Entitlement is read from `me/` only, never from an attempt or a
query parameter.

### Architecture slice and seams (verified against `main` at 09606a5)

**1. Controlled setup shell (new).** The only wizard frame today is the authenticated
dialog `src/onboarding/WizardDialogShell.jsx:17-49` (MUI Dialog; header keys
`Onboarding.STEP_COUNTER` / `Onboarding.SETUP` at :24-26; LinearProgress), driven by
`OnboardingWizard.jsx:6-59`, which counts a dismissed/closed step as complete
(:36-47). That pair stays exactly as is. The new shell is a separate page/inline
component: one centred column of stable width at every step (prototype: 600px column,
32px inner padding, 20/16px below a 600px viewport, stacked full-width actions with the
primary on top on narrow screens), a labelled step list (current step has
`aria-current="step"`, steps the host marks unreachable cannot be activated, completed
steps are marked), a polite live "step n of N" counter reusing `Onboarding.STEP_COUNTER`
and `Onboarding.SETUP`, a step title heading that receives focus on step change, an
error region that receives focus when an error appears, the step content, and one
action row (back + primary). Everything is host-controlled: steps and labels,
current/completed/reachable ids, step selection, back/primary handlers, busy state,
error text. The shell persists nothing, infers no completion and never starts
project/import/payment work. A primary action can submit a content form natively
(Enter in a field submits), and activation is ignored while busy or while a promise
returned by the primary handler is pending (no duplicate submit). Use theme palette,
spacing and typography only; no Maana colour or logo values.

**2. Login controller extraction.** `src/pages/LoginPage.jsx` holds the whole login
behaviour inline: safe `next` resolution `getRedirectTarget` :57-94 (forced
recovery/security target > `security_state.requires_additional_security` →
`/account?tab=security&from=weak_login` > same-origin leading-slash `next` > `/`),
social-error detection from `error`/`social` query parameters :96-101, S164 recovery
hand-off :103-172, authenticated-on-arrival redirect :174-177,
credential/passkey/MFA/recovery handlers :180-261, auth-method flags :263-275, render
with `LoginForm` and `MfaLoginComponent` :310-337. Extract this behaviour so the page
and the new `LoginContent` share ONE implementation (not a new controller around
`LoginForm`). The page keeps `NarrowPage` framing, `<title>`, `LOGIN_PAGE_ALERT_SX`,
the `?next=` source, `/reset-request-password` and `/signup` navigation, its current
`startSocialLogin(provider)` call and the recovery hand-off. `LoginContent` takes the
continuation from a prop, renders the MFA step inline in the same column, never reads
or strips the URL recovery sentinel and never consumes the recovery session token.
Continuation validation is ONE shared function used by the page, `LoginContent`, and
the provider entry of `LoginContent`/`SignUpContent`. When a forced or required-security
target applies, the component performs that navigation itself and does not hand the
continuation back; only a non-forced success reports `{ user, target }` to the host.
`login(user)` on AuthContext is called exactly as the page does today, including the
authenticated-on-arrival case after a provider callback.

**3. Provider entry.** `startSocialLogin(provider, { callbackUrl })`
(`src/utils/authService.js:169-223`) already rejects cross-origin callback URLs
(:198-221) and falls back to `${origin}/login`; it is not changed. The embedded entry
reuses `SocialLoginButtons` (`src/components/SocialLoginButtons.jsx:11-82`) gated by
`authMethods.social_login` + `social_providers` (as `LoginPage.jsx:263-267`), passes the
validated continuation as `callbackUrl`, shows the copy-list transition text with the
provider name while the redirect is pending, and returns to the provider choice with
the existing `Auth.SOCIAL_LOGIN_FAILED` message when starting fails or when the callback
arrives with the `error`/`social` query parameter (cancellation), so the person can
retry. Note: `startSocialLogin` compares against a `www.`-stripped origin; pass the
continuation path as is and do not work around that.

**4. Signup and confirmation extraction.** `src/pages/SignUpPage.jsx` mixes framing
(:156-161), mode derivation from `authMethods.signup_modes` (:51-69), the QR token from
`?rt` (:61-62), Turnstile (:80-81, :100-102, reset on failure :142-145), submit via
`submitRegistrationRequest` (:104-149), the success alert (:168-172) and a hardcoded
`navigate('/login')` (:151-153). `src/pages/SignupConfirmPage.jsx` reads `?token`
(:30-33), validates and calls `confirmRegistration` (:40-70), and hardcodes
`navigate('/login', { replace: true })` (:63) plus `/signup` and `/login` (:90-95,
:142). Extract `SignUpContent` and `SignupConfirmContent`; the pages become wrappers that
supply the URL-derived inputs and today's navigations and render exactly what they
render today. `SignUpContent` keeps all signup modes, optionally shows the provider
entry above the email form (prototype order: Google, Microsoft, divider, email), reports
a submitted email to the host and, in embedded use, shows the copy-list instruction to
open the confirmation link. `SignupConfirmContent` receives the token from the host and
reports success to the host, which then shows the separate login; there is no
auto-login after confirmation. Passwords and tokens live only in component state and are
never passed to a host callback. DCM builds the confirmation link as
`{base}/signup/confirm/?token=...` without a continuation parameter, so continuation
across confirmation comes from the host rendering `SignupConfirmContent` at that route —
never from storage.

**5. Profile step content.** `src/components/ProfileComponent.jsx` carries the
UCM-AUTH-13 same-person rule: identity `user.id ?? user.email ?? user.username`
(:59-61), edited-field set reset on identity change (:50-51, :57-87), untouched fields
refreshed from the server. Extract that rule into a shared module used by both
ProfileComponent (behaviour unchanged; `tests/ProfileComponent.refresh.test.jsx` stays
green without edits) and `ProfileStepContent`. `ProfileStepContent` shows first/last
name, ONE required combined statement when terms are enabled (terms + privacy, both
nouns linked: terms to the server-provided `document.url`, opened in a new tab with
`rel="noopener noreferrer"` and only for `http`/`https`; privacy to the existing
statement via `fetchPrivacyStatement` (`src/auth/authApi.jsx:64-67`) or a host-supplied
link), and the independent optional convenience-cookie control (initial value from the
user's server value, never derived from terms or privacy). Without terms enabled the
required statement is privacy only, matching today's semantics. Draft values are
host-controlled (value + change callback) and bound to the person: a draft of another
identity is never displayed or submitted and is replaced by the current person's server
values. Completion writes the existing profile PATCH (`updateUserProfile`, :49-56:
names, `accepted_privacy_statement`, `accepted_convenience_cookies`), updates AuthContext
with the response as `AccountPage.jsx:96-99` does, and, when terms are enabled, POSTs the
acceptance with the version from the last GET. Completion is reported to the host only
when every required write succeeded; repeating it after a partial failure is safe (both
writes are idempotent). On 409 `version_mismatch`: if the body says `accepted: true`
the requirement is met; otherwise take the returned document, uncheck the statement,
show an error asking to accept the current terms, and keep the names. Any other terms
error (including 404 `terms_not_configured`) keeps the step incomplete with an error
(fail closed). The combined statement is pre-checked only when the server reports
current-version `accepted: true` AND the user's privacy acceptance — never because of a
provider login, an existing account or privacy alone. Terms are an explicit opt-in prop;
without it neither `ProfileStepContent`, ProfileComponent nor AccountPage makes any terms
request.

**6. Terms client.** New `src/auth/termsApi.js` following the billing/receipts client
pattern (`src/billing/api.js:4-31`): a factory with `overrides` and `{ apiBase }`
(default `/api/terms/`) using the shared `apiClient`, returning `getAcceptance()` (GET)
and `accept(version)` (POST exactly `{ version, accept: true }`), plus a default
instance. Responses resolve to `response.data`; errors reject unchanged so callers read
`error.response.status` / `error.response.data.detail` (as the billing surface does).

**7. Billing client seam.** `createBillingApi` (`src/billing/api.js:4-29`) posts
`{ plan_key }` in `startCheckout(planKey)` (:9); URLs come from `billingApiUrls`
(`src/billing/wire.js:8-22`). Extend `startCheckout(planKey, options)`: with no options
or `context` null/undefined the request and result are exactly as today; with a context
it sends only `plan_key`, `context` and `idempotency_key` (from `options.idempotencyKey`)
— every other option, including anything URL-like, is ignored — and rejects without a
request when the key does not match `[A-Za-z0-9_-]{16,64}`. Add
`resolveCheckoutAttempt(reference)` (GET the attempt URL, reference URL-encoded; reject
without a request when it does not match `[A-Za-z0-9_-]{16,64}`) and an exported helper
`createCheckoutIdempotencyKey()` that returns a fresh key matching the pattern from a
cryptographic source (`crypto.randomUUID`, or `crypto.getRandomValues`). No automatic
retry anywhere. Overrides through `createBillingApi(overrides)` keep working.
PlanPicker and SubscriptionSection are not changed; they keep validating returned URLs
with `isTrustedPaymentUrl` (`src/billing/safeUrl.js:10-16`, `PlanPicker.jsx:31-32`,
`SubscriptionSection.jsx:55`). A host that wants context passes an `api` override.

**8. Exports and i18n.** Export the new components and clients from `src/index.js`
next to the existing pages/components/billing/onboarding blocks (:48-57, :85, :133-146).
New keys go into `src/i18n/authTranslations.ts` (`Auth.*`: `de` formal plus `de_informal`
where the text addresses the person) or `src/i18n/onboardingTranslations.ts`
(`Onboarding.*`, shell only). Every new key carries `de`, `en`, `fr` and `sw`
(`tests/i18nAggregate.test.js` enforces them). Copy-list wording (informal German, the
variant Maana uses): "Öffne den Bestätigungslink in der E-Mail.", "Die Anmeldung erfolgt
bei {{provider}}. Danach geht es hier weiter.", "Ich akzeptiere die Nutzungsbedingungen
und die Datenschutzerklärung." (the two nouns are the links), "Komfort-Cookies erlauben
(optional)"; give natural English equivalents and a formal `de`. Reuse existing auth
keys for every existing label and error. No prototype simulation notices, no helper or
marketing paragraphs; step labels and titles are host copy.

### Public interface contract (binding names)

- `SetupWizardShell` — `src/onboarding/SetupWizardShell.jsx`
- `SignUpContent` — `src/components/SignUpContent.jsx`
- `SignupConfirmContent` — `src/components/SignupConfirmContent.jsx`
- `LoginContent` — `src/components/LoginContent.jsx` (embedded login incl. inline MFA and provider entry)
- `ProfileStepContent` — `src/components/ProfileStepContent.jsx`
- `createTermsApi`, `defaultTermsApi` — `src/auth/termsApi.js` (`getAcceptance()`, `accept(version)`)
- `createBillingApi()` / `defaultBillingApi`: `startCheckout(planKey, options?)`, `resolveCheckoutAttempt(reference)`
- `createCheckoutIdempotencyKey` — `src/billing/api.js`

All exported from `src/index.js`. Prop names and event shapes are yours to design within
this map: keep them minimal, document each component's props/events in a JSDoc block,
and make every new prop optional where a page wrapper does not need it.

### Invariants, do-not-touch, pitfalls

- Existing exports, page names, `*_ALERT_SX` constants, routes, titles and default
  navigations stay unchanged. Dialog onboarding (`OnboardingProvider`, `OnboardingWizard`,
  `UNIVERSAL_STEP_DESCRIPTORS`, built-in steps) is untouched.
- No new `localStorage`/`sessionStorage`/IndexedDB access anywhere in this WO.
- No new dependency; MUI and react-i18next only. No theme or token change.
- Anonymous setup routes need `addPublicPath` in the host (`src/auth/apiClient.jsx:29-36,59`);
  do not change the built-in list.
- Existing tests must pass unmodified: `tests/pageTitles.test.jsx` (mocks `LoginForm`,
  `TurnstileWidget`, `PageLayout`, `ProfileComponent` by module path),
  `tests/loginPageErrorResolution.test.jsx`, `tests/authErrorCodeRendering.test.jsx`,
  `tests/SignUpPage.test.jsx`, `tests/ProfileComponent.refresh.test.jsx`,
  `tests/OnboardingWizard.test.jsx`, `tests/OnboardingProvider.test.jsx`,
  `tests/billingApi.test.js`, `tests/checkKitIntegration.test.jsx`. If one genuinely
  needs a mock for a newly introduced module, add only that mock — never change or
  weaken an assertion — and name it in your final report.
- Errors render through `resolveErrorText(i18n, err, defaultKey)` as the pages do.
- jsdom origin is `http://localhost`; mock `startSocialLogin` in tests (it submits a form).
- Test conventions: `// @vitest-environment jsdom`, `vi.hoisted` module mocks, mocked
  `react-router-dom` / `react-i18next` (see `tests/SignUpPage.test.jsx`,
  `tests/OnboardingWizard.test.jsx`, `tests/ProfileComponent.refresh.test.jsx`).

### Required tests to write (maps Part A)

- `tests/SetupWizardShell.test.jsx` — controlled next/back keeps host draft values;
  unreachable steps not activatable; `aria-current="step"`; live counter; focus to the
  title on step change and to the error when shown; busy and a pending primary promise
  block a second submit.
- `tests/LoginContent.continuation.test.jsx` — embedded success reports the safe
  continuation; absolute, protocol-relative and backslash targets fall back; required
  security and recovery-forced targets win and are navigated by the component; MFA step
  inline; provider callback `error`/`social` shows the failure and allows retry;
  authenticated-on-arrival resolves through the same precedence; the provider entry
  passes the validated continuation as `callbackUrl`.
- `tests/SignUpContent.test.jsx`, `tests/SignupConfirmContent.test.jsx` — embedded submit
  reports the email and never a password or token; confirmation reports success to the
  host and does not log in; Turnstile reset on failure.
- `tests/authPageWrappers.test.jsx` — LoginPage default target, `next` validation and
  security precedence; SignupConfirmPage still navigates to `/login` with replace;
  SignUpPage keeps its success alert and login link.
- `tests/ProfileStepContent.terms.test.jsx` — unchecked without server evidence
  (provider-only user, privacy-only user); 409 with `accepted: false` and other failures
  block completion, refresh the document and keep names; 409 with `accepted: true`
  completes; cookies independent and optional; same-person refresh keeps edits, identity
  switch resets the draft; terms not enabled → zero terms requests.
- `tests/termsApi.test.js` — GET/POST shapes, POST body exactly `{ version, accept: true }`,
  `apiBase` override.
- `tests/billingCheckoutContext.test.js` — no options and `context: null` post exactly
  `{ plan_key }`; context posts `{ plan_key, context, idempotency_key }`; URL-like and
  unknown options never sent; missing/malformed key and malformed reference reject
  without a request; resolve URL encoding; a 502 rejects after exactly one request;
  `createCheckoutIdempotencyKey` matches the pattern and differs between calls.
- `tests/setupTranslations.test.jsx` — real i18next with `createUiCoreTranslations()` (no
  `react-i18next` mock) renders the new labels and an error in `de` and `en`.

Dev harness (not published, `files: ["dist"]`): add a `setup-wizard` entry to
`dev/entries.jsx` rendering `SetupWizardShell` with the account states (provider choice +
email, provider transition, email sent, confirmation, login) and the profile step with
terms enabled, against stubbed APIs, in German (its own i18next instance from
`createUiCoreTranslations({ germanVariant: 'informal' })`), and render it at the true
browser viewport without harness padding (extend the `usesBrowserViewport` handling in
`dev/main.jsx`). Provide a way to switch between these states inside the entry.

Work from this package; do not explore broadly. Open only the named files to verify.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to
refine; there is no separate plan file. Read the root `AGENTS.md` and
`.codex/skills/frontend-engineering/SKILL.md` only for conventions. Stay in scope; do not
touch auth policy, permissions, dependencies, schema or CI beyond what this spec names;
do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the
review verdicts are the Orchestrator's alone.** Your tools are for editing the assigned
source, test and dev files and for running the tests you wrote — nothing else. Do NOT
install dependencies, touch a lockfile, run a package manager or tidy stray files; if repo
state blocks you, stop with `RESULT: BLOCKED <reason>`. Do NOT `git add`/`commit`/`push`;
leave every change uncommitted for the Orchestrator's independent review. WRITE the
required tests AND run only the tests you wrote, once, with the existing direct runner
(`node_modules/.bin/vitest run <your test files>` from the target directory) — that is your
ONLY test run, not the app's suite and not a review. The Orchestrator re-runs the
authoritative set and does the independent review afterwards; your run is not the gate.

Use explicit UTF-8 file I/O. You share this checkout: preserve all other edits. Start
with `PLAN: <step1> | <step2> | ...`, print a single-line
`PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and
`... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly one
`RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to an application implementer.

> If you are the implementer reading this work order as your own specification: STOP at
> this line. Everything below describes what the Orchestrator does AFTER you finish. You do
> none of it — no reviewers, no verification run, no register edit, no commit. You ARE the
> implementation instance described below; do NOT launch or dispatch another implementer.

Status: planned; Gate #1 approved by the operator on 2026-10-21 in the Maana
Expertenchat (session local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Dispatch waits for
the published DCM-AUTH-12 release and contract.
Follow `orchestrate-codex` after approval. DCM-AUTH-12 is the upstream release gate;
record the actual DCM version and contract before dispatch. Complete required
independent Tier-3 review, security and frontend review under current governance.
Use the existing prototype for the scoped 375/1280 rendered comparison of the
shell/account/profile states; the remaining Maana journey is verified downstream.
Record tests, compatibility evidence and the published UCM version in the register.
No application promotion, fleet bump or prototype rewrite belongs to this WO.

### Upstream gate record

DCM-AUTH-12 released as django-core-micha 3.16.0 (PyPI confirmed 2026-10-21; landing
e447d4f, e4e54f2, register d94c4b7; publish run 39645732413), announced by the Maana
Expertenchat. Contract read from DCM `origin/main` d94c4b7: `docs/design/terms.md`,
`docs/design/billing.md` (DCM-AUTH-12 section), `CHANGELOG.md` [3.16.0]. Part B filled
against it by the Orchestrator (Claude) on 2026-10-21.

### Execution directive

Configured `implementation`: codex/gpt-6-luna. Claude parent, CLI route, cwd
`C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`: `codex exec --skip-git-repo-check
--dangerously-bypass-approvals-and-sandbox -m gpt-6-luna - < work-orders/UCM-AUTH-14.md`
(stdin form for the large WO), backgrounded, output to the session scratchpad; banner read
back. Codex status: newest record 2026-10-15 available, none today, so this dispatch is the
day's probe. One dispatch; review findings are fixed by the Orchestrator.

Launch evidence: one CLI dispatch on 2026-10-21, `codex exec -m gpt-6-luna -c model_reasoning_effort=high
-C <ucm> - < work-orders/UCM-AUTH-14.md`; banner read back: model gpt-6-luna, provider openai, workdir ui-core-micha,
reasoning high, session 01a15f95-efcf-7813-8881-e5e15b323794. It did not commit, stage or touch the register,
package files, CHANGELOG or README. It ended `RESULT: BLOCKED` only because its single allowed test run preceded a
syntax fix of its own; the implementation was complete. It could not find the root `AGENTS.md` and frontend skill at
the relative paths (cwd ui-core-micha), conventions only.

### Execution record (Orchestrator)

Integration found defects the Orchestrator fixed before review (author of these changes: Orchestrator, Claude):
`LoginContent` called `login()` in the signed-in-arrival effect (re-render loop risk) and accepted injectable
`authApi`/`authService` props that broke `tests/pageTitles.test.jsx`; injectable API props on the other contents were
removed as unrequested public surface (tests use module mocks, the harness the mock transport); missing keys
(`Auth.OR`, `Common.BACK`); no native form submit through the shell; shell visuals rebuilt to the APP-18 structure
with theme tokens only; continuation without a valid value no longer forced `/` as provider callback; compressed code
reformatted and the S164 rationale comments restored; Luna's tests rewritten to assert behaviour (several asserted
props or the arrival `login()` bug). `LoginFlow` (internal, not re-exported) is the shared controller of `LoginPage`
and `LoginContent`.

Deviations from Part B, recorded: the terms client is a factory `createTermsApi` in `src/auth/termsApi.js` (the DCM
prefix is app-chosen) instead of functions in `authApi.jsx`, as Part B §6 already specified; the embedded contents keep
the existing kit labels ("Mit Google fortfahren", "Einladung anfordern", divider "oder") rather than prototype copy, per
the copy rule that existing auth labels are retained.

Review rounds (codex/gpt-6-luna, `--sandbox read-only`; reviewers' own shell reads were rejected by the Windows
sandbox, so all reviewed the inline diff): round 1 all six (envelope, regression, duplication, tests, ui, sec); round 2
tests + envelope after fixes; round 3 envelope + ui after the focus fix; round 4 envelope after the submit-guard fix.
Dispositions in the register Notiz.

CI proof: `ci.yml` on `ci-test/UCM-AUTH-14` for candidate 20b9736 (run 39675235455): build passed, 1171 of 1172
tests passed including `packageTreeShaking`; `themeCompleteness` "kit sx disjointness" failed on seven inline `sx`
objects in the new components (kit convention: top-level exported objects in `kitSxRegistry`). The Orchestrator's
affected list had dropped `themeCompleteness` (an Orchestrator error). Fixed in a follow-up commit: exported
`SIGN_UP_PROVIDER_*_SX`, `PROFILE_STEP_*_SX`, `SETUP_WIZARD_CARD_SX` with registry entries; the card now takes the
theme's Paper radius. Delta reviewed (regression + ui lenses) and CI re-run on the new head.

Verification: affected set on the final tree (32 files, 205 tests): 204 passed; `tests/packageTreeShaking.test.js`
fails locally only on a Windows symlink permission (EPERM, environment), proven in CI below; `packageEntries` needs
`--testTimeout=60000` on this machine. `tsc -p tsconfig.build.json` passed. Rendered comparison against
`MAANA-APP-18-consolidated.html#setup` via the dev harness `#setup-wizard` (servers `ui-core-micha-dev-harness`,
`maana-prototypes`): four application screenshots (account step and profile step at 375 and 1280) beside the
prototype's same states; same structure (header row, numbered step list with completed check, 600px centred card,
title and detail line, fields, combined statement with two links, optional cookies, stacked primary/back), no
horizontal overflow at 375 (scrollWidth = viewport); differences are MUI floating labels, theme typography sizes and
the retained kit labels. Coverage is sampled, not complete. DOM checks: email-sent state shows the success message and
"Öffne den Bestätigungslink in der E-Mail."; empty profile submit focuses the error; names + statement submit through
the shell's `primaryForm` completes after the profile PATCH and terms POST.

### Review routing (Tier 3)

One concurrent batch on the same unmodified diff (`python -I .claude/scripts/review-diff.py`):
`review` lenses envelope, regression, duplication, tests; `ui_review`; `sec_review` — all
codex/gpt-6-luna, `--sandbox read-only`, static-only clause; fallback claude/sonnet. Own
targeted security pass in parallel (continuation/open redirect, security-flow bypass, terms
evidence, checkout option allowlist, storage). In-scope findings fixed by the Orchestrator,
corrected diff re-reviewed.

### Verification

Affected set, once at the end: the new tests plus `pageTitles`, `loginPageErrorResolution`,
`authErrorCodeRendering`, `SignUpPage`, `ProfileComponent.refresh`, `AccountPage*`,
`OnboardingWizard`, `OnboardingProvider`, `onboardingDescriptors`, `CookieConsentStep`,
`billingApi`, `billingExports`, `billingPublicExports`, `billingPlanPicker`,
`billingSubscriptionSection`, `billingChoosePlan`, `authTranslations`, `i18nAggregate`,
`i18nGermanVariant`, `packageEntries`, `packageTreeShaking`, `checkKitIntegration`, and the
TypeScript build. Full suite only in publish CI. Rendered 375/1280 comparison: dev-harness
`setup-wizard` entry against `MAANA-APP-18-consolidated.html#setup` (shell + account and
profile states), at most four application screenshots including the two-width pair.

### Register, docs, release

Orchestrator writes the README section and CHANGELOG entry, bumps the minor version,
commits with explicit pathspecs, checks `git log origin/main..HEAD` before the push,
confirms the published version with `npm view`, records the register row in a second
commit, and reports back to local_cbfc9d51-5217-42a4-99ba-27a315c854ce.
