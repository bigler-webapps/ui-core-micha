# UCM-AUTH-16 — Keep setup step labels readable on narrow screens

## A. Envelope

## Goal and expected outcome

In `SetupWizardShell`, six setup steps remain readable and operable at a 375 px viewport. In particular, the German label `Abschluss` must not split a single trailing letter onto another line. Longer translated labels must remain available in full without overlap or inaccessible controls. The current step, completed states, keyboard navigation and reachable-step behavior remain intact.

## Scope and non-goals

Target repository: `ui-core-micha`. Adjust the shared setup step navigation responsively, including its component tests and any directly necessary documentation. Preserve desktop behavior and support variable step counts and labels. This order does not change setup business logic, authentication, translations, theme tokens, or Maana's trial tax text. Consumption of a published shared-core version by Maana is a separate order and is not authorized here.

Prototype: none requested. Token delta: none. New explanatory copy: none.

## Tier and preconditions

Tier 3: change inside shared core. Reproduction: Maana setup at 375 px, 2026-11-16; the last letter of `Abschluss` appears alone on a second line. No implementation before Gate #1.

## Risks

Shared consumers may have more steps, longer or unbroken labels, and different available widths. Avoid clipping information or changing keyboard and screen-reader order.

## Required tests to write

Cover the six-step German case and long labels at narrow width in an appropriate rendered check; assert labels and controls remain accessible, with current/completed and keyboard behavior preserved. Cover a normal desktop width and a different step count. A DOM-only test cannot establish actual wrapping; verify rendered width as well.

## B. Implementation map — addressed to the implementer

Target paths: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha/src/onboarding/SetupWizardShell.jsx` and `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha/tests/SetupWizardShell.test.jsx`. The shell renders an ordered flex list with one `li` per step and a `ButtonBase` containing the step number and label; the label currently has `overflowWrap: 'anywhere'`. Its public controlled props determine current, reachable and completed states. Existing tests cover navigation and accessible states. Preserve this contract; use Part A's scope and tests. Rendered-width verification is the orchestrator's task, not a jsdom assertion.

### Preamble

**Your first tool action is the hook canary: run the shell command `codex-hook-canary-ws-gov-60` exactly.** The expected denial is `WS-GOV-60 canary: workspace hooks are active`; continue after it. If absent, report unverified coverage once and continue.

The text above is the COMPLETE spec. Read the nearest `AGENTS.md`, the relevant `.codex/skills/frontend-engineering/SKILL.md`, and app `MEMORY.md` only for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. Do not edit `WORK_ORDERS.md` or the register. Your tools are for editing source and test files and running only the tests you wrote. Do not install dependencies, touch a lockfile, run a package manager, tidy stray files, or run git add/commit/push. If blocked, report `RESULT: BLOCKED <reason>`. Write the required tests and run only your own new tests once. The orchestrator runs the authoritative tests and review.

Narrate `PLAN: <steps>` first, then `PROGRESS: [n/total] <action>` before each action, with no gap over about two minutes; finish with exactly one `RESULT: DONE|BLOCKED <reason>`.

---

## C. Orchestrator only — STOP: not addressed to the implementer

If you are the implementer, STOP here. Do not dispatch reviewers or implementers, verify, edit the register, or commit.

## Gate record

Gate #1 approved by the operator 2026-11-16 in this chat.

The initial dispatch carried the implementation map and preamble but the WO checker did not recognize their headings. This was discovered after dispatch; headings were corrected before completion. The first launch was stopped before changes because it assumed the orchestrator role; the second explicitly identified the implementer role.

## Completion

Implementation: codex/gpt-6-luna. Affected tests: 10 passed in SetupWizardShell and setupTranslations. Rendered development harness at 375 and 1280 px: six German labels readable; at 375 px a four-step fixture with a long phrase and unbroken identifier stayed inside its cells (measured text ranges 131–244 and 248–356 px); Tab then Enter activated the completed step. No physical touch-device test. Round 1 found two test gaps; both addressed. Round 2: rendered and keyboard evidence was unavailable to the lens but was subsequently obtained; claimed label overlap was not reproduced by measured text bounds. The absence of an automated desktop breakpoint assertion remains a carried test limitation. A patch release publishes the shared component; Maana adoption remains separate.
