# THEME-7 — Guidance: a series slot that collides with an app's own accent

## Part A — Envelope

**Goal.** Give consuming apps a documented answer for the case where a baseline
`dataSeries.categorical` slot sits too close to something the app itself owns — the app's
accent, or one of its domain identity colours. Today the baseline offers six series colours
and no guidance for that collision, so each app rediscovers the problem on its own.

**Why — a measured case, not a hypothesis.** During hram's Imara design-language work
(hram `IMARA-2`, frozen 2026-08-13) two collisions were measured against the app's own
values, using Lab ΔE with the operator's own rejected candidate pair as the calibration
floor (that pair sat at ΔE 16.6 and was judged "not tellable apart"):

- baseline series 1 `#3D5A99` versus hram's chosen primary `#2F4F96` → **ΔE 7.2**, the
  tightest pair in that app's whole system; a series line beside a primary button reads as
  the same colour.
- baseline series 3 `#2E8F8A` versus hram's DALYs identity `#1F7A72` → **ΔE 8.3**; same
  hue (a −28.7 vs −27.8), one lightness step apart (L 54 vs 46).

hram resolved both app-side: slot 1 dropped entirely (both replacement candidates measured
worse elsewhere — a neutral slate landed ΔE 5.0 from the shared `stale` fill, a muted green
ΔE 15.5 from the app's own olive slot), and slot 3 replaced by a navy, which simultaneously
restored the dark blue the first removal had taken away. The nine remaining slots plus an
overflow grey covered the app's needs.

**This is not a defect report against the baseline.** For an app whose primary is not a
muted indigo and which has no teal domain identity, series 1 and 3 are correct and useful.
What is missing is the *guidance*, and the observation that the baseline's own muted,
cool-leaning character makes a collision with a tastefully chosen accent more likely rather
than less — apps that like this palette tend to pick accents from the same region.

**Scope.**

1. `DESIGN.md` — a short subsection under the data-colour principle: how to check a chosen
   accent against the series palette (measure, do not eyeball; a usable threshold with the
   calibration above named as its provenance), and what to do when it collides — drop the
   slot rather than nudge it, because a nudged slot stays confusable while a dropped one is
   simply absent.
2. The same note in the theme package's own documentation where `dataSeries.categorical` is
   described, so it is found by someone reading the token rather than the design doc.
3. **Decide and record**: whether the baseline should additionally *ship* anything —
   candidates being an exported ΔE helper apps can assert with, a documented extension
   sequence for apps needing more than six slots, or nothing at all beyond the guidance.
   Doing nothing is a legitimate outcome and should be recorded as a decision if chosen.

**Non-goals / do-not-touch.** Do **not** change the six shipped series values — hram's
divergence is app-specific and other consumers depend on the current set. No change to the
status palette, the completeness assertion, or any component. This is documentation plus,
at most, one small additive export.

**Tier 3** — shared-core surface, per the estate tiering table, even though the change is
documentation-led. Independent review mandatory.

**Tests to write.** None for the documentation. If item 3 lands a helper, that helper gets
its own unit test with the two measured pairs above as fixtures — they are real values with
known answers.

**Risks.** The guidance is derived from a single app's experience; state that plainly rather
than presenting it as a general law. The threshold in particular is calibrated on one
operator's judgement — useful as a starting point, not as a standard, and it should say so.

## Part B — Implementation map (implementer)

PLACEHOLDER — Orchestrator fills this on `git pull`: context package with `path:line`
anchors into `DESIGN.md` and the token documentation, the absolute working directory, the
progress contract, the preamble. Not dispatchable while this stands.

## Part C — Orchestrator only

**STOP — addressee guard.** If you are the implementer reading this file as your own spec:
this part is not addressed to you. It tells the Orchestrator how to invoke you; you ARE that
invocation — do not shell out to `codex exec`. Stop reading at this line.

- **Execution.** Codex first per the Tier-2/3 rule unless the status record says otherwise.
- **Review routing.** `reviewer` mandatory (Tier 3). No `ui_reviewer` unless item 3 turns
  into code with a visual surface, which it should not.
- **Verification.** Scoped: the theme package's existing tests must stay green; any new
  helper carries its own.
- **Cross-repo.** Reference hram `IMARA-2` and its frozen sheet as the evidence source; do
  not restate the measurements from memory when the artifact holds them.

