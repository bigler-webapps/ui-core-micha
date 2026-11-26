# UCM-CHAT-22 — Chat permission groups: shared interface

## A. Envelope

This repository-local companion records the ui-core-micha portion of HRAM-CHT-10, the canonical feature work order and acceptance target. The operator requested these companion entries on 2026-11-25. The scope, exclusions and approval below remain those of HRAM-CHT-10; this entry authorizes no additional feature or review round.

**Tier 3.** Changes both shared cores and the server-side authorization of app tools and data. The feature has one work order across django-core-micha (DCM), ui-core-micha (UCM) and HRAM. HRAM hosts the work order because it is the first consumer and the executable acceptance target.

### Goal and outcome

An HRAM user can open a small gear in the chat header and narrow what that chat may read by switching a few meaningful groups. The same shared UCM surface renders any opted-in app catalogue, including write groups with confirmation requirements, without per-app frontend controls or mappings.

### Product contract

- **App catalogue.** The app backend supplies stable group and capability IDs, localized user-facing labels, read/write kind, ordering, the functions in each group and the write confirmation policy per action. Group by what the user recognizes, such as planning foundations, options and results, or rounds and submissions. Keep the default list short. The disclosure for a group lists its functions without individual switches. Treat catalogue content as plain data. UCM supplies the common strings and presentation.
- **One popup, one save.** Separate read and write sections, with a single switch per group and details collapsed on open. Group changes are staged until one Save. Cancel, close or Escape discards staged changes and returns focus to the gear. Group state survives reload and is isolated to the chat. Loading, failure and stale writes are explicit. A save failure keeps the draft available for retry. Never apply a late read or save result to a different chat.
- **Effective access.** For opted-in apps the server intersects current app, object and field access, the app's admin and user restrictions, the chat's allowed groups and the current model/data-disclosure policy. Apply the same constraints to tool discovery, invocation and app-supplied context. Recheck at execution and before returning results to the provider. Preserve existing per-object and provider checks. The browser can submit group choices only. It cannot grant capabilities, change confirmation requirements or supply an authoritative scope or actor.
- **Availability.** Present only groups and functions the app declares appropriate to disclose to that user. A visible unavailable function explains its state. A group with zero available functions cannot be enabled. Enabling a group containing an unavailable function only permits eligible members. A no-write catalogue renders the read controls and a short empty write state. Apps without an opted-in catalogue retain their existing chat behavior.
- **Lifecycle.** Persist restrictions on the existing private-chat boundary. Cross-user, inaccessible, archived or stale edits are refused. Save atomically against the current catalogue and grant revision. Deleting capabilities takes effect immediately. A newly registered capability in a saved group needs a newly authorized grant. A rename or label translation never grants access. After a restriction narrows, stop any affected active work and prevent automatic provider reuse of context, history, summaries and resumed sessions that can carry the removed data. Restart model context if safe reuse cannot be established. Keep stored transcripts under existing access and retention rules. Previously disclosed data follows the existing provider retention policy.
- **Write metadata.** Support groups containing direct-on-explicit-request and confirmation-required action descriptors. Show the applicable policy in the collapsed group and expanded details, with a mixed policy label when needed. An enabled write group expresses permission to request its actions. Per-action confirmation remains an independent requirement. HRAM exposes zero write groups. This delivery exercises write rendering with synthetic catalogue fixtures.

### HRAM first adopter

