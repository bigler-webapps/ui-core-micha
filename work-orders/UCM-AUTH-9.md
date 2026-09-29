# UCM-AUTH-9 — Auth flows that dead-end: a rejected password removes the invite form, a closed signup looks open

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: every auth page leaves the person a way forward and says why something failed.
- Expected outcome:
  - Invite/reset page: a server-side rejection of the password keeps the form, shows the reason
    (e.g. "too common") at the field, and lets the person retry. After success the person sees a
    confirmation, not a silent jump to the login page.
  - Signup page: when self-registration is off (`signup: false`, `signup_modes: []`), the page says
    so instead of rendering a form whose submit can never enable.
  - User list: a role change confirms that it was saved, or shows why not.

## Context — measured 2026-09-29 in jg-ferien's local browser test (ucm 3.5.0 installed there)

- `src/pages/PasswordInvitePage.jsx`: the form renders only when `!successKey && !errorKey`
  (~l.142); any error — including the server's `Auth.RESET_PASSWORD_INVALID` with
  `messages: ["This password is too common."]` — removes both password fields and the button;
  only a reload recovers. The reason is not shown. Client-side validation keeps the form.
- After a successful set the page navigates to login (~l.102) with no confirmation.
- `src/pages/SignUpPage.jsx`: submit is `disabled: submitting || signupModes.length === 0 ||
  (turnstileRequired && !turnstileToken)`; with no signup modes the page still shows e-mail and
  access-code fields and a permanently grey button, no explanation.
- `src/components/UserListComponent.jsx`: role selects save without any feedback.

## Scope + non-goals

- In scope: the three behaviours above.
- Explicit non-goals / do-not-touch:
  - Password rules and the backend responses (dcm) stay as they are.
  - Strings and the formal/informal choice are `UCM-I18N-4`.

## Tier · gates

- **Tier 3** — shared-core auth screens.
- Reviewer: `reviewer` (all lenses) · `sec_reviewer` (auth flow) · `ui_reviewer`.
- **Done means released and jg-ferien's pin bumped.**

## Risks

- An invalid/expired token must still end in the "link invalid" state without a form — only a
  password rejection keeps the form. The two error classes must be told apart by code, not by text.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. Server rejects the password → form still present, reason shown, retry possible.
2. Invalid token → invalid-link state, no form.
3. Success → confirmation visible.
4. Signup with no modes → explanatory message, no form.
5. Role change → success or error feedback.

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

*(to be filled by the Orchestrator: execution directive; `reviewer` (all lenses) + `sec_reviewer` + `ui_reviewer`; release; jg-ferien pin bump; register rows here and in jg (`JG-UX-19`).)*
