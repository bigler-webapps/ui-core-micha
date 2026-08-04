# WORK ORDER SHELL-1 (ui-core-micha) — a shared user menu: avatar, profile, logout

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). New prefix `SHELL-*` for shared application-shell surfaces
(header chrome, user menu) — distinct from `MSG-*` (messaging) and `NOTIF-*` (notification domain).
Design settled with the operator 2026-08-04 against an interactive prototype.

## TIER
Tier 2 — shared-core UI consumed by every app, and it touches the logout path. Independent `reviewer`
mandatory, `ui_reviewer` mandatory.

## WHY

Measured across the estate 2026-08-04, not estimated:

| App | Account + logout controls today |
|---|---|
| spesix `Header.jsx` | account link `:184` + separate logout `:224` — **and the same pair again** at `:269`/`:307` for mobile |
| survey_app `Header.jsx` | account nav entry `:67`, logout desktop `:152`, logout mobile `:90` |
| jg-ferien `HeaderUserActions.jsx` | avatar → `/account` only; **logout exists nowhere in the header** — it sits at the bottom of `/more` |
| hram | **unknown** — no header file under `components/`, different structure |

**Seven render sites across two apps for two adjacent actions**, and the duplication is worse *within*
each app than between them: desktop and mobile variants render the same logout separately. That is
where behaviour drifts.

This is a **consolidation**, not a bug fix. jg's missing header logout is the most visible symptom, but
fixing only jg would leave the duplication everywhere else untouched.

## THE BOUNDARY — settled, do not renegotiate

| | |
|---|---|
| **ucm owns** | the avatar, the menu, **Profil** (`/account`), **Abmelden** |
| **Host passes** | account-related entries only, already permission-filtered and already translated |
| **Stays out** | the context/structure picker, and management navigation such as org administration |

**The context picker must never enter this menu.** Verified: spesix's `activeSchoolId` is consumed by
**13 files** (`ApprovalsPage`, `BudgetsPage`, `ClaimsPage`, `ClaimEditPage`, `AppLayout`, …) and jg's
`selectedEventId` by **18**. Changing it re-scopes the entire application's data. It is a primary
control that must stay permanently visible next to the content it governs — burying a control that
determines *which school's budgets you are reading* behind avatar → menu → item is both two taps too
many and the wrong mental model. The menu answers "who am I"; the picker answers "what am I looking at".

Operator, 2026-08-04: org/structure pickers are app-specific and already solved where they live. Adding
a second route to them here would be exactly the duplication this WO exists to remove.

## SCOPE

**A. `UserMenu` — a new exported component.**

Trigger is an avatar; clicking opens a menu containing an identity block (name, email), **Profil**,
any host entries, a separator, and **Abmelden** last.

- **Navigation follows the existing `NotificationBell({ resolveLink })` pattern**
  (`notifications/NotificationBell.jsx:19,31`) — the host passes its `navigate`; ucm knows no routes.
  Do not invent a second navigation mechanism.
- **`/account` is the Profil default.** Verified identical in jg-ferien, spesix, survey_app and hram.
  Overridable, but the default must work with no host configuration.
- **Abmelden calls ucm's own `logout`** (`auth/AuthContext.jsx:132`) — already there, unexported to any
  UI today. That is the whole gap.

**B. ucm owns the avatar.** ucm currently has **no** avatar component (only MUI `Avatar` usage inside
`ConversationList`); jg has its own local `UserAvatar`. Build ucm's, deriving initials from
`first_name` / `last_name` / `username`, which `mapUserFromApi` (`auth/AuthContext.jsx:41-56`) already
carries in every app. Allow a host override for a real image, but the no-config path must render
something correct.

jg's local `UserAvatar` becomes redundant. **Removing it is jg's job, not this WO's** — note it in the
completion note so the follow-up is written.

**C. The host extension point.**

```jsx
items={[{ id, label, onSelect }]}
```

Three rules, each load-bearing:

1. **ucm never evaluates permissions.** jg's org entry is gated on `canManageStructure(user)`, a
   jg-local helper. A `requiresPermission` prop would need a permission model shared across four apps —
   there is none, and inventing one here is out of scope. **The host filters, then passes.**
2. **Labels arrive as resolved strings, not i18n keys.** `More.NOTIFICATIONS` lives in jg's catalogue;
   ucm cannot translate it. This is the same ownership question `django-core-micha` MSG-13 is currently
   failing — dcm emits keys nobody has a catalogue for. Get it right here from the start: **whoever
   owns the text supplies it finished.**
3. **One action mechanism, not two.** `onSelect` only; the host closes over its own `navigate`. Do not
   also accept `href` — two ways to express the same thing is two things to test and two ways to be
   inconsistent.

**Ordering belongs to ucm.** Host entries render as one group in a fixed slot; **Abmelden is always
last**. If hosts could order freely, logout would sit in four different places and the consistency that
motivates this WO would be gone.

**Expected usage:** spesix and survey_app pass **nothing** — `<UserMenu resolveLink={navigate} />` is
the whole integration. Only jg passes an entry (its notification settings, which no other app has).

