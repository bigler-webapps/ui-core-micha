# UCM-PRIV-4 — Complete central privacy adoption through AccountPage

## Part A — Envelope

### Outcome and authority

Tier 3. Primary repository: ui-core-micha, main. Consumer follow-through: the 19 interactive application repositories below, on develop. This is one correction with shared-package and consumer delivery, not a replacement for their PRIV-1 orders.

Operator decision, 2026-11-06: correct the missing central-mode path in the shared account page, including Gustav and other affected apps, and provide implementation instructions. Retain legacy behavior for consumers that have not explicitly adopted the central contract. Do not defer the usable migration path to UCM-PRIV-2: that order removes legacy interfaces only after migration is complete.

In a centrally migrated app, the account profile contains no privacy-statement acceptance or blanket convenience-cookie checkbox and sends neither legacy consent field. Profile name edits remain functional. Privacy information and the app's purpose-specific settings remain reachable through the already adopted shared surfaces. Actual contractual terms, research consent, AI permissions and browser permissions stay separate and unchanged.

### Confirmed defect and bounded scope

At the inspected 4.33.0 source, `src/components/ProfileComponent.jsx` already implements `privacyMode="central"`. `src/pages/AccountPage.jsx:49-69` exposes no such input and its profile branch at lines 347-353 always passes `showPrivacy` and `showCookies`, leaving the child in its legacy default. `showProfileStatements={false}` only hides statement text; it does not select the central contract. `tests/AccountPage.test.jsx:41-43` replaces the profile with a placeholder, so that test cannot detect the integration gap.

1. Expose and forward the existing `privacyMode` contract through AccountPage. An omitted mode preserves legacy behavior until UCM-PRIV-2. Central mode takes precedence over legacy statement/checkbox flags and stays central during manifest loading, error or unavailable states; never restore old checkboxes or send legacy fields as an error fallback.
2. Reuse ProfileComponent's existing central behavior. Do not fork the account page, introduce a second consent service, infer consent from user booleans, automatically select central mode from provider presence, or hide the checkboxes with CSS.
3. Preserve AccountPage navigation, groups, extraTabs, profile submit/login refresh, security/admin permissions and billing extensions. Preserve real terms acceptance in ProfileStepContent; do not couple saving a name to accepting privacy information or granting optional purposes.
4. Document the AccountPage option alongside existing profile adoption and statement documentation. Release the compatible package change using the next available version under current release rules; do not reserve a version already used by concurrent work. Include the necessary release metadata and generated lock updates, with no unrelated dependency upgrades.
5. Update each listed consumer's live AccountPage entry to explicitly select central mode once its own PRIV-1 prerequisites hold. Update its exact UCM pin and lockfile to the verified correction release (or a later verified compatible release). Preserve current app-owned wrappers, permissions, layout and additional tabs. A package pin alone does not complete consumer delivery.
6. Recheck direct ProfileComponent/ProfileStepContent and onboarding callers within each consumer's existing PRIV-1 scope. Already-central paths remain intact; outstanding legacy paths are completed by that app's PRIV-1 migration, not silently omitted or worked around here. This correction does not authorize an unrelated profile redesign or duplicate another session's migration.

### Consumer inventory and sequencing

Read-only working-checkout evidence, 2026-11-06; file/line positions and pins can change during concurrent adoption. Provider presence below is source evidence only, not proof of completed or deployed migration. Refresh the named call sites and each app's PRIV-1 delivery record before editing.

| Repository / existing order | AccountPage call site (relative to app root) | Observed UCM pin | PrivacyProvider found |
|---|---|---|---|
| Gustav / GUS-PRIV-1 | `frontend/src/pages/account/GustavAccountPage.jsx:46` | 4.33.0 | yes |
| hram / HRAM-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:179` | 4.33.0 | yes |
| Photogallery / PG-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:17` | 4.33.0 | yes |
| Cinevia / CIN-PRIV-1 | `frontend/src/App.jsx:134` | 4.33.0 | yes |
| maana / MAANA-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:80` | 4.33.0 | yes |
| Kira / KIRA-PRIV-1 | `frontend/src/App.jsx:88` | 4.33.0 | yes |
| webshop-guenter / WSG-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:13` | 4.33.0 | yes |
| bigler-consult / BCO-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:30` | 4.32.0 | yes |
| spesix / SPX-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:417` | 4.33.0 | yes |
| musiknoten / MUS-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:13` | 4.33.0 | yes |
| reimbursements / RMB-PRIV-1 | `frontend/src/pages/AccountPage.jsx:4` (`CoreAccountPage` alias) | 4.28.0 | no |
| jg-ferien / JG-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:477` | 4.30.0 | no |
| hpc-bridge / HPC-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:13` | 4.0.1 | no |
| fitness-monitor / FM-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:29` | 4.0.1 | no |
| survey_contact_app / SCA-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:13` | 4.12.0 | no |
| kerzenziehen / KZ-PRIV-1 | `frontend/src/App.jsx:123` | 4.12.0 | no |
| survey_app / SVA-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:121` | 4.28.0 | no |
| cockpit / CKP-PRIV-1 | `frontend/src/pages/AccountHubPage.jsx:16` | 4.2.0 | no |
| innoservice / INNO-PRIV-1 | `frontend/src/App.jsx:66` | 4.30.0 | no |

