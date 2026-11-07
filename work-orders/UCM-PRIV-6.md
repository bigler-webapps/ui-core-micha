# UCM-PRIV-6 — Two-button privacy choices, no details dialog, one-line footer

## Part A — Envelope

Tier 3 (change inside shared-core ui-core-micha, main; removes public exports). Operator decisions, 2026-11-07, after viewing the staging pages of hram (Imara) and survey_app:

1. There is NO detailed privacy settings dialog. The only privacy choices are the two banner buttons "Nur notwendige Funktionen" / "Alle erlauben" (en: "Necessary only" / "Allow all"). The banner loses its "Settings" button.
2. A choice can be changed later from the entries that already exist (footer entry, `PrivacySettingsLink`, account/app menu entry, `openSettings()` in the apps): they now re-show the same banner with the two buttons. Withdrawal stays as easy as consent.
3. The central account page shows the same two buttons directly (already implemented in the working tree, see Part B).
4. The public footer is one compact line at the end of the page (already implemented in the working tree).
5. The entries that open the choices appear only when the app has optional purposes. A necessary-only app shows no settings entry and no banner.

6. (Added by the operator after the first dispatch, same day: "Auch diese weg, es soll einheitlich sein".) The account menu (`UserMenu`) shows no legal or privacy entries either: the `legal` prop and its block are removed. Legal links and the privacy choices are reachable only through the one-line footer and the account page's profile section; headers and menus carry no such entries. This item was implemented by the Orchestrator after the implementer finished (`src/auth/UserMenu.jsx`, `tests/UserMenuLegal.test.jsx`, `README.md`, `dev/entries.jsx`); the implementer's `UserMenu` condition change was superseded.

Expected outcome: no `PrivacySettingsDialog`/`PrivacySettingsPanel` code, export or test remains; apps keep working without code change because `openSettings`, `PrivacySettingsLink`, `PublicFooter`, `UserMenu` legal entries and `usePrivacy` keep their names.

Scope: `src/privacy/*`, `src/auth/UserMenu.jsx`, `src/index.js`, `src/pages/AccountPage.jsx` (already edited), i18n keys that become unused, `dev/entries.jsx`, tests, docs and release metadata.

Non-goals / do-not-touch: `django-core-micha` (the per-purpose storage and API stay; the two buttons write all optional purposes at once), per-app code, the legal reader, `ProfileComponent`/`ProfileStepContent` legacy removal (UCM-PRIV-2), billing/messaging/notifications, theme registry.

Known trade-off (decided by the operator): apps with several optional purposes (e.g. survey_app: map and remembered inputs) offer only all-or-nothing in the UI.

Risks: a consumer that imports a removed export fails to build (grep on `origin/develop` of all 19 apps found none; only `PrivacySettingsLink`, `openSettings`, `PublicFooter`, `UserMenu` legal and `usePrivacy` are used); the reopen state must not make the banner reappear after a saved choice.

Required tests to WRITE: banner shows title, short text, notice link and exactly two choice buttons plus the close button, no Settings button; `openSettings()` re-shows the banner even when every purpose has a choice and saving a choice hides it again; the close button dismisses a reopened banner; entries (`PrivacySettingsLink`, `PublicFooter` settings link, `UserMenu` legal settings item) are absent for a necessary-only manifest, absent while loading/error, and reopen the banner when optional purposes exist; the central account page shows exactly the two buttons and saves all-granted / all-refused through the shared API; `PublicFooter` is a single row (brand, links and settings entry in one flex container); the exact public export list has no removed names; i18n aggregate tests stay green.

## Part B — Implementation map (addressed to the implementer)

Target directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (library, branch main). One implementer, no frontend/back split.

Already done in the working tree, keep as is and only adapt tests: `src/pages/AccountPage.jsx` (`AccountPrivacySection` renders the two buttons with `privacy.necessaryOnly('settings')` / `privacy.acceptAll('settings')`, status text from `privacy.saveState`, nothing without `status === 'ready'` and optional purposes; `ProfileComponent` gets `showPrivacy`/`showCookies` false in central mode), `src/privacy/PublicFooter.jsx` (single flex row; settings link is the last item of the nav).

