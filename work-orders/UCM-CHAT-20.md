# UCM-CHAT-20 — Refresh source-aware managed chat models

## A. Envelope

Tier 3. Shared UI slice of approved Bigler Consult BCO-UI-10, approved 2026-11-17. Existing open chat workspaces show the effective source and model choices from the released DCM managed catalogue contract. A valid explicit choice stays selected. If a choice is revoked, show the eligible standard supplied by the server. If none is available, show an unavailable selection and keep eligible explicit choices reachable. A change in the catalogue does not interrupt a running request. Preserve existing app labels, scope constraints, keyboard interaction and legacy catalogue behavior.

Refresh a managed catalogue when opening the picker and returning the document to the foreground. Update already-open foreground views often enough to meet the combined central-save-to-visible 30-second requirement. Suppress overlapping or stale responses across scope and chat changes. Handle repeated revocations in one open view. Show the source label when the same model name occurs under distinct approved account IDs. Use the existing picker. No admin UI, provider calls, new dependency, redesign or unrelated changes in this slice.

Required tests: legacy startup and picker refresh; managed foreground and return refresh, repeated revocation in an existing chat, valid explicit choice retention, missing standard without implicit fallback, same display name from distinct sources, out-of-order responses after switching chat, and preserving an in-flight request. The parent WO verifies the combined 30-second behavior against the released DCM and UCM versions.

## B. Implementation map

Target: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. Reuse `src/chat/ChatWorkspace.jsx` (`refreshCatalogue`, `catalogueChatId`, `shownChatId`, existing selection fallback and composer state), `src/chat/ModelPicker.jsx` (`validSelection`, radio navigation and row rendering), and `src/chat/api.js` (`getCatalogue`). Use existing i18n keys where possible. Update `tests/chatComposeStartCatalogue.test.jsx` and `tests/chatWorkspace.test.jsx` with fake provider-free catalogue fixtures. Use the effective catalogue contract from sibling WO `DCM-CHAT-20` once confirmed from its implementation. Preserve registered app overrides and local readiness checks. Do not make a client-side policy decision from a partial response.

Catalogue response: existing `entries` and `default` remain authoritative. Managed entries carry `source_id`, `source_label` and an opaque entry `id`; selection uses `entry` and `effort`, with source identity already encoded in the entry ID. The managed response adds `policy: {revision: number | null}` even when there are no entries or no valid stored revision. The unmanaged response omits `policy`. Retain that distinction while refreshing. Use the server default only when it is present and valid; do not silently write a policy fallback as an explicit user choice or auto-pick the first entry. An initial managed empty state must still refresh when the app is reachable.

### Implementer preamble

> First action from the workspace root: run `codex-hook-canary-ws-gov-60`. Expect `WS-GOV-60 canary: workspace hooks are active`. If absent, report unverified coverage once and proceed under the existing controls.
>
> Parts A and B are your complete scope. Read only scoped UCM conventions and `frontend-engineering`. Work on the named source and tests, preserve other changes, and write and run only the new or changed tests, once. No package managers, installs, dependencies, lockfiles, git operations, register edits, dispatch, acceptance, live calls or self-review. The Orchestrator owns authoritative verification, review and release. Begin with `PLAN: <steps>`, emit `PROGRESS: [n/total] <action>` and end once with `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## C. Orchestrator only

STOP — implementer, do not act on this section.

Verify the agreed catalogue payload against the DCM implementation before release. Verify the scoped chat UI tests and independent reviews. Coordinate release manifest ownership with UCM-AUTH-17 and UCM-DEP-4, and release the shared picker compatibly with the DCM contract before consumer pins. The visual acceptance of the Bigler Consult owner backoffice remains in BCO-UI-10.

## Gate record

Gate #1 approved by the operator in BCO-UI-10 chat on 2026-11-17. This is the UCM portion of the approved Envelope.
