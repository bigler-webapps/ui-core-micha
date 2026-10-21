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

## Part B — Implementation map (reserved for the Orchestrator)

**Not dispatch-ready.** After Gate #1 and the DCM contract/release, fill the complete
context package, absolute working directory, contract slice, exact source anchors,
progress contract and implementer preamble. Do not dispatch from this envelope.

Inspection starting points:

- `src/onboarding/OnboardingProvider.jsx`, `OnboardingWizard.jsx`,
  `WizardDialogShell.jsx`: authenticated dialog selection and presentation.
- `src/pages/SignUpPage.jsx`, `SignupConfirmPage.jsx`, `LoginPage.jsx`:
  page framing, hardcoded navigation and auth-controller ownership.
- `src/components/ProfileComponent.jsx`, `src/utils/authService.js`,
  `src/auth/authApi.jsx`, `src/index.js`: profile state, callbackUrl, APIs/exports.
- `src/billing/` and existing auth/onboarding/profile/client tests.
- The published DCM-AUTH-12 contract; do not guess its final endpoint names.

## Part C — Orchestrator only

STOP — this part is not an instruction to an application implementer.

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
