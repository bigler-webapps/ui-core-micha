# UCM-PERF-5 — Recover once from a JS chunk that no longer exists after a deploy

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: a user who still has an old page open when a new build is deployed does not get stuck on
  a failed lazy-loaded chunk ("Failed to fetch dynamically imported module"); the page reloads
  once and continues on the new build.
- Expected outcome: ucm exports a small helper an app installs once at startup. When a dynamic
  import or Vite module preload fails, the helper reloads the page once. If the same failure
  happens again shortly after that reload, it does not reload again; the error surfaces the way it
  does today.

## Background

hram already lazy-loads its pages (`React.lazy` in `App.jsx`) without any recovery; the estate's
experience is that stale chunks after deploys were a long-running problem there. Two page-load WOs
from the 2026-10-21 Tanzania measurement split bundles further (`HRAM-WEBPERF-3` in hram,
`SVA-WEBPERF-1` in survey_app); operator decision 2026-10-21: both rely on this shared helper
instead of each carrying its own.

## Scope + non-goals

- In scope: the helper, its export, a short usage note in ucm's own documentation, and its tests.
- Non-goals / do not touch:
  - installing it in any app (each app WO does that);
  - keeping old build files on the server across deploys (rejected in the requirements round);
  - retrying ordinary API requests or handling any error that is not a failed chunk load;
  - any change to existing ucm components' loading behaviour.

## Tier · precondition / gate

- Tier 3: shared-core change.
- Precondition: none.

## Risks

- A reload loop when the chunk is genuinely missing (broken deploy): the guard against a second
  reload is the protection; its window must survive the reload itself.
- Unsaved user input is lost by a reload. That is acceptable only because a stale chunk leaves the
  page unusable anyway; apps decide where they lazy-load (survey_app must not lazy-load anything
  after a respondent has started a survey — stated in its own WO).
- Private browsing or blocked storage: if the guard's state cannot be stored, the helper must not
  reload at all rather than risk a loop.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

- A chunk-load failure triggers exactly one reload.
- A second chunk-load failure within the guard window after that reload does not reload.
- A failure after the guard window has passed reloads again (a later deploy is a new event).
- Errors that are not chunk-load failures never reload.
- Storage unavailable: no reload, no exception.

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

Placeholder. Not yet mapped: context package, target directory and preamble are missing, so this
WO must not be dispatched in its current state.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish.

To be filled by the Orchestrator.
