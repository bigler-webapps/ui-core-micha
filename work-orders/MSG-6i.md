# WORK ORDER MSG-6i (ui-core-micha) — attachment tile size, poll spacing/denominator, wider emoji picker

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Operator polish requests 2026-08-03, gathered in a
requirements round after MSG-6h shipped; four independent, small scopes bundled the same way
MSG-6f bundled A/B/C.

## TIER
Tier 2 — shared-core UI consumed by every host app. Independent `reviewer` + `ui_reviewer` mandatory
(scope C changes poll math, not just styling).

## SCOPE

**A. Attachment tile: 64px → 120px.**

`AttachmentList.jsx`'s tile `sx={{ width: 64, height: 64, ... }}` (both the `ButtonBase` and its
internal thumbnail `Box component="img"`, which is `width: '100%', height: '100%'` and inherits).
Change both dimensions to `120`. Check the non-image tile's icon/caption layout still reads well at
the larger size (currently sized for 64px — `InsertDriveFileOutlinedIcon fontSize="small"` and a
`caption` typography may look sparse/small inside a 120px box; consider `fontSize="medium"` or larger
if it looks disproportionate — operator did not specify, use judgement, flag if genuinely unsure).
`Stack direction="row" flexWrap="wrap"` spacing stays as-is unless the larger tiles visibly break
wrapping at typical bubble widths.

**B. Poll card: more breathing room, not a wider bubble.**

Operator, verbatim (after seeing a screenshot of the current cramped layout — checkbox, option text,
and percentage squeezed onto one tight line, thin bars close to the text, minimal gap between options):
*"Nicht generell breiter, aber luftiger."* (Not generally wider, but airier.) This is **not** scope A
of a width change — the poll's outer bubble width stays exactly as-is (still shares
`MessageBubble.jsx`'s `maxWidth: min(75%, 680px)` with every other message type). Increase internal
spacing in `PollCard.jsx`: the `Stack spacing={0.75}` wrapping the whole card, the per-option
`Stack direction="row" spacing={0.5}` (control + label), and the `LinearProgress`'s `height: 6` are
the likely levers — raise spacing values and/or bar height/thickness so the card reads as roomier.
No prescribed exact values; operator did not send further numeric guidance beyond the "airier, not
wider" direction — use reasonable judgement (e.g. spacing bumped by ~50%, bar height 8-10px) and
**flag this specific change for a live screenshot check before considering it closed** — same
disclosed-limitation pattern as MSG-6h's reaction-spacing fix (no staging credentials this round).

**C. Poll percentage denominator: respondents of this poll, not sum of votes cast.**

