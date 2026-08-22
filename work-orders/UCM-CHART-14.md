# UCM-CHART-14 — The removal was right. The reason on the record is false, and the error message says the opposite of the docblock.

- **Repo:** `ui-core-micha`, branch `main`
- **Tier:** 3 — shared-core. Version correction `3.1.0` → **`4.0.0`**.
- **Status:** planned
- **Workstream:** `CHART-*`
- **Files:** `src/components/charts/ChartFrame.jsx`, `docs/CHART-LAYOUT.md`,
  `tests/ChartFrame.test.jsx`, `package.json`, and one new dev script + its tests.

> **`UCM-CHART-13` shipped the right change for a stated reason that is false.** The mechanics are
> correct and are not being reopened: `height` and `aspect` are gone, `minHeight` stays,
> `warnOnChartFrameHeightMismatch` is deleted, and parameterising `assertRemovedChartProp` with
> `removedIn` was a genuine improvement over what the WO asked for — the error now attributes the
> right WO instead of always blaming `UCM-CHART-12`.
>
> What is wrong is the **justification** recorded alongside it, and one user-visible consequence.

## Part A — Envelope (authoritative WHAT/WHY)

### The three findings

**F1 — the shipped consumer measurement is false.** Three places state that nothing passed `aspect`:

| where | text |
|---|---|
| `ChartFrame.jsx:29-30` (docblock) | "no consumer across the five apps passes it (measured against 3.0.1)" |
| `docs/CHART-LAYOUT.md` | "it is gone because no consumer across the five apps passed it (measured against 3.0.1)" |
| commit `676af5c` message | "aspect was applied … but unused by all five consuming apps" |

**Four `ChartFrame`s pass `aspect`**, at `origin/main` of fitness-monitor and in its working tree
right now:

```
fitness-monitor/frontend/src/pages/BodyHistoryPage.jsx:295   <ChartFrame minHeight aspect>
fitness-monitor/frontend/src/pages/BodyHistoryPage.jsx:444   <ChartFrame minHeight aspect>
fitness-monitor/frontend/src/pages/EnvironmentPage.jsx:245   <ChartFrame minHeight aspect>
fitness-monitor/frontend/src/pages/EnvironmentPage.jsx:279   <ChartFrame minHeight aspect>
```

Measured 2026-08-22 by parsing JSX opening tags with brace- and string-awareness, across all 13 app
repos plus ucm. Same scan confirms **hram is clean**: 16 `ChartFrame`s, 11 carrying `minHeight` only,
zero carrying `aspect` or `height` — so `HRAM-CHT-4` (landed, `4e55d1ae`) is unaffected by this WO.

**F2 — the runtime error message states the opposite of the docblock 50 lines above it.**

```js
// ChartFrame.jsx:79
'Removed -- it was never applied to the frame. Use size on the chart inside the frame …'
```

```js
// ChartFrame.jsx:28, the same file
// it WAS wired to `aspectRatio` on the box at 3.0.1, and worked.
```

**The four consumers who hit this error are the four whose cards actually change shape**, and the
message tells them the prop never did anything. Deleting it on that advice is a silent layout change.
This WO's predecessor argued that "a prop accepted and silently ignored is worse than one that
errors" — an error that misdescribes what it is guarding is worse than both.
`tests/ChartFrame.test.jsx:254` repeats the same false claim in a comment.

**F3 — `3.1.0` is a minor for removing an applied prop with four live call sites.** It is breaking,
and the minor was chosen *because* of F1. `3.1.0` is already published and cannot be unpublished; the
correction is that the **next** release is `4.0.0`, not that history is rewritten.

### Goal

The record matches what was measured, the error message tells the truth to the four callers who will
see it, the version reflects that the change is breaking — and **the consumer count stops being a
claim and becomes a command.**

### The actual deliverable: a census, not three corrected sentences

`UCM-CHART-12` established the pattern — *the deliverable is the invariant, not the fix*. The
analogue here is blunt: **this is the sixth wrong consumer count in this series**, and every one of
them came from a grep.

| # | claim | reality |
|---|---|---|
| 1 | `UCM-CHART-8`: 3 `aspect` sites in fitness-monitor | 8 hits; `EnvironmentPage` never listed |
| 2 | "8 call sites" | 4 charts (4 frame+chart pairs) |
| 3 | `HRAM-CHT-4`: "18 preset files" | 14 files, 19 old-API sites |
| 4 | "0 consumers pass `aspect`/`height` to `ChartFrame`" | 4 pass `aspect` |
| 5 | "`aspect` is never applied in `ChartFrame`" | applied at `:139`; a `head`-truncated grep hid it |
| 6 | `UCM-CHART-13`: "no consumer across the five apps passed it" | the same 4 |

Greps cannot see JSX structure: a prop three lines below its component name, an arrow function whose
`=>` ends the match early, an apostrophe inside a comment, a `{a > b}` in a sibling prop. Every entry
above is one of those. **Ship the parser, and "measured against X" becomes reproducible output
instead of a sentence somebody has to trust.**

