# MSG-3 — ucm messaging surfaces (full parity)

Status: planned · Tier 2 · Target repo: `ui-core-micha` (main)
**Binding spec:** `django-core-micha/docs/design/messaging-platform.md` — especially §ucm surface,
§REST contract, §Realtime, §Notification contract. On any conflict the design doc wins; deviations
from it are an operator scope change, never a silent edit.

Canonical register row: `django-core-micha/WORK_ORDERS.md` (the `MSG-*` workstream register). This
repo carries the ucm-side mirror row.

---

## Part A — Envelope (Expertenchat, 2026-07-31)

### Goal

Build the shared messaging surfaces in ucm against the dcm messaging domain published in 2.36.1, so
that a consuming app gets a complete chat UI by mounting a provider and a few components, and supplies
only routing, display placement and scope pickers itself — never a forked state machine.

### Two operator decisions that shape this WO (2026-07-31)

**1. Redesign is permitted — but no feature may be lost.** jg's current messaging UI is *not* a
verbatim visual target: where it grew organically across MSG-B1..B4, MSG-UX and MSG-DIALOG-1, MSG-3
may lay it out and structure the interaction better. The licence covers **layout, composition,
visual language and interaction flow**. It does **not** cover the feature set: the design's paper
test ("No jg feature is lost") stays binding, and dropping or degrading a capability is a scope
change back to the operator, not a design choice.

Because "redesign allowed" is easy to over-read, the WO carries a hard deliverable:
**a written deviation list** — every behavioural difference from jg's current messaging UI, with a
one-line rationale each, committed alongside the code (`docs/messaging-deviations.md` or an appendix
in this file). "We changed nothing behaviourally" is an acceptable list; an absent list is not.
Consequence to record now: **MSG-5 therefore becomes a visible change for jg users**, not a silent
migration, and needs its own UX review at adoption.

**2. Validation runs through the DX-1 dev harness.** ucm had no way to render anything; DX-1 adds a
Vite dev page. MSG-3 is expected to **use** it: every surface gets a harness entry, and the redesign
is iterated there rather than asserted in jsdom.

### Expected outcome

Per design §ucm surface, a new `src/messaging/` subpackage mirroring the layout and conventions of the
existing `src/notifications/` subpackage (module layout, `src/i18n/<domain>Translations.ts`, flat
`tests/*.test.jsx`, additive barrel exports in `src/index.js` with an exports regression test):

- `MessagingProvider` + hook, an API adapter over the dcm REST contract, and a normalized cache.
- Realtime on **Layer 1**: `const { subscribe } = useRealtime()` — destructure it and depend on
  `subscribe`, never on the recreated context object (design §Realtime states this explicitly; it is
  a known footgun). Handle every frame the design lists, deduplicate by `event_id`, and refetch REST
  state and cursors on reconnect. **No second socket, no client→server WS.**
- `ConversationList`, `Thread`, `Composer`, `ReadTicks`, `ReactionBar`, `PollCard`, `AttachmentList`,
  config and per-conversation preference surfaces, and conversation launchers.
- Cursor pagination with infinite reverse scroll on thread history, from day one — the dcm contract
  is opaque signed cursors, **not** offset paging.
- Optimistic send: the composer writes a local row keyed by `client_request_id`, reconciles the REST
  response and the WS confirmation into exactly one row, and surfaces retry/error without duplicates.
- Labels, status text and validation messages in **de/en/fr**.
- Host apps supply routing, display placement and scope pickers; ucm supplies the state machine.

### Parity inventory — the files that define "no feature lost"

The deviation list must be built against **all** of these, not just the obvious component folder:

