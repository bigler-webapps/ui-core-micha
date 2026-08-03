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
