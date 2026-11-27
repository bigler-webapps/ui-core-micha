# UCM-CHAT-21 — Show managed chat families by provider

## Part A — Envelope

### Goal and outcome

In a managed app, users choose a provider and model family in the existing chat model picker. They see one **Claude → Sonnet** entry even when several API accounts or a subscription can serve it. The owner assigns the underlying route in Bigler Consult. A route-only change keeps the user's current selection valid and requires no app redeploy after enrolment.

**Tier 3.** Shared UI core, private source information and a changed catalogue contract. This order follows `UCM-CHAT-20` and implements the UCM slice of [BCO-UI-10](../../bigler-consult/work-orders/BCO-UI-10.md). It consumes the managed public catalogue from [DCM-CHAT-21](../../django-core-micha/work-orders/DCM-CHAT-21.md).

### Scope

- In managed mode, group the offered families by **OpenAI** and **Claude**. OpenAI labels are **Astra**, **Sol**, **Terra**, **Luna**. Claude labels are **Fable**, **Opus**, **Sonnet**, **Haiku**. Render the eligible entries and default from the authoritative DCM catalogue. Carry the stable public selection ID and supported effort through the existing selection flow.
- The managed picker, trigger, headings, tooltips, accessible labels, DOM attributes and user-visible errors must omit route identifiers, account or subscription labels, upstream billing mode and concrete model versions. Use the existing app token-balance presentation where applicable. The app's user tariff is separate from upstream provider billing.
- Use the existing picker layout, keyboard navigation, mobile sheet and visual tokens. Provider names serve as group headings. Keep exactly one row per offered provider/family. Preserve the managed refresh from UCM-CHAT-20 on picker open, window foregrounding and periodic refresh. Do not overwrite a still-valid explicit selection when only the route changes or interrupt an in-flight reply. If the current family is revoked, present the eligible server default or the existing unavailable state. Ignore stale responses for another chat or scope.
- Keep unmanaged consumers compatible. BCO Owner UI, private routing, analytics, provider credentials, tariff calculations and consumer pins belong to the relevant DCM or app work orders.

### Preconditions and release

Validate against the released or agreed DCM-CHAT-21 public payload before publication. UCM relies on DCM to enforce the policy and filter private fields at the API boundary. Publish a compatible UCM release before chat consumers pin it. BCO-UI-10 records each deployed pin and verifies the combined 30-second update on staging.

### Prototype and visual acceptance

Use `work-orders/assets/app-prototype.html@539e3937de901f2020e68e63f29e287281d036fb`, scene `?scene=managed-picker`, checklist `ucm-chat-21-checklist`. Coverage is the existing managed picker trigger and open desktop and mobile picker states. Surrounding chat is context. The prototype governs visual and selection parity. DCM and this Envelope govern the API, privacy and routing behavior. Token delta: none. Copy reuses existing picker labels, with **OpenAI** and **Claude** as group headings and the exact family labels. Fixture controls and explanations are prototype copy only.

At **375 px and 1280 px**, all five prototype criteria apply:

| ID | Expected result |
|---|---|
| UCM21-01 | Use prominent OpenAI and Claude group headings. Show the selected family with a straight blue line at the left edge. Sonnet is initially selected in the example. Public text, trigger and accessible names show provider/family and the existing effort only. |
| UCM21-02 | Select across provider groups by keyboard. The trigger and effort controls update. Close and reopen with the same explicit choice focused. The existing user token balance remains usable. |
| UCM21-03 | Apply a route-only catalogue refresh with Sonnet selected. Sonnet remains one selected row. User-visible text, selection and the user token balance stay stable. |
| UCM21-04 | When Sonnet is revoked, the received server default Sol takes its place and the remaining families are selectable. |
| UCM21-05 | An empty managed catalogue shows no available model in the panel and in the closed trigger, with no selectable effort. |

### Required tests to write

- Managed catalogue with both providers, exactly one row per offered provider/family and the correct default. Verify selection sends the stable public ID and effort.
- Inject legacy account labels, `subscription` indicators or version metadata into a managed fixture. Verify the managed trigger, list, accessible tree and rendered attributes expose none of those fields. Keep the app token balance usable.
- Refresh an already-open chat after a source-only change, then after repeated family revocation. Check explicit selection retention, eligible server default, missing default, stale responses and in-flight reply behavior. Keep the unmanaged catalogue and selection path intact.
- Exercise keyboard navigation across provider groups and existing picker interactions at desktop and mobile widths.

## B. Implementation map

Target: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. The DCM 3.32.0 managed catalogue exposes `policy`, `default` and entries `{id, provider, family, label, efforts}`; the stable ID is `provider:family` and selection may be sent as `{entry, effort}`. Managed chat payloads carry the same selection. Public consumers must not render private fields, even if legacy account, source, billing or model metadata is present in a fixture. The pinned prototype and Part A remain authoritative for visual and interaction behavior.

Use `src/chat/ModelPicker.jsx` for grouping, trigger, selected row, keyboard navigation and desktop/mobile panel; use `src/chat/ChatWorkspace.jsx` for selection, catalogue refresh and stale-response handling. Preserve the unmanaged path and existing token balance. Existing tests in `tests/chatPicker.test.jsx`, `tests/chatPickerLevels.test.jsx`, `tests/chatWorkspace.test.jsx` and `tests/chatComposeStartCatalogue.test.jsx` are the relevant seams. Use existing translations and theme tokens; see `DESIGN.md`. Add the scoped tests required by Part A. No app pins, owner UI, provider routing or central policy changes belong here.

## Preamble

