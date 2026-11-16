# UCM-DEP-4 — Durable keyboard regression test dependency

## Part A — Envelope

**Target:** ui-core-micha, `main`.

Tier 3 — shared-core test and dependency metadata.

### Goal and scope

Make the UCM-AUTH-17 registration field keyboard regression test runnable in normal CI. Add exactly `@testing-library/user-event` 14.6.12 as a development dependency and update the lockfile without changing unrelated dependencies. Use the library to verify that Tab reaches both fields, edited app-owned data is submitted by Enter, and the existing signup contract remains intact. No production runtime dependency or user interface change is authorized by this order.

### Required tests and risks

Run the keyboard test, existing signup and registration API tests, and verify the frozen lockfile installation under the repository's package-manager policy. A fresh package must satisfy the configured minimum release age; do not bypass that policy. Keep the selected package and its transitive peer resolution isolated from unrelated package upgrades.

## Part B — Implementation map

Target `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. The orchestrator owns the test and package-manager metadata after UCM-AUTH-17's closing review. Relevant files: `package.json`, `pnpm-lock.yaml`, `tests/SignUpContent.test.jsx`, and existing `tests/authApiRegistration.test.js`. No application source edits are in this order. The pre-existing UCM-AUTH-17 source diff is reviewed under that order, not by this dependency-only review.

## Part C — Orchestrator only

STOP — implementer instructions end here. The operator explicitly authorized this exact development dependency and its lockfile change. Use independent review for the newly approved dependency/test scope; this is not a third review of UCM-AUTH-17. The UI-core release and Maana integration follow only after installation, tests and reviews are green.

## Gate record

Operator approved 2026-11-16: "Ja, ich gebe @testing-library/user-event 14.6.12 als Entwicklungsabhängigkeit samt Lockfile-Änderung frei."
