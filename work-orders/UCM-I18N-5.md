# UCM-I18N-5 — User-list pagination range text is hard-coded English

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: the user list's pagination reads in the user's language.
- Expected outcome: `UserListComponent`'s `TablePagination` renders its "1–4 of 4" text through a
  translation key (de/en/fr and every locale the bundles carry), the way `labelRowsPerPage`
  already does.

## Context — measured 2026-10-01 in jg-ferien's local browser (ucm 3.7.0 installed there)

- `/account?tab=users` in German: "Zeilen pro Seite: 25 ▾ · **1–4 of 4**". `UserListComponent.jsx`
  (~l.589-600) sets `labelRowsPerPage={t('UserList.ROWS_PER_PAGE', …)}` but no
  `labelDisplayedRows`, so MUI's English default renders. It is the only `TablePagination` in ucm.
- Follows `UCM-I18N-4` (hard-coded English in the user list).

## Scope + non-goals

- In scope: `labelDisplayedRows` via a key with count interpolation; tests; release.
- Explicit non-goals / do-not-touch: no other change to the user list.

## Tier · gates

- **Tier 3** — change inside shared-core (small).
- Done means released AND jg-ferien's pin bumped.

## Risks

- The "more than" form (`count === -1`) must have a wording too, or it renders "of -1".

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. In `de`, the pagination shows the German range text; in `en` the English one.
2. Key-parity: every locale bundle has the new key.

---

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Context package

### The call site

`src/components/UserListComponent.jsx:589-601`:
```jsx
<TablePagination
  component="div"
  count={sortedUsers.length}
  page={page}
  onPageChange={(_, newPage) => setPage(newPage)}
  rowsPerPage={pageSize}
  onRowsPerPageChange={(event) => {
    setPageSize(Number(event.target.value));
    setPage(0);
  }}
  labelRowsPerPage={t('UserList.ROWS_PER_PAGE', 'Rows per page:')}
  rowsPerPageOptions={[10, 25, 50, 100]}
/>
```
`t`/`i18n` come from `useTranslation()` (`react-i18next`), already in scope at l.53.

### MUI's `labelDisplayedRows` contract

MUI's own default (`node_modules/@mui/material/TablePagination/TablePagination.js:119-124`,
for reference only — do not import it):
```js
function defaultLabelDisplayedRows({ from, to, count }) {
  return `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`;
}
```
The prop signature is `({ from, to, count, page }) => ReactNode`. `count` is `-1` when the total
is unknown/unbounded — this component always passes a real `sortedUsers.length`, but the prop
contract still has to handle `-1` defensively (the Risk note): MUI itself would call the function
with `-1` only if `count={-1}` were passed, which this component doesn't do — handle it anyway
since the function must satisfy the full contract, not just this component's current call site.

### The translation bundle has FOUR locales, not three

`src/i18n/authTranslations.ts` (flat `export const authTranslations = { "Key.NAME": { de, fr, en,
sw }, ... }`) carries `de`/`fr`/`en`/`sw` for every existing key, confirmed by grepping all locale
codes in the file — **sw (Swahili) is real and already translated throughout, not a stub**. "every
locale the bundles carry" in the Envelope means these four, not jg-ferien's usual three. Add the
new key(s) in the same shape, next to `UserList.ROWS_PER_PAGE` (~l.2050-2055) for locality.

