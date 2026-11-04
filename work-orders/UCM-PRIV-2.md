# UCM-PRIV-2 — Retire legacy privacy UI after adoption

## Part A — Envelope

Tier 3. Target: ui-core-micha, main. Complete the migration once the shared service and all applicable app adoption WOs in PRIVACY-ROLLOUT.md are delivered and the current consumer inventory proves no retained consumer depends on the legacy interface. Depends on UCM-PRIV-1 and the app adoption evidence.

Remove legacy CookieConsentStep/profile-checkbox paths, deprecated old statement-consent props and old-profile write adapters once their callers are migrated. Keep real terms acceptance and the new privacy information/consent contract. Do not convert historical booleans into invented purpose-specific evidence.

The scope includes the exact consumer pins, prop/call-site follow-through needed to make removal real; update each affected app's privacy delivery record. Static apps which never used these interfaces do not need a library or database migration. Historical legal documents and unrelated user/profile data are preserved.

Before removal, establish both first-party consumers and any supported externally published API commitments. If an active consumer remains, keep the removal WO pending with its named dependency; do not silently break it or retain an unexplained permanent shim. The new feature's rollout is separate from this final removal.

Required tests to write: the former acceptance booleans cannot enable optional services; new onboarding/profile/notice flows use only the shared contract and supported exports, and imports from updated consuming apps resolve. Run affected migration/API/permission tests and consumer integration checks when implementing.

Non-goals: broad auth refactor, unrelated profile fields, changing privacy policy content, deleting legitimate consent evidence, production promotion. No new visual design; preserve UCM-PRIV-1's approved surface. Prototype delta: none.

## Part B — Implementation map (not dispatchable)

PLACEHOLDER — after Gate #1 the Orchestrator supplies absolute working directories, current named files/functions, the API/manifest contract slice, migrations and compatibility invariants, progress contract and mandatory implementer preamble. This Envelope alone is not a coder dispatch.

## Part C — Orchestrator only

STOP — this section is not an instruction to the implementer.

Gate #1 pending. The operator requested specifications and the prototype, not feature implementation. Follow orchestrate-codex before dispatch. Requirements-only authoring needs no independent code review; future Tier-3 source delivery does, including the security boundary and UI changes where applicable. Use the configured roles and the app's existing test harness. In joined apps, put the named cross-layer click path into the existing browser suite; do not introduce a harness or expand screenshots beyond the canonical prototype comparison merely for this rollout.

Reorient and re-read current instructions/pins at handoff. The shared visual reference is ui-core-micha/work-orders/assets/app-prototype.html@ced7a28 (375/1280 px); match composition and interaction using the consuming app's own theme. It covers only privacy choices and notice entry points. The Envelope governs behavior, permissions and data contracts, not prototype omissions.

Coordinate the release and explicit consumer updates as one removal sequence. Do not close this merely because a deprecation warning exists. Verify caller/export inventory before choosing the package's release boundary.

