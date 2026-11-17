# UCM-AUTH-17 — Extensible registration form for an optional app field

## Part A — Envelope

**Target:** ui-core-micha, `main`.

Tier 3 — shared frontend core and registration.

### Goal and scope

Allow an application embedding `SignUpContent` to add its own optional registration field and send its value with the existing registration request, without duplicating the shared form. The app owns the field's UI, copy, translations and validation; the shared component supplies a narrow, explicit extension contract. Extension data must not overwrite the core email, registration mode, anti-abuse token, QR token or existing generic access code. Do not put the value in a URL, browser persistent storage or logs. Submission, errors, loading, disabled controls, keyboard behavior and success handling remain coherent with the existing form. Existing consumers and provider flows remain unchanged when no extension is configured.

This is a reusable, opt-in integration seam; do not introduce Maana-specific UI, grant logic or new shared product copy. The actual Maana field is governed by MAANA-APP-23 and its pinned prototype, including all 375/1280 acceptance criteria; the core extension changes no default appearance. Token delta and copy list: none.

### Required tests to write

Test opt-in rendering and submission of an optional value, absence and empty-value behavior, loading/error/retry and success, restriction against overriding protected core request fields, no persistence or URL propagation, and preservation of existing signup modes, providers and anti-abuse handling without the extension. Verify accessible keyboard interaction for an application-supplied field. Document the public API and the consumer's responsibility for labels, validation and error text.

### Risks

Registration is shared across applications. Extra data must be optional, scoped, protected from request-field collisions and never silently alter existing flows.

## Part B — Implementation map

Target `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. `src/components/SignUpContent.jsx` owns the form, input state, provider flow and `handleSubmit`; `src/auth/authApi.jsx` implements `submitRegistrationRequest`. Existing regression tests are `tests/SignUpContent.test.jsx` and nearby auth tests; update public documentation for the opt-in contract. Existing `SignUpPage.jsx` uses the component without extension props and must retain behavior. Stay in named paths and relevant tests/docs. No package manager, lockfile, dependency changes, unrelated restyling or app files.

### Implementer preamble

Your first tool action is the exact command `codex-hook-canary-ws-gov-60`; the expected denial is `WS-GOV-60 canary: workspace hooks are active`. Continue after it; if absent, report unverified coverage. This is the COMPLETE spec. You are the IMPLEMENTER, not the orchestrator. Work only on approved source, tests and contract docs. Run only tests you wrote, once. Do not install dependencies, run package managers, edit registers or memory, launch other agents, review, stage, commit or push. Report blockers without expanding scope. Start with `PLAN: ...`, emit `PROGRESS: [n/total] ...` before relevant actions and on completion, and finish `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP: implementer instructions end here. Do not dispatch, review, update register, commit or push.

Operator explicitly approved this UI-core dependency on 2026-11-16 in the MAANA-APP-23 chat. Run configured implementation, independent Tier-3 general/UI/security reviews and scoped tests. MAANA-APP-23 retains its pinned prototype and complete real-app acceptance at both widths.

## Gate record

Gate #1 approved by the operator 2026-11-16: "Ja, freigeben" to the separately scoped backwards-compatible registration form extension.

## Progress — 2026-11-16

Implementation and two independent review rounds completed. Round 1 found that the keyboard test simulated form submission instead of verifying real keyboard input; the test now verifies the host-controlled edited value and the submit control semantics. Round 2 repeated the outstanding real-keyboard finding. The two affected test files pass (9 tests), but the required actual keyboard interaction is not yet verified. The local test harness is `scratchpad/ucm-auth17-keyboard.html`; the in-app browser could not reach its server on the initial attempt and the subsequent local preview was queued while the chat was not visible. Do not mark done or publish until keyboard interaction is verified. Changes remain uncommitted.

Follow-up: a durable keyboard test was added to `tests/SignUpContent.test.jsx`, using `@testing-library/user-event` to navigate with Tab, type, and submit with Enter. It passes with the existing suite (10 tests) using a temporary local alias to version 14.6.12. The package is not yet declared in ui-core-micha; normal CI cannot run the new test until the operator explicitly authorizes that development dependency and the lockfile is updated. Do not commit a broken test or claim the dependency was approved. Input was emulated, not a rendered-browser acceptance.

Later follow-up: the operator approved 14.6.12 and the package and minimal lockfile changes are now prepared under UCM-DEP-4. The corrected scoped suite passes 11 tests using the temporary alias. A normal frozen install is currently refused by pnpm's minimum-release-age policy until approximately 2026-11-17 02:28 UTC; no bypass has been approved. The UCM-AUTH-17 code and tests remain uncommitted until UCM-DEP-4's ordinary install and checks succeed.

On 2026-11-17 the operator approved replacing 14.6.12 with the established 14.6.1, tracked as UCM-DEP-5. Its normal frozen install, UI-core build, and 11 focused tests pass; the keyboard test uses emulated Tab, text entry and Enter. UCM-DEP-5's independent review returned no findings. No computer-use interaction was performed. Landing and publication remain pending the repository's foreign unpushed commit.
