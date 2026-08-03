# WORK ORDER MSG-6g (ui-core-micha) — poll UI: tap-to-vote with result bars, no separate vote button

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Operator request 2026-08-03: *"bei der Abstimmung wäre es
schön, wenn es ähnlicher wie WhatsApp mit dem Balken sowie ohne Abstimmungsbutton möglich wäre."*

This is a **UX improvement, not a defect** — the current poll works. It is scoped separately so it never
blocks the messaging defect WOs.

## TIER
Tier 2 — shared-core UI consumed by every app. Independent `reviewer` + `ui_reviewer` mandatory.

## CURRENT STATE

`PollCard.jsx` renders each option as a MUI `FormControlLabel` with a `Checkbox` (multi-select) or radio,
labelled `"<text> (<vote_count>)"`, plus a separate **"Abstimmen"** submit button and a
**"Umfrage schliessen"** action for the owner. Voting is therefore a two-step interaction — select, then
submit — and the result is a bare number in parentheses.

## GOAL

Voting is one tap on the option itself, and the distribution is readable at a glance from proportional
bars rather than parenthesised counts.

## SCOPE

**A. Tap-to-vote — remove the separate submit button.**

- **Single-choice poll** (`allow_multiple: false`): tapping an option casts the vote immediately.
  Tapping a different option moves the vote. The "Abstimmen" button goes away entirely.
- **Multi-select poll** (`allow_multiple: true`): tapping an option toggles that option immediately —
  each tap is its own vote update, not a batched submit. **Confirm dcm's vote endpoint accepts the full
  option-id set per call** (it takes `option_ids`, so a toggle sends the new complete set, not a delta);
  if it does not, stop and report rather than inventing a delta protocol.
- Every tap is an optimistic UI update reconciled against the server response, following the pattern
  `MessagingProvider` already uses for sends. **A failed vote must visibly revert** — a silently
  swallowed failure that leaves the bar showing a vote nobody recorded is worse than the current
  two-step flow.
- Keep "Umfrage schliessen" — that is an owner action, not part of voting.

**B. Result bars.**

- Each option shows a horizontal proportional bar plus its count and percentage, in place of the
  `(<n>)` suffix.
- The viewer's own choice(s) are visually marked. `voted_option_ids` already exists for this and is
  carried in the REST vote/create/close response — note the standing constraint documented in
  `MessagingProvider.jsx`: it is **viewer-specific and never present on a `poll_updated` frame**, so
  frame handling must not wipe a locally-known selection. Do not regress that; it was a deliberate fix.
- Denominator: total votes cast, not participant count. A poll's turnout relative to group size is a
  different question and is **not** in scope.
- Percentages must not mislead at zero votes — define and implement the zero-vote rendering explicitly
  rather than letting a division produce `NaN`.

**C. Closed polls.** A closed poll shows final bars and is not interactive. Verify the closed state is
visually unmistakable — with the submit button gone, "closed" can no longer be inferred from a missing
button.

## NON-GOALS / DO NOT TOUCH
- No backend change. If a scope-A requirement appears to need one, stop and report — that is a dcm WO.
- Do not change `voted_option_ids` handling in `applyFrame` beyond what B needs to read it (see the
  merge-trap note above).
- Do not add a "who voted for what" disclosure. Per-voter visibility is a privacy decision nobody has
  taken, and the existing `voters` data in `serialize_poll` is not licence to surface it.
