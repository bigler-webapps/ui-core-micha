# UCM-CHAT-14 — Chat layout isolation: typing relayouts only the composer

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/chat`) affecting every consuming app's chat layout.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Builds on:** UCM-CHAT-13 (4.26.0, the composer-local draft).
**Consumers:** maana (where it was measured), cockpit, hram, survey_app with their next pin bump.

### Goal and expected outcome

After UCM-CHAT-13 a keystroke no longer re-renders the workspace (staging, Maana Imara_v1 chat, ~50 turns, permissions
panel open: 0 DOM mutations across 16 keystrokes), but the time per keystroke is unchanged: median 811 ms, max
1,294 ms. The cost is browser layout: after a value change, reading the textarea's `scrollHeight` (the composer's
autosize does this) alone takes 280-500 ms, because the change invalidates the layout of the whole page, about 15,000
visible elements (every turn with its host extras, plus the side panel). The operator (2026-10-26) asked for a
complete decoupling. Expected outcome: a keystroke relayouts the composer only; typing stays within one frame however
long the chat is.

### Settled decisions (operator, 2026-10-26)

1. **Layout isolation:** the thread's scroll container, the composer and the side panel are separate layout
   boundaries (CSS containment, for example `contain: layout paint` or `contain: strict` on the fixed-size regions),
   so a size or content change inside the composer cannot invalidate the thread's or the panel's layout.
2. **Off-screen turns are skipped:** each turn in the thread gets `content-visibility: auto` with an intrinsic size
   placeholder (`contain-intrinsic-size: auto <estimate>`), so the browser lays out and paints only turns near the
   viewport.
3. **Measured acceptance:** on Maana staging, the same chat and method as the baseline (native value setter plus
   input event, timed around `dispatchEvent`, 16 keystrokes), the median synchronous time per keystroke is below 16 ms.
4. A virtualised thread (rendering only visible turns) is **not** part of this order; it is a separate step only if
   1-3 do not reach the target.

### Risks to handle

`content-visibility` changes how `scrollHeight` is estimated: keep the existing scroll pinning (stay at the bottom
while an answer streams, keep position when older turns load at the top) exact; in-page search and keyboard focus must
still reach off-screen turns (the browser handles `content-visibility: auto` for both; verify). The composer's growth up
to its maximum rows and the compact/standard layouts stay unchanged.

### Scope and acceptance

`src/chat/ChatWorkspace.jsx` (grid regions), `src/chat/ChatThread.jsx` (turn wrapper, scroll container),
`src/chat/ChatComposer.jsx` only if its region needs the boundary; their tests; CHANGELOG, a minor version. Accepted
when decision 3's measurement holds on Maana staging after the pin bump, and the scroll behaviour of decisions'
risks is unchanged.

### Non-goals and do-not-touch

Host slot APIs, the composer-local draft from UCM-CHAT-13, Markdown rendering, the model picker, visual appearance.

### Required tests to write

The thread container and each turn carry the containment/`content-visibility` styles (jsdom cannot measure layout,
so assert the styles); scroll pinning while streaming and position keeping on loading older turns behave as today;
compact and standard layouts unchanged. The real measurement is the acceptance in decision 3 (recorded, not a unit
test).

## Part B — Implementation map (implementer)

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-26 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`; no `sec_review`. Publish
a minor release and report the version; the Maana QDA session bumps the pin and the Expertenchat re-measures on
staging (decision 3).
