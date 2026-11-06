# UCM-PRIV-3 — Approved public footer and authenticated legal entry points

## Part A — Envelope

### Outcome and scope

Tier 3. Target: ui-core-micha (main), with consumer integration through the existing 20 app privacy adoption orders listed in [PRIVACY-ROLLOUT.md](../../django-core-micha/work-orders/PRIVACY-ROLLOUT.md). Depends on UCM-PRIV-1 and the applicable BCO-LEGAL-5 document destinations. This supplements the existing privacy rollout; it does not duplicate its consent implementation or create another set of app adoption orders.

Apply the operator-approved footer pattern across those applications, retaining each app's identity and applicable documents. Maana, Imara and Spesix are the concrete visual examples. Full footers belong on public pages, including login and registration. Authenticated workspaces expose legal documents and the app's privacy settings through the account/app menu instead of a full footer. Placement follows the page shell, not merely whether the visitor happens to have a session: a signed-in visitor on a public landing page still sees its public footer.

Use existing shared privacy links/settings primitives and host layouts. Any shared composition belongs in ui-core-micha; actual route placement, branding and applicable document configuration remain the consumer's responsibility. Do not change authentication, permissions, consent persistence, optional-service activation, legal text content, schema, or unrelated application screens. Production promotion is outside this approval.

### Visual reference and declared coverage

Approved artifact: [public-footer-comparison.html](assets/public-footer-comparison.html) at **ui-core-micha@18e95f5**, with `?app=maana`, `?app=imara` and `?app=spesix`. Each view contains the 1280 px and 375 px frames together. This separate comparison is intentional: it compares three consumer brands side by side with their responsive rendering, rather than replacing the shared privacy-dialog prototype or any app's living prototype.

Coverage is footer composition, legal-link ordering, mobile wrapping and the settings entry point only. The grey page content, app picker, preview explanations and destination/settings demonstration dialogs are not production UI. The authenticated menu placement is specified here; it is not visually depicted by this footer-only artifact. The privacy settings dialog remains governed by `work-orders/assets/app-prototype.html` at ui-core-micha@ced7a28. The central reader remains governed by BCO-LEGAL-5.

Desktop: app identity/copyright at the left, legal navigation at the right, a quiet separate privacy-settings action below. Mobile: identity first, a readable wrapping/two-column legal-link group, then settings separated by a fine rule. Preserve keyboard focus visibility and usable touch targets without clipping. App tokens, supported languages and dark mode remain authoritative; no global rebranding. Token delta: none; the three sample palettes do not replace other apps' themes.

Parity guardrail: visual/UX placement only; existing functional, permission and data contracts remain binding. Preview clicks only demonstrate destinations and are not proof of published legal documents.

### Links and placement

- Privacy notice and terms are persistently reachable anonymously on public pages and from the account/app menu in authenticated workspaces. Interactive apps additionally expose their own UCM privacy-settings action in both locations. Settings reopen after refusal and remain informative in necessary-only apps; do not add a consent banner solely to match the footer.
- Use the validated central document mapping and `/legal/<slug>?app=<registered-id>&lang=<document-locale>` contract from BCO-LEGAL-5. Imara's registered ID is `hram`; Maana and Spesix use `maana` and `spesix`. Preserve app context and the supported legal-language fallback. Do not infer a controller or legal applicability from the sample copyright or branding.
- Preserve applicable DPA, imprint and cancellation links. The examples show privacy, terms and DPA; Maana additionally shows cancellation/refund information and its local cancellation entry; Imara retains its local imprint. Verify actual configured destinations before activation; do not invent an equivalent route in another app.
- Legal hyperlinks remain available when the settings API fails. Settings open in the originating app and must not modify Bigler Consult's own privacy choice or grant consent simply by opening.
- The static YOP report retains its existing upstream/host and verbatim-mirror constraints. It receives applicable legal links, without a fake settings action, account menu, new backend or banner.

### Replaces / removes; deliberately keeps

Replaces/removes: duplicate legal-link/footer compositions within the covered public footer; full marketing/legal footer in authenticated workspaces once equivalent legal/settings entries are accessible in the account/app menu. Do not leave both presentations stacked in the same shell.

Deliberately keeps: actual app identity, applicable copyright/operator attribution, existing special legal destinations, terms-acceptance flows, study/tenant notices, privacy settings behavior and all unrelated page/workspace content. Prototype omissions outside footer coverage authorize no removal.