| jg file | LOC | Note |
|---|---|---|
| `frontend/src/components/Messaging/Thread.jsx` | 2470 | the bulk: timeline, composer, replies, reactions, edit/delete, image upload, poll UI |
| `frontend/src/components/Messaging/ConversationList.jsx` | 166 | |
| `frontend/src/context/MessagingContext.jsx` | 184 | Layer-1 subscription + list/unread state |
| `frontend/src/components/Messaging/AnnouncementDialog.jsx` | 147 | broadcast/announcement composer incl. `link_target` deep-link |
| `frontend/src/components/Messaging/MessagingConfig.jsx` | 131 | per-scope config surface |
| `frontend/src/components/Messaging/NewDirectMessageDialog.jsx` | 103 | DM launcher — **the first-contact case MSG-2b unblocked** |
| `frontend/src/api/messagingApi.js` | 102 | |
| `frontend/src/components/Messaging/EmojiPickerButton.jsx` | 44 | |
| `frontend/src/components/Messaging/conversationHelpers.js` | 22 | |
| **`frontend/src/pages/MessagesPage.jsx`** | **310** | **easy to miss and NOT purely host-app routing** — see below |

~3700 LOC excluding tests.

**`MessagesPage.jsx` needs an explicit split.** It is nominally jg's page, but it embeds behaviour that
belongs to this WO's "conversation launchers": the unified conversation+group list that surfaces
*unopened* groups as clickable launch items, and broadcast-conversation auto-surfacing/auto-open via
the `?tab=broadcast` query parameter. The page shell (routing, placement, master-detail layout) stays
with the host app per design §ucm surface; **the launcher behaviour it currently embeds is ucm scope**
and must appear in the deviation list either as reproduced or as an explicitly surfaced deviation.
This file was missing from the first parity inventory and is exactly the shape of gap through which a
feature disappears with nobody deciding to drop it.

### Decomposition is a requirement, not a preference

jg's messaging UI is one 2470-LOC component with a 2173-LOC test file. **Reproducing that shape in ucm
is a scope violation, even if every feature is present.** The component list above is a set of binding
boundaries, not a suggested file layout. Concretely:

- **Each named component is a separately exported, independently mountable, independently testable
  unit** — not an internal helper reachable only through `Thread`. `Composer`, `ReactionBar`,
  `PollCard`, `AttachmentList` and `ReadTicks` must each stand on their own.
- **Domain state lives in the provider and its normalized cache; components read it through the
  hook.** Design §ucm surface says host apps get components, "not a forked state machine" — the
  corollary inside ucm is that subcomponents do not receive conversation/message state by
  prop-drilling through `Thread`. This is the actual cause of a 2470-LOC component, not the feature
  count. **This applies to domain state only** — conversations, messages, receipts, unread counts,
  poll results. Ephemeral UI state stays local to the component that owns it: composer draft text,
  upload progress, scroll and virtualization position, open menus, hover state. Lifting those into
  the provider would be a worse design, not a more compliant one.
- **Every component gets its own DX-1 harness entry, mountable standalone.** This is the forcing
  function: a monolith cannot be mounted piecewise, so the harness makes accidental re-monolithisation
  visible immediately rather than at review time.
- **Soft size trigger:** any single component file above ~400 LOC must be justified explicitly in that
  chunk's review. Not a hard cap — a deliberate, argued exception is fine, an unexamined 1500-line
  component is not.
- `Thread` itself owns the timeline and its virtualization/scroll behaviour. Composing, reacting,
  poll rendering, attachment rendering and receipt display are **collaborators it renders**, not
  responsibilities it absorbs.

The `ui_reviewer` pass at WO end covers this explicitly, alongside design-system consistency.

### Proposed chunk plan (staged commits, one independent review per chunk)

1. `MessagingProvider` + API adapter + normalized cache + Layer-1 subscription (frames, `event_id`
   dedup, reconnect refetch).
2. `ConversationList` + launchers + unread / archive / mute + list pagination.
3. `Thread` (timeline + scroll/virtualization only) + message rendering + one-level replies / thread
   view + infinite reverse scroll, with `ReadTicks` as a separate collaborator component.
4. `Composer` (optimistic send, retry/error) + attachment upload + `AttachmentList`.
5. `ReactionBar` + `PollCard` + config/preferences + i18n sweep + barrel exports + the deviation list.

The register estimates 3–5 chunks. **Treat that as a floor, not a ceiling** — the jg parity target is
~3700 LOC excluding tests, with `Thread.jsx` alone at 2470. If the work does not fit, split further
and say so; do not compress by dropping scope.

