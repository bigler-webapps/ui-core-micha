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

## Part B — Implementation map (not dispatchable)

PLACEHOLDER — the Orchestrator completes current shared/consumer files and functions, absolute working directories, released exports and legal-config contract slices, do-not-touch areas, progress contract and mandatory implementer preamble before dispatch. Carry each app's applicable requirements into its existing PRIV-1 Part B; completed app adoption requires a scoped follow-through record rather than silently being treated as covered.

## Part C — Orchestrator only

STOP — this section is not an instruction to the implementer.

Gate #1 approved by the operator 2026-11-06 in Codex chat 01a1a885-1278-78f3-8cc2-fd110de60445: the footer-only Maana/Imara/Spesix preview was accepted (“Das gefällt mir so”), with application to all apps and public-only full footers agreed in the following exchange. This approval does not authorize production promotion.

The exact approved artifact was already rendered at 1280/375 for all three examples in that chat and is archived unchanged at the pin above. Follow orchestrate-codex for implementation, configured delegation, independent Tier-3 review and the bounded two-width implementation comparison. Preserve the in-progress UCM-PRIV-1 work and its approved consent-dialog pin. This new WO is its presentation/adoption supplement, not a requirement to restart that implementation.

Track delivery through the central rollout and the existing app WO records. A shared release alone is not completion: all 20 apps need their applicable public/footer and authenticated/menu outcome recorded, with static/no-account exceptions explicit. No app source was changed while recording this approval.
