# UCM-SHELL-9 — AccountPage: app-defined groups, labels, order and visibility

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (account hub of every app); additive, default unchanged.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Consumer:** MAANA-APP-28 decision 2 (prototype `maana/work-orders/assets/MAANA-APP-28-collaboration.html`).

### Goal and expected outcome

MAANA-APP-28 (operator, 2026-10-25) needs Maana's account hub grouped as **Persönlich** (Profil, Sicherheit, Abo und
Token), **Zusammenarbeit** (Teams, Einladen), **Hilfe** (Support) and an operator-only **Betrieb** group. Measured
against ui-core-micha 4.20.0 (`dist/pages/AccountPage.js`): the group definitions are hard-coded in the order
my-account, management, help; extra tabs may join only those keys, anything else falls into a trailing "more" group;
the labels come from fixed `Account.GROUP_*` keys that an app cannot override because ucm's translations are merged
after the app's; built-in tabs (profile, security, users, invite, support) are bound to their groups. Expected outcome:
an app can declare its own groups and place built-in and extra tabs in them; apps that declare nothing see today's hub.

### Settled decisions (operator, 2026-10-25)

1. An optional `groups` declaration on `AccountPage`: each group has a key, a label supplied by the app, an order and
   an optional visibility rule (for example operators only); a group without visible tabs stays hidden as today.
2. Built-in tabs (profile, security, users, invite, support) can be assigned to any declared group; `extraTabs` can
   join any declared key. Their own permission checks (for example the invite right) stay unchanged.
3. Without the declaration, groups, labels, order and placement are exactly today's for every app.
4. Maana's use (for orientation, not built here): Persönlich (profile, security, Abo und Token), Zusammenarbeit (Teams,
   invite — invite stays visible to everyone with the invite right, operator decision 2026-10-25), Hilfe (support),
   Betrieb visible to operators only (users, Abo-Übersicht, Alle Projekte, Alle Teams, Assistent, Transkription).

### Scope and acceptance

`AccountPage` (and its tab/group rendering on desktop and phone); DE and EN; documented with an example. Accepted when
Maana can render the four groups in that order with its own labels and an app without the prop is unchanged.

### Non-goals and do-not-touch

Tab contents, permissions and roles, the user list, Maana's wiring (MAANA-APP-28), the translation merge order.

### Risks

Deep links by tab value (`?tab=`) must keep working whatever group a tab is in.

### Required tests to write

Declared groups render in the given order with app labels; built-in tabs move into declared groups; an extra tab joins
a declared group; an operator-only group hides for a non-operator; an empty group hides; `?tab=` selects a moved tab;
no declaration renders today's groups and labels.

## Part B — Implementation map (implementer)

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: covered by the operator's approval of MAANA-APP-28 on 2026-10-25 (its decision 2 needs it; the operator
decided the placement of "Einladen" the same day in the Maana Expertenchat, session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`. Publish a minor release and
report the version.
