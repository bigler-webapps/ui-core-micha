# UCM-PRIV-1 — Shared privacy choices and notice surfaces

## Part A — Envelope

### Outcome, dependency and visual scope

Tier 3. Target: ui-core-micha, main. Depends on the released DCM-PRIV-1 contract. Deliver a shared provider, notice links, first-choice banner, purpose settings, service activation/cleanup helpers and translations. Adoption is explicit; it does not create consent dialogs in every app by default.

### Shared product contract

- Operator decisions (2026-11-04): use prior opt-in for optional processing uniformly for CH/EU; retain visit measurement only after an explicit choice; use one shared prototype. No consent banner when no optional purposes exist.
- A privacy notice informs; it is not a blanket processing consent or a condition of access. Keep actual terms acceptance, study consent, AI disclosure/release and browser push/geolocation permissions separate.
- The deployment's actual controller, app/site, origins, languages, document versions and services define the scope. Do not assume bigler-consult is controller for a client-operated app or copy consent across apps/subdomains.
- Unknown, missing, expired, malformed or unavailable choice means optional processing is off. A recorded legacy boolean/cookie never counts as a purpose-specific opt-in.
- An explicit requested operation may use the storage actually necessary for it, with a documented justification and lifetime. Being local, first-party, cookieless, server-side or labelled "functional" does not by itself establish necessity.
- No optional request, SDK initialisation, iframe, beacon, identifier creation/read, prefetch or queued event replay before a valid choice. Revocation blocks new work immediately and clears only storage owned by the withdrawn purpose.
- Do not delete research files, customer drafts, tickets, carts, reaction ownership, account sessions or other essential functional data through a generic cookie-clear operation. Existing server records are governed separately; withdrawal does not falsely promise to undo past transmissions.
- Roll out on existing deployment/trunk conventions. Runtime/edge behavior and uploaded legal texts were not verified by the source inventory; each app needs bounded evidence on its actual routes before claiming complete coverage.

### Scope boundaries

No server/secret/provider-console change, production promotion, framework migration, new analytics vendor or broad dependency refresh is included. Narrow shared-library adoption pins and necessary lock/migration changes are in scope. Other active work must remain intact.

### UI and service lifecycle

- A nonblocking first-choice surface appears only when configured optional purposes need a decision. "Necessary only" and "Allow all" have equal prominence on its first layer, plus settings. Closing/continuing navigation does not grant anything. No preselected optional purpose.
- Settings remain reachable without login from the public footer and inside the account area. Show separate purposes, actual provider/storage duration details and current selections. Necessary functions are information, not a misleading disabled consent checkbox.
- A provider initialises before optional imports/effects. All optional service entry points use a purpose-aware lifecycle guard, including dynamic imports, requests, iframes, storage reads/writes and callback races. App code owns the actual providers; the shared package does not load vendors speculatively.
- A positive server-confirmed choice activates only matching services. Refusal/revocation stops scheduling immediately, tears down active integrations where possible, blocks late callbacks and clears registered purpose-owned keys/cookies/caches. Never run localStorage.clear() or delete all IndexedDB databases/caches.
- Synchronise choices between tabs on the same supported scope without letting stale optimistic updates resurrect grants. Do not auto-enable choices at login/logout, account switch or on a new device.
- Support storage-disabled/private/offline conditions: necessary app use remains possible; optional processing stays off if a durable grant cannot be established. Give an honest retry state. Persisting a refusal must not require registration.
- Empty optional configuration shows notice information/settings as appropriate, without a banner or acceptance fiction. Use the actual controller and configured document locale; preserve supported app languages, including DE/EN/FR variants and existing regional language choices.
- Provide explicitly adopted replacements for CookieConsentStep and profile statement controls. Retain legacy exports only during rollout, deprecate them and remove under UCM-PRIV-2. Keep name completion, actual terms acceptance, AI permissions and browser permissions intact.

### Prototype and removal authority

Visual spec: [app-prototype.html](assets/app-prototype.html) at ui-core-micha@ced7a28; [rendered 375/1280 comparison](assets/privacy-prototype-two-widths.png). The shared example uses current baseline typography/spacing/radius and MUI's default primary; apps retain their own primary/font/dark-mode identity. Token delta: none. The prototype is visual/UX only; the Envelope specifies behavior and authority.

Coverage: first choice, purpose settings, saved/error states and a necessary-only app. The gallery is a concrete example, not a mandate to add its purposes to every app. Details in production come from each validated manifest; prototype provider labels are not verified legal identities. No unrelated app screen is redesigned.

Replaces/removes on adoption: compulsory privacy-acceptance checkbox; undifferentiated convenience-cookie checkbox; duplicate onboarding/profile prompt; cosmetic convenience-cookie writes; optional loaders outside the shared lifecycle. Deliberately keeps: readable notices, real terms acceptance, research/AI/push/geolocation permissions, current account/name forms, app data and requested functional storage. Nothing else is removed.