**This reverses an explicit non-goal from `MSG-6g`'s own envelope**, confirmed deliberately by the
operator in this round (not an oversight): MSG-6g stated *"Denominator: total votes cast, not
participant count. A poll's turnout relative to group size is a different question and is not in
scope."* — operator's correction: for a **multi-select** poll, summing `vote_count` across options can
exceed the number of people who actually answered (one person can vote for several options), so a
per-option percentage computed against that inflated sum reads as misleadingly low and the bars
don't sum to a sensible 100%. The new denominator: **the number of distinct people who cast at least
one vote in this poll** — not total conversation participants (an un-started, never-voting group
member should not silently deflate everyone else's percentages further).

Compute this **client-side, no backend change**: `serialize_poll`'s existing `option.voters` arrays
(already present, already used for the viewer's-own-vote marking) already carry every voter's id per
option — the union of all options' `voters` arrays, deduplicated, is exactly "everyone who answered
this poll." Replace `PollCard.jsx`'s current
`totalVotes = options.reduce((sum, option) => sum + (option.vote_count ?? option.voters?.length ?? 0), 0)`
with a respondent count derived from the union of `option.voters` across all options (a `Set` of voter
ids). **Zero-vote rendering must stay `NaN`-free** (existing guard, do not regress it) — zero
respondents still means 0% for every option, not a division error.

**D. Composer emoji picker: its own, wider curated list, decoupled from reaction quick-picks.**

`Composer.jsx:144` currently reuses `QUICK_EMOJIS` from `ReactionBar.jsx` (`['👍', '❤️', '😂', '🎉',
'👀']`, 5 entries) — the same tiny set meant for quick message reactions, not for composing free-form
text. Operator confirmed direction after discussion: mobile users already have a full native emoji
keyboard (no in-app work needed there); desktop users lack an obvious equivalent, so a **wider curated
grid (~20-30 common emojis)** in the Composer's own picker adds real value. **Not** a full
search-based picker (out of scope — meaningfully more engineering for a need mobile already covers).

Define a new, separate constant (e.g. `COMPOSER_EMOJIS` in `Composer.jsx` itself, or a shared
`emojiSets.js` if that reads cleaner) with ~20-30 common emojis, grouped loosely by theme (smileys,
gestures, hearts, objects/travel — operator did not specify an exact list; use a reasonable, common
default and flag it as easily adjustable). Render as a grid inside the existing `Menu` (currently a
plain vertical `MenuItem` list — at 25-30 entries that would be a very long scroll; switch to a
wrapping grid layout, e.g. a `Box` with `display: grid` or `flexWrap`, inside the `Menu`). Keep
`ReactionBar.jsx`'s own `QUICK_EMOJIS` untouched (5, curated, unchanged) — reactions stay small and
fast, this is a Composer-only change.

## NON-GOALS / DO NOT TOUCH
- Do not touch `ReactionBar.jsx`'s own reaction UI or its 5-emoji `QUICK_EMOJIS` — scope D adds a
  second, separate, larger set for the Composer only.
- Do not widen the message bubble's `maxWidth` (`MessageBubble.jsx`) — scope B is internal spacing
  only, confirmed explicitly by the operator.
- Do not touch `MessageBubble.jsx`'s reaction-overlap fix from MSG-6h, or the lightbox/context-menu
  logic from MSG-6h — this WO only resizes the tile (scope A), doesn't change its interaction model.
- No backend change for scope C — the data needed already exists in the current API response.
- Do not build a full emoji search/picker component (scope D) — a curated grid only.

## RISKS
- Scope C is a **behaviour change visible to every host app** the moment this version is consumed —
  a poll's displayed percentages will differ from before for any multi-select poll where the same
  person voted for multiple options. State this plainly; it is the operator's own explicit correction,
  not a silent reinterpretation.
- Scope A's larger tile changes vertical rhythm inside a message bubble containing attachments —
  check it doesn't visually crowd the meta row (timestamp/read-ticks) directly below it.
- Scope B and D have no prescribed exact values — implement a reasonable default, disclose the
  specific choices made (spacing multipliers, the exact emoji list) in the completion note so the
  operator can request a numeric tweak without re-deriving what was chosen.

## REQUIRED TESTS TO WRITE
Narrow and behavioural. Do NOT run the full suite.

1. Attachment tile renders at 120×120 (image and non-image cases).
2. Poll respondent-count denominator: a multi-select poll where one voter voted for two options must
   show percentages based on the **respondent count** (e.g. 1 respondent → both their chosen options
   show 100%, not summed-and-diluted), not `sum(vote_count)`. This must **fail against the current
   `sum(vote_count)` code** — prove it with a case where the two differ (multi-select, one voter,
   two options voted).
3. Poll respondent-count denominator: the existing single-choice zero-vote case still shows 0%, no
   `NaN`, no regression (reuse/extend the existing MSG-6g zero-vote test's assertion shape).
4. Composer emoji picker: opening it shows more than 5 emoji options (the expanded set, not
   `ReactionBar`'s `QUICK_EMOJIS`); selecting one still inserts it at the cursor position (existing
   `insertEmoji` behaviour, unchanged — just fed from the new list).
5. `ReactionBar`'s own picker is unaffected — still exactly its original 5 `QUICK_EMOJIS` (regression
   guard that scope D didn't leak into scope-unrelated reaction UI).

## TEST SCOPE FOR THE GATE (orchestrator)
Attachment-, poll-, and Composer-adjacent messaging test files. Not the full suite.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main`. Publish per the repo's release flow;
the jg-ferien pin bump is part of THIS WO's completion, not a deferred step (standing correction this
session: publish alone is not delivery).

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`). Work order:
> `work-orders/MSG-6i.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> Four independent scopes: (A) attachment tile 64px→120px in `AttachmentList.jsx`. (B) `PollCard.jsx`
> internal spacing increased ("airier, not wider" — bubble maxWidth unchanged) — no exact numbers
> given, use judgement, flag for a live screenshot check. (C) poll percentage denominator changes from
> `sum(vote_count)` to the count of distinct respondents (union of all options' `voters` arrays,
> client-side, no backend change) — **this deliberately reverses an explicit MSG-6g non-goal**, operator
> re-confirmed. (D) Composer's emoji picker gets its own ~20-30-entry curated grid, decoupled from
> `ReactionBar`'s 5-entry `QUICK_EMOJIS` (untouched) — no full search picker, mobile already has a
> native one.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
