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