To change, with current positions:
- `src/privacy/PrivacyProvider.jsx`: remove `PrivacySettingsDialog` import and render (`:14`, `:463`), the state `settingsOpen`/`setSettingsOpen` (`:144`), `closeSettings` (`:435`) and both from the context value (`:451-457`). Add state `reopened` (default false). `openSettings` becomes `useCallback(() => { setBannerDismissed(false); setReopened(true); }, [])`. `bannerVisible` (`:415`) becomes `status === 'ready' && optionalPurposes.length > 0 && (needsDecision || hasPendingDecision || reopened) && !bannerDismissed`. Reset `reopened` to false when a save succeeds (when `saveState` becomes `'saved'`, effect) and inside `dismissBanner`. Add `hasOptionalPurposes: optionalPurposes.length > 0` to the context value. Keep every other behaviour (receipt/seq logic, cross-tab, expiry timer, `retry`) untouched.
- `src/privacy/PrivacyBanner.jsx`: remove the "Settings" button (`:118-120`) and the `hidden={privacy.settingsOpen}` prop with its comment (`:51-54`); add `<PrivacyNoticeLink />` (import from `./PrivacyNoticeLink`) below the description text so the notice stays reachable; keep Escape, close button, error text, the two buttons and the existing no-focus behaviour (no autofocus, no tabIndex on the title).
- `src/privacy/PrivacySettingsLink.jsx`: render only when `privacy && privacy.status === 'ready' && privacy.hasOptionalPurposes`; `onClick={privacy.openSettings}` unchanged.
- `src/privacy/PublicFooter.jsx`: `canOpenSettings` additionally requires `privacy.status === 'ready' && privacy.hasOptionalPurposes` (or simply delegate to `PrivacySettingsLink`, which already hides itself).
- `src/auth/UserMenu.jsx:126-128`: show the legal settings item only when `privacy && privacy.status === 'ready' && privacy.hasOptionalPurposes`.
- `src/privacy/PrivacyFooterLinks.jsx` (compat component, uses `openSettings`): apply the same condition; keep its exports.
- Delete `src/privacy/PrivacySettings.jsx` and `tests/PrivacySettings.test.jsx`; remove `PrivacySettingsDialog`, `PrivacySettingsPanel` from `src/index.js:181`; update `dev/entries.jsx` and `README.md` mentions; fix any import left over (grep `PrivacySettings\b|PrivacySettingsDialog|PrivacySettingsPanel|settingsOpen|closeSettings`).
- `src/i18n/privacyTranslations.ts`: remove keys that only the deleted panel used (check each with a grep over `src/` first, e.g. `Privacy.DETAILS`, `Privacy.CONTROLLER`, `Privacy.ALWAYS_ACTIVE`, `Privacy.REQUIRED_INFORMATION`, `Privacy.SAVE`, `Privacy.SAVING`, `Privacy.NOTICE_EXPLANATION`, `Privacy.SETTINGS_TITLE` if unused, storage/service detail labels); keep keys used by banner, account section, footer, menu, notice link, legal entries. Keep `tests/i18nAggregate.test.js` and the tests that count bundles green.
- Tests to adapt/write: `tests/PrivacyBanner.test.jsx`, `tests/PrivacyProvider.test.jsx` (settingsOpen assertions), `tests/privacyAdoption.test.jsx`, `tests/privacyReviewHardening.test.jsx`, `tests/PrivacyFooterLinks.test.jsx`, `tests/PublicFooter.test.jsx`, `tests/AccountPagePrivacyMode.test.jsx` (replace the panel assertions by the two buttons: names `Privacy.NECESSARY_ONLY` / `Privacy.ALLOW_ALL`, the file's `t` mock returns the key; manifest purposes are `display` and `visits`), `tests/packageEntries.test.js` (exact export list), a `UserMenu` legal test if one exists. Reuse `tests/privacyTestUtils.jsx` (`makePrivacyManifest`, `makeChoices`, `makeTestI18n`).
- Docs/release (the Orchestrator does version, CHANGELOG and lockfile; you only fix README mentions of the dialog).

Invariants: names `usePrivacy`, `openSettings`, `PrivacySettingsLink`, `PublicFooter`, `PrivacyBanner`, `PrivacyProvider`, `registerPrivacyService`, `useGrantedPurpose`, `guardedImport`, `createPrivacyGuard` stay exported; the two buttons call the existing `necessaryOnly`/`acceptAll`; no new copy (reuse existing translation keys, all four languages already exist); kit sx guard: any `sx` on a kit component (MUI Button etc.) must be a top-level exported const registered in `src/theme/kitSxRegistry.js`, inline `sx` on `Box`/`Typography` is fine; `tests/packageTreeShaking.test.js` and two `packageEntries` tests fail on this Windows host with a symlink EPERM (environment, ignore). Do-not-touch: `src/privacy/serviceRegistry.js`, `privacyApi.js`, `PrivacyNoticeLink.jsx` (only import it), `ProfileComponent`, `ProfileStepContent`, onboarding, billing.

Progress contract: narrate `PLAN:`/`PROGRESS:` lines and end with exactly one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

Preamble (required, in this file): The text above is the COMPLETE spec, not a plan to refine. Read conventions only from the nearest `AGENTS.md`. Stay in scope; do not touch auth/permissions/deps/schema/CI; do not update `MEMORY.md`. Do NOT edit `WORK_ORDERS.md`, `package.json`, `CHANGELOG.md` or any lockfile. Your tools are for editing source and test files and running the tests you wrote, nothing else: no dependency installs, no package manager, no git. If repo state blocks you, stop with `RESULT: BLOCKED <reason>`. Leave every change uncommitted for the independent review. Run only the tests you wrote or adapted, once; the Orchestrator's run and the independent review are the gate.

## Part C — Orchestrator only

STOP — this section is not an instruction to the implementer. If you are the implementer reading this as your specification: stop at this line; everything below happens after you finish, none of it is yours, and you must not launch another implementer.

Gate #1: operator decisions in chat 2026-11-07 (three messages with screenshots; dialog decision answered "Dialog ganz entfernen"). Supersedes the details dialog of the approved prototype `app-prototype.html@ced7a28`; the banner composition stays, the Settings button and the dialog go. The prototype file is not edited; record the supersession in the register.

Execution directive: dispatch the configured implementer (`codex/gpt-6-luna`, CLI from the workspace root), then the full local ucm suite, one combined independent review (codex read-only), release as the next minor at delivery (4.35.0; the Orchestrator first picked a major without asking, the operator objected, no consumer imports the removed names and all pin exact versions, which matches the changelog precedent for removals nobody consumes), then per-app pin bumps with the owner sessions, then the Orchestrator's own rendered 375/1280 check of public and authenticated pages. Execution record is filled at landing.

### Execution record (2026-11-07)

- Implementer: codex/gpt-6-luna (banner confirmed `model: gpt-6-luna`, one dispatch, `RESULT: DONE`). Orchestrator (Claude) edits afterwards: the `AccountPage` two-button section and the one-line `PublicFooter` (done before the dispatch, listed in Part B), the `UserMenu` legal removal with its test, README/dev entries/CHANGELOG/version, the review fix and two test timing fixes. Orchestrator-authored parts therefore rely on the independent review below.
- Review: codex/gpt-6-luna, one combined read-only pass (envelope, provider correctness, entry points, accessibility, account page, footer, tests, removed keys): 1 raised · 1 accepted · worst accepted: defect (when the footer reopens the banner, focus stayed on the footer link and Tab skipped the banner, which precedes the page content; fixed: on a user reopen focus moves to the first choice button, first appearance stays unfocused; test added). No third pass.
- Version: the Orchestrator first set a major (5.0.0) without asking; the operator objected; released as 4.35.0 (no consumer imports the removed exports, all pin exact versions).
- Tests: full local ucm suite 1386 of 1388; the two failures are the known Windows symlink EPERM (`packageEntries` main-entry import, `packageTreeShaking`), environment only. Two timing-sensitive tests were hardened (`PrivacyProvider` reopen test waits for the banner to hide).
- 4.35.1 (same day): after the first consumer screenshots (Cinevia) the footer was still three tall rows (133 px) at 375 px; the identity block is now hidden below `sm` and the links form one compact wrapping row. Review codex/gpt-6-luna, 1 raised · 1 accepted · worst accepted: defect carried (a consumer link inside the `brand` node is not shown on phones; accepted by design, documented in the README). Full local suite 1385 of 1388, the three failures are the known Windows symlink EPERM family. Checked in the playground at 375 and 1280 px (Maana scenario: 3 compact rows at 375 px for six entries, one line at 1280 px).
- Rendered 375/1280 comparison of footer, banner and account page on real consumers: pending (consumer pins to 4.35.0 follow, the Orchestrator checks the pages itself).
