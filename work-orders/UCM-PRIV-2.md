# UCM-PRIV-2 — Retire legacy privacy UI after adoption

## Part A — Envelope

Tier 3. Target: ui-core-micha, main. Complete the migration once the shared service and all applicable app adoption WOs in PRIVACY-ROLLOUT.md are delivered and the current consumer inventory proves no retained consumer depends on the legacy interface. Depends on UCM-PRIV-1 and the app adoption evidence.

Remove legacy CookieConsentStep/profile-checkbox paths, deprecated old statement-consent props and old-profile write adapters once their callers are migrated. Keep real terms acceptance and the new privacy information/consent contract. Do not convert historical booleans into invented purpose-specific evidence.

The scope includes the exact consumer pins, prop/call-site follow-through needed to make removal real; update each affected app's privacy delivery record. Static apps which never used these interfaces do not need a library or database migration. Historical legal documents and unrelated user/profile data are preserved.

Before removal, establish both first-party consumers and any supported externally published API commitments. If an active consumer remains, keep the removal WO pending with its named dependency; do not silently break it or retain an unexplained permanent shim. The new feature's rollout is separate from this final removal.

Required tests to write: the former acceptance booleans cannot enable optional services; new onboarding/profile/notice flows use only the shared contract and supported exports, and imports from updated consuming apps resolve. Run affected migration/API/permission tests and consumer integration checks when implementing.

Non-goals: broad auth refactor, unrelated profile fields, changing privacy policy content, deleting legitimate consent evidence, production promotion. No new visual design; preserve UCM-PRIV-1's approved surface. Prototype delta: none.

## Part B — Implementation map (not dispatchable)

Prepared 2026-11-07 from ucm 4.33.1 (`origin/main` 28a677e) and `origin/develop` of the 19 consumers. NOT yet dispatched: start only after the operator's go and the two readiness conditions at the end of this part.

