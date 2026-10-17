# UCM-BILL-7 — Extra account tabs can join a navigation group

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared-core (`ui-core-micha`), account page.
**Repository:** `bigler-webapps/ui-core-micha`, trunk `main`; released as a minor version.
**Precondition:** none (independent of UCM-BILL-6).

### Goal and expected outcome

The operator-approved prototype `maana/work-orders/assets/MAANA-APP-8-subscription.html` (2026-10-17) shows the
account navigation as „Profil, Sicherheit, Abo" in one group. `AccountPage` builds its navigation groups itself
and puts every app-provided extra tab into the group „Weitere" (`Account.GROUP_MORE`), so Maana's „Abo" lands
there. Expected outcome: an app can place an extra tab into one of the kit's groups.

### Settled decisions (operator, 2026-10-17)

1. An entry of `extraTabs` accepts an optional `group` naming one of the kit's existing navigation groups
   (the account group that holds Profil and Sicherheit, and the others the kit defines); with it the tab
   appears in that group after the kit's own tabs; without it, or with an unknown group, it stays in
   „Weitere" as today.
2. Additive only: no change to the kit's own tabs, their order or labels.

### Scope and acceptance

The optional `group` on extra tabs, documented in the README/CHANGELOG; desktop sidebar and phone navigation
of the account page.

### Non-goals and do-not-touch

The tabs' content, the billing components, new groups, reordering the kit's tabs.

### Risks

An app passing a misspelled group would silently land in „Weitere"; that is the intended safe fallback.

### Required tests to write or update

An extra tab with `group` set to the account group renders in that group after Profil and Sicherheit; without
`group` or with an unknown one it renders under „Weitere"; phone navigation follows the same placement.

## Part B — Implementation map (implementer; Orchestrator completes before dispatch)

Placeholder — dispatch-blocking.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

Gate #1: covered by the operator's approval of the prototype on 2026-10-17 (account navigation „Profil,
Sicherheit, Abo"); registered by the Maana Expertenchat (session local_cbfc9d51-5217-42a4-99ba-27a315c854ce)
from the MAANA-APP-8 post-landing comparison. Seam: `pages/AccountPage.jsx` (`groupDefinitions`,
`Account.GROUP_MORE`). Tier 3: all lenses plus `ui_reviewer`. Consumer: MAANA-APP-9 passes `group` for „Abo".