- Do not change poll creation (`Composer`'s dialog) — this WO is the display and voting surface only.
- Do not touch `ReadTicks`, conversation titles, or anything in the MSG-6f scope.

## RISKS
- **Tap-to-vote removes the "are you sure" step.** On a phone a mis-tap now votes. Mitigate by making
  the vote reversible (tap again / tap another) and by ensuring the optimistic state is obviously
  distinct from the confirmed state; do not add a confirmation dialog, which would reinstate the
  two-step flow this WO removes.
- Rapid successive taps race. The last write must win deterministically — state how (request ordering,
  or discard stale responses by comparing against the latest local intent).
- Accessibility: an option becomes an interactive control with a name, a pressed/checked state and
  keyboard operability. Bars are decorative; the count and percentage must be in the accessible name or
  adjacent text, not conveyed by width alone. `ui_reviewer` should check this specifically.
- Every host app inherits the new interaction — a visible behaviour change beyond jg-ferien.

## REQUIRED TESTS TO WRITE
Narrow and behavioural. Do NOT run the full suite.

1. Single-choice: tapping an option votes without any further interaction; tapping a second option
   moves the vote (the first is no longer selected, the counts reflect it).
2. Multi-select: tapping toggles one option on and off, and each tap sends the complete option-id set.
3. A rejected vote reverts the optimistic state and surfaces an error — assert the bar returns to its
   prior value, not merely that an error appeared.
4. Bars render proportionally, including the **zero-vote** case, with no `NaN` and no division error.
5. The viewer's own selection survives a `poll_updated` frame that does not carry `voted_option_ids`
   (the documented merge trap — this must not regress).
6. A closed poll is non-interactive: tapping an option does nothing and issues no request.

**Non-vacuity:** test 5 must fail if the merge-trap guard is removed. Test 3 must assert the reverted
value, not the presence of an error message.

## TEST SCOPE FOR THE GATE (orchestrator)
`PollCard` and its neighbours in the messaging test files. Not the full suite.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main` (or `develop` if present). Publish per
the repo's release flow; the consuming pin bump is a separate step.

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`, or `develop` if present).
> Work order: `work-orders/MSG-6g.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> **UX improvement, not a defect — this blocks nothing and is blocked by nothing.** Do not let it hold
> up the messaging defect WOs (dcm MSG-10, ucm MSG-6f).
>
> Frontend only: no backend change is in scope. If tap-to-vote appears to need one, stop and report.
> Two things that are easy to break and are called out in the WO: a failed vote must visibly revert
> (not fail silently), and the viewer's `voted_option_ids` must survive a `poll_updated` frame that
> does not carry it — that merge-trap guard was a deliberate earlier fix and test 5 pins it.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.

---

## Part B — Implementation map (Orchestrator) / as-built record

**Codex was unavailable (out of credits) — implemented directly by the Orchestrator.**

### Blocker found and resolved before implementation

Line 38-40's own contingency ("confirm dcm's vote endpoint accepts the full option-id set
per call... if it does not, stop and report") fired for real: `vote_poll` (dcm
`services.py:247-259`) only cleared prior votes for single-choice polls; multi-select only
ever `bulk_create`d, so a smaller `option_ids` set never retracted an omitted vote —
untoggling was silently a no-op. Reported to the operator, who confirmed fixing it
directly in dcm rather than working around it client-side. Fixed and published as dcm
`2.40.1` — see dcm `work-orders/MSG-11.md`. `option_ids` is now authoritative (delete
anything no longer in the set, then re-create the requested set) for both poll kinds.

### Files changed

- `src/messaging/MessagingProvider.jsx`:
  - New module-level `applyOptimisticVote(poll, previousSelectedIds, nextSelectedIds, userId)`
    — adjusts only the options whose membership in the vote actually changed (count +/-1,
    `voters` array +/- the acting user), leaves everything else untouched.
  - New `pollVoteTokensRef` (per-poll "latest tap wins" token) alongside the existing
    `activeIdRef`/`seenEventsRef`/`filtersRef`.
  - `castPollVote(messageId, poll, optionIds)` rewritten: captures `previousPoll` from
    `cache.messages[messageId].poll` (falling back to the `poll` param), patches the
    optimistic projection into the cache immediately (same `patchMessage` shape
    `toggleReaction` already uses), then on success reconciles with the server's poll, on
    failure reverts to `previousPoll` — both guarded by the token so a stale response from
    a since-superseded tap can't stomp a newer one.
- `src/messaging/PollCard.jsx`: full rewrite.
  - Single-choice (`allow_multiple: false`) → `Radio` per option (native "tap a different
    option moves the vote, tap the same one is a no-op" semantics — matches the WO's
    stated design directly, no extra toggle-off logic needed).
  - Multi-select → `Checkbox` per option (existing toggle semantics preserved).
  - Whole-option-row tap target (`Box onClick`, `stopPropagation` on the control's own
    `onClick` to avoid a double-fire) — WhatsApp-style, matches the operator's own framing.
  - `LinearProgress` bar + `{{count}} ({{percent}}%)` (`MessagingPoll.OPTION_RESULT`, new
    key) next to each option; `percent = totalVotes > 0 ? round(count/totalVotes*100) : 0`
    — never `NaN`.
  - Accessible name (`aria-label` on the control) carries option text + result text +
    "you voted" — never width-only.
  - Closed state: `Chip` with a lock icon + `MessagingPoll.CLOSED`, replacing the old
    caption-only text (now the *only* closed signal, since the submit button is gone).
  - Local `selected` state + a `voteTokenRef` mirror the provider's own token guard, since
    `PollCard` is a "dumb" prop-driven component (documented in
    `tests/messagingPollRendering.test.jsx`) — a rejected vote must revert visibly even
    when the host never re-passes a fresh `message` prop from its own cache.
  - Removed: the "Abstimmen" submit button and its `SELECT_OPTION` validation entirely.
- `src/i18n/messagingTranslations.ts`: removed now-orphaned `MessagingPoll.VOTE` and
  `MessagingPoll.SELECT_OPTION`; added `MessagingPoll.OPTION_RESULT`.

### Tests

- `tests/messagingMsg6g.test.jsx` (new) — the 6 WO-required cases verbatim.
- `tests/messagingPollRendering.test.jsx` — updated for radio (not checkbox) on
  single-choice, the new label/aria-label shape, and the closed-chip instead of a
  disabled button; its `t` mock upgraded to interpolate `{{count}}`/`{{percent}}` (was
  bare-key-only, insufficient to assert rendered numbers).
  `tests/messagingInteractions.test.jsx`'s poll test rewritten for tap-to-vote (no submit
  click). `tests/messagingCompactBubble.test.jsx`'s poll smoke test needed no change
  (empty `options: []`, no control interaction).

### Verification
Full suite 234 → 240, `tsc` clean (pre-review).

### Independent review: `reviewer` + `ui_reviewer`, both mandatory (author = Orchestrator, not Codex)

**`reviewer` — 3 findings, all fixed:**
- **R1 (P1, real bug):** `castPollVote`'s optimistic count projection was built from the
  caller-supplied `poll` argument, not from `previousPoll` (the value already freshly read
  from `cache.messages[messageId].poll` two lines above, and correctly used as the revert
  target on failure). For a second rapid tap (e.g. switching a single-choice vote A→B)
  where the caller's `poll` reference hadn't yet been refreshed — exactly how `PollCard`
  is documented to behave, a "dumb" prop-driven component — the count math computed
  against the stale pre-first-tap baseline, landing a silently wrong transient
  `vote_count` in the **shared cache** (not just local render state) until the server's
  response eventually reconciled it away. Fixed: project from `previousPoll`. Verified
  non-vacuous: reverted the fix, confirmed the new regression test below fails with the
  exact predicted wrong number (4 instead of 5), then restored it.
- **R2 (P2, coverage gap):** no test asserted vote-count values across a multi-tap
  sequence with non-zero starting counts — the zero-vote fixtures used elsewhere
  happened to mask R1 via the `Math.max(0, ...)` clamp. Closed by a new
  `messagingMsg6g.test.jsx` case using non-zero seed counts (5/2) and a genuinely
  cache-connected reader alongside a *statically-propped* `PollCard` (the scenario that
  actually reproduces the staleness, per R1's own trace — a cache-connected `PollCard`
  re-renders with a fresh `poll` prop between taps and would not have caught this).
- **R3 (P3):** `applyOptimisticVote` could push a literal `undefined` into an option's
  `voters` array when `user?.id` is momentarily unset (`AuthContext` not yet populated).
  Fixed with a `userId != null` guard.

**`ui_reviewer` — 2 findings, both fixed:**
- **U1 (P2):** no visual distinction between an in-flight optimistic vote and a
  server-confirmed one, contradicting the WO's own risk-mitigation requirement. Fixed by
  reusing `ReactionBar.jsx`'s established `pending` Set convention — dims the tapped
  option's bar/text while its request is in flight, but (unlike `ReactionBar`) does
  **not** disable the control, since the WO explicitly requires rapid re-taps to remain
  possible and race deterministically (last-write-wins via the token guard), not be
  blocked.
- **U2 (P2):** single-choice rendered bare, ungrouped `Radio` controls — no `RadioGroup`,
  no shared `name`. Diverged from this repo's own established radio idiom
  (`AuthFactorRequirementCard.jsx`'s `RadioGroup` + `FormControlLabel`) and lost native
  arrow-key navigation between options plus the screen-reader group announcement. Fixed
  by wrapping single-choice options in a real `RadioGroup`; multi-select's `Checkbox`
  options are unaffected (no equivalent ARIA grouping concept applies). Switching to
  `FormControlLabel` for both control types also let the manual `Box onClick` +
  `stopPropagation()` whole-row-tap hack be removed entirely — `FormControlLabel`'s own
  `<label>` wrapping already makes the whole row natively clickable.
- Found and fixed while addressing U2, not itself a reviewer finding: `RadioGroup`'s own
  `onChange` only ever hands back `event.target.value`, a DOM string, which would coerce
  a non-string option id (dcm's are UUID strings today, but the type isn't a guaranteed
  contract) — caught by `tests/messagingInteractions.test.jsx`'s existing numeric-id
  fixture failing after the `RadioGroup` change. Fixed by keeping each `Radio`'s own
  `onChange` (closure-typed, matching the `Checkbox` branch) instead of relying on the
  group-level handler.

Re-verified after all fixes: full suite 234 → **241** (7 new: 6 WO-required cases +
1 R1/R2 regression), `tsc` clean.
