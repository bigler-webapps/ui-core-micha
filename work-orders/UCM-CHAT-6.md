# UCM-CHAT-6 — Chat: show the summary and the cost of each reply

## Part A — Envelope (everyone)

**Tier:** 2 — display of new payload fields in the shared chat surface; no new logic beyond presentation. **Repository:** `bigler-webapps/ui-core-micha`. **Canonical:** DCM-CHAT-13; starts after its payload is fixed.

### Goal and expected outcome

The person sees on what the assistant relies and what each reply cost.

### Settled decisions (operator, 2026-10-16)

1. „Zusammenfassung bis hier" as a collapsed block at the point of the summary, expandable to its text.
2. Each reply shows its cost quietly (e.g. „6 Token") when the app supplies a token conversion; otherwise nothing.
3. A notice before sending when the chat is long and a summary will be made.
4. DE, EN, FR.

### Scope and acceptance

The two display elements and the notice in all chat surfaces of the kit.

### Non-goals and do-not-touch

Summarisation itself, prices, chat layout otherwise.

### Risks

None beyond layout regressions in the chat thread.

### Required tests to write or update

Summary block collapsed/expanded, per-reply cost with and without conversion, notice, i18n.

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 pending. After DCM-CHAT-13. Tier 2: `reviewer` lenses and `ui_reviewer`.
