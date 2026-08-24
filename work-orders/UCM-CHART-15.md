# UCM-CHART-15 — Shift the chart size scale up one step, and raise the ceiling

## Part A — Envelope

*Authored by the Expertenchat. Authoritative WHAT/WHY.*

### Goal

The named chart sizes become one step taller, and the scale gains two steps above `tall`.

| token | today | new |
|---|---|---|
| `compact` | 30 → 240 px | **40 → 320 px** |
| `standard` | 40 → 320 px | **50 → 400 px** |
| `tall` | 50 → 400 px | **60 → 480 px** |
| `extra_tall` | — | **70 → 560 px** |
| `super_tall` | — | **80 → 640 px** |

The 10-unit step is preserved throughout, and every value stays a clean multiple of the theme's 8 px
spacing unit.

### Why

Two independent pressures, both from real call sites rather than speculation.

**The ceiling is too low.** `tall` (400 px) is the largest token, and hram has already had to use the
documented `height` escape to get past it — `StructuralReachabilityPanel` sits at `height={480}` with
a comment recording exactly this: *"no size token goes taller than `tall`"*. An escape used because
the scale ends is a scale that ends too early.

**The whole scale is too cramped.** The operator's judgement, on existing plots and not only the new
ones. That judgement lands on a value that was never chosen on its merits: the comment at
`src/components/charts/chartDefaults.js:295` says `standard` is

> "pinned to the pre-existing deployed default (`TimeSeriesChart`'s old `CHART_HEIGHT = 320`) so this
> migration does not also silently redraw every already-shipped default-sized chart"

That was a **migration guardrail, not a design verdict** — 320 was kept because it was the previous
value. The migration it protected is complete, so the pin has served its purpose and what remains is
a height inherited rather than decided.

### The blast radius is one app, and that is why now

Measured across the workspace on 2026-08-24:

```
hram                    3.0.1     <- the only 3.x consumer
14 other apps           2.41.3 / 2.37.0
```

The size tokens are a **3.0.0 feature** (this repo's own CHANGELOG marks 3.0.0 "Breaking": `size`
replaced `minHeight`/`height`/`aspect`). On 2.x the scale does not exist. So no chart outside hram
changes, and the verification surface is one application.

**That inverts the usual caution into urgency:** fourteen apps are still to migrate onto 3.x. Every
app that migrates onto a scale already known to be too cramped has to be revisited afterwards.
Correcting the scale before they migrate is strictly cheaper than after.

### Version: minor, by operator decision — and what that obliges

Redefining what an existing public token renders is breaking under semver, and the Expertenchat
recommended a major. **The operator decided minor on 2026-08-24; that decision stands and this WO
implements it.**

The consequence has to be carried somewhere, so it is carried here: a minor version can arrive
through automation. Renovate's weekly run bumps minors without a human reading the diff, and on this
estate that triage is also the vehicle that opens `develop → main`. A silent minor could therefore
make every hram chart 80 px taller in a PR nobody read as a visual change.

Two obligations follow, and they are not optional decoration:

1. **The CHANGELOG entry must lead with the redraw**, in the plainest possible words: every existing
   `compact`/`standard`/`tall` chart becomes 80 px taller. Not a bullet at the bottom — the first
   line of the entry.
2. **Release and consumption are coordinated**, not left to the weekly bump. `hram`'s pin bump and
   its own verification are `HRAM-CHT-5` and land deliberately.

### Scope

**`src/components/charts/chartDefaults.js`**

1. `CHART_SIZE_SPACING_UNITS` becomes `{ compact: 40, standard: 50, tall: 60, extra_tall: 70,
   super_tall: 80 }`.
2. **Rewrite the pin comment at `:294-299`, do not delete it.** It explains why 320 was there; without
   a successor the next reader sees an unexplained shift. The new text should say what the old pin
   was for, that its migration is complete, and that the scale is now chosen rather than inherited.

**The enumeration sites — all of them.** The valid-size list is written out in more places than the
one that matters, and a half-updated enumeration is this change's most likely defect:

