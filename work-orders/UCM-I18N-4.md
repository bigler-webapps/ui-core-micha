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

## Context package — two independent parts

### 1. The variant mechanism + the informal auth bundle

- **What "registers the kit's strings" means today, concretely** (so the mechanism plugs into the
  real thing, not a hypothetical): every consuming app's own `i18n/index.js` imports the named
  bundle exports (`authTranslations`, `messagingTranslations`, …) or the single aggregate
  `uiCoreTranslations` (`src/i18n/uiCoreTranslations.js`, built by `I18N-1`) and spreads them into
  its own i18next `resources` object — see `jg-ferien/frontend/i18n/index.js` for the exact pattern
  (not this repo; read it for reference only, do not edit it — jg's own pin-bump/adoption is a
  separate step, out of this WO). **No app currently imports `uiCoreTranslations` itself** (checked
  — only per-feature bundles are imported today), so changing how the aggregate is BUILT carries no
  live migration risk.
- **Do not change `uiCoreTranslations`'s existing shape or behaviour** — `tests/i18nAggregate.test.js`
  (`I18N-1`/`I18N-3`) asserts it is byte-identical to the plain merge of the 7 per-feature bundles;
  breaking that assertion is not this WO's job. Add a NEW function alongside it instead:
  ```js
  // src/i18n/uiCoreTranslations.js — ADD this export, keep the existing `uiCoreTranslations` export unchanged
  export function createUiCoreTranslations({ germanVariant = 'formal' } = {}) {
    return Object.fromEntries(
      Object.entries(uiCoreTranslations).map(([key, value]) => {
        const { de_informal, ...rest } = value;
        if (germanVariant === 'informal' && de_informal) return [key, { ...rest, de: de_informal }];
        return [key, rest];
      }),
    );
  }
  ```
  This is "the single export a consumer picks a variant with" (the Envelope's phrase) — a future jg
  adoption step calls `createUiCoreTranslations({ germanVariant: 'informal' })` instead of spreading
  `uiCoreTranslations` directly; every OTHER existing consumer is completely unaffected (they don't
  call this function at all, and `uiCoreTranslations` itself is untouched) — this is what "no
  consumer changes wording without opting in" means mechanically.
- **The informal German variant itself** — add a sibling `de_informal` field to the `de` value of
  every key in `src/i18n/authTranslations.ts` where the FORMAL wording actually depends on
  Sie/Ihr-form address. Do NOT add `de_informal` to a key whose German text has no such dependency
  (e.g. "E-Mail-Adresse", "Passwort", "QR-Token" read identically either way) — the function above
  already falls back to the formal `de` value when `de_informal` is absent, so omitting it there is
  correct, not incomplete.
  - Find every Sie-dependent key with a word-boundary scan of each entry's `de` value against
    `\bSie\b|\bIhr\b|\bIhre\b|\bIhrem\b|\bIhren\b|\bIhrer\b|\bIhres\b` (covers "Sie", "Ihr(e/em/en/er/es)"
    in all inflected forms) — this repo already has one page that MIXES both forms today
    (`Auth.MFA_RECOVERY_TITLE`'s description at `authTranslations.ts` uses "du" while
    `Auth.PAGE_INVITE_SUBTITLE` uses "Sie" — measured, not hypothetical), so a plain "does the file
    already use du sometimes" check is not sufficient; use the regex scan.
  - For each matched key, write a natural informal ("du"/"dein"/"dir"/imperative-du) rewording as
    `de_informal`, keeping the same meaning, placeholders (`{{email}}` etc. must appear identically),
    and punctuation style as the formal version. This is a real translation task — this is a
    shared-core kit that already ships a disclosed machine-translated Swahili bundle (`I18N-3`); do
    the same here: **disclose in your final `RESULT:` line that the informal wording was machine-
    translated by you (the implementing model), not reviewed by a fluent German speaker**, exactly
    as `I18N-3` did for Swahili. Do not silently imply human review.
- **Test file:** extend `tests/i18nAggregate.test.js` (it already imports `uiCoreTranslations` and
  the per-bundle exports — read it first) or add a new `tests/i18nGermanVariant.test.js`, covering:
  1. For a representative key (e.g. `Auth.PAGE_INVITE_SUBTITLE`),
     `createUiCoreTranslations({ germanVariant: 'informal' }).['Auth.PAGE_INVITE_SUBTITLE'].de`
     is the informal wording and does NOT match the Sie-form regex; the default call
     (`createUiCoreTranslations()`, no argument) returns the SAME `de` value as plain
     `uiCoreTranslations['Auth.PAGE_INVITE_SUBTITLE'].de` (today's formal string, unopted-in
     consumers see no change).
  2. **The real parity guard the Risk note asks for:** scan `authTranslations` for every key whose
     `de` matches the Sie-form regex above, and assert EACH such key has a non-empty `de_informal`
     that does NOT itself match the Sie-form regex (proves it was actually rewritten, not copied).
     This is the test that would fail if a future key were added with formal wording only and
     forgotten — the actual failure mode the Envelope's Risk names, not a generic "same key set"
     check (which would be trivially true by construction here and prove nothing).
  3. Four-locale shape test (`I18N-3`, `tests/i18nAggregate.test.js`'s existing
     `REQUIRED_LOCALES = ['de','en','fr','sw']` check) still passes — it iterates `uiCoreTranslations`
     itself, which is unchanged; run it to confirm, do not edit it.
  4. Existing consumers unaffected: `uiCoreTranslations['Auth.PAGE_INVITE_SUBTITLE']` (the plain,
     unchanged export) still equals exactly what it did before this WO — read from
     `authTranslations.ts` directly, minus the new `de_informal` field which existing code never
     reads.

### 2. Hard-coded English in `UserListComponent`, `UserInviteComponent`, `BulkInviteCsvTab`

- **Every string named in the Envelope's Context already uses `t(key, englishDefault)`** — the
  translation KEYS are already referenced in the JSX, they are simply missing from every bundle, so
  `t()` silently falls through to the English default regardless of locale. **In almost every case
  the fix is adding the bundle entry, not touching the component.** Add these keys to
  `src/i18n/authTranslations.ts` (all four locales it already carries: de/en/fr/sw — plain, correct
  translations, NOT the informal-German mechanism from part 1, this is unrelated hard-coded-string
  work):
  - From `src/components/UserListComponent.jsx` (verified against the file, line refs current):
    `UserList.DELETE_CONFIRM` (`:93`), `Common.OPERATION_FAILED` (`:278`), `UserList.NEW` (`:313`),
    `UserList.SUCCESSFUL_LOGIN` (`:331`), `UserList.ROLE` (`:349`), `Common.ACTIONS` (`:398`),
    `UserList.TITLE` (`:503`), `Common.SEARCH` (`:509`), `UserList.SEARCH_PLACEHOLDER` (`:510`),
    `UserList.NO_USERS` (`:560`). (`Common.YES`/`Common.NO`/`Common.DELETE`/`Auth.EMAIL_LABEL`/
    `Profile.NAME_LABEL` already exist — do not re-add them.)
  - **One genuine code change, not just a bundle entry:** the `<TablePagination>` at `:581` has no
    localisation props at all — MUI supplies its own English default "Rows per page:" directly, it
    is not reachable via `t()` today. Add `labelRowsPerPage={t('UserList.ROWS_PER_PAGE', 'Rows per
    page:')}` to that element, plus the new `UserList.ROWS_PER_PAGE` bundle entry.
  - From `src/components/UserInviteComponent.jsx`: `Auth.INVITE_SENT_SUCCESS` (`:29`, `:104` in
    `BulkInviteCsvTab.jsx` too — shared key), `Auth.INVITE_TITLE` (`:43`). (`Auth.EMAIL_LABEL`,
    `Auth.INVITE_BUTTON` already exist.)
  - From `src/components/BulkInviteCsvTab.jsx`: `Account.BULK_INVITE_NO_EMAILS` (`:82`),
    `Account.BULK_INVITE_PARSE_FAILED` (`:87`), `Account.BULK_INVITE_DONE` (`:117`, has `{{ok}}`/
    `{{total}}` interpolation — keep both placeholders in every locale), `Account.BULK_INVITE_TITLE`
    (`:129`), `Account.BULK_INVITE_HINT` (`:132-135`, multi-line `t()` call — easy to miss with a
    single-line grep, it IS in scope), `Account.BULK_INVITE_UPLOAD` (`:143`),
    `Account.BULK_INVITE_SEND` (`:147`), `Account.BULK_INVITE_COUNT` (`:150`, `{{count}}`),
    `Common.STATUS` (`:166`), `Common.DETAILS` (`:167`), `Account.BULK_INVITE_PROGRESS` (`:190`,
    `{{done}}`/`{{total}}`), `Account.BULK_INVITE_SUCCESS_COUNT` (`:192`, `{{count}}`).
    (`Auth.EMAIL_LABEL`, `Common.SUCCESS`, `Common.ERROR` already exist.)
  - **`UCM-AUTH-9` already landed** (earlier in this release's sequence) and touched this SAME
    file: it added `UserList.ROLE_UPDATE_SUCCESS` (already present, all four locales — do not
    re-add it) and, after its own review, reused the pre-existing `Auth.SELF_SIGNUP_DISABLED` key
    for the closed-signup message rather than adding a new `Auth.SIGNUP_CLOSED` key (that key does
    NOT exist — do not look for it or add it).
- Test file: extend `tests/UserListComponent`/`UserInviteComponent`/`BulkInviteCsvTab` tests if they
  exist (grep `tests/`), or add focused new ones:
  1. Render each of the three components with `i18n.language = 'de'` (or however this repo's test
     harness sets locale — check an existing test that asserts translated text, e.g.
     `tests/authTranslations.test.js`, for the pattern) and assert NONE of the literal English
     default strings listed above are present, and the translated (German) text IS present.
  2. Four-locale shape test (`i18nAggregate.test.js`) still passes for every new key.

## Do-not-touch / invariants

- Default behaviour for existing consumers stays formal German — `uiCoreTranslations` itself must
  not change; only the new `createUiCoreTranslations` function is variant-aware.
- Behavioural fixes of the auth screens are `UCM-AUTH-9`'s scope, not this one — this WO only adds
  strings/keys and the variant mechanism, it does not change component logic (aside from the one
  named `labelRowsPerPage` prop addition, which is not a behaviour change).
- No secrets, no dependency changes — everything here is data (translation bundles) plus one small
  pure function.

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