**D. Icons — decide once, state it.** jg's entries carry a trailing `ChevronRightIcon` and no leading
icon; ucm's built-ins would want leading icons. A mixed set looks broken. Either every entry may carry
an optional leading icon (ucm supplies its own), or none do. **This is the implementer's call, but it
must be stated, not left to emerge.**

**E. The preview toggle from `django-core-micha` MSG-13 scope E.** MSG-13 rules that the push shows
sender + message text, with a per-user opt-out. dcm ships the preference; **the `Switch` belongs in
`NotificationSettings.jsx` and is not deliverable from dcm.** It is folded in here because it is the
same corner of ucm and the same release.

Depends on dcm publishing the preference field first. **If it has not landed, ship A–D without E and
say so** — do not block the menu on it.

## CONTEXT PACKAGE — verified current state (Orchestrator, Implementation map)

Work from this package; do not explore broadly from scratch — open only the named files to verify.
If you must dig deeper, delegate to a read-only Explore sub-agent (Haiku).

**New file: `src/auth/UserMenu.jsx`.** Sits with `AuthContext.jsx` (identity/auth surface), not
`notifications/` — this is not a notification. Export it in `src/index.js` next to the existing auth
block (`export { AuthContext, AuthProvider } from './auth/AuthContext';` at `:4`) — add
`export { UserMenu } from './auth/UserMenu';` there, not in the notifications block at `:59-65`.

**Menu pattern to mirror — `src/notifications/NotificationBell.jsx` (whole file, 85 lines), exactly:**
- `resolveLink` prop shape (`:19`): `export function NotificationBell({ resolveLink }) { … }`. The
  handler calls `resolveLink(someLinkString)` conditionally (`:31`) — same contract `UserMenu` must
  use: `resolveLink('/account')` for Profil, `resolveLink(item.onSelect...)` is wrong per spec —
  re-read scope C: host items use `onSelect` (a callback), NOT `resolveLink` — `resolveLink` is only
  for ucm's own Profil navigation. Two distinct mechanisms coexist here (ucm's own nav via
  `resolveLink`, host items via their own `onSelect`) and that is correct, not a violation of "one
  action mechanism" (point C.3 bars the host from having *two* ways — `onSelect` is the host's one way).
- Trigger + `Menu` scaffold (`:36-51`): `IconButton` with `aria-label`, `onClick={(e) =>
  setAnchorEl(e.currentTarget)}`, then MUI `<Menu anchorEl={anchorEl} open={Boolean(anchorEl)}
  onClose={() => setAnchorEl(null)} anchorOrigin={{horizontal:'right',vertical:'bottom'}}
  transformOrigin={{horizontal:'right',vertical:'top'}}>`. **MUI `Menu` handles Escape and
  click-outside natively via its built-in focus trap** (`onClose` fires for both) — no custom
  keyboard/focus-trap code needed; `ui_reviewer`'s RISKS check is about *not breaking* this default,
  not building one. Focus returns to the trigger `IconButton` automatically on close (MUI default);
  verify this in the required test rather than assuming it.
- Item click closes the menu (`setAnchorEl(null)`) before/alongside the action (`:28-32`) — Abmelden
  and Profil and each host item must all close the menu on click.

**Identity data — `src/auth/AuthContext.jsx`:**
- `mapUserFromApi` (`:41-73`) is where `user.first_name`, `user.last_name`, `user.username`,
  `user.email` land — confirmed present on every `user` object in every app (already relied on by
  `AccountPage`). Avatar initials: prefer `first_name[0]+last_name[0]`, fall back to `username[0]`
  when names are absent (per scope B) — no other field exists to derive from.
- `logout` (`:132-141`): `const logout = async () => { try { await logoutSession(); } catch (e) {
  console.error(...) } finally { setUser(null); } }`, already exposed on the context value (`:150`).
- **No `useAuth` hook exists in this repo** — every consumer does `useContext(AuthContext)` directly
  (`AuthContext` exported at `:15`, `createContext(null)`). `UserMenu` must do the same — do not
  invent a `useAuth` hook as part of this WO, that would be scope creep beyond the menu itself.
- Do not touch any line in this file (NON-GOALS already says so) — `UserMenu` only *reads*
  `user`/`logout` off the context.