> First action from the workspace root: run `codex-hook-canary-ws-gov-60`. Expect `WS-GOV-60 canary: workspace hooks are active`; if absent, report unverified coverage and continue under all workspace gates.
>
> Parts A and B are the complete specification. Work on scoped source and tests only, preserve other work, and do not edit the register, this WO, documentation, dependencies or lockfiles. Do not install packages, dispatch agents, review, stage, commit or push. Write the required tests and run only the tests you wrote once. The Orchestrator owns acceptance, review and release. Start with `PLAN`, report `PROGRESS`, and finish with `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## C. Orchestrator only

> Implementers stop here. Independent review, authoritative verification and publication belong to the Orchestrator.

Verify the DCM-CHAT-21 payload, the privacy checks in the rendered managed UI, and a route-only refresh using an unchanged public selection. Record the rendered application evidence against UCM21-01 through UCM21-05 at both widths and the published release in BCO-UI-10 for the chat consumers.

## Completion


<!-- acceptance:begin -->
Acceptance (local-stack, http://127.0.0.1:4173; derived cause: none)

| ID | Type | Status | Run time | Evidence | Reason |
|---|---|---|---|---|---|
| UCM21-01 | V | pass | 2026-11-27 17:31 | .claude/scratch/acceptance-UCM-CHAT-21 | Both widths: OpenAI and Claude headings, Sonnet with blue left marker, trigger shows Claude / Sonnet and effort only (375 truncated with ellipsis), balance visible; orchestrator reading of recaptured 375/1280 images. |
| UCM21-02 | V | pass | 2026-11-27 17:31 | .claude/scratch/acceptance-UCM-CHAT-21 | Both widths: Sol selected with marker, both groups, effort control and balance visible (reader haiku); keyboard and focus on reopening covered by managed_picker tests at desktop and mobile widths. |
| UCM21-03 | V | pass | 2026-11-27 17:31 | .claude/scratch/acceptance-UCM-CHAT-21 | Both widths: single selected Sonnet row, balance visible, no route or account text (reader haiku). |
| UCM21-04 | V | pass | 2026-11-27 17:31 | .claude/scratch/acceptance-UCM-CHAT-21 | Both widths: Sonnet absent, Sol selected, remaining families listed (reader haiku). |
| UCM21-05 | V | pass | 2026-11-27 17:31 | .claude/scratch/acceptance-UCM-CHAT-21 | Both widths: panel and closed trigger show the existing unavailable text, no effort control; orchestrator reading of recaptured images. |
<!-- acceptance:end -->
The acceptance protocol is derived from all five UCM-CHAT-21 criteria in `work-orders/assets/app-prototype.html@539e3937de901f2020e68e63f29e287281d036fb`. The local Vite harness uses synthetic data and renders the actual picker. Functional keyboard, refresh and selection checks must also be evidenced at both widths; visual captures alone do not prove those interactions.

The earlier scoped picker and workspace tests passed locally. The earlier Windows file-URL encoding defect no longer prevented capture on 2026-11-22. The protocol now targets the prototype's single scenario combobox by role, preserving the same fixture values; all five rows captured at both widths. Independent image judgement (`codex/gpt-6-luna`) marked UCM21-03 visually passed and the other four unclear: mobile closed-trigger and prototype views are missing, and screenshots cannot prove keyboard selection, focus or accessible names. Functional refresh, selection and keyboard evidence remains required separately, including for UCM21-03. The current sanctioned `tests.py --repo ui-core-micha --scope managed_picker --wo UCM-CHAT-21` run returned `RESULT: BLOCKED` with Windows `WinError 2` when starting the declared npm command; no substitute test run was made. Independent first-round review identified the empty picker, harness theme and test coverage findings, which were corrected locally; a closing review and the remaining visual and functional acceptance are still required. This work remains unreleased.

Follow-up 2026-11-22: after operator approval for the permanent test configuration, the sanctioned `managed_picker` scope ran and passed 46 tests. Two earlier runs exposed a render-test race: the initial catalogue and turns had not settled before the render baseline. A scoped fix-worker (`codex/gpt-6.1-terra`) made the test settle those requests explicitly without changing production code. This test run does not establish the remaining two-width functional acceptance criteria.

The independent closing review used `codex/gpt-6.1-terra` for envelope, regression, tests, security and UI and `codex/gpt-6-luna` for duplication. It raised two test defects, corrected by `codex/gpt-6.1-terra`; the sanctioned `managed_picker` scope then passed all 46 tests. The review also identified unrelated group-grant changes interleaved in `ChatWorkspace.jsx`. Those foreign changes are outside this Envelope and must be excluded from any UCM-CHAT-21 landing. The visual acceptance and two-width functional evidence remain open. Part B: accurate.

2026-11-27 closing: the group-grant hunks named above landed with UCM-CHAT-22 (`81fc365`), so the remaining diff is this order's. Test-only additions after the closing pass: a two-width (desktop Popover, mobile Drawer) keyboard-across-groups and reopen-focus test, and the dev harness places the composer so the trigger stays visible beside the panel at 375 and 1280 px. `managed_picker` passed 48 tests on the final tree. Acceptance UCM21-01 to -05 all `pass` at 375 and 1280 px (UCM21-02/-03/-04 judged by a read-only reader on Haiku; UCM21-01/-05 by the Orchestrator after recapture; keyboard and focus evidence is the two-width test). The empty state uses the existing unavailable label, not the prototype's sample wording. Release prepared as 4.42.0 (minor: unmanaged path unchanged; managed mode needs the DCM 3.32.0 public catalogue). Part B: accurate. pre-existing red: none seen.

## Gate record

Gate #1 approved by the operator 2026-11-17 in the Codex requirements chat: “Ich gebe alle drei WO frei.” Approved Envelope: `3b47ab4`; pinned prototype: `539e3937de901f2020e68e63f29e287281d036fb`.
