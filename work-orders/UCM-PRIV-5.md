# UCM-PRIV-5 — Privacy choices inline in the account page, no focus steal in the banner

## Part A — Envelope

Tier 3 (change inside shared-core ui-core-micha, main). Operator requests, 2026-11-07, after viewing the rendered pages:

1. The central account profile showed only the notice link; the privacy choices must be rendered directly in `AccountPage`, not behind a link.
2. When the privacy banner first appears, its title was focused and showed a focus ring ("Datenschutzauswahl" with a blue outline); remove that.

Scope: `AccountPage` in `privacyMode="central"` renders the existing `PrivacySettingsPanel` (the same choices as the settings dialog, including the notice link) in the profile tab below the form when a `PrivacyProvider` is mounted; the profile form drops its own privacy/notice block in that mode. `PrivacyBanner` no longer focuses its title and the title is no longer focusable. Escape-dismiss, the labelled region, and the settings-dialog focus return stay.

Non-goals: no new copy, tokens or design (existing panel, existing prototype composition `app-prototype.html@ced7a28`); no change to `ProfileComponent`/`ProfileStepContent` (the onboarding/welcome profile keeps the notice link only); no change in legacy mode or without a provider; no consumer change in this order (consumers get it with their next pin; UCM-PRIV-2 bumps all of them anyway).

Required tests: central account page shows the panel with the purpose checkboxes, saves through the shared API, shows no legacy checkbox and exactly one notice link; no section without a provider; banner title is not focused and has no tabindex.

## Part B — Implementation map

Target `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. Files: `src/pages/AccountPage.jsx` (`AccountPrivacySection`, profile tab: `showPrivacy`/`showCookies` false in central mode), `src/privacy/PrivacyBanner.jsx` (focus effect, `tabIndex`, `headingRef` removed), tests `tests/AccountPagePrivacyMode.test.jsx`, `tests/PrivacyBanner.test.jsx`; release metadata `package.json` 4.34.0, `CHANGELOG.md`, `README.md`. Do-not-touch: `src/privacy/PrivacySettings.jsx`, `ProfileComponent`, `ProfileStepContent`, theme registry. Implemented directly by the Orchestrator (small, localised); independent review is the configured one (Part C).

## Part C — Orchestrator only

STOP — this section is not an instruction to the implementer.

Gate #1: operator requests in chat 2026-11-07 (two messages with screenshots).

Execution record: authored by the Orchestrator (Claude). Independent review: codex/gpt-6-luna, one combined read-only pass (envelope, regression, accessibility, tests, kit guards): 1 raised · 1 accepted · worst accepted: nit (changelog said the title is reached in the tab order; corrected). Tests: scoped (`AccountPagePrivacyMode`, `AccountPage`, `PrivacyBanner`, `PrivacySettings`, `privacyAdoption`, `privacyReviewHardening`, `themeCompleteness`) green; full local ucm suite 1387 of 1390 passed, the three failures are the known Windows symlink EPERM in `packageEntries`/`packageTreeShaking`. Rendered 375/1280 comparison of the account page and the banner on a real consumer: pending (needs a consumer on 4.34.0).