Deliver the shared correction first, then Gustav and the other already-adopting consumers. The nine consumers with no provider found need their existing PRIV-1 migration before or together with central AccountPage activation. Do not perform a large pin jump without the compatibility assessment already required by the consumer order. A waiting consumer remains an explicit incomplete dependency; it does not justify retaining the defect in migrated apps.

The static `yopoulab-hhs-2026` report has no AccountPage and is excluded from this correction. `bottleneck-analysis-app` remains excluded from the entire rollout. No additional application repositories are implicitly added.

### Visual scope and non-goals

Reuse the accepted UCM-PRIV-1 privacy presentation (`work-orders/assets/app-prototype.html@ced7a28`) and UCM-PRIV-3 legal-entry placement. No new visual design, token delta or helper copy. The existing prototype governs notice/settings appearance only; it does not depict or authorize removal of unrelated account sections.

Replaces/removes in explicitly central consumers: the two legacy consent checkboxes, legacy statement fetches associated with that profile mode, and legacy consent fields in profile writes. Deliberately keeps: name fields and validation, save feedback, account/security/admin/billing navigation, app extensions, informational privacy access and the existing local privacy-settings action. Legacy consumers retain their current UI until explicitly migrated. Do not remove legacy exports, database fields or stored evidence here; those remain UCM-PRIV-2/DCM-PRIV-2.

Non-goals: consent-backend/schema changes, new permissions, auth policy changes, changes to optional-service activation/persistence, provider accounts, legal wording, CI/infrastructure changes, broad dependency refresh, production promotion. Historical boolean values are neither purged nor converted into purpose-specific grants.

### Required tests to write

- Shared integration test renders the real AccountPage AND real ProfileComponent with representative auth/privacy providers and mocked network boundaries. In central mode, both legacy consent controls are absent, the configured privacy link is present when the manifest is ready, and editing/saving a name calls the profile API with the expected name fields and neither `accepted_privacy_statement` nor `accepted_convenience_cookies`. Test with historical booleans both true and false. Assert absence of obsolete statement requests and consent writes from a profile edit.
- Repeat the central profile assertion during privacy loading/error: no legacy controls/writes reappear and name saving still works. Existing shell legal links remain governed by UCM-PRIV-3; do not invent a new link fallback API in this correction.
- Omitted mode and explicit legacy mode retain the existing checkbox/statement behavior, including `showProfileStatements={false}` only hiding statements. These positive controls must fail if the default is accidentally changed estate-wide. Existing profile/terms tests retain independent terms acceptance and central draft/payload behavior.
- Consumer tests exercise each actual account wrapper/route's selected mode and preserve its distinctive props (Gustav extra tabs, Maana billing/groups/delete handler, research/admin restrictions where present). Include a real-package profile-save integration in Gustav so a mock that ignores the new prop cannot produce a false pass. Other consumers can reuse the shared integration guarantee with focused wrapper/route assertions; no copied full shared test suite.
- Use each repo's existing scoped harness. Where an app has joined the browser harness and this profile-save flow is covered, extend that path to assert: open account profile, change a synthetic name, save successfully, legacy checkboxes absent and outgoing payload free of legacy consent fields. No new browser harness, real customer data or bulk full-suite run.

Risks: a missing prop at any wrapper retains legacy behavior; using an old published package silently ignores a new prop; enabling central mode before privacy adoption removes old controls without the replacement; unrelated app extensions can be lost in a wrapper rewrite. The exact-release consumer checks and real shared integration test address these risks.

## Part B — Implementation map (not dispatchable)

Shared scope (target `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`, branch `main`). Implemented directly by the Orchestrator because the change is three lines; independent review is the configured one (see Part C).

- `src/pages/AccountPage.jsx`: new prop `privacyMode = 'legacy'` (signature, next to `showProfileStatements`), forwarded to the single `ProfileComponent` render in the `safeTab === 'profile'` branch. `showPrivacy`/`showCookies` stay `true`: central mode in `ProfileComponent` (`src/components/ProfileComponent.jsx`) already ignores them for payload and statement fetches and renders `PrivacyNoticeLink`.
- Contract slice: `ProfileComponent` with `privacyMode === 'central'` sends only `first_name`/`last_name`, fetches no statements, renders no checkbox, and shows `PrivacyNoticeLink` only when the provider is `ready` with a manifest (nothing while loading/error: Envelope forbids a new fallback API).
- Tests: `tests/AccountPagePrivacyMode.test.jsx` (real AccountPage + real ProfileComponent + real PrivacyProvider with a fake API; central ready/loading/error, historical booleans true/false, legacy positive controls). Existing `tests/AccountPage.test.jsx` mocks the profile and stays as is.
- Release: `package.json` 4.33.1, `CHANGELOG.md`, `README.md`.
- Do-not-touch: `ProfileComponent`, `ProfileStepContent`, onboarding, `UserMenu`, `PublicFooter`, any export list.

