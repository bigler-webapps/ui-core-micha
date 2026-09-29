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

## Context package — three independent fixes

### 1. `src/pages/PasswordInvitePage.jsx` — the dead-end form + silent navigate

- **Root cause of both bugs: ONE shared `errorKey` state variable covers two structurally
  different failures**, and the render condition `{!successKey && !errorKey && <PasswordSetForm
  .../>}` (line 142) hides the form for EITHER. The link-validity check (`verifyResetToken`, the
  `useEffect` at line 36) and the password submission (`setNewPassword`, `handleSubmit` at line 56)
  are two separate API calls that already fail independently — the fix is to stop collapsing their
  results into one state variable, not to inspect error codes at render time.
- **Fix — split the state:**
  1. Keep `errorKey` (rename mentally to "link check result") for the `useEffect` at line 36–54
     only — this is the existing "invalid/expired link" path and must keep hiding the form (the
     Risk note: "an invalid/expired token must still end in the 'link invalid' state without a
     form"). No change needed to this effect's logic.
  2. Add a new `submitErrorKey` state, set ONLY inside `handleSubmit`'s `catch` block (line
     103–105) instead of reusing `errorKey`. Read the human-readable reason from the response body
     the backend actually sends: `normaliseApiError` (see `src/utils/auth-errors.js`) puts the
     whole response body on `err.raw`; a password-policy rejection carries
     `err.raw?.messages` (an array of strings, e.g. `["This password is too common."]"`) alongside
     `err.code`. Prefer joining `err.raw.messages` when it's a non-empty array; otherwise fall back
     to `t(err.code || 'Auth.RESET_PASSWORD_FAILED')`, same as today.
  3. Change the render condition so the form shows whenever the LINK itself is valid, regardless
     of `submitErrorKey`: `{!errorKey && !successKey && <PasswordSetForm .../>}` (drop the old
     shared `errorKey` check that also hid it on submit errors — `errorKey` from here on only ever
     means "link invalid", never "password rejected"). Display `submitErrorKey` in its own
     `<Typography color="error">` above or below the form, distinct from the existing `errorKey`
     alert.
  4. Pass `submitErrorKey` down or keep it page-local and render it directly — `PasswordSetForm`
     itself does not need to change (it already renders its OWN `localErrorKey` for client-side
     validation; the server-rejection message is a page-level concern rendered alongside the form,
     not inside `PasswordSetForm`).
- **Fix — success confirmation instead of a silent jump:** in `handleSubmit`'s try block (line
  66–102), the code currently computes `target` and calls `navigate(target)` immediately after
  `setSuccessKey(...)` — the navigation happens before the success message can ever be seen. Stop
  calling `navigate` automatically. Instead:
  1. Keep the existing `successKey` set exactly as today (line 68–72) and the existing
     `safeNextPath`/`target` computation (line 73–101) — that same-origin validation logic is
     correct and must not change.
  2. Store the computed `target` in a new state variable (e.g. `continueTarget`) instead of
     navigating with it immediately.
  3. Where `{successKey && <Typography color="primary" ...>}` already renders (line 136–140), add
     a `<Button variant="contained" onClick={() => navigate(continueTarget)}>` reading
     `t('Auth.SIGNUP_GO_TO_LOGIN')` (existing key, reused — this button always leads to the login
     page, same destination the automatic navigate used to go to) right below the confirmation
     text. The person now sees the confirmation and clicks through themselves.
- Test file: extend whatever test already covers `PasswordInvitePage` (grep `tests/` for
  `PasswordInvitePage` — if none exists, create `tests/PasswordInvitePage.test.jsx` following
  `tests/AccountPage.test.jsx`'s page-level render pattern: mock `../src/auth/authApi`'s
  `verifyResetToken`/`setNewPassword` with `vi.mock`, wrap in a router since the page uses
  `useNavigate`/`useParams`/`useLocation`).
  1. `verifyResetToken` resolves (valid link), `setNewPassword` rejects with
     `{ response: { data: { code: 'Auth.RESET_PASSWORD_INVALID', messages: ['This password is too
     common.'] } } }` (the shape `normaliseApiError` reads) → after submit, the `PasswordSetForm`
     (its password fields) is still present, "This password is too common." is visible, and the
     user can submit again.
  2. `verifyResetToken` rejects → the invalid-link message is shown and `PasswordSetForm` is
     ABSENT (`screen.queryByLabelText`/`queryByRole` for a password field returns null).
  3. `verifyResetToken` resolves, `setNewPassword` resolves → after submit, the success message is
     visible AND a "go to login" button is visible (and the test can assert `navigate` was NOT
     called automatically — only after clicking the button, if you choose to test the click too).

