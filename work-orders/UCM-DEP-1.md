# UCM-DEP-1 — All open Renovate updates in one change on main, one CI run

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`).

# A. Envelope — addressed to everyone

## Goal and expected outcome

ui-core-micha's eight open Renovate PRs land as one change on `main`, verified by one CI run. A release follows only if a runtime dependency changed; tooling-only updates need none.

## Tier

Tier 3: dependency changes, majors included.

## Operator decisions this Envelope records (2026-10-15)

1. The bundle contains these open Renovate PRs' updates, in one change on `main`:

| PR | Update |
|---|---|
| #17 | npm non-major |
| #18 | github-actions |
| #19 | actions/checkout v7 |
| #20 | actions/setup-node v7 |
| #21 | jsdom v30 (test) |
| #22 | pnpm v12 |
| #23 | typescript v7 |
| #24 | vitest v5 (test) |

2. A major that needs more than small adaptations (configuration, a renamed import, a test helper) is taken out of the bundle, left as its PR, and reported with the reason. The bundle does not grow into a migration.
3. Verification is one CI run of the repository's own CI on the candidate (for an app: a `ci-test/<ID>` ref with the full job set). A red job is fixed within decision 2 and the run repeated; not more than that.
4. After the push Renovate closes the PRs whose update landed; a PR it rebases instead is an update that did not land and is reported.

## Scope

1. Dependency manifests and lockfiles, workflow `uses:` pins, image pins the updates touch.
2. The small adaptations decision 2 allows, with tests where behaviour is touched.
3. Each update's changelog read for breaking changes before it goes in; a breaking change the code meets is adapted (decision 2) or the update is taken out.
4. A release per the repository's own publish procedure only when the published package's runtime dependencies changed.

## Non-goals

- No new features, no refactoring beyond decision 2.
- No change to the Renovate configuration.
- No pin bump in any consuming app.

## Risks

- pnpm 12 and TypeScript 7 change the build toolchain; the published bundle must stay byte-compatible in its exports. The CI's build and the kit's own tests are the check.

## Required tests to write

None beyond the adaptations of decision 2. The evidence is the CI run of decision 3.

# B. Implementation map — addressed to the implementer

*To be filled by the Orchestrator.*

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Part of the PR close-out round of 2026-10-15; stagger the CI run with the other bundles of that round (one heavy run at a time on the shared runner). On 2026-10-15 the working tree carried another session's uncommitted changes to `package.json` and `pnpm-lock.yaml` (likely the dcm/ucm chat migration): the same files this bundle changes. Sequence with that session before starting; never fold its changes into this commit.