Copy list: no new production helper text. Translate existing labels in each app's supported UI languages. The approved German labels are “Datenschutz”, “Nutzungsbedingungen”, “Auftragsverarbeitung”, “Datenschutzeinstellungen” and, where applicable, “Widerruf und Erstattung”, “Verträge hier kündigen”, “Impressum”. All preview explanatory sentences remain preview-only.

### Required tests to write

- Public/login/registration shells render the applicable legal links and local settings action without requiring authentication or optional consent. Authenticated workspaces expose equivalent entries through their account/app menu and do not duplicate the full footer.
- Links retain the correct registered app ID, supported document locale and applicable special destinations. Use a representative Maana mapping and an app inheriting general texts; do not duplicate the entire central-reader test suite in every consumer.
- Settings reopen after refusal, including the necessary-only configuration; an unavailable settings API leaves legal links usable. Keyboard opening/closing returns focus correctly using the existing UCM contract.
- Retain coverage for app-scoped choices and no consent grant on link/settings navigation. No broader auth or backend suite is added solely for this layout change.

## Part B — Implementation map — addressed to the implementer

Work from this package; do not explore broadly. Open only the named files to verify. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (branch main; the tree may hold foreign untracked files such as `scratchpad/` — leave them).

### Context package

Existing (UCM-PRIV-1, 4.32.0 — read, do not restructure):
- `src/privacy/PrivacyFooterLinks.jsx`: exports `legalDocumentLanguage(uiLanguage, fallback)`, `buildLegalReaderUrl({origin, slug, appId, lang})` (pure; slugs `privacy|terms|data-processing|cancellation`; returns null on unsafe origin/unknown slug/bad app id) and `PrivacyFooterLinks`. LEAVE `PrivacyFooterLinks` and its test unchanged.
- `src/privacy/PrivacySettingsLink.jsx`: `usePrivacy()` returns null outside a provider; `status === 'unconfigured'` means host has not adopted; `privacy.openSettings` opens this app's settings dialog. Opening grants no consent.
- `src/auth/UserMenu.jsx`: MUI `Menu` with profile item, optional `items` ({id,label,onSelect}), logout. Props today: `resolveLink, items, profileLink, avatarSrc`. Existing tests: `tests/UserMenu.test.jsx` (mocks react-i18next with `translated:<key>`).
- `src/i18n/privacyTranslations.ts` (de/fr/en/sw per key; ONLY ADD keys), `src/index.js` privacy export block (lines ~177-192), `tests/i18nAggregate.test.js`, `tests/packageEntries.test.js`, `src/theme/kitSxRegistry.js` (guard: any `sx` object passed to a MUI component must be a top-level exported const registered in BOTH `SX_EXPORTS` and `KIT_COMPONENT_SX_REGISTRY`, and must not shadow baseline styleOverrides such as `minHeight`; see `PRIVACY_BANNER_*` in `src/privacy/PrivacyBanner.jsx`). Prefer plain `Box`/`Link` with theme-token `sx` only where the guard allows; if in doubt follow the PRIVACY_BANNER_* pattern.