### 2. `src/pages/SignUpPage.jsx` — signup closed but form still renders

- `signupModes` (line 51–59) is already computed as an empty array when self-signup is off. The
  page currently still renders the mode-picker (only if `signupModes.length > 1`, so with zero
  modes that block is already skipped) AND the full email/access-code form regardless, with the
  submit button just permanently disabled (line 234: `disabled={submitting || signupModes.length
  === 0 || ...}`) and no explanation anywhere.
- **Fix:** immediately after the `NarrowPage`'s `<Helmet>` block (after line 165), add:
  `{signupModes.length === 0 ? (<Alert severity="info" sx={SIGN_UP_PAGE_ALERT_SX}>{t('Auth.SIGNUP_CLOSED', 'Sign-up is currently closed for this project.')}</Alert>) : (<>...the existing success/error
  alerts + mode-picker + form + "already have an account" block, unchanged...</>)}` — i.e. wrap
  everything from the existing `successKey` alert (line 166) through the "already have an account"
  block (line 254) in this conditional, so a zero-modes project shows ONLY the explanatory message,
  no form at all. New translation key `Auth.SIGNUP_CLOSED` needs an entry in `authTranslations.ts`
  (all locales the file already carries: de/fr/en/sw) — do not leave it English-only via the
  `t(key, fallback)` default-only pattern, add the real bundle entry.
- Test file: extend whatever exists for `SignUpPage` (grep `tests/` for `SignUpPage`).
  1. `authMethods.signup_modes = []` and `authMethods.signup = false` → the explanatory message is
     shown, no email/access-code `TextField` and no submit button are present.
  2. Existing signup-open behaviour (at least one mode) is unchanged — re-run/extend whatever
     assertions already cover the working case so this fix can't be a silent regression.

### 3. `src/components/UserListComponent.jsx` — role change has no feedback

- `handleChangeRole` (line 106–124) already has a `catch` that shows `alert(...)` on failure — that
  half already satisfies "or shows why not". The missing half is SUCCESS feedback: today a
  successful role change just silently re-fetches (`await loadUsers()`, line 120) with nothing
  telling the person it worked.
- **Fix:** add a lightweight success signal after the `await loadUsers()` call inside the `try`
  block (line 106–120) — the simplest, lowest-risk option consistent with this component's existing
  style (it already uses the browser's own `alert()`/`window.confirm()` for feedback elsewhere in
  this same file, e.g. line 93, 102, 122 — match that existing convention rather than introducing a
  new Snackbar/Toast pattern this component doesn't otherwise use):
  `alert(t('UserList.ROLE_UPDATE_SUCCESS', 'Role updated.'));` right after `await loadUsers();`.
  New key `UserList.ROLE_UPDATE_SUCCESS` needs a real bundle entry (all locales) in
  `authTranslations.ts` — this key is new to `I18N-4`'s hardcoded-English-string list too; if
  `I18N-4` lands first in the register it may already exist, check before adding a duplicate.
- Test file: extend the existing `UserListComponent` test (grep `tests/` for
  `UserListComponent`) — assert that a successful `onChangeRole`/`updateUserRole` call triggers the
  new success signal (mock `window.alert` with `vi.spyOn(window, 'alert')` and assert it was called
  with the translated success text), and that the existing failure path is unaffected (still calls
  `alert` with the error path, exactly as today — do not weaken that assertion).

## Do-not-touch / invariants

- Password rules and the backend responses (dcm) stay as they are — this WO only changes how the
  frontend reads/displays what the backend already returns.
- Strings and the formal/informal address choice belong to `UCM-I18N-4`, not here — new keys added
  here (`Auth.SIGNUP_CLOSED`, `UserList.ROLE_UPDATE_SUCCESS`) get plain, correct de/fr/en/sw values,
  not the informal-German variant mechanism (that mechanism is `I18N-4`'s own scope).
- Do not touch `SignupConfirmPage.jsx` — out of scope (not named in the Envelope's Context), even
  though it has a structurally similar immediate-navigate-after-success pattern; note it in the
  register Notiz as a possible follow-up, do not fix it here.

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
