# UCM-AUTH-16 — Keep setup step labels readable on narrow screens

# A. Envelope

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

# B. Implementation map

To be filled by the Orchestrator after Gate #1. No implementer dispatch while this placeholder remains or the required preamble is absent.

---

# C. Orchestrator only — STOP: not addressed to the implementer

Record review routing, evidence, and completion here.
