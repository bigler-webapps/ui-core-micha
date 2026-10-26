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

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. You are the single
implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory. You own exactly
`src/chat/ChatWorkspace.jsx`, `src/chat/ChatThread.jsx`, `src/chat/ChatComposer.jsx` (only if its region needs the
boundary), `src/chat/kitSxRegistry.js` and new `tests/chatLayoutIsolation.test.jsx`. No other file (no README,
CHANGELOG, package files, lockfile, register, `dev/**`, no new exports in `src/entries/*.js`).

### Seams (verified against `main` at c1c359e, 4.26.0)

- `src/chat/ChatWorkspace.jsx`:
  - `:508` the root grid (`display: 'grid'`, columns list | main | optional side panel, `height: '100%'`,
    `overflow: 'hidden'`);
  - `:509` the list column;
  - `:510` the main column `Stack` with the header (`:511-518`);
  - `:521` `<ChatThread …>`;
  - `:522-524` the archived caption, `renderComposerExtra` and the long-chat Alert;
  - `:525-532` `<ChatComposer key=… …>`;
  - `:540` the wide side panel `Box` (`borderLeft`, `minHeight: 0`, `overflow: 'auto'`);
  - `:541` the narrow side panel `Drawer`.
- `src/chat/ChatThread.jsx`:
  - `:81` streaming pin: `end.current.scrollIntoView({ block: 'end' })` while `pinned`;
  - `:84-88` older-turn position keeping through `scrollTop += scrollHeight - heightBeforeOlder` in a
    `useLayoutEffect` on `turns[0]?.id`;
  - `:90-96` `loadOlder` records `heightBeforeOlder`;
  - `:103-107` the scroll container (`role="log"`, `onScroll` sets `pinned` from `scrollHeight - scrollTop -
    clientHeight < 80` and loads older turns near the top; `sx={{ minHeight: 0, flex: 1, overflowY: 'auto', … }}`);
  - `:119` each turn wrapper `<Box key={turn.id ?? index} sx={{ mb: 3 }}>`;
  - `:133` `<Answer …>`.
- `src/chat/ChatComposer.jsx`:
  - the compact root `CHAT_COMPOSER_COMPACT_ROOT_SX` and the standard root `Stack` sx;
  - the MUI multiline `TextField` (`maxRows` 5 or 6), whose `TextareaAutosize` reads the textarea's `scrollHeight` on
    each value change. That read forces the page layout.
- Exported sx objects are registered in `src/chat/kitSxRegistry.js` (`createKitSxEntry(name, muiKey, sx, exportName)`);
  inline sx on registry-checked MUI components fails `themeCompleteness`.

### What to build

- **Layout boundaries.**
  - The thread scroll container gets size, layout and paint containment. It is a flex child with `minHeight: 0` whose
    size comes from its parent, so `contain: strict` is safe; if you use `contain: layout paint`, also make sure its
    size does not depend on content.
  - The composer region gets `contain: layout paint`. It must keep its intrinsic height, because it grows with the
    text up to `maxRows`, so do not add size containment there.
  - The wide side panel `Box` gets `contain: strict`; it is a grid cell with `minHeight: 0` and its own scroll.
  - Prefer exported, registered sx constants over inline objects where the component is registry-checked.
- **Off-screen turns skipped.** Each turn wrapper gets `content-visibility: auto` and
  `contain-intrinsic-size: auto <estimate>`, for example `auto 320px`. The `auto` keyword makes the browser remember
  the real size once a turn has rendered, so scroll heights stay stable after first view.
- **Scroll behaviour exact.**
  - Streaming keeps the bottom pin: the end sentinel stays outside the `content-visibility` wrappers, and the last turn
    is near the viewport, so it renders.
  - Loading older turns keeps the position. The layout effect measures `scrollHeight` before and after prepending; new
    turns above the viewport use the intrinsic estimate, which keeps the delta consistent. Check that nothing relies on
    the real heights of off-screen turns.
  - Do not set `overflow-anchor: none` anywhere.
- **No visual change.** Same spacing (keep `mb: 3` on turns), same borders, same compact and standard layouts.
  Containment must not clip anything that is visible today: focus rings, the popover, menus and tooltips render in
  portals, so they are not affected, but check box-shadows and focus outlines at region edges.

### Required tests (maps Part A)

