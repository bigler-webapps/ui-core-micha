# SHELL-2 — AccountPage: from a horizontal tab strip to a grouped sidebar + mobile drawer

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 2 (shared core)
**Review:** independent `reviewer` (Sonnet, full) **and** `ui_reviewer` — spawned concurrently, both mandatory before commit
**Prototype (visual spec):** [`work-orders/assets/SHELL-2-account-navigation.html`](assets/SHELL-2-account-navigation.html)

---

## A. Envelope

### Goal

Make `AccountPage` usable on a 375 px viewport, and give the account surface the same
navigation pattern the estate already uses in jg-ferien's `EventInfoPage`.

Expected outcome: the horizontal tab strip is gone. On desktop the sections live in a
sticky, grouped sidebar; on mobile they live in a bottom drawer opened by an in-page
trigger bar. The users section renders cards instead of a table below `md`.

### Measured evidence (2026-08-08, live at 375 px)

Measured in a running cockpit (which mounts ucm's `AccountPage` at `/account`), with the
host header neutralised so the numbers describe ucm alone:

- All six sections render without document overflow — `AccountPage` itself does **not**
  break the layout at 375 px.
- The tab strip: scroller `clientWidth` 343 vs `scrollWidth` 589, `overflow-x: auto`,
  246 px of scroll travel, and **`scrollButtons: 0`**. At rest, Profil / Sicherheit /
  Benutzer / Einladen are reachable; Support and the consumer-injected section are off
  screen with no arrow, no fade, no hint that they exist. This is a discoverability
  failure, not a reachability failure — the tabs do respond to a horizontal swipe.
- The users table: 1045 px of content inside a 341 px `MuiTableContainer` with
  `overflow-x: auto`. One third is visible. The `Aktionen` column sits roughly 700 px to
  the right. Column `minWidth` values: E-Mail 220, Name 180, Neu 90, Letzte Anmeldung 120,
  Rolle 180, Aktionen 220.
- Interactive controls on the auth pages measure 34–36 px tall, below the 44 px touch
  target guideline. In scope only where this WO touches the control anyway.

### Scope

**A. Section navigation — both halves of the jg-ferien pattern**
(reference: `jg-ferien/frontend/src/components/EventInfoHub/SectionSwitcher.jsx`,
driven from `jg-ferien/frontend/src/pages/EventInfoPage.jsx:1126-1159`)

- **`md` and up:** a CSS grid `280px minmax(0, 1fr)`. Left, a sticky vertical section list
  grouped under headings — per group an outlined `Paper` with a heading row and a `List` of
  `ListItemButton`, the active entry in the `selected` state. Right, the section content
  with `minWidth: 0`.
- **Below `md`:** the content spans the full width. The grouped list moves into a bottom
  `Drawer`: top corners rounded 18 px, `maxHeight: 78dvh`, bottom padding
  `max(16px, env(safe-area-inset-bottom))`, a title row, list scrolls inside.
- **The trigger** — the part the reference does not supply. In jg-ferien the button that
  opens the drawer lives in that app's own page header; `AccountPage` has no header of its
  own (the consuming app provides it), so the trigger must live inside `AccountPage`. Per
  the prototype: a full-width 56 px bar at the top of the content, showing a small "Bereich"
  caption above the current section name, with a trailing chevron.

**B. Grouping, and the `extraTabs` extension**

- Fixed groups owned by ucm, in this order: `Mein Konto` (profile, security) ·
  `Verwaltung` (users, invite) · `Hilfe` (support) · `Weitere` (catch-all, last).
- `extraTabs` entries gain an **optional** `group` field. An entry without `group` falls
  into `Weitere`. Every existing call site keeps working unchanged — this is additive only.

**C. Users section: table to cards below `md`**

- At `md` and up the table stays exactly as it is, columns and `minWidth` values unchanged.
- Below `md`, one card per user carrying the same fields as a row — email, name, the "Neu"
  flag, last login, role, actions — with the actions reachable without horizontal scrolling
  and with touch targets of at least 44 px.

**D. Version**

- Bump to `2.30.0`. Minor rather than patch because `extraTabs` gains a new public field;
  additive API is a minor under semver.

### Non-goals / do not touch

- Pagination or filtering for the user list. Absent today, absent in the prototype,
  explicitly not part of this WO — do not add it "while in there".
- The internal content of the Profil, Sicherheit, Einladen, Support and consumer-injected
  sections. Only their placement in the navigation changes.
- The access-code, QR-signup and invite management components.
- The six auth pages (Login, SignUp, SignupConfirm, PasswordChange, PasswordResetRequest,
  PasswordInvite). Measured clean at 375 px; out of scope.
- Messaging, notifications, charts, onboarding.
- The consuming apps. No host repo is touched by this WO — in particular **cockpit's header
  is a separate work order**; its toolbar is what inflates the document to 498 px on every
  route, including `/account`, and fixing it here would be out of scope.
- No behaviour change, no permission change, no data-contract change (parity guardrail).

### Replaces / removes — within the prototype's declared coverage

The prototype is the visual spec; **this list, not prototype silence, is the removal
authority.** Everything named here must be gone when the WO is done:

1. **The horizontal MUI `Tabs` strip — on desktop as well as mobile.** It is replaced by
   the sidebar (desktop) and the drawer (mobile). Keeping it at any breakpoint means the
   WO is not done. The operator was asked about this specifically and chose both halves.
2. **On mobile, the section-title heading below the trigger bar.** The trigger bar is the
   sole carrier of the current section name there. Do not re-add it as a "missing" heading.
   Desktop keeps its section heading, because desktop has no trigger bar to carry the name.
3. The scrollable-tabs affordance question disappears with the strip — do not "fix" it by
   adding scroll buttons or a fade to something that no longer exists.

A redesign is a subtraction task. If the finished screen carries more UI than it does
today, that is a stop signal, not thoroughness.

### Deliberately keeps — undrawn in places, but must survive

- **The `?tab=<value>` URL contract** (`src/pages/AccountPage.jsx:60`), including the
  fallback to `profile` when the value is unknown *or* not permitted for the user
  (`:180-186`). Cockpit's `/user-management`, `/profile` and `/change-password` redirects
  depend on it. This is the single most breakable thing in the WO.
- The `?from=recovery` and `?from=weak_login` entry states (`:64-65`).
- The full `extraTabs` contract (`:146-155`): `value`, `label` as a string **or a function**
  receiving `{ user, perms, isSuperUser, t }`, `visible(context)`, `render`. Extended by
  `group` only; nothing removed, nothing made required.
- The permission-conditional section list: `users` on `canViewUsers`, `invite` on
  `canViewInvite`, `support` on `isSuperUser || perms.can_view_support`, profile and
  security always (`:127-144`). The section list is per-user and can be as short as two
  entries.
- `WidePage` as the page container, and its title.
- The desktop section heading above the content.
- The users table's column set and `minWidth` values at `md` and up.
- No standalone "Übersicht" entry above the groups. jg-ferien has one; `AccountPage` has no
  overview screen for it to point at, so none is invented. Navigation starts at the first
  group. Settled with the operator.

### Risks

- **No staging net.** This repo has no `develop`. A push to `main` that touches `src/**` or
  `package.json` publishes to npm immediately via `.github/workflows/publish.yml`. The
  independent review is the only gate before publication — it is not back-fillable.
- **Fourteen consumers inherit the desktop change** on their next pin bump. Nobody is
  forced: every consumer pins an exact version (eight sit on 2.4.5). Only cockpit is
  expected to bump soon, and that bump belongs to cockpit's own WO.
- **`AccountPage` has zero tests today.** None of the 20 files under `tests/` touches it or
  `UserListComponent`. The `?tab=` contract is currently unguarded, so a regression there
  would surface first as three broken redirects in cockpit, silently.
- **Drawer stacking.** jg-ferien had to raise its own `SectionSwitcher` drawer to
  `theme.zIndex.drawer + 3` to clear its bottom navigation bar. ucm has no bottom nav, but a
  consuming app may — the drawer must not assume it is topmost, and must not hard-code a
  value that fights a host's own layering.
- **Safe-area insets are inert without `viewport-fit=cover`.** jg-ferien uses
  `env(safe-area-inset-bottom)` while its `index.html` omits `viewport-fit=cover`, so those
  insets resolve to zero there. Copy the padding by all means, but do not assume it is
  doing anything, and do not change any consuming app's viewport meta tag from here.

### Tests to write

Narrow and new — both files are new; there is nothing to extend. Written as part of the
implementation, run by the Orchestrator.

**`tests/AccountPage.test.jsx`**

1. The grouped list renders: the four groups in fixed order, each built-in section under
   its declared group.
2. `?tab=users` activates the users section.
3. `?tab=<unknown>` falls back to `profile`.
4. `?tab=users` for a user **without** `canViewUsers` falls back to `profile` — the
   permission fallback, not just the unknown-value one.
5. A short permission set (profile + security only) renders a two-entry list without an
   empty `Verwaltung` or `Hilfe` group heading.
6. `extraTabs` without `group` lands in `Weitere`; with `group: 'Mein Konto'` lands there.
7. `extraTabs` with a **function** `label` and with `visible()` returning false are both
   still honoured (guards the contract this WO extends).
8. Below `md`: the trigger bar renders and names the current section; the duplicate section
   heading is **absent** (assert its absence explicitly — this is a removal).
9. At `md` and up: the sidebar renders and no trigger bar is present.

Mock the breakpoint per this estate's established pattern —
`vi.mock('@mui/material/useMediaQuery')` with a per-test return value, as
`jg-ferien/frontend/src/components/Header.test.jsx` does.

**`tests/UserListComponent.test.jsx`**

10. At `md` and up: a table with the six columns.
11. Below `md`: one card per user, each carrying email, name, the "Neu" flag, last login,
    role and the actions; assert there is no horizontally scrolling container.

Prove non-vacuity for at least tests 4 and 8 by temporarily removing the corresponding
behaviour and confirming the test fails.

### Parity guardrail

The prototype is the visual and UX spec. Visual/UX only: **no behaviour, no permission, no
data-contract change.** `ui_reviewer` checks it in both directions — everything in the
prototype present, and nothing outside it surviving. Because this is a visual redesign,
before the WO is marked done the Orchestrator asks the operator to run a side-by-side of
the built screen against the prototype; surviving legacy has repeatedly slipped past a
static diff review in this estate.

### Preconditions

None. This WO is independent of cockpit's navigation WO and can land first.
