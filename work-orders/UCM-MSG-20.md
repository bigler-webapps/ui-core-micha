# UCM-MSG-20 — Message composer collapses on narrow screens

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: on a 375 px phone a person can type and send a message in every conversation type.
- Expected outcome:
  - The text field keeps a usable width (at least most of the row) next to the action icons; the send
    button is fully visible.
  - URLs in messages are clickable links.
  - The read marker next to the time explains itself (label or tooltip), or is not shown where it
    carries no information.

## Context — measured 2026-09-29 in jg-ferien's local browser test (ucm 3.5.0 installed there)

- jg-ferien, event announcement conversation, 375 px: next to four icon buttons (attach, emoji, poll,
  announce) the textarea is **16 px** wide (its field 44 px), "Senden" is clipped (44 px), the row
  overflows (315 of 295 px).
- Component: `src/messaging/Composer.jsx` (row layout incl. the four icon buttons,
  `allowAnnouncement` prop); `src/messaging/MessageBubble.jsx` shows a bare "0/0" next to the time.
- Long words and URLs wrap correctly inside the bubble; URLs are plain text.
- The dcm register is canonical for `MSG-*`; this is the ucm-side row.

## Scope + non-goals

- In scope: composer layout at narrow widths (e.g. actions collapse into one menu, or wrap to their
  own row), linkified URLs, an explained or hidden read marker.
- Explicit non-goals / do-not-touch:
  - No change to message sending, polls or announcements behaviour.

## Tier · gates

- **Tier 3** — shared-core component.
- Reviewer: `reviewer` (all lenses; linkify is new logic) · `ui_reviewer` · `sec_reviewer` (linkify
  must not create script or `javascript:` links).
- **Done means released and jg-ferien's pin bumped.**

## Risks

- Linkify is an injection surface: only `http(s)` URLs, `rel="noopener noreferrer"`, no HTML from
  message text.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. At 375 px width the textarea has at least a defined minimum width and the send button is not
   clipped, with all four actions enabled.
2. `https://…` in a message renders as a link; `javascript:…` does not.
3. The read marker has an accessible label or is absent.

---

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

*(placeholder — no context package yet, no progress contract yet; the Orchestrator fills this
part on `git pull` and appends the preamble below to the invocation. Do not dispatch on this
placeholder.)*

## Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`)

## Preamble — a REQUIRED block IN this file, not something appended at invocation

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register
> row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source
> and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies,
> touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state
> blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT
> `git add`/`commit`/`push` — leave every
> change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests
> the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute
> and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review).
> The orchestrator re-runs the authoritative set + does the independent review after you finish —
> those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

---

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit.**

*(to be filled by the Orchestrator: execution directive; `reviewer` (all lenses) + `ui_reviewer` + `sec_reviewer`; release; jg-ferien pin bump and 375 px check in an event conversation; register rows here, in dcm (MSG canonical) and in jg (`JG-UX-14`).)*
