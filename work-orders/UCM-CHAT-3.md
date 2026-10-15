# UCM-CHAT-3 — Extension points on the shared chat surface: scope, side panel, per-answer content, composer extra, app frames, compact layout

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`). Stage 2 of the shared chat: it prepares `maana/MAANA-CHAT-11`. Backend counterpart: `django-core-micha/DCM-CHAT-10`.

# A. Envelope — addressed to everyone

## Goal and expected outcome

The shared chat surface from `UCM-CHAT-1` is a closed component: an app mounts it and gets list, thread, composer and picker. maana's chat (`maana/frontend/src/qda/assistant/`) needs domain UI around and inside that surface:
- a permissions panel next to the thread;
- proposal cards and plan steps under an answer;
- a read-scope summary and a context check above the input;
- a compact variant inside the Coding tab;
- chats per project.

Expected outcome: the surface offers optional extension points through which an app adds such UI without copying or forking the surface. An app that uses none of them, such as cockpit, sees no change.

## Operator decisions this Envelope records (2026-10-15)

- maana moves onto the shared surface (`MAANA-CHAT-11`). The extension points are generic; nothing maana-specific lives in ui-core-micha.
- No prototype. The visual reference for the composed result is maana's current chat UI, plus the shared surface's own spec (`work-orders/assets/UCM-CHAT-1-ai-chat.html`).

## Scope

- **Scope:** an optional `scope` prop. The chat list, the creation of chats and the status request use it, following `DCM-CHAT-10`.
- **Unavailable state:** when `status/` reports `unavailable` with a reason, the surface shows its unavailable state. The text comes from the app, through a reason-to-text mapping prop; there is a generic fallback.
- **Side panel slot:** an optional render slot next to the thread. It receives the current chat. At narrow widths, and in the compact layout, it opens as a sheet from a button in the thread bar.
- **Per-answer slot:** an optional render slot under each assistant answer. It receives the turn and the app frames that belonged to that turn. maana uses it for proposal cards and plan steps.
- **Composer slot:** an optional render slot directly above the input. It receives the current chat.
- **App frames:** an optional callback receives every `{"type":"app"}` frame from `DCM-CHAT-10` with its name and payload. Frames are also handed to the per-answer slot of the turn they arrived with.
- **Notices:** the `history_trimmed` notice from `DCM-CHAT-10` shows as a quiet chip in the thread, with the number of left-out turns.
- **Compact layout:** an optional variant for narrow containers, such as maana's Coding-tab panel.
  - The list becomes a drawer, the side panel a sheet, and the picker a sheet.
  - The variant follows the container width, not only the viewport.
- **Strings:** new strings are registered through the existing i18n contract in all four languages.

## Copy list (released with this Envelope)

- The generic unavailable fallback: "The assistant is not available here."
- The history chip: "{count} earlier messages left out", with singular and plural forms.

App-supplied texts, such as maana's unavailable reasons, are the app's copy and not part of this list.

## Token delta list

None. All colours, type and radii come from the consuming app's theme, as in `UCM-CHAT-1`.

## Replaces / removes

Nothing. The extension points are additive.

## Non-goals

- Any maana component (permissions panel, proposal cards, plan steps, context dialog) inside ui-core-micha.
- Changes to the picker, Markdown rendering or the socket protocol beyond the `app` frame and the `history_trimmed` notice.
- Mounting the surface in maana (`MAANA-CHAT-11`).

## Tier

Tier 3: a change inside shared-core.

## Risks

- **Regression for cockpit:** with no new props, the surface must render and behave exactly as 4.0.x. Tests pin this.
- **Slot content and the surface's state:** slot content renders inside the surface but owns its own state. Changing chats remounts it, so one chat's content never shows in another.

## Required tests to write

- Without any new prop, the existing chat surface tests pass unchanged.
- `scope` is sent on list, create and status.
- An `unavailable` status renders the app's reason text, and the fallback renders when no mapping is given.
- The side panel slot renders next to the thread and as a sheet in the compact layout.
- The per-answer slot receives its turn and only that turn's app frames.
- The composer slot renders above the input.
- The app-frame callback receives each `app` frame once.
- The `history_trimmed` chip shows the count.
- Switching chats remounts the slots.
- Every new translation key exists in all four languages.

# B. Implementation map — addressed to the implementer

*To be filled by the Orchestrator.*

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Minor release. Can be built against the `DCM-CHAT-10` contract in parallel; `maana/MAANA-CHAT-11` mounts it. Use ucm's own CI (`ci.yml`, UCM-CI-1) on a `ci-test/<ID>` ref for the full suite before publishing.
