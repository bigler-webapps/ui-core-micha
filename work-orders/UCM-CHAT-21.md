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

Use `work-orders/assets/app-prototype.html@9f12030c9aab4b49a958a504329e3e0670e96768`, scene `?scene=managed-picker`, checklist `ucm-chat-21-checklist`. Coverage is the existing managed picker trigger and open desktop and mobile picker states. Surrounding chat is context. The prototype governs visual and selection parity. DCM and this Envelope govern the API, privacy and routing behavior. Token delta: none. Copy reuses existing picker labels, with **OpenAI** and **Claude** as group headings and the exact family labels. Fixture controls and explanations are prototype copy only.

At **375 px and 1280 px**, all five prototype criteria apply:

| ID | Expected result |
|---|---|
| UCM21-01 | Group the eligible families by OpenAI and Claude. Sonnet is initially selected in the example. Public text, trigger and accessible names show provider/family and the existing effort only. |
| UCM21-02 | Select across provider groups by keyboard. The trigger and effort controls update. Close and reopen with the same explicit choice focused. The existing user token balance remains usable. |
| UCM21-03 | Apply a route-only catalogue refresh with Sonnet selected. Sonnet remains one selected row. User-visible text, selection and the user token balance stay stable. |
| UCM21-04 | When Sonnet is revoked, the received server default Sol takes its place and the remaining families are selectable. |
| UCM21-05 | An empty managed catalogue shows no available model in the panel and in the closed trigger, with no selectable effort. |

### Required tests to write

- Managed catalogue with both providers, exactly one row per offered provider/family and the correct default. Verify selection sends the stable public ID and effort.
- Inject legacy account labels, `subscription` indicators or version metadata into a managed fixture. Verify the managed trigger, list, accessible tree and rendered attributes expose none of those fields. Keep the app token balance usable.
- Refresh an already-open chat after a source-only change, then after repeated family revocation. Check explicit selection retention, eligible server default, missing default, stale responses and in-flight reply behavior. Keep the unmanaged catalogue and selection path intact.
- Exercise keyboard navigation across provider groups and existing picker interactions at desktop and mobile widths.

## Part B — Implementation map

The Orchestrator fills the absolute paths, catalogue contract and implementer preamble after Gate #1. Dispatch is blocked while this placeholder is present.

## Part C — Orchestrator only

> Implementers stop here. Independent review, authoritative verification and publication belong to the Orchestrator.

Verify the DCM-CHAT-21 payload, the privacy checks in the rendered managed UI, and a route-only refresh using an unchanged public selection. Record the rendered application evidence against UCM21-01 through UCM21-05 at both widths and the published release in BCO-UI-10 for the chat consumers.

## Gate record

Requested on 2026-11-17. Gate #1 for implementation is pending.