- Map existing `ToolSpec` registrations and HRAM's data categories into groups such as **Planning foundations**, **Options and results** and **Rounds and submissions**. Cover the existing tool/category inventory for planning, research, teaching and methodology. Only display groups appropriate to the current authorized context. Assign each function to a meaningful group and preserve its underlying category predicates, including tools with multiple category requirements. HRAM-specific catalogue labels and mapping live in the backend.
- Continue to honor HRAM's account-wide `My Data` and admin controls as upper bounds. An existing or new HRAM chat with no per-chat choice keeps its currently eligible legacy read capabilities from the initial catalogue at rollout. A chat cannot override a disabled category. Subsequent additions to a group do not expand an existing grant or this legacy baseline. Preserve the separate hosted-analysis consent and model policy while applying chat restrictions to any app data it receives.
- Use HRAM's existing `ChatWorkspace` mount and DCM assistant URLs with the shared built-in UI. A catalogue-only configuration must be sufficient to show the new control. No HRAM-specific JSX, per-group translations in HRAM frontend, custom permission endpoint in HRAM, or extra frontend setup for a second app.
- Release additive, compatible DCM and UCM versions before updating HRAM's exact pins. Check the version diffs and preserve existing clients' contracts. The completion evidence includes the running HRAM application on both pins.

### Scope limits and risks

- **Preserve** the existing HRAM `My Data` screen and account settings. It controls a different scope from this chat popup. No UI removals are authorized. Existing chat history, model picker, chat management and provider/billing settings keep their current UI and access policy.
- App write execution, action confirmation endpoints, independent changes to app policies, Voice, MCP, other app rollouts and shared-chat grant semantics are outside this envelope. The prototype's maana and Cockpit catalogues demonstrate the UI contract only.
- Main risks: scope fallback accidentally making a forbidden tool callable, catalogue growth silently widening grants, stale saves overwriting newer settings, archive/revocation races, an app-specific UI dependency, and provider replay of withdrawn data.

### Prototype and adopted criteria

Prototype: `work-orders/assets/app-prototype.html@652d15f6`, scene `?scene=chat-grants`, checklist `chat-grants-checklist`. Shows the closed gear, open grouped popup and expanded group in the existing chat. The prototype defines UI/UX parity. This Envelope defines behavior, authorization, data contracts and coverage.

| ID | Required outcome |
| --- | --- |
| CG-V1 | An accessible gear is visible and reachable with the popup closed at 375 and 1280 px. |
| CG-V2 | The open popup presents collapsed groups, one switch per group, the HRAM no-write state and reachable actions without horizontal overflow at both widths. |
| CG-V3 | Expanding Options and results reveals its actual functions with the original single switch and reachable actions at both widths. |
| CG-F1 | A saved change affects only the selected chat, survives reopening and reload, and leaves the second chat's settings intact. |
| CG-F2 | Cancel discards edits. An app-disabled function remains unavailable when its group is enabled. |

Token deltas: use the existing UCM tokens for surface colors, accent, typography, radius, shadows and density in place of the prototype's illustrative colors and system font. Match the visible hierarchy and interaction.

Copy budget for new explanatory/status text (German source prototype, localized in implementation): `Gilt für diesen Chat`, `Keine Schreibaktionen im Chat`, `Keine Leseaktionen im Chat`, `App-Recht fehlt`, `Direkt bei ausdrücklichem Auftrag`, `Mit Bestätigung`, `Bestätigung je nach Aktion`, `Chat-Freigaben gespeichert.`, `Chat-Freigaben konnten nicht geladen werden.`, `Chat-Freigaben konnten nicht gespeichert werden.`, `Die Freigaben wurden geändert. Neu laden.` Function counts and group availability counts are localized state labels.

### Required tests to write

