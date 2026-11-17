# UCM-DEP-5 — Keyboard test with the established user-event version

## Part A — Envelope

**Target:** ui-core-micha, `main`.

Tier 3 — shared-core test, dependency and release metadata.

### Goal and scope

Replace the blocked, unreleased 14.6.12 choice from UCM-DEP-4 with the operator-approved `@testing-library/user-event` 14.6.1 development dependency. Enable the permanent UCM-AUTH-17 keyboard test using the existing registration extension. Update the lockfile without upgrading unrelated dependencies. Publish the reviewed UCM-AUTH-17 public API in an appropriate minor UI-core release. Do not alter other dependencies or production behavior.

### Required tests and risks

Run frozen installation under the normal package-manager policy, the Tab/Enter and existing signup and registration request tests, and the affected build. The keyboard test must prove edited host-owned data reaches submission. Confirm automated publication succeeds before Maana consumes the release. Keep old consumers' default registration behavior unchanged.

## Part B — Implementation map

Target `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. Orchestrator owns the already prepared `package.json`, `pnpm-lock.yaml`, `tests/SignUpContent.test.jsx`, and `tests/authApiRegistration.test.js` changes and the UI-core minor release metadata. UCM-AUTH-17's source implementation was reviewed in its own two rounds. This separately approved version substitution and test change gets its own independent Tier-3 review.

## Part C — Orchestrator only

STOP: implementer instructions end here. The operator selected the established older version after the 14.6.12 minimum-age block. Review this version substitution and test as a separate scope, and preserve the earlier UCM-AUTH-17 review records. Release only when the frozen install, tests and review are green. No computer-use interaction is authorized.

## Gate record

Operator approved 2026-11-17 by replying "weiter" to the explicit proposal to use `@testing-library/user-event` 14.6.1 instead of 14.6.12 and continue autonomously.

## Progress — 2026-11-17

The normal pnpm 11 frozen install passes the supply-chain policy with 14.6.1. The focused registration and keyboard suites pass 11 tests without a temporary alias, and the UI-core build passes. Independent round 1: envelope gpt-6.1-terra; regression, duplication, tests, security and UI gpt-6-luna; no findings. The keyboard interaction is emulated via user-event, not a rendered-browser test. Release is pending landing; do not push another session's unpushed commits.
