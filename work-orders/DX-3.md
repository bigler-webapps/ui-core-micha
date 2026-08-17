# DX-3 — `publish.yml` tests before it builds, so `2.41.2` cannot publish

**Target repo:** `ui-core-micha` (branch `main`)
**Tier:** 3 — CI is a Tier-3 surface regardless of diff size.

Short-form WO: two steps swapped, then an operator-confirmed dispatch.

---

## A. Envelope

### Goal

`DX-2` landed on `main` (`31675d8`, `e75192f`) and **its publish failed**, so `@micha.bigler/ui-core-micha`
is still at `2.41.1` on the registry while `package.json` says `2.41.2`. Nothing DX-2 produced can be
consumed until this is fixed.

Cause, from run
[32029216699](https://github.com/bigler-webapps/ui-core-micha/actions/runs/32029216699) —
`completed/failure`:

```
FAIL tests/packageTreeShaking.test.js > built package entries resolve and unused translation bundles tree-shake
Error: ENOENT: no such file or directory, lstat '.../ui-core-micha/dist'
Test Files  1 failed | 64 passed (65)
      Tests  1 failed | 510 passed (511)
```

`publish.yml` runs **`Run tests` before `Build`**. `DX-2`'s new test copies the package's own `dist/` to
assemble a fake installed consumer, and **`dist/` is gitignored** (`.gitignore:2`), so in a clean checkout
it does not exist yet. The test is not flaky and it is not wrong — it inspects the built artifact, which is
the whole point of it. **It simply cannot pass in the order the workflow runs.**

It passed locally at 511/511 because a `dist/` from an earlier `pnpm run build` was lying around. That is
the failure mode, not the test.

### Scope

1. **`.github/workflows/publish.yml`** — move the `Build` step **above** `Run tests`.
   **Both steps carry `if: steps.version_check.outputs.should_publish == 'true'`; that condition must stay
   on each.** Nothing else in the file changes.
2. **Publish `2.41.2`** — see the dispatch note below, which is the part most likely to be missed.

### The dispatch is required, and it is not automatic

`publish.yml` triggers on `push` to `main` filtered to `package.json`, `pnpm-lock.yaml`, `src/**` and
`tsconfig.build.json`. **`.github/workflows/**` is not in that list**, so landing this fix does **not**
re-trigger the publish. `2.41.2` would sit unpublished until some unrelated `src/**` change happened to
push it out.

So: after the fix lands, **dispatch `publish.yml` on `main`**. `publish.yml` is **not** on the dispatch
safe-allowlist (`weekly-routines`, `terraform-plan`), so per `AGENTS.md` name the exact workflow and inputs
and **wait for an explicit operator go** before running it.

`should_publish` compares `package.json` against the registry, so with `2.41.2` local and `2.41.1`
published it will evaluate true and the dispatch will publish. No version bump is needed for this WO — and
none should be added, because the artifact being published is DX-2's, not this WO's.

### Non-goals / do not touch

- **`tests/packageTreeShaking.test.js`.** It is correct. Do not make it build `dist/` itself, do not skip it
  when `dist/` is absent, and above all do not delete it — a skip would silently retire the only check that
  the `sideEffects` declaration actually tree-shakes, which is DX-2's entire deliverable.
- **The `sideEffects` array, `src/theme/fonts.js`, or anything else DX-2 landed.** Reviewed and correct.
- **The trigger `paths` list.** Adding `.github/workflows/**` would make every workflow edit attempt a
  publish. That is a worse default than one dispatch.
- **The version.** Stays `2.41.2`.
- Any other workflow, any source file.

### Recorded, deliberately out of scope

**`publish.yml` is the only workflow in this repo that runs tests, and it runs them only when
`should_publish == 'true'`.** So ucm's suite executes in CI *only on a version bump* — a `src/**` change
that does not bump the version is never tested by CI at all. That is a real gap in a shared-core package
consumed by twelve apps, and it is a separate decision (a `ci.yml` for this repo, or a `pull_request`
trigger), not something to fold into a two-line reorder.

### Risks

- **Low, and the shape is known**: after the swap a build failure surfaces before test results instead of
  after. That is an improvement, not a regression — you want to know the artifact is buildable before
  spending 64 s on tests against it.
- **The real risk is stopping at the commit.** A landed reorder with no dispatch leaves `2.41.2`
  unpublished and looks done. The acceptance criterion below is the registry, not the workflow file.

### Required tests to WRITE

**None.** Nothing to unit-test in a step reorder, and manufacturing one would be noise. The verification is
a green run plus the registry.

### Acceptance

1. A `publish.yml` run on `main` completes **green**, with `tests/packageTreeShaking.test.js` **passing**
   rather than skipped — 511/511.
2. **`npm view @micha.bigler/ui-core-micha version` returns `2.41.2`.** The registry is the acceptance,
   not the commit and not the green tile.

### Parity guardrail

No source, API, behaviour or visual change. What changes is the order two CI steps run in.

---

## B. Implementation map

*Filled by the Orchestrator on `git pull` — see `AGENTS.md` → "Work Order".*

---

## C. Orchestrator only

> **STOP — if you are the implementer reading this work order as your own specification, this section is NOT
> addressed to you. Skip it entirely.** It tells the Orchestrator how to invoke you. **You ARE that
> invocation — do NOT shell out to `codex exec`, do NOT spawn reviewers, do NOT edit `WORK_ORDERS.md`, do
> NOT dispatch any workflow, and do NOT `git add`/`commit`/`push`.**

### Execution directive

Check `.claude/codex-status.md` first. **No line for the current date means use Codex.** A dated
`unavailable` line for today means skip the attempt, implement directly in Claude and name the record —
that flips authorship, which keeps the independent `reviewer` mandatory. Otherwise one probe, outcome
written back either way.

### Review routing

Tier 3: **independent `reviewer`** — mandatory even for two lines, because CI is the surface. **No
`ui_reviewer`** (nothing renders), no `sec_reviewer`. Ask the reviewer to confirm the `if:` conditions
survived the move on **both** steps — dropping one would make a step run unconditionally, which is the only
way a two-line reorder can go wrong.

### Verification

Acceptance criterion 2 is the verification: **read the registry.** A green tile is not a publish, and this
session has now had the publish status misreported in both directions on the same package — once assumed
published when it was not, once assumed unpublished when it was. `npm view`, every time.

### Register + commit

One row, `DX-3`. `done` only with the reviewer's verdict named **and** the registry showing `2.41.2`. Also
update `DX-2`'s note: it currently reads as fully delivered, and it was not — its publish failed. Leaving
that uncorrected is how the next person concludes `2.41.2` is available when it is not.

### Mini-handover

Repo: `ui-core-micha`, branch `main`. WO: `work-orders/DX-3.md`. Move `Build` above `Run tests` in
`.github/workflows/publish.yml`, keeping the `if: should_publish` condition on both. Then **ask the operator
to confirm a `publish.yml` dispatch on `main`** — the workflow's own path filter excludes
`.github/workflows/**`, so landing the fix does not re-trigger it, and `2.41.2` stays unpublished until
someone dispatches. Acceptance is `npm view` returning `2.41.2`, not a green tile. Tier 3, `reviewer`
mandatory. Follow `orchestrate-codex`.