- **DCM:** catalogue schema and duplicate/invalid IDs, opt-in/no-hook compatibility, group save and revision conflicts, private owner and scope authorization, foreign chat and archived chat rejection, server rejection of forged group IDs or action grants, permission intersection including unavailable group members, and removal/addition/translation lifecycle. Prove that tool calls or app context after narrowing cannot recover denied data, including a running turn and a provider continuation. Add affected permission and WebSocket inventory coverage where the surfaces change, and document the shared API contract and error shapes.
- **UCM:** use two unrelated catalogue fixtures with the same component and an empty write section. Assert grouped switch count and translation, effective/disabled state, collapsed details, direct/confirmation/mixed write metadata, keyboard focus and dismissal, save/cancel/retry, and stale responses after switching chats. Check the shared ChatWorkspace without catalogue support.
- **HRAM:** cover category mapping, existing account/admin restrictions, planning workspace and user boundaries, legacy no-choice reads, and category changes between opening the popup and tool execution. Verify app-supplied context and existing hosted-analysis dataset exposure. Update the HRAM API-contract description. In the isolated synthetic fixture `assistant_grouped_grants`, prepare two private chats titled `Planungsoptionen vergleichen` and `Zweiter Planungschat` for the same German-language run-owned actor. Allow planning foundations and options, disable rounds by the chat default in the fixture, and disable one review function at the app level. Exercise the HRAM click path in the acceptance protocol using this fixture. Use deterministic provider stubs for any necessary backend model calls.

## B. Implementation map

Prepared as a repository-local companion to HRAM-CHT-10. Only this repository's portion is in scope.

- Target: ui-core-micha, branch main.
- Shared ChatWorkspace, group grants component, API and wire adapters, translations and focused chat tests.
- Preserve unrelated changes and select only HRAM-CHT-10 hunks for review and landing.
- The canonical acceptance criteria and cross-repository release sequence remain in HRAM-CHT-10.

## Preamble

> Implement only the assigned repository portion of the approved HRAM-CHT-10 envelope. Preserve foreign changes. Do not alter the work order, register, dependencies or Git state. Do not run tests; the orchestrator owns evidence runs. Report progress and leave an unstaged diff.

## C. Orchestrator only

Track this repository's independent review, tests and release evidence here and in HRAM-CHT-10. Do not claim completion until all applicable gates pass.

## Gate record

Gate #1 approved by the operator for HRAM-CHT-10; repository-local companion requested by the operator on 2026-11-25.

## Completion

2026-11-26: The DCM review requested explicit reauthorization when an enabled group is switched off and on in one unsaved draft. The feature worker added the optional wire field to the shared dialog. A separate test worker's write was blocked by the workspace hook, which resolved a relative source import outside its allowlist; the write was not retried. Existing selected group and locale tests passed 11 and 3. Full frontend scope reported 1,467 tests with one known package-entry timeout. The new behavior has no direct test, closing review or acceptance evidence; no commit or release occurred.

Open. Review and release evidence pending. Part B: mapping prepared from HRAM-CHT-10; verify against the final diff.

2026-11-26 update: After the operator explicitly approved the retry, the configured worker added the direct reauthorization test using an absolute target path. The selected run passed 10 tests. A full frontend run reported 1,477 tests with the existing unrelated package-entry import timeout; the scope remains red. Closing review and HRAM acceptance remain open.

2026-11-26 release preparation: Version 4.41.0 contains only this work order's selected hunks; the overlapping managed-model changes are excluded. The approved lifecycle extension justified independent review round 3. The configured OpenAI reviewers raised three defects: two coverage gaps and missing reauthorization guidance. The configured fix worker `codex/gpt-6.1-terra` corrected them; affected selections passed 12 and 5 tests. A separate package-entry selection passed 5 tests after a timeout under concurrent load. Part B: accurate. The operator explicitly approved round 4 because selected-hunk landing requires the review snapshot to match the corrected patch. HRAM acceptance remains open.

Round 4 (`codex/gpt-6.1-terra` and `codex/gpt-6-luna`; envelope, regression, duplication, tests, security and UI) found no blocker. Carried findings: direct workspace coverage for archived/pending chats; a named loading indicator; and the reauthorization guidance exceeds the original copy budget. The existing package import timeout limits were increased after an isolated pass and repeat full-scope timeouts.

The final UCM frontend scope passed 1,481 tests on 2026-11-26. The selected-hunk landing dry run matched the reviewed patch. The register contains an unrelated UCM-AUTH-18 edit alongside this work order's new entry; its foreign line must remain unstaged.