Approved visual spec: `work-orders/assets/public-footer-comparison.html` (CSS at line 5/6, markup in `footer()` at line 12). Read it. Essentials: footer top border (1px, line colour), padding 24px 32px 20px, white/paper background from the theme; top row flex space-between: identity left (brand node + small copyright, `text.secondary`, 12px), legal nav right (flex-end, wrap, gap 8px 22px, links 13px, `text.secondary`, no underline, hover underline + primary colour, min touch height 36px); below it a separate right-aligned row with the quiet settings action (primary colour, small sliders icon, text "Datenschutzeinstellungen"). Mobile (<600px): identity first with 16px margin below, legal links in a 2-column grid (gap 4px 16px, 12px, min-height 44px), settings row left-aligned with 16px top margin, 12px top padding and a 1px fine rule above it, min-height 44px. Keyboard focus must stay visible (use the theme's default focus ring; never `outline: none`). Use theme palette tokens only (no hard-coded colours except none), so every app theme and dark mode stays authoritative.

### What to build

1. `src/privacy/legalEntries.js` (pure helpers + hook, no JSX):
   - `useLegalEntries({ legalOrigin, appId, documents = ['privacy','terms','data-processing'], extraLinks = [], fallbackLanguage = 'en' })` → ordered array `{ id, label, href }`. Order: the requested `documents` (each via `buildLegalReaderUrl`, language via `legalDocumentLanguage(i18n.language, fallbackLanguage)`, entries with null href are dropped) THEN the host's `extraLinks` (`{id, label, href}`; `label` is already translated by the host; `href` may be a relative path starting with `/` or an https/http URL; drop entries whose href is not a string beginning with `/` (and not `//`) or `http(s):`). Built-in label keys: `Privacy.LEGAL_PRIVACY` ("Datenschutz"), `Privacy.LEGAL_TERMS` ("Nutzungsbedingungen"), `Privacy.LEGAL_DATA_PROCESSING` ("Auftragsverarbeitung"), `Privacy.LEGAL_CANCELLATION` ("Widerruf und Erstattung"). Also export optional ready-made label keys for the host to use for its local links: `Privacy.LEGAL_IMPRINT` ("Impressum"), `Privacy.LEGAL_CONTRACT_CANCEL` ("Verträge hier kündigen"), and `Privacy.LEGAL_SETTINGS` ("Datenschutzeinstellungen") used by the settings action. Add all seven keys to `src/i18n/privacyTranslations.ts` with de/fr/en/sw (de exactly as quoted; fr/en/sw sensible equivalents: e.g. en "Privacy", "Terms of use", "Data processing", "Cancellation and refunds", "Imprint", "Cancel contracts here", "Privacy settings"). Do not change existing keys.
   - Must NOT depend on the privacy API: usable without a `PrivacyProvider`.
2. `src/privacy/PublicFooter.jsx`: `PublicFooter({ brand, copyright, legalOrigin, appId, documents, extraLinks, fallbackLanguage, showSettings = true, ...props })` rendering a `<footer>` per the spec above: `brand` and `copyright` are nodes supplied by the host (never invented copy), `<nav aria-label={t('Privacy.FOOTER_NAV')}>` with the links from `useLegalEntries`, and the settings action as a separate row/button using the `PrivacySettingsLink` mechanism (render nothing for it when the host has not adopted privacy, i.e. `usePrivacy()` null or status `unconfigured`, or `showSettings` false); its label is `t('Privacy.LEGAL_SETTINGS')` (pass as children of `PrivacySettingsLink`; do not alter that component). Legal links render even when `usePrivacy()` reports an error/unavailable status. Accept `className`/`sx`/data attributes via `...props`. Export from `src/index.js` in the privacy block: `PublicFooter`, `useLegalEntries`.
3. `src/auth/UserMenu.jsx`: additive opt-in prop `legal` (object with the same fields as above: `legalOrigin, appId, documents, extraLinks, fallbackLanguage, showSettings`). When `legal` is omitted the rendered output and behaviour are IDENTICAL to today (existing tests must pass unmodified). When given: after the `items` block and before the logout divider, a Divider then one `MenuItem component="a" href=... ` per legal entry (closes the menu on click via `handleClose`; opens in the same tab; no `target`), then, if privacy is adopted (`usePrivacy()` non-null and status not `unconfigured`) and `showSettings !== false`, a `MenuItem` `t('Privacy.LEGAL_SETTINGS')` that calls `handleClose()` then `privacy.openSettings()`. Legal items must stay when settings are unavailable. MUI `Menu` children must be an array/flat elements, not a Fragment. Keep the file's existing comments and structure.
4. Playground: in `dev/entries.jsx` add entry id `public-footer` ("Privacy / Public footer + menu", `fullViewport: true`) built from the existing `PrivacyEntry` harness mock transport (`/api/privacy/dev/<scenario>/`): a scenario Select as in `PrivacyEntry`, an app Select (maana: extras cancellation document + local "Verträge hier kündigen" `/contracts/cancel`; imara appId `hram` with local imprint `/imprint`; spesix: none), a `PublicFooter` rendered with brand text and "© 2026 Bigler Consult", and a `UserMenu` (inside an `AuthContext.Provider` with a demo user) given the same `legal` config. Use `https://bigler-consult.ch` as `legalOrigin`. No new harness, no new dependency, no change to `dev/mockTransport.jsx` unless a scenario genuinely requires it.
5. Docs/version: `CHANGELOG.md` new top section `## 4.33.0 - UCM-PRIV-3` (what is added: PublicFooter, useLegalEntries, UserMenu `legal`, new `Privacy.LEGAL_*` keys; opt-in, existing consumers unchanged; PrivacyFooterLinks remains for compatibility); `package.json` version `4.33.0` (ONLY the version line; never touch `pnpm-lock.yaml`); the README privacy section (find it with a grep for "PrivacyFooterLinks") gets a short usage example including the link contract and a note that Maana passes `documents: ['privacy','terms','data-processing','cancellation']` + a local contract-cancel extra link, Imara an imprint extra link with appId `hram`, Spesix the defaults.

### Required tests to write (and run yourself)

`tests/PublicFooter.test.jsx` and an extension in a NEW file `tests/UserMenuLegal.test.jsx` (leave `tests/UserMenu.test.jsx` unchanged):
- PublicFooter without any provider renders brand, copyright, nav links privacy/terms/data-processing with exact hrefs for Maana (`appId: 'maana'`, lang de) and for an app inheriting defaults (`hram`), in order, extras (cancellation document + local `/contracts/cancel`, imprint `/imprint`) appended after; no settings action without a provider.
- With a `PrivacyProvider` over a failing API (settings request fails) legal links still render; with a working mock the settings button opens the dialog and keyboard Escape closes it with focus returning to the trigger; necessary-only manifest still opens settings; opening settings sends no consent write (assert the mock transport saw no POST/PUT) — reuse `tests/privacyTestUtils.jsx` and the patterns in `tests/PrivacySettings.test.jsx` / `tests/privacyAdoption.test.jsx`.
- Unsafe extra link (`javascript:`) and unsafe origin are dropped; language fallback (UI `sw`/`fr` → `lang=en`, fallbackLanguage de → de).
- UserMenu: without `legal` identical menu items as before; with `legal` entries appear between items and logout, are `a` elements with the right hrefs, settings item calls openSettings, absent when no provider; legal items present when the provider is unavailable.
- `tests/i18nAggregate.test.js`/`packageEntries.test.js`: only adjust if a new export name must be pinned there (privacyTranslations is already listed; check whether the sub-path export test enumerates `index.js` names).

### Do not touch

`src/privacy/PrivacyProvider.jsx`, `PrivacySettings.jsx`, `PrivacyBanner.jsx`, `serviceRegistry.js`, `privacyApi.js`, `PrivacyFooterLinks.jsx`, `PrivacySettingsLink.jsx`, `PrivacyNoticeLink.jsx`, `tests/UserMenu.test.jsx`, `tests/PrivacyFooterLinks.test.jsx`, `pnpm-lock.yaml`, `WORK_ORDERS.md`, `.github/`, other repositories, existing translation values. No new dependencies, no consent/auth/permission/schema changes, no new production helper copy beyond the seven label keys.

### Known pitfalls

- Any `sx` on MUI components that is not trivially a theme-token object trips the kit-sx guard (see above); register new exported sx consts in `src/theme/kitSxRegistry.js` (`SX_EXPORTS` and `KIT_COMPONENT_SX_REGISTRY`) and avoid setting `minHeight` on MuiButton-like components that baseline overrides. Plain `Box` has no baseline override.
- vitest: from the repo root run `node node_modules/vitest/vitest.mjs run tests/PublicFooter.test.jsx tests/UserMenuLegal.test.jsx` (no package manager). `tests/packageTreeShaking.test.js` fails on this Windows host (symlink EPERM) — ignore; do not run it.
- Use explicit UTF-8 for any file I/O; keep umlauts in translations.

### Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this section is not an instruction to the implementer.

Gate #1 approved by the operator 2026-11-06 in Codex chat 01a1a885-1278-78f3-8cc2-fd110de60445: the footer-only Maana/Imara/Spesix preview was accepted (“Das gefällt mir so”), with application to all apps and public-only full footers agreed in the following exchange. This approval does not authorize production promotion.

The exact approved artifact was already rendered at 1280/375 for all three examples in that chat and is archived unchanged at the pin above. Follow orchestrate-codex for implementation, configured delegation, independent Tier-3 review and the bounded two-width implementation comparison. Preserve the in-progress UCM-PRIV-1 work and its approved consent-dialog pin. This new WO is its presentation/adoption supplement, not a requirement to restart that implementation.

Track delivery through the central rollout and the existing app WO records. A shared release alone is not completion: all 20 apps need their applicable public/footer and authenticated/menu outcome recorded, with static/no-account exceptions explicit. No app source was changed while recording this approval.