`tests/chatLayoutIsolation.test.jsx` (`// @vitest-environment jsdom`, conventions of `tests/chatThread.test.jsx` and
`tests/chatWorkspace.test.jsx`). jsdom cannot measure layout, so assert styles through `getComputedStyle` or the
element's style/class as MUI emits it:
- the thread scroll container carries its containment;
- every turn wrapper carries `content-visibility: auto` and `contain-intrinsic-size`;
- the composer region and the wide side panel carry their containment.

Keep the existing scroll tests green: streaming pin and older-turn position keeping in `tests/chatThread.test.jsx` /
`tests/chatWorkspace.test.jsx`. Add one assertion that the streaming end sentinel is not inside a `content-visibility`
wrapper.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the test you wrote — nothing else. Do NOT install dependencies, touch a
lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`.
Do NOT `git add`/`commit`/`push`; leave every change uncommitted. Run only
`node_modules/.bin/vitest run tests/chatLayoutIsolation.test.jsx` from the target directory, once — your ONLY test run;
the Orchestrator's run and the independent review are the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-26 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`; no `sec_review`. Publish
a minor release and report the version; the Maana QDA session bumps the pin and the Expertenchat re-measures on
staging (decision 3).

Mapped by the Orchestrator (Claude) on 2026-10-26 against `main` at c1c359e (4.26.0).

Execution: codex/gpt-6-luna, one CLI dispatch, banner read back.

Review: lenses plus `ui_review`, one round. The Orchestrator does its own Envelope pass while they run.

Verification:
- the new test, all `chat*` tests, `checkKitIntegration`, `themeCompleteness`, `packageEntries` and tsc;
- the full suite in CI on `ci-test/UCM-CHAT-14`;
- a real-browser measurement in the dev harness. The new entry `#chat-long-thread` (Orchestrator-owned `dev/entries.jsx`)
  has 50 turns of long Markdown, a 60-switch side panel and answer chips, about 6,300 elements. It uses the staging
  method: native value setter plus input event, timed around `dispatchEvent`, 16 keystrokes.
  - Before (4.26.0), 3 runs: median 30-44 ms, max 63-67 ms.
- A visual check that nothing moved, at most two screenshots.

The staging acceptance (median below 16 ms on the Maana chat) is measured by the Expertenchat after the Maana pin bump.

Launch evidence: 2026-10-26, model gpt-6-luna, reasoning high, session 01a1766e-bbb5-7d33-b5d8-f8995541b68f; `RESULT: DONE`
(its test run: 4 passed). Assigned files only, no commit.

Orchestrator fix after the implementer. In the browser the chat opened about 8,000 px above the bottom: the initial
`scrollIntoView` landed on the 320 px estimates, and the turns near the viewport then grew to their real height. This
is a regression against today.
- Fix: a ResizeObserver on a plain content wrapper re-pins to the bottom while `pinned`.
- Verified that the chat opens at the last turn again; test added.
- Adapted the selector test to the wrapper.
- CHANGELOG, version 4.27.0.

Harness measurement (`#chat-long-thread`, dev build, staging method, 3 runs):

| | Before (4.26.0) | After |
|---|---|---|
| Keystroke, median | 30-44 ms | 6-7 ms |
| Keystroke, max | 63-67 ms | 9.5-13 ms |
| Forced layout read after a value change | — | ~1.1 ms |

Not verified in the browser:
- Position keeping when older turns load. The harness has no older pages, so this rests on the existing jsdom test and
  the unchanged layout effect.
- Keyboard focus and in-page search into skipped turns, which the browser handles natively.

Orchestrator's Envelope pass (before the lens results): complete; beyond scope only the re-pin observer, which the
pinning risk requires; nothing missing apart from the browser checks above.

Review, first pass: 3 raised, 1 accepted.
- Accepted, tests R2: the side-panel test now asserts the grid cell itself.
- Not accepted, `ui_review` U1 (re-pin after prepending in a short thread): it is equivalent to keeping the position,
  because the scroll is clamped to the same bottom.
- Not accepted, tests R1 (the real ResizeObserver cannot be simulated in jsdom): the browser behaviour was verified.

Single re-run: four clean. Tests R1 claimed the assertions read the exported constants; in fact they read computed
styles of the rendered nodes. Not accepted, not a blocker. The round is closed.