### Required tests to WRITE (scoped per chunk; the reconciliation set is mandatory)

- **Optimistic send reconciliation:** a REST confirmation and a WS frame for the same
  `client_request_id` produce exactly one message row — the classic duplicate-message bug.
- **`event_id` deduplication:** a repeated frame changes nothing.
- **Reconnect:** current list, open thread and unread count are refetched; no stale cursor is reused.
- **Pagination:** opaque cursor paging and reverse infinite scroll; a rejected cursor surfaces as an
  error rather than an empty thread.
- **Read ticks:** aggregate state renders; per-recipient detail appears only where permitted and
  **never for a direct conversation** — mirror the dcm carve-out on the client so the UI cannot imply
  a capability the API refuses.
- **Attachment upload errors** surface as user-visible validation, not a generic failure (the MSG-2
  chunk-4 lesson: a rejected upload must read as a rejection).
- **i18n coverage:** every new key exists in all three languages; no hardcoded user-facing string.
- **Exports regression:** the barrel exposes the new public surface, mirroring
  `tests/notificationsExports.test.js`. This doubles as the decomposition check — every named
  component must be individually exported and individually renderable in its own test, which a
  monolith cannot satisfy.
- Existing ucm suites (notifications, onboarding, auth, charts) stay green — this WO is additive.

Per AGENTS.md "Test scope", per-chunk runs stay scoped to that chunk; the WO-end gate is the
affected-area set (messaging + notifications, since both share the Layer-1 transport).

### Reviews

Beyond the standard independent `reviewer` per chunk, this WO explicitly carries **`ui_reviewer`** at
WO end — design-system consistency, reuse of existing ucm primitives, responsive behaviour, dark mode
and translation coverage. With a redesign licence in play, that pass is not optional.

### Non-goals / do-not-touch

dcm changes (small sibling contract fixes are in scope per the design's release plan, but a
behavioural change to the dcm domain is not); any app-side code; jg's existing messaging UI (untouched
until MSG-5); the jg data migration; search; typing indicators; client→server WebSocket; scanner
infrastructure; `src/notifications/` behaviour beyond additive reuse — the Layer-1 primitive is
consumed, not modified.

### Risks

- **Largest v1 block, built without a consumer.** MSG-5 is the first mount. The DX-1 harness is the
  only feedback loop until then, and a mock adapter can drift from the real contract — shape fixtures
  from the design doc's REST/realtime sections, not from imagination.
- **Redesign licence is the main scope risk.** Without the deviation list it silently becomes
  "reimplement approximately", and jg loses features nobody decided to drop.
- **Optimistic send** is where duplicate/ghost messages come from; it has a mandatory test above.
- **`useRealtime` misuse** re-subscribes on every render if the context object is a dependency — a
  documented footgun, called out in expected outcome.
- Estimate risk: see the chunk plan note.

### Preconditions

dcm messaging published (2.36.1, incl. MSG-2b) · **DX-1 done** (the harness this WO validates
against) · Approval Gate #1 for MSG-3 = operator go on this envelope.

### Release

One version bump + npm publish at WO end. No consumer pins are bumped here; MSG-5 picks the release
up via its own registry live-check before pinning.

### Execution directive

Implement through `codex exec` in the background — invoked **directly via Bash** (never the
`debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from a file;
fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit. One
invocation per chunk, each chunk left uncommitted for the orchestrator's independent review.

### Mini-handover (pastable)

Orchestrator: implement `work-orders/MSG-3.md` in `ui-core-micha` (main), chunk by chunk starting at
chunk 1. `git pull` first, read the WO + `django-core-micha/docs/design/messaging-platform.md`
(§ucm surface, §REST contract, §Realtime), then follow `orchestrate-codex` (Codex-first per chunk,
own review per chunk, `ui_reviewer` at WO end, one publish at WO end).

---

## Part B — Implementation map (Orchestrator)

To be filled by the Orchestrator session on `git pull`, within the envelope above.
