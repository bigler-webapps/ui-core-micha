# UCM-I18N-4 — Let a consumer choose informal German, and translate the hard-coded English in the auth and user screens

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: an app that addresses its users with "du" gets "du" in every ucm screen, and no ucm screen
  shows hard-coded English in a German UI.
- Expected outcome:
  - The kit's German strings exist in a formal ("Sie", today's default) and an informal ("du")
    variant; a consumer picks one when it registers the kit's strings (the single export from
    `I18N-1`). Apps that do nothing keep today's formal German.
  - `UserListComponent`, the invite panel (`UserInviteComponent`, `BulkInviteCsvTab`) and their
    messages use translation keys for every visible string, in all configured locales.

## Context — measured 2026-09-29 in jg-ferien's local browser test (ucm 3.5.0 installed there)

- jg-ferien addresses its users with "du" throughout; ucm's auth screens use "Sie" — login, signup,
  reset request, invite and reset pages (`src/i18n/authTranslations.ts`), so the break runs through
  one flow (`/signup` "Sie", jg's `/signup/confirm` "du"), and one page mixes both (invite page
  heading "Sie", validation "du").
- Hard-coded English in German UI: `UserListComponent.jsx` — "All Users", "Search",
  "Search users...", "Rows per page:", "Successful Login", "Are you sure you want to delete this
  user?"; invite panel — "Invite a new user", "Bulk Invite via CSV", "Upload a CSV file containing
  email addresses. Header "email" is supported.", "Upload CSV", "Send Invites", success "Invitation
  sent.".
- **Operator decision 2026-09-29: generic fixes go to ucm, app-specific ones to the app.**

## Scope + non-goals

- In scope: the variant mechanism at registration time; the informal German variant of the auth
  bundle; keys for the hard-coded strings above (de/en/fr at least, plus every locale the bundles
  already carry).
- Explicit non-goals / do-not-touch:
  - Default behaviour for existing consumers stays formal German — no consumer changes wording
    without opting in.
  - Behavioural fixes of those screens are `UCM-AUTH-9`.

## Tier · gates

- **Tier 3** — change inside shared-core, a new public option on the registration export.
- Reviewer: `reviewer` (all lenses) · `ui_reviewer`.
- **Done means released and jg-ferien's pin bumped with the option set** (separate jg step).

## Risks

- A variant that only covers some keys silently falls back to "Sie" for the rest; a test must prove
  key parity between the two German variants.
- Consumers that already override ucm keys locally must keep working (override order unchanged).

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. Registering with the informal option yields "du" strings for the auth pages; without it, today's
   strings.
2. Key parity: formal and informal German cover the same key set.
3. `UserListComponent` and the invite panel render no hard-coded English (render in `de`, assert the
   listed strings are absent and translated keys present).
4. Four-locale shape test (`I18N-3`) still passes for the new keys.

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

*(to be filled by the Orchestrator: execution directive; `reviewer` (all lenses) + `ui_reviewer`; release; jg-ferien pin bump with the informal option; register rows here and in jg (`JG-UX-10`).)*