Proposed keys (interpolated, i18next `{{var}}` syntax — do not reserialize the whole file through
`JSON.parse`/`JSON.stringify`, this is a `.ts` module, not JSON; a plain text insert keeps every
other entry byte-identical):
```ts
"UserList.DISPLAYED_ROWS": {
  "de": "{{from}}–{{to}} von {{count}}",
  "fr": "{{from}}–{{to}} sur {{count}}",
  "en": "{{from}}–{{to}} of {{count}}",
  "sw": "{{from}}–{{to}} ya {{count}}"
},
"UserList.DISPLAYED_ROWS_MORE_THAN": {
  "de": "{{from}}–{{to}} von mehr als {{to}}",
  "fr": "{{from}}–{{to}} sur plus de {{to}}",
  "en": "{{from}}–{{to}} of more than {{to}}",
  "sw": "{{from}}–{{to}} ya zaidi ya {{to}}"
}
```
The `sw` wording reuses "ya" for "of"/possessive, already used this way elsewhere in the same file
(e.g. l.57 `"ruhusa ya kutuma mialiko"`, l.114 `"barua pepe ya kuweka upya"`) and "zaidi ya" ("more
than") as a plain compositional phrase — a reasonable best-effort construction, NOT a
native-speaker-verified translation; say so plainly in your own report rather than presenting it as
settled, same as you would for any other claim you can't independently verify.

Call site becomes:
```jsx
labelDisplayedRows={({ from, to, count }) =>
  count === -1
    ? t('UserList.DISPLAYED_ROWS_MORE_THAN', '{{from}}–{{to}} of more than {{to}}', { from, to })
    : t('UserList.DISPLAYED_ROWS', '{{from}}–{{to}} of {{count}}', { from, to, count })
}
```

### Existing test harness to extend, not duplicate

`tests/userScreenTranslations.test.jsx` already renders `UserListComponent` through a REAL
`i18next` instance pinned to German (`withGermanI18n`, ~l.22-30, built from
`authTranslations.*.de`) and asserts rendered German strings plus `expectNoEnglishDefaults()`
(~l.34-39, checks `document.body.textContent` against an `ENGLISH_DEFAULTS` list, ~l.33-46). The
test `'renders UserListComponent in German, including pagination and action feedback'` (~l.97-125)
already fetches exactly 1 user, so the pagination currently renders English "1–1 of 1" — add that
literal string (or your chosen German text) to the existing `for (const german of [...])` loop
(~l.115) to assert the real rendered pagination text, and add the English range phrasing (e.g.
`'of 1'` or similar, whatever actually changes) to `ENGLISH_DEFAULTS` so `expectNoEnglishDefaults()`
(already called at line 124) starts actually catching a regression here — today it does NOT, since
no "of N" string is in that list, which is why this bug shipped unnoticed.

Required test 1 (German vs English) is naturally satisfied by extending this file: German via the
existing `withGermanI18n` harness, English via a parallel small i18next instance (or reuse the
`en` resources the same way `germanResources` is built from `.de`) rendering the same component and
asserting the English range text.

Required test 2 (key-parity across all four locales) — check whether a generic "every key has
every locale" structural test already exists in this repo (grep `authTranslations` test files for
something like `Object.values(...).every(...)` or a locale-set check) before writing a new one;
extend it if so, add a small standalone one for just these two new keys if not.

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

**Execution directive:** dispatch via `codex exec --skip-git-repo-check
--dangerously-bypass-approvals-and-sandbox -m gpt-5.6-luna - < work-orders/UCM-I18N-5.md` (today,
2026-10-02, already recorded `available` in `webapps/.claude/codex-status.md`), cwd =
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Monitor for `RESULT: DONE|BLOCKED`.

**Review routing:** Tier 3 (shared-core) — full `reviewer` lens set (`envelope`, `regression`,
`duplication`, `tests`, codex/gpt-5.6-luna, one concurrent batch, diff inline) PLUS `ui_reviewer`
(frontend-adjacent: a rendered component's i18n text). `duplication` should specifically check
whether any OTHER app already patched around this same MUI default locally (a local workaround that
this shared-core fix should make redundant, worth naming even if out of this WO's scope to remove).

**Tests:** the Orchestrator re-runs `tests/userScreenTranslations.test.jsx` (and any new/renamed
key-parity test file) as the gate — not ucm's full suite (Tier 3 but a small, local-only change;
no cross-app ripple to justify a full run per `AGENTS.md` → Test scope).

**Release:** patch bump (3.11.0 → 3.11.1) — this extends `UCM-I18N-4`'s existing i18n-gap category
in the same component, not a new capability area, per the project convention (version bump reflects
scope, not mere newness). Update `package.json` + `CHANGELOG.md`, then the repo's normal publish
path (check `.github/workflows/` or `package.json` scripts for how a previous release like
`UCM-THEME-14`/3.11.0 or `UCM-AUTH-11`/3.9.1 actually published, don't assume `npm publish` by
hand — follow the established mechanism).

**jg-ferien pin bump:** after the release is live, bump `ui-core-micha`'s pin in
`jg-ferien/frontend/package.json`, install, run jg-ferien's own affected tests (anything touching
`UserListComponent` consumption, if jg-ferien renders it at all — check first; if jg-ferien doesn't
use `UserListComponent`, the pin bump itself plus jg-ferien's existing suite staying green is the
evidence), commit + push to jg-ferien's `develop`.

**Register:** `done` only once BOTH halves land — the release AND the jg-ferien pin bump (the WO's
own Tier line: "Done means released AND jg-ferien's pin bumped"). Row here (ui-core-micha's
`WORK_ORDERS.md`) AND a row in jg-ferien's own `WORK_ORDERS.md` noting the pin bump, per the
Envelope's own closing instruction.

**Commit:** ui-core-micha lands on `main` (no `develop` branch here, confirmed in `AGENTS.md`'s
branch table). jg-ferien's pin bump lands on `develop` as usual.
