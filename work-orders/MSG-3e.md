# MSG-3e — per-candidate scope in `DirectMessageLauncher`

Status: planned · Tier 2 · Target repo: `ui-core-micha` (main)

---

## Part A — Envelope (2026-08-02)

### Goal

Let a host present **one flat direct-message picker whose candidates live in different messaging
scopes**. Today `DirectMessageLauncher` takes a single `scope` prop and applies it to every candidate,
so a host with people spread across several scopes must either render one launcher per scope or
re-implement the component.

### Why now

jg-ferien MSG-6 turns `/messages` into a global inbox across **all** of a user's events. In jg's model a
direct conversation is scoped to an event, so a flat "everyone I may DM" list carries a **different
scope per person** — the operator's explicit requirement ("DM über alle, Gruppen pro Event"). Without
this seam jg would have to copy ~90 lines of this component locally, which AGENTS.md's
reuse-before-reimplement rule exists to prevent. The need is generic: any host whose people span
multiple scopes hits it.

### Expected outcome

`candidates[n].scope` (optional) takes precedence over the `scope` prop **for the selected candidate
only**. Precisely:

| selected candidate's `scope` | `scope` prop | scope sent to `createDirectConversation` |
|---|---|---|
| present | present | the candidate's |
| present | absent | the candidate's |
| absent | present | the prop's (today's behaviour) |
| absent | absent | no `scope` key in the payload at all (today's behaviour) |

Strictly additive and backward compatible: a host that passes no per-candidate scope sees byte-identical
behaviour. Note the last row — the current code omits the key entirely rather than sending
`scope: null`, and that must not change; dcm distinguishes the two.

### Scope / non-goals

In scope: `src/messaging/DirectMessageLauncher.jsx` and its test file.

Explicit non-goals — do **not**:
- change the dialog's layout, copy, i18n keys, or a11y semantics;
- add grouping, sectioning, or per-candidate secondary text (a scope is not a label — jg groups its
  *group* picker by event locally, and that stays a host concern);
- touch `MessagingProvider`'s `openDirectConversation` signature or any other component;
- validate or interpret the scope value — it is an opaque host-supplied identifier, passed through.

### Tier

Tier 2. Shared-core (`ui-core-micha`) is excluded from the Tier-1 fast path by AGENTS.md regardless of
diff size, so this one-line-of-logic change gets a WO, Codex-first, and a mandatory independent review.

### Tests to WRITE (scoped — run only these)

Extend `tests/messagingDirectMessageLauncher.test.jsx`:

1. **per-candidate scope wins** — candidates `[{id: 2, display_name: 'Alex', scope: 'scope-a'}, {id: 3,
   display_name: 'Sam', scope: 'scope-b'}]`, launcher `scope="scope-prop"`; select Sam, start; assert
   `createDirectConversation` called with `{target_user_id: 3, scope: 'scope-b'}`.
2. **fallback to the prop** (regression) — a candidate without its own `scope` in the same mixed list
   still sends the prop's scope.
3. **neither present** — no `scope` key in the payload (`expect(Object.keys(payload)).toEqual(
   ['target_user_id'])` or equivalent — asserting absence, not `undefined`).

The three existing tests in that file must keep passing unchanged; they are the backward-compatibility
proof and must not be edited to accommodate the change.

Command: `pnpm vitest run tests/messagingDirectMessageLauncher.test.jsx`

### Release

One version bump `2.19.0` → **`2.20.0`** (minor: additive, backward-compatible) + npm publish at WO end.
jg-ferien MSG-6 pins this version, so the publish is the precondition for that WO's final test run.
Per `reference_dcm_ucm_publish_topology`: publish-from-main, and the target version must be verified
live on the registry before jg bumps its pin.

### Risks

Low. The one real trap is the "absent/absent" row above — a naive `scope: candidate.scope ?? scope`
inside the object literal would start sending `scope: undefined`, which serialises differently and
changes an existing contract. Build the payload conditionally, as the current code already does.

### Execution directive

**If you are the implementer reading this as your own spec, this section is not addressed to you — it
tells the Orchestrator how to invoke you. You ARE that invocation: do not shell out to `codex exec`.**

Orchestrator: implement through `codex exec` in the background, invoked **directly via Bash** (never the
`debugger`/`*_coder` Agent wrappers), with **both** flags `--skip-git-repo-check` and
`--dangerously-bypass-approvals-and-sandbox`, the WO passed as a positional argument from this committed
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit; if the
fallback is used the Orchestrator becomes author and an independent `reviewer` is mandatory.

### Mini-handover (pastable)

Orchestrator: implement `work-orders/MSG-3e.md` in `ui-core-micha` (main). `git pull` first, read the WO,
then follow `orchestrate-codex` (Codex-first, own independent review, publish 2.20.0 at WO end).

---

## Part B — Implementation map (Orchestrator)

**Single chunk.** **Target repo working directory:** `C:\Users\Micha Bigler\Documents\webapps\ui-core-micha`
(repo root). Work from this package; open only the named files to verify.

### The one file that changes

`src/messaging/DirectMessageLauncher.jsx` — 96 lines, whole file is in scope but only `start()` and one
derivation change.

Current state (verified while scoping, do not re-derive):

- `:25` — `export function DirectMessageLauncher({ candidates = [], scope, onOpen })`.
- `:31` — the component tracks **only** `selectedId`, never the selected candidate object. A lookup is
  therefore needed; mirror the pattern jg already uses in its own `AllGroupsLauncher`
  (`jg-ferien/frontend/src/pages/messaging/AllGroupsLauncher.jsx:40-44`):
  `const selectedCandidate = useMemo(() => candidates.find((c) => c.id === selectedId) || null,
  [candidates, selectedId]);` — `useMemo` is not yet imported in this file (`:1` imports `useId, useState`).
- `:44-60` — `start()`; the payload is built at `:49-52`:
  ```js
  const conversation = await openDirectConversation({
    target_user_id: selectedId,
    ...(scope == null ? {} : { scope }),
  });
  ```
  This spread-or-nothing shape is the invariant the third test pins: when there is no scope the key is
  **absent**, not `undefined`. Keep the shape; only the value fed into it changes:
  `const effectiveScope = selectedCandidate?.scope ?? scope;` then `...(effectiveScope == null ? {} :
  { scope: effectiveScope })`. `??` (not `||`) so a falsy-but-valid scope id survives.
- `:75-82` — the `ListItemButton` render loop; **do not** change it. Candidate rendering already falls
  back through `display_name || name || label || id` and the scope must not appear in the UI.

### Invariants / do-not-touch

- `extractApiErrorMessage` error path (`:55-59`) and the `starting` guard stay exactly as they are.
- `openDirectConversation` comes from `useMessaging()` (`:19, :27`) — its signature is dcm's contract,
  unchanged.
- `src/index.js:72` already exports the component; no export change.
- No new i18n keys (`MessagingDirect.*` set is complete for this change).

### Docs

`docs/messaging-deviations.md` currently has zero BLOCKED entries (MSG-3d closed them) — this WO adds no
deviation and must not add a row. If the repo carries a prop-level API note for this component, update it;
if not, do not invent a docs file.

### Progress contract

Emit a `PLAN: …` line first, then a single-line `PROGRESS: [n/total] <action>` before every relevant
action and `… done` on completion, no gap > ~2 min, unbuffered stdout, and exactly one final
`RESULT: DONE|BLOCKED <reason>`.

### Constraints for the implementer

The WO text is the COMPLETE spec. Read `AGENTS.md` and `.codex/skills/frontend-engineering` only for
conventions. Stay in scope. Do not touch the Core-Behaviour approval surfaces. Do not update `MEMORY.md`.
Do **not** `git add/commit/push` — leave the diff for the Orchestrator's review. Do **not** bump the
version or publish — the Orchestrator owns the release. WRITE the three tests above and RUN ONLY that one
test file; no full suite, no self-review — the Orchestrator owns the authoritative run and the
independent review, and those are the gate.