### Copy included in the prototype

The following helper text is part of the approval package (DE / EN). App-specific purposes/providers must be substituted with verified manifest content; no invented service is displayed.

- "Notwendige Funktionen sind immer aktiv. Sie entscheiden, ob wir zusätzlich Ihre Darstellung speichern und Besuche dieser Galerie messen dürfen." / "Necessary functions are always active. You decide whether we may also remember your display settings and measure visits to this gallery."
- "Sie können Ihre Auswahl jederzeit hier ändern." / "You can change your choice here at any time."
- "Für Anmeldung, Sicherheit und ausdrücklich angeforderte Funktionen." / "For sign-in, security and functions you explicitly request."
- "Merkt sich Ihre gewählte Darstellung auf diesem Gerät." / "Remembers your chosen display on this device."
- "Zählt Aufrufe dieser Galerie." / "Counts visits to this gallery."
- "Anbieter: Betreiber dieser App. Speicherart und Laufzeit werden für die tatsächlich eingesetzten Funktionen ausgewiesen." / "Provider: this app’s operator. Storage types and duration are listed for the functions actually used."
- "Anbieter: Betreiber dieser App. Lokaler Browserspeicher; bis zum Widerruf oder zur Löschung im Browser." / "Provider: this app’s operator. Local browser storage; until withdrawal or removal in your browser."
- "Anbieter: Betreiber dieser App. Separate Besucherkennung als Cookie; höchstens ein Jahr, bei Widerruf entfernt." / "Provider: this app’s operator. Separate visitor cookie; at most one year, removed on withdrawal."
- "Nur notwendige Funktionen sind aktiv." / "Only necessary functions are active."
- "Ihre Auswahl ist gespeichert." / "Your selection has been saved."
- "Speichern derzeit nicht möglich. Optionale Dienste bleiben ausgeschaltet." / "Unable to save right now. Optional services remain off."
- "Diese App verwendet nur notwendige Funktionen." / "This app uses only necessary functions."
- "Welche Daten wir wofür verwenden, steht in der Datenschutzerklärung." / "Our privacy notice explains which data we use and why."

### Required tests to write

- First load, accept all, refuse all, selective choice, reopen/change, expiry, purpose-version change and no-optional configuration; no grant from closing/scrolling.
- Instrument a real service adapter: zero imports/requests/identifier reads before choice or after refusal; correct activation; revoke and late callback races; only registered storage removed.
- Server errors/offline/storage failures, tab conflict and account switch cannot activate services; current choices and errors are accurately rendered.
- Anonymous keyboard/screen-reader operation, dialog focus, translated labels and actual document links; both widths without clipping and equal first-layer accept/refuse prominence.
- Existing onboarding/profile names and real terms flow remain correct under explicit adoption; legacy consumer imports still work until their removal WO.

## Part B — Implementation map (not dispatchable)

PLACEHOLDER — after Gate #1 the Orchestrator supplies absolute working directories, current named files/functions, the API/manifest contract slice, migrations and compatibility invariants, progress contract and mandatory implementer preamble. This Envelope alone is not a coder dispatch.

## Part C — Orchestrator only

STOP — this section is not an instruction to the implementer.

Gate #1 approved by the operator 2026-11-06 (Codex Expertenchat, session 01a1a807-3193-7793-8e43-50d6d7fd7263). Approval covers this Envelope and the shared privacy prototype/copy, accepted after the interactive preview. The canonical visual reference remains ui-core-micha@ced7a28. Dependencies and activation prerequisites still apply; production promotion is not approved. The Orchestrator must complete Part B and the mandatory preamble before dispatch. Follow orchestrate-codex before dispatch. Requirements-only authoring needs no independent code review; future Tier-3 source delivery does, including the security boundary and UI changes where applicable. Use the configured roles and the app's existing test harness. In joined apps, put the named cross-layer click path into the existing browser suite; do not introduce a harness or expand screenshots beyond the canonical prototype comparison merely for this rollout.

Reorient and re-read current instructions/pins at handoff. The shared visual reference is ui-core-micha/work-orders/assets/app-prototype.html@ced7a28 (375/1280 px); match composition and interaction using the consuming app's own theme. It covers only privacy choices and notice entry points. The Envelope governs behavior, permissions and data contracts, not prototype omissions.

Initial seams: src/onboarding/OnboardingProvider.jsx, steps/CookieConsentStep.jsx, components/ProfileComponent.jsx, ProfileStepContent.jsx, auth/authApi.jsx, AuthContext.jsx and existing i18n/theme/export conventions. Preserve the independent billing changes in src/index.js and elsewhere; sequence overlapping edits with their owner. Render the final implementation against the pinned prototype at 375/1280 before delivery.