**Avatar:** no existing ucm `Avatar` component (verified — only bare MUI `<Avatar>` usage inside
`ConversationList`, nothing reusable). Build it inline in `UserMenu.jsx` or as a small
`src/auth/UserAvatar.jsx` sibling — implementer's call; MUI's `<Avatar>{initials}</Avatar>` for the
no-image case, `<Avatar src={overrideImageUrl} />` when a host passes one (scope B: "Allow a host
override for a real image").

**i18n — new file `src/i18n/userMenuTranslations.ts`**, same shape as the existing four
(`src/i18n/notificationsTranslations.ts` is the closest analog, e.g. its `:1-4`): a flat object,
keys like `'UserMenu.PROFILE'`/`'UserMenu.LOGOUT'`, each `{ de, fr, en, sw }`. **No existing
`UserMenu.*` or reusable `Profil`/`Abmelden` key exists yet** — `authTranslations.ts` has
`Account.TAB_PROFILE` (`:1616-1619`, "Profil"/"Profile") which is close but is the *account page
tab* label, a different UI surface; do not reuse it silently — either add fresh `UserMenu.*` keys
(recommended, keeps this component's translations self-contained and independently consumable) or
explicitly reuse `Account.TAB_PROFILE` if the copy is identical — state which was chosen. Then export
`userMenuTranslations` from `src/index.js` next to `authTranslations` (`:56`)/`notificationsTranslations`.
Per scope C.2, host-supplied `items[].label` are already-resolved strings — `UserMenu` must NOT run
them through `t()`.

**Package/test conventions:** flat package, `src/` at repo root (no `frontend/` subdir), React 19 +
MUI 7 as peer deps (`package.json`), Vitest + `@testing-library/react`. New test file
`tests/UserMenu.test.jsx` mirroring `tests/NotificationBell.test.jsx`'s shape: `vi.hoisted()` mocks,
stub `react-i18next`'s `useTranslation` with a **stable** `t` reference (module-level, not recreated
per render — the NOTIF-14 postmortem in this repo's own `WORK_ORDERS.md` documents exactly this
class of bug: an unstable mocked `t` retriggers effects and clobbers state in tests), and
`afterEach(cleanup)`.

## NON-GOALS / DO NOT TOUCH
- **No context or structure picker**, in any form, including read-only display of the current context.
  ucm cannot know whether the unit is a school, an event, a course or a department.
- No management navigation (org administration and the like) — account-related entries only.
- Do not change `AuthContext`'s `logout`, session handling, or `mapUserFromApi`.
- Do not touch any host app in this WO. The four header rewires are separate small WOs, one per app.
- Do not change `NotificationBell` or the notification feed.
- Do not add a permission model, a routing table, or an i18n catalogue to ucm.

## RISKS
- **Profil goes from one tap to two** in every app, including the three whose avatar is a direct link
  today. On mobile that is felt. It is the price of the consolidation and must be stated in the
  completion note, not discovered by users.
- **The benefit only materialises per app.** ucm exports nothing header-shaped today, so there is no
  single place to switch over — the component lands, then four hosts adopt it individually.
- **"Looks universal" is not a check.** An earlier version of the prototype had *Benachrichtigungen* as
  a ucm built-in. In fact **only jg** embeds `NotificationSettings`, and `?tab=notifications` exists
  only there — three apps would have got a menu entry pointing at a route they do not have. Verify
  every built-in against all consuming apps before making it a built-in.
- **hram is unverified.** Do not claim four apps benefit until someone has looked at hram's shell.
- A menu is a focus trap if built carelessly: keyboard operation, `Escape`, click-outside and focus
  return to the trigger all have to work. `ui_reviewer` should check this specifically.

## REQUIRED TESTS TO WRITE
Narrow and behavioural. Do NOT run the full suite.

1. With no `items` and no overrides, the menu renders identity, Profil and Abmelden — the zero-config
   path two of four apps will use.
2. Abmelden calls `AuthContext`'s `logout`. Assert the call, not merely that the item rendered.
3. Profil navigates via `resolveLink` to `/account` by default, and to an override when given.
4. Host `items` render in their slot with their `onSelect` invoked on click — and **Abmelden is still
   the last item** with host entries present. That ordering assertion is the guard against hosts
   drifting apart.
5. Keyboard: the trigger opens the menu, `Escape` closes it and returns focus to the trigger.
6. The avatar renders correct initials from `first_name`/`last_name`, and falls back to `username` when
   names are absent.

**Non-vacuity:** test 4's ordering assertion must fail if host entries are appended after Abmelden;
test 2 must fail if `logout` is stubbed out.

## TEST SCOPE FOR THE GATE (orchestrator)
The new component's tests plus whatever covers `AuthContext` and `NotificationSettings` if scope E is
included. Not the full suite.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main` (or `develop` if present). Publish per
the repo's release flow; host pin bumps and header rewires are separate work.

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`, or `develop` if present).
> Work order: `work-orders/SHELL-1.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> **Design is settled against an interactive prototype — do not renegotiate the boundary.** ucm owns the
> avatar, the menu, Profil (`/account`) and Abmelden. The host passes only account-related entries,
> already permission-filtered and already translated. **The context/structure picker never enters this
> menu** — spesix's `activeSchoolId` drives 13 files and jg's `selectedEventId` 18; it re-scopes the
> whole app and must stay a permanently visible control of its own.
>
> Two traps, both already paid for elsewhere in this estate: **do not make an entry a built-in without
> verifying it in every app** (an earlier prototype had Benachrichtigungen as shared — only jg has it),
> and **labels arrive as finished strings, never i18n keys** (dcm MSG-13 is currently broken for exactly
> that reason).
>
> Expected integration for spesix and survey_app is `<UserMenu resolveLink={navigate} />` and nothing
> else. Scope E depends on dcm MSG-13's preference landing — if it has not, ship A–D and say so.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