### Definition of Done

- [ ] **`scripts/chart-api-census.mjs`** — takes a workspace root, walks every sibling repo's
      `frontend/src` (falling back to `src/`), and reports per app: every `<ChartFrame>` and every ucm
      chart preset element, with which of `aspect` / `height` / `minHeight` / `margin` / `xAxisAngle`
      each one carries, and file:line. Only counts components actually imported from
      `@micha.bigler/ui-core-micha` — a local `BarChart` of the same name is not a consumer.
- [ ] **It parses, it does not grep.** Opening-tag scanning must track string literals, template
      literals, `{}` depth, and `//` + `/* */` comments. **A tag it cannot close is reported as
      `UNPARSED`, never skipped and never counted as clean** — a census that silently drops what it
      cannot read is the failure it exists to prevent.
- [ ] **Its own tests, over fixtures carrying the four traps that actually broke the ad-hoc scans:**
      an arrow function in a prop, an apostrophe inside a JSX comment, nested braces, and a prop on a
      line far below the component name. Each fixture asserts the exact props found.
- [ ] **`aspect`'s error message rewritten to be true and actionable.** It must say the prop *was*
      applied (`aspectRatio` on the card box, up to 3.0.1), that the card's height now follows its
      content with `minHeight` as the floor, and that a caller who wants the chart taller or shorter
      sets `size` on the chart inside. Do not describe it as never-applied anywhere.
- [ ] **`height`'s message left as it is** — it *was* genuinely dead, so that one is already true.
- [ ] **F1's text corrected in all three places** — docblock, `docs/CHART-LAYOUT.md`, and the comment
      at `tests/ChartFrame.test.jsx:254`. Replace "no consumer passed it" with what the census
      reports: four call sites in fitness-monitor, removed by `FM-CHART-1`. **Do not quietly delete
      the sentence** — the point is that a measurement was wrong, and that is worth leaving legible.
- [ ] **Version `4.0.0`**, with the release note saying plainly that `3.1.0` removed an applied prop
      under a minor and that four call sites were affected.
- [ ] **Run the census and paste its output into this WO's register Notiz.** A WO about unverified
      counts that lands with an unverified count is self-refuting.

### Non-goals

- **Do not reinstate `aspect`, and do not touch `minHeight`.** The removal stands; only its stated
  reason and its error text are wrong.
- Do not migrate fitness-monitor's four call sites — `FM-CHART-1` owns them.
- Do not rewrite history or attempt to unpublish `3.1.0`.
- Do not extend the census beyond chart props. It answers "who passes what to the chart API", not
  "who uses ucm".

### Risks

- **The census must stay out of the published package.** It is a dev script: keep it off the
  `exports` map and out of `files`, and confirm the existing `packageTreeShaking` test still passes —
  that test has been flaky under concurrent load before (`UCM-CHART-12`'s note), so a failure there
  needs re-running alone before it is believed.
- **The census reads sibling repos and must degrade gracefully** when a repo is absent, has no
  frontend, or is a fresh clone — report "not present", never throw. It must never write anything.
- **`FM-CHART-1` is mid-flight** with fitness-monitor's pin at `3.0.1` and all four `aspect` props
  still in place. Until it lands, the census correctly reports 4 — that is the expected output, not a
  failure. Do not "fix" fitness-monitor from here.
- The corrected error message will be seen by that session. Getting F2 right is what makes its
  remaining work safe, so **do F2 before anything else in this WO.**

### Tests to WRITE — narrow

- `ChartFrame` + `aspect`: the thrown message names `minHeight` and `size`, and **does not contain
  "never applied"**. Assert on content, not just that it throws — `13`'s test matched
  `/ChartFrame.*aspect.*size/s`, which the false message passes.
- `ChartFrame` + `height`: unchanged, still green.
- The census fixtures above.
- Nothing else. `13`'s suite stays as it is apart from the corrected comment and the tightened
  message assertion.

No full suite.

---

## Part B — Implementation map

> **TO BE FILLED BY THE ORCHESTRATOR** on `git pull`. Must carry: `ChartFrame.jsx:22-35` (docblock)
> and `:72-81` (the two `assertRemovedChartProp` calls); `assertRemovedChartProp` itself at
> `chartDefaults.js:566`; the `docs/CHART-LAYOUT.md` "What stays unchanged" block; the test file's
> `describe` at `:257` and comment at `:254`; the absolute working directory; the progress contract;
> and the preamble. **Do not dispatch while this placeholder stands.**

---

## Part C — Orchestrator-only

> **TO BE FILLED BY THE ORCHESTRATOR.** Review routing (Tier 3: `reviewer` + `ui_reviewer`
> concurrent), register maintenance including the pasted census output, publish verification for
> `4.0.0`, commit, and the execution directive with its self-address guard.
