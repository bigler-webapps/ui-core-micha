# WORK ORDER MSG-6j — poll option row collides with its vote count under a tight bubble width

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is
not addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not
shell out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked
**directly via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags
`--skip-git-repo-check` and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a
positional argument from this file. Fall back to direct Claude implementation only on Codex quota /
rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Operator screenshots from `jg-ferien` production, 2026-08-04:
a poll option's label text runs directly into its vote-count/percent text with **zero visible gap**
("soidfsdoöifn**2** (100 %)" — the bold "2" is the vote count, not part of the option text). The
percentage math itself is confirmed correct once both votes had landed (a second screenshot showed
"2 (100 %)" / "1 (50 %)" as expected) — **this WO is width/layout only, no data or percentage logic
change.**

## TIER
Tier 2 — `ui-core-micha` is shared-core, which forces Tier 2 regardless of change size per AGENTS.md.
Independent `reviewer` mandatory. No `sec_reviewer` needed (pure layout, no data/permission surface).

## ROOT CAUSE — verified against the landed code (`src/messaging/PollCard.jsx`, `MessageBubble.jsx`)

`MessageBubble.jsx:100` sizes every message bubble as `width: 'fit-content', maxWidth: 'min(75%, 680px)'`
— it shrinks to exactly the width its content needs, with **no minimum floor**. Inside a poll,
`PollCard.jsx`'s `optionLabel()` renders each option's label and its `resultText` ("{count} ({percent}
%)") in a `Stack direction="row" justifyContent="space-between"` with **no `spacing`/`gap`** of its
own (`:112-116`). `justifyContent: 'space-between'` only inserts space when the row has *leftover*
width beyond what its children need — but here the bubble's own width is derived FROM this exact
content (`fit-content`), so by construction there is no leftover space, and space-between reserves
**zero minimum gap**. The label (`Typography noWrap`, which MUI resolves to
`overflow:hidden;textOverflow:ellipsis;whiteSpace:nowrap`) shows its full text without truncating
because the row isn't actually being squeezed narrower than content — it's exactly content-width, so
label and result text end up flush against each other with nothing between.

Two independent, additive fixes, both needed (confirmed by re-reading the code, not guessed):

1. **Give the label/result row an explicit minimum gap that `space-between` cannot collapse to zero.**
   Add `spacing={1}` (or equivalent `gap`) to the `Stack direction="row" justifyContent="space-between"`
   at `PollCard.jsx:113` (inside `optionLabel()`'s `richLabel`). MUI's `Stack` applies its `spacing`
   prop as margin between children, independent of `justifyContent` — this guarantees a floor gap
   even when the row has no leftover width to distribute.
2. **Give the poll card itself a sensible minimum width** so a short question/option set doesn't pull
   the whole bubble in tighter than is comfortable to read (the operator's "insbesondere in der Breite
   mehr Platz" — more room specifically in width). Add a `minWidth` to the `Paper` at
   `PollCard.jsx:123` (e.g. `minWidth: 280` — pick a value that reads comfortably at this repo's base
   font size; check against `MessageBubble.jsx`'s own `maxWidth` ceiling so a minWidth poll never
   exceeds the bubble's own max on a narrow viewport — clamp or use `Math.min` logic if needed, verify
   in the browser at a mobile width e.g. 375px, not just desktop).

## NON-GOALS / DO NOT TOUCH

- Do not touch percentage/vote-count computation (`respondentCount`, `optionLabel`'s `percent`
  calculation) — confirmed correct by the operator's second screenshot; this WO is layout-only.
- Do not touch `MessageBubble.jsx`'s own `maxWidth`/`width: fit-content` — other message kinds
  (plain text, attachments, announcements) rely on that tight fit; scope the fix to the poll's own
  minimum, not a global bubble-sizing change.
- Do not touch `applyOptimisticVote`, `castPollVote`, or any vote-casting logic.

## RISKS

- A `minWidth` on the poll `Paper` that isn't reconciled against `MessageBubble`'s `maxWidth` could
  overflow the bubble container on a narrow mobile viewport (375px) if chosen carelessly — verify at
  that width explicitly, not just desktop, per the WO's own note in `PollCard.jsx`'s existing
  accessibility comment about width assumptions.
- `spacing` on a `Stack` that already has other margin/padding assumptions elsewhere in the row could
  shift alignment of the progress bar below it (`LinearProgress` sits in the same parent `Stack`,
  outside the row) — verify visually that the bar still aligns with the row above it.

## REQUIRED TESTS TO WRITE

Narrow, matching this repo's existing `PollCard` test conventions — extend
`tests/messagingPollRendering.test.jsx` (the file covering poll rendering today) rather than
inventing a new file. `tests/messagingMsg6i.test.jsx` and `messagingMsg6g.test.jsx` are the other two
poll-adjacent suites; skim them for the established assertion style before writing new tests.

1. A poll with a short question/options renders its `Paper`/container at at least the chosen minimum
   width (assert a computed style or a `sx` prop value — whatever this repo's existing width
   assertions already use elsewhere, e.g. `MessageBubble`'s own tests, follow that pattern).
2. The label/result-text row has non-zero spacing between its two children even when both are their
   natural (non-ellipsized) width — a regression test for the exact reported bug: render a poll with
   one option's label + result text combined width close to the container's available width, assert
   there is a rendered gap (e.g. via a wrapping element's `gap`/margin style, or simply that the
   two `Typography` nodes are not adjacent DOM siblings with zero computed margin — use whatever
   assertion style this repo's other spacing regression tests already use, e.g. MSG-6i's own
   `getComputedStyle`-based test for `Thread.jsx`'s flex fix, same technique).

**Non-vacuity:** test 2 must fail against the pre-fix code (space-between with no `spacing`) — verify
that before considering this WO done.

## VERIFICATION

Live browser check at both a normal desktop width and a 375px mobile width (this repo's own
established convention per prior MSG-6 WOs) with a real poll: two options with realistic-length text,
confirm the label and vote-count/percent never visually touch, and the card is not uncomfortably
narrow for a two-option poll.

## TARGET REPO

`C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`, no `develop` in this repo).

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`). Work order:
> `work-orders/MSG-6j.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> `PollCard.jsx`'s option row uses `justifyContent: space-between` with no `spacing`, inside a message
> bubble that is `width: fit-content` — so there is never leftover space for space-between to
> distribute, and the option's label text runs directly into its vote-count/percent text with zero
> gap. Fix: add `spacing` to that row, and add a sensible `minWidth` to the poll's `Paper` (reconciled
> against `MessageBubble.jsx`'s `maxWidth: min(75%, 680px)` ceiling, verified at 375px too). No
> percentage/vote-count logic changes — that part is already correct.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
