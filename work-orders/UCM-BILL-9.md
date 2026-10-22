# UCM-BILL-9 — Compact access column and icon delete in the user list

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/billing`, `src/components/UserListComponent.jsx`), visible in every app
that uses the user list.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Prototype:** [UCM-BILL-9-access-column.html](assets/UCM-BILL-9-access-column.html) (approved by the operator
2026-10-22).

### Goal and expected outcome

The operator found the access column of the user list far too wordy (2026-10-22): each row shows a sentence such as
"Subscription personal_monthly · until November 19, 2026" plus a switch carrying its own label "Access enabled without
a subscription", and the delete action is an outlined text button. Expected outcome: a short coloured status, a
separate narrow switch column without a visible label, and an icon delete button — as in the prototype, and as the
MAANA-APP-8 prototype already intended.

### Settled decisions (operator, 2026-10-22)

1. **Access** is a short status badge, one line: "Freigeschaltet" (free access), "{Planname} · bis {Datum}"
   (subscription), "Team · bis {Datum}" (team seat), "Schreibgeschützt" (no access or read-only), "Betreiber" where the
   account is an operator. The plan is shown by its display name as the app names it, never by its key; dates use the
   short numeric locale format. Colours as the prototype (existing tokens: success for subscription, primary for free
   and team, warning for read-only, neutral for operator).
2. **"Ohne Abo"** is its own narrow column holding only the free-access switch; the switch has no visible label (the
   accessible name and a tooltip keep "Ohne Abo freigeschaltet – {Name}"). Rows with a subscription, a team seat or
   operator status show "–" instead of the switch. The grant dialog with its required reason and the revoke dialog are
   unchanged.
3. **Delete** is an icon button (trash) with the tooltip and accessible name "Löschen – {Name}", in every app using the
   user list; the confirmation and the rules for who may delete stay unchanged; the own row stays disabled.

### Scope and acceptance

`BillingAccessCell`/`accountAccessText`, `FreeAccessSwitch` presentation, the access and switch columns as offered to
the user list, and the delete action of `UserListComponent`; DE and EN; desktop and phone (the table keeps scrolling
horizontally on a phone). Accepted when the prototype renders equivalently at 375 and 1280 px.

### Non-goals and do-not-touch

Grant and revoke logic and API, permissions for deleting or granting, other row actions, the other columns, the
operator overview page.

### Risks

Apps that pass their own row actions keep their buttons; only the built-in delete changes. A missing plan display
name must fall back to a neutral label, never to the raw key.

### Required tests to write

Status text per access source (free, subscription with plan name and date, team, read-only, operator); switch column
shows the switch only for free and read-only rows, "–" otherwise, with its accessible name; the grant dialog still
requires a reason; delete is an icon button with its accessible name, disabled on the own row, confirmation unchanged.

### Visual specification

Prototype above. **Token delta:** none. **Copy:** "Freigeschaltet", "Team", "Betreiber", "bis {date}", column header
"Ohne Abo", "Löschen – {name}"; English equivalents ("Free access", "Team", "Operator", "until {date}", "No
subscription", "Delete – {name}").

## Part B — Implementation map (implementer)

Placeholder — dispatch-blocking. To be filled by the Orchestrator.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1 approved by the operator on 2026-10-22 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`; 375/1280 comparison
against the prototype. Runs after UCM-CHAT-7 in the same session; publish a minor release and report the version
(Maana adopts it with MAANA-CHAT-15 or the next pin bump).