Consumer scope (each app root under `C:/Users/Micha Bigler/Documents/webapps/<app>`, branch `develop`): exact `@micha.bigler/ui-core-micha` pin 4.33.1 (or a later verified release) with regenerated lockfile, explicit `privacyMode="central"` on the live AccountPage call site listed in Part A, one focused wrapper/route assertion preserving the wrapper's distinctive props; Gustav additionally a real-package profile-save integration. The pin bump plus one prop is a minimal change: scoped local tests only (the touched wrapper test, the profile-save path, build/lint), no heavy suite and no ci-test run unless a real logic change forces one (operator direction 2026-11-06). Consumers whose PRIV-1 is still open take this item inside that session; landed consumers get a short follow-up session. Apps without a provider adopt central mode only together with their PRIV-1.

Progress contract: each consumer reports commit, pin, call site and test evidence into the delivery matrix in Part C.

Mandatory preamble (shared scope): the WO is the complete spec; implement only what Part B lists; do not run `git add/commit/push`, do not self-review, do not touch lockfiles or package managers; your own run is not the gate.

## Part C — Orchestrator only

STOP — this section is not an instruction to the implementer.

Gate #1 approved by the operator 2026-11-06 (Codex Expertenchat, session 01a1a807-3193-7793-8e43-50d6d7fd7263), by accepting the proposed correction and requesting this work order including Gustav/other affected apps and implementation instructions. Approval covers the bounded correction described above; it does not authorize production promotion or removal of legacy APIs before UCM-PRIV-2's prerequisites.

Follow orchestrate-codex. Refresh current instructions and model routing, complete Part B and the mandatory preambles, then use the configured Tier-3 implementation/review flow. Preserve concurrent uncommitted privacy-adoption changes; coordinate with their owner before overlapping edits. Do not recreate work that another app session has already completed.

Record this as the integration omission originating in UCM-PRIV-1 at `4bba8fe` (review recorded as codex/gpt-6-luna; the AccountPage path was not covered). Do not rewrite that historical review as having checked this path. Track the corrective shared release and each of the 19 consumer commits/tests in a delivery matrix here and cross-reference the existing app PRIV-1 register notes when delivering. Update a prior carried finding only when that consumer has the corrected package, mode and evidence. Shared release alone is not completion of UCM-PRIV-4; explicit unmet app dependencies remain open. UCM-PRIV-2 must wait for this migration path and its consumer evidence, not absorb the fix as deferred cleanup.

Use the existing prototype comparison requirement for the corrected central account/profile surface at 375/1280, keeping the comparison bounded; no new prototype is requested by this correction. Scope permission regression tests to the AccountPage/profile area actually affected. Commit and push only reviewed, tested own changes on the authorized trunks. Release UCM before consumers pin it; select the next available version at delivery. Promotion retains its separate approval.

### Execution record (Orchestrator, 2026-11-06)

- Shared correction authored by the Orchestrator (Claude), not the configured implementer: the whole diff is the one-prop forward plus tests and release metadata. Independent review: codex/gpt-6-luna, one combined read-only pass (envelope, regression, tests, version). 1 raised (test did not prove the provider reached the error state) · 1 accepted · worst accepted: defect · fixed by asserting `getManifest` was called and no notice link before/after saving. Mutation check: removing the forward fails the 5 central tests, the 3 legacy controls stay green. Scoped tests: `AccountPagePrivacyMode`, `AccountPage`, `ProfileComponent.refresh`, `privacyAdoption` green. Not run: the full ucm suite (a one-prop change; the publish workflow runs `pnpm test`).
- Origin: integration omission of UCM-PRIV-1 at `4bba8fe` (review recorded as codex/gpt-6-luna; the AccountPage path was not covered).
- Prototype comparison at 375/1280 for the central account profile surface: pending, to be done in the first consumer (Gustav) with the real app.

### Delivery matrix (shared release first, then consumers)

| Repository | Pin | `privacyMode="central"` at call site | Evidence | State |
|---|---|---|---|---|
| ui-core-micha | 4.33.1 | n/a | see above | released with the landing commit |
| Gustav, hram, Photogallery, Cinevia, maana, Kira, webshop-guenter, bigler-consult, spesix, musiknoten | | | | open |
| reimbursements, jg-ferien, hpc-bridge, fitness-monitor, survey_contact_app, kerzenziehen, survey_app, cockpit, innoservice | | | | open: needs own PRIV-1 first |
