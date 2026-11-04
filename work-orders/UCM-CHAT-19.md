# UCM-CHAT-19 — Compact composer: actions share the input row when there is no context

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha` chat surface), consumed by every app with the compact
composer.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; consumers pick it up by a pin bump in their own order
(Maana: inside MAANA-QDA-56).

### Goal and expected outcome

MAANA-QDA-56 (operator, 2026-11-04) asks for a chat thread of at least half the viewport at 375 px. After moving Maana's
own actions out of their row, the thread is still short of that; the remaining lever is a composer row that holds only
the model picker. In `ChatComposer` `layout="compact"` (`src/chat/ChatComposer.jsx`, the context row around lines
109-112) the `actions` sit in a context row of their own even when `context` is empty, so on a phone the picker takes a
full row of about 35 px above the input. Expected outcome: in the compact composer, when there is no context, the
actions sit in the input row next to Send/Stop, and the separate row disappears.

### Settled decisions (operator, 2026-11-04)

1. Compact layout, no `context`: `actions` render inside the input row, before Send/Stop; no context row is rendered.
2. Compact layout with `context`: unchanged (context row with the actions at its end).
3. The `standard` layout, the notice and the usage-limit rows are unchanged.
4. The input keeps priority on narrow screens: the actions do not wrap and do not push Send/Stop out of the row at
   320 px.

### Non-goals

`ChatWorkspace` props and the model picker itself, host app code (Maana's pin bump and measurement belong to
MAANA-QDA-56), the thread height rule in `ChatWorkspace`.

### Risks

Every consumer that uses the compact composer without context gets the new arrangement with its next pin bump; the
input must stay usable at 320 px.

### Required tests to write

Compact without context: actions are inside the input row and no context row exists; compact with context: the context
row with its actions as before; standard layout unchanged.

## Part B — Implementation map (implementer)

To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-11-04 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce), answer "Freigeben" to the question whether the model picker may move into
the input row through a ui-core change. Tier 3: all lenses, `ui_reviewer`. Release a new version; verify it with
`npm view` before MAANA-QDA-56 pins it.