3. `resolveChartHeightPx`'s error message (`:407`) — `"compact" | "standard" | "tall"`.
4. `assertRemovedChartProp`'s guidance string in **each** chart component that carries it
   (`LineChart.jsx:72`, `BarChart.jsx:54`, and the same call in `ScatterChart`).
5. The `size` JSDoc in **each** preset (`LineChart.jsx:44`, `BarChart.jsx:27`, `ScatterChart.jsx:155`).
6. `docs/CHART-LAYOUT.md`.
7. The CHANGELOG entry described above.

Grep for the literal `"tall"` before declaring this done; the list above is what was found on
2026-08-24 and is not guaranteed complete.

### Non-goals / do not touch

- `resolveChartLayout`'s geometry, the axis-band resolution, margins, `xLabels`, rotation logic.
- The `height` px escape — it stays exactly as documented.
- `ChartFrame`'s `minHeight` semantics.
- Any consuming app. hram's adoption is `HRAM-CHT-5`.
- Adding a sixth step. If 640 px proves too small later, the scale extends by another 10 units; do
  not pre-add one now.

### Risks

- **A half-updated enumeration.** Adding the tokens to the resolver but not to the error message
  produces a runtime error that lists only three valid values while five work — which reads as a bug
  in the caller's code, not in this package.
- **A test that asserts the token names but not their values** would pass against both the old and
  new scale and prove nothing. See test 1.
- The two new tokens have **no call site yet** in this repo. That is intended — `HRAM-CHT-5` adopts
  them — but it means nothing here exercises them beyond the resolver test.

### Tests to write

1. `resolveChartHeightPx` returns **320 / 400 / 480 / 560 / 640** for the five tokens — asserting the
   pixel values, not just that a number comes back. Written so it fails against the current scale.
2. An unknown size still throws, and the message names **all five** valid tokens.
3. The `height` escape still wins over `size`, for a new token as well as an old one.
4. Existing chart-layout tests that hard-code 240/320/400 are updated deliberately, each one seen
   and changed rather than mass-replaced — one of them may be asserting the old value *on purpose*.

---

## Part B — Implementation map

> **PLACEHOLDER — to be filled by the Orchestrator on `git pull`.** Context package
> (`chartDefaults.js:294-300` and `:402-415`, every enumeration site with `path:line`, the existing
> chart-layout tests, `docs/CHART-LAYOUT.md`), target working directory, progress contract,
> execution directive with self-address guard, mini-handover.
> **The Codex preamble block belongs in this file before dispatch.**

---

## Part C — Orchestrator only

> **STOP — everything below addresses the Orchestrator.**

**Tier 3 · tests: the four resolver cases plus the updated layout tests**

Shared-core — a change *inside* `ui-core-micha` is Tier 3 by the tiering table regardless of diff
size, and this one redefines rendered output for every consumer that reaches 3.x.

- `reviewer` — the enumeration completeness and the test's ability to fail are its brief.
- `ui_reviewer` — the scale as a design decision: does the 10-unit step still read as a coherent
  scale with five members, and is `super_tall` distinguishable from `extra_tall` in practice.
- `sec_reviewer` — not run. No auth, no data, no exposure surface.
- Concurrent, full context.

### Release

Minor bump per the operator's decision → **3.2.0** from the current 3.1.1. Follow this repo's release
procedure. The CHANGELOG obligation in Part A is a release gate, not a nicety: if the entry does not
lead with "every existing chart becomes 80 px taller", the release is not ready.

Do **not** bump hram from here. `HRAM-CHT-5` owns that, and it carries the visual verification.

### Register

Row `UCM-CHART-15`, review notes in the required shape, the published version, landing SHA(s) in a
second commit before the push. Record explicitly that a **major was recommended and minor was chosen
by the operator** — a future reader tracing a silent redraw should find that decision, not infer it.

### Log

- **2026-08-24** — Envelope authored. Operator judged all three existing tokens too cramped and chose
  a full one-step shift over adding a token at the top, accepting the breaking redraw; added
  `super_tall` to the two steps proposed. Version set to minor against the Expertenchat's
  recommendation of major, recorded above with its consequence.