Target directory (shared scope): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`, branch `main`. Breaking removal: the next MAJOR version, selected at delivery (never reserve one); every consumer pins the exact ucm version, so nobody breaks until it bumps.

### Legacy surface in ucm (current `path:line`)
- `src/onboarding/steps/CookieConsentStep.jsx` (whole file; calls `fetchCookieStatement`/`fetchPrivacyStatement`/`updateUserProfile` with `accepted_privacy_statement: true`, `accepted_convenience_cookies`), export `src/index.js:154`, descriptor `cookie_consent` in `src/onboarding/OnboardingProvider.jsx:22-27` (condition `!ctx.user.accepted_privacy_statement`) and the `privacyMode !== 'central'` filter at `:165`, prop `privacyMode = 'legacy'` at `:147`.
- `src/components/ProfileComponent.jsx`: props `showPrivacy`, `showCookies`, `showStatements`, `privacyStatementText`, `cookieStatementText`, `privacyMode`; state `acceptedPrivacy`/`acceptedCookies`, statement fetch effect (`:87-123`), payload branches (`:138-143`), checkbox and statement blocks (`:237-310`). Keep: name fields, submit/feedback, `PrivacyNoticeLink`.
- `src/components/ProfileStepContent.jsx`: every `privacyMode !== 'central'` branch (`:120`, `:135`, `:145`, `:183-188`, `:219-221`, `:246-248`, `:292-306`, `:344-378`) and the `fetchPrivacyStatement` use (`:173`). Keep real terms acceptance (`termsEnabled`, `termsApi`) and name completion.
- `src/pages/AccountPage.jsx:69-70, :355-358`: props `showProfileStatements`, `privacyMode`; the profile tab always renders the central profile afterwards. `showPrivacy`/`showCookies` stop being passed.
- `src/utils/profileDraft.js:5-30`: `includeLegacyPrivacy`, `acceptedPrivacy`/`acceptedCookies` draft fields.
- `src/auth/authApi.jsx:69,74`: `fetchPrivacyStatement`, `fetchCookieStatement` (exports via `export * from './auth/authApi'`).
- `src/auth/AuthContext.jsx:63-67`: `accepted_privacy_statement`/`accepted_convenience_cookies` normalisation of the user object. Decide at implementation whether any consumer still reads them from the user object (the inventory below says none does in frontend code); if none, drop them; otherwise keep read-only and say why.
- `src/i18n/authTranslations.ts:2389-2410`: four `Auth.field.accepted_*` keys; plus the Profile/Onboarding legacy label keys that become unused (check every key with a grep across `src/` and the consumer inventory before deleting).
- Tests that assert the legacy behaviour: `tests/AccountPagePrivacyMode.test.jsx` (positive controls become removal assertions), `tests/ProfileComponent.refresh.test.jsx`, `tests/ProfileStepContent.terms.test.jsx`, `tests/privacyAdoption.test.jsx`, plus the i18n aggregate and export-name tests (`tests/packageEntries.test.js`, `tests/i18nAggregate.test.js`).

### Consumer inventory (git grep on `origin/develop`, 2026-11-07, non-test frontend code)
- `CookieConsentStep`: no consumer. `privacyMode="legacy"`: no consumer. `fetchPrivacyStatement`/`fetchCookieStatement`/`privacyStatementText`/`cookieStatementText`: no consumer.
- `OnboardingProvider`: only jg-ferien (`App.jsx:63`) and cockpit (`App.jsx:54`), both `privacyMode="central"`; after removal the prop is dropped there.
- `showProfileStatements={false}` passed by Gustav (`pages/account/GustavAccountPage.jsx:46`), Kira (`App.jsx:88`), bigler-consult (`pages/AccountHubPage.jsx:30`), innoservice (`App.jsx:58`): remove the prop at these four call sites in the same sequence.
- `privacyMode="central"` at ProfileComponent/AccountPage/OnboardingProvider call sites in every app: remove the prop everywhere once it no longer exists (a harmless unknown prop, but the follow-through must be real).
- `cookie_consent` step id: `jg-ferien/frontend/src/components/OnboardingStepConfigAdmin.jsx:12` maps it to a title; dcm `onboarding/models.py:5` lists `cookie_consent` in `UNIVERSAL_STEP_KEYS` and test_onboarding asserts it. ucm may drop the step, but the admin step-config UI and the dcm key stay in sync: ucm removal first, dcm key removal belongs to DCM-PRIV-2; until then the jg admin label stays.
- Apps with their own forked profile components (not ucm): hram (`UtilsComponents/ProfileComponent`, audited clean 2026-11-07) and jg-ferien (forked component cleaned in `1afac38`). They are not affected by the ucm removal.
- reimbursements `WelcomePage.jsx:18-19` deletes the two legacy fields from the profile payload: remove the two lines with the follow-through (the central profile no longer produces them).
- Externally published API: `@micha.bigler/ui-core-micha` is consumed only by the repositories above (the 19 apps; bottleneck-analysis-app, excluded from the rollout, declares neither ucm nor dcm in its package.json, requirements or pyproject files, checked 2026-11-07 in the local working copy).

### Added in the same release: privacy settings entry in the central profile
Operator decision 2026-11-07 (seen on the rendered account page: the central profile showed only the notice link): in `ProfileComponent` central mode (`src/components/ProfileComponent.jsx`, the privacy block around `:237-245`, next to `<PrivacyNoticeLink />`) also render the existing `<PrivacySettingsLink />` (`src/privacy/PrivacySettingsLink.jsx`). It opens the settings dialog that `PrivacyProvider` renders itself (`PrivacyProvider.jsx:463`) and renders nothing when the provider is absent or `unconfigured`, so no host change is needed beyond the new pin. Same treatment is NOT required in `ProfileStepContent` (onboarding keeps the notice link only). No new copy: reuse `Privacy.SETTINGS`. Use the existing prototype composition (`app-prototype.html@ced7a28`, 375/1280): the two links sit together in the "Privacy and cookies" block, no new design or token. Where an app also has the account-menu entry (UCM-PRIV-3) the settings are reachable from both places, which is intended. Necessary-only apps keep the informative dialog.

### Contract and invariants
- After removal the profile and onboarding flows have exactly one privacy contract: the shared manifest/choices (UCM-PRIV-1) and `PrivacyNoticeLink`. Terms acceptance (`termsApi`, `ProfileStepContent` terms) is separate and unchanged.
- No code reads `accepted_privacy_statement`/`accepted_convenience_cookies` to enable an optional service (required test, below). Historical values stay in the database untouched here (DCM-PRIV-2 owns the server side); do not convert them into grants.
- Public export names after the change are asserted exactly in `tests/packageEntries.test.js`; update that list deliberately, nothing else may disappear.
- Do-not-touch: `src/privacy/*`, `PublicFooter`, `UserMenu` legal entries, billing, messaging, notifications, `AccountPage` navigation/groups/billing extensions, theme registry.
- Pitfalls: `tests/packageTreeShaking.test.js` and two `packageEntries` tests fail on this Windows host with a symlink EPERM (environment); `ui-core-micha` timing-sensitive tests (banner focus, chat summary) were hardened 2026-11-07; run the full local suite before dispatching a publish because the publish workflow runs it on a CPU-bound runner.

### Required tests (written in this order of risk)
1. The former acceptance booleans cannot enable optional services: render the shared flows with a user whose booleans are true and assert no optional purpose is granted and nothing is written.
2. Profile and onboarding render and save with only the shared contract: payload is exactly the name fields; terms acceptance still gates onboarding where `termsEnabled`.
3. Exact public export list; imports of removed names fail loudly in the test (no silent undefined).
4. The central profile shows the settings link next to the notice link when the provider is ready, clicking it opens the settings dialog (real `PrivacyProvider` with a fake API), and nothing renders without a provider or when unconfigured; the profile save payload stays name-only. Include the account page integration from `tests/AccountPagePrivacyMode.test.jsx`.
5. Per consumer follow-through: the touched wrapper/route assertion, plus an import-resolution check against the built package version.

### Progress contract
One commit for the shared removal with release metadata (`package.json`, `CHANGELOG.md` with an explicit migration note, `README.md`), then one commit per consumer (pin + lockfile + prop removal + the focused assertion), each reported into a new delivery matrix in Part C.

### Mandatory implementer preamble
This work order is the complete spec. Implement only Part B of this file. Do not run `git add`, `git commit`, `git push` or any package-manager command (the Orchestrator does pins and lockfiles). Do not review your own work and do not treat your own test run as the gate. You edit source and test files and may run only the tests you wrote, once.

### Readiness conditions (Orchestrator, before dispatch)
1. Operator go for the breaking removal (major release) and for the consumer pin bumps.
2. Evidence that the central account page works on staging for at least one consumer (no staging test account existed on 2026-11-07), or the operator's explicit acceptance of local-only evidence for it.

## Part C — Orchestrator only

STOP — this section is not an instruction to the implementer.

Gate #1 approved by the operator 2026-11-06 (Codex Expertenchat, session 01a1a807-3193-7793-8e43-50d6d7fd7263). Approval covers this Envelope and the shared privacy prototype/copy, accepted after the interactive preview. The canonical visual reference remains ui-core-micha@ced7a28. Dependencies and activation prerequisites still apply; production promotion is not approved. The Orchestrator must complete Part B and the mandatory preamble before dispatch. Follow orchestrate-codex before dispatch. Requirements-only authoring needs no independent code review; future Tier-3 source delivery does, including the security boundary and UI changes where applicable. Use the configured roles and the app's existing test harness. In joined apps, put the named cross-layer click path into the existing browser suite; do not introduce a harness or expand screenshots beyond the canonical prototype comparison merely for this rollout.

Reorient and re-read current instructions/pins at handoff. The shared visual reference is ui-core-micha/work-orders/assets/app-prototype.html@ced7a28 (375/1280 px); match composition and interaction using the consuming app's own theme. It covers only privacy choices and notice entry points. The Envelope governs behavior, permissions and data contracts, not prototype omissions.

Coordinate the release and explicit consumer updates as one removal sequence. Do not close this merely because a deprecation warning exists. Verify caller/export inventory before choosing the package's release boundary.

Scope addition recorded 2026-11-07 (operator, in chat): the central profile also gets the privacy settings link, delivered in this same release so that the apps need only one pin round. It is additive and covered by Part B; it does not change the Envelope's no-new-design rule (existing component, existing prototype composition).

Correction dependency recorded 2026-11-06: [UCM-PRIV-4](UCM-PRIV-4.md) supplies the missing AccountPage central-mode path and the 19 affected consumer integrations. That is an immediately usable migration correction, not cleanup to defer into this order. Require its consumer evidence before removing the legacy path; preserve historical findings until their actual consumer fix is verified.

