# UCM-CHAT-8 — ChatWorkspace starts status, catalogue and chat lists together and takes a preloaded list

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: a chat surface opens one request level earlier, and an app that has already loaded the chat
  list does not load it again. From Tanzania every serial level costs at least ~0.33 s.
- Expected outcome:
  - On mount and on every scope change, `ChatWorkspace` starts the status request, the catalogue
    request and both chat lists (active and archived) at the same time, instead of starting the
    catalogue and lists only after the status has answered
    (`src/chat/ChatWorkspace.jsx`, the effect around the status request and `loadLists`).
  - If the status is not `available`, the catalogue and list answers are discarded and the surface
    shows the unavailable or error state exactly as today; nothing from them is shown.
  - A new optional prop lets the app hand over the active chat list it has already loaded for the
    same scope. When given, `ChatWorkspace` uses it instead of requesting the active list; the archived
    list is still requested. Without the prop, behaviour is today's apart from the earlier start.
  - Activating the host's chosen chat (and everything that follows from it) can therefore begin as
    soon as the status and the lists have answered, one level earlier than today.
  - The prop is documented in the chat section of the README and in the changelog; the release is a
    minor version.

## Background (measured 2026-10-22 from Tanzania, staging-maana)

maana's project page: `assistant/status` (level 3) -> then `assistant/chats/?archived=false` and
`?archived=true` plus the catalogue (level 4) -> then the chat's grants, turns (110 kB) and proposals
(level 5). maana also loads the active chat list itself to find its remembered chat, so the active
list is requested twice. Consumers of `ChatWorkspace`: maana (`qda/assistant/AssistantChat.jsx`) and
cockpit (`cockpit/AssistantPage.jsx`).

## Scope + non-goals

- In scope: the start sequence of `ChatWorkspace`, the preloaded-list prop, README and changelog.
- Decided in the requirements round (2026-10-22): parallel start plus an optional preloaded active
  list; the archived list keeps being requested by `ChatWorkspace`.
- Non-goals / do not touch:
  - the chat protocol, streaming, the composer and every visible part of the surface;
  - the catalogue request for a specific chat after a chat is selected;
  - paging of the lists ("load more") and list refreshes after create, rename, archive, restore or
    delete;
  - any consumer app (maana adopts this in MAANA-WEBPERF-3; cockpit is unaffected unless it opts in).

## Tier · precondition / gate

- Tier 3: change inside shared-core (request order changes for every consumer; the prop is additive).
- Precondition: none.

## Risks

- A scope change while the start requests are in flight must drop every answer of the old scope,
  including the catalogue and a preloaded list that belongs to the old scope.
- Lists requested for an unavailable or misconfigured assistant cost requests that are thrown away;
  they must never be shown, and their errors must not override the status's own state.
- A preloaded list that is stale (the app loaded it long before) would hide a newer chat; it is only
  valid for the same scope and the same start.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

- On mount, status, catalogue, active list and archived list are all requested before any of them
  resolves.
- Status `not_configured` or a status error: the list and catalogue answers are discarded and the
  surface shows today's unavailable or error state.
- With a preloaded active list for the scope: no active-list request; the archived list is still
  requested; the host's chosen chat is activated from the preloaded list.
- A scope change during the start: no answer of the old scope reaches the state.
- The existing ChatWorkspace tests pass unchanged.

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

Placeholder. Not yet mapped: context package, target directory and preamble are missing, so this
WO must not be dispatched in its current state.

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish.

To be filled by the Orchestrator. Origin: the MAANA-WEBPERF-3 re-measurement on 2026-10-22; operator
chose the ucm fix the same day. First consumer: maana MAANA-WEBPERF-3.
