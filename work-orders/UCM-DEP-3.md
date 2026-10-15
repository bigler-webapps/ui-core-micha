# UCM-DEP-3 — Remove the `./package.json` export added beyond UCM-DEP-2

Follow-up from the acceptance of `UCM-DEP-2` (2026-10-15): its Envelope named exactly four public
entries; the landed 4.0.0 also exports `./package.json`. The operator decided to remove it.

# A. Envelope

## Goal & expected outcome

- Ziel: the package's public surface is exactly what `UCM-DEP-2` decided.
- Expected outcome: a patch release of `@micha.bigler/ui-core-micha` whose `exports` map holds
  `.`, `./charts`, `./chat` and `./markdown` and nothing else; CHANGELOG entry says so.

## Scope

- Remove the `./package.json` entry from `exports` in `package.json`.
- Adjust any test that asserts the exports map so it pins exactly the four entries.
- Release as the next patch version (4.0.1) with a one-line CHANGELOG entry.

## Non-goals / do-not-touch

- No other change to the exports map, peers, `files` or source.
- No consumer repo changes.

## Tier · precondition / gate

- Tier 3: a change inside shared-core (its public surface), however small.
- Precondition: none (4.0.0 is published). Lands before the app orders bump, so they pin 4.0.1.

## Risks

- A consumer tool that reads `@micha.bigler/ui-core-micha/package.json` through the exports map
  (some bundler plugins and version checks do) would fail to resolve it. Checked at authoring
  (2026-10-15): no app source or config under `*/frontend` imports
  `ui-core-micha/package.json`; a third-party plugin doing so would show in the consuming app's
  build on its bump.

## Required tests to WRITE

- The exports-map test asserts the exact key set `{".", "./charts", "./chat", "./markdown"}`.
