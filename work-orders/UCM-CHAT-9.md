# UCM-CHAT-9 — ChatWorkspace: limit state, clickable links, stored tool steps, model estimates

## Part A — Envelope

### Goal and expected outcome

`ChatWorkspace` gains the generic pieces hram's assistant (HRAM-AI-2) needs and other apps can use. In 4.20.0 the composer cannot be disabled at a cost limit (there is only a `quota_exceeded` notice with "Change model"), links in answers render as plain text "label (href)", and tool steps are shown only while a turn is generating.

After this order:

1. **Limit state.** With the period usage, limit and reset date from dcm (DCM-CHAT-16), the composer shows a usage meter; at the limit the composer is disabled and shows the reset date. Without limit data the composer behaves as today.
2. **Clickable links.** Markdown links in answers are links. Links into the app go through an app-provided navigation callback (so an app keeps its router and the panel stays open); external links open in a new tab. Unsafe schemes are not rendered as links.
3. **Tool steps per answer.** The tool steps stored with a turn (DCM-CHAT-16) are shown on the answer after reload, as they are while generating.
4. **Model estimates.** The model picker shows the estimated cost per answer when the catalogue provides one, and nothing otherwise.

Charts stay app-specific through the existing `renderAnswerExtra`; this order adds no chart rendering.

### Decision taken (operator, 2026-10-25)

Generic chat UI pieces belong in ucm; charts in the consuming app.

### Scope

1. `ChatWorkspace`, `ChatComposer`, `ChatThread`, `MarkdownReply`, `ModelPicker` for the four points.
2. Chat translations for the new strings; `CHANGELOG.md`, a minor version bump.

### Copy list

"<used> of <limit> USD", "Monthly limit reached" / "Daily limit reached" (by period), "Resets <date>", "≈ <cost> USD per answer".

### Non-goals

- Chart rendering, app-specific answer extras.
- Changing the full-page chat layout beyond these points.

### Risks

- Link handling is an injection surface: only http(s) and app-relative links become links; everything else stays text.
- Apps without limit data or estimates must see no change.

### Required tests to write

1. At the limit the composer is disabled and shows the reset date; below it the meter shows usage; without limit data nothing changes.
2. An app-relative link calls the navigation callback; an external link opens in a new tab; a `javascript:` link renders as text.
3. Stored tool steps render on a reloaded answer.
4. The model picker shows an estimate when present and none when absent.

## Part B — Implementation map — addressed to the implementer



**Target working directory:** `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`.

### Ownership

You are the single implementer in a shared checkout: preserve foreign edits, including the untracked `scratchpad/`
directory. You own exactly `src/chat/api.js`, `src/chat/wire.js`, `src/chat/ChatWorkspace.jsx`,
`src/chat/ChatComposer.jsx`, `src/chat/ChatThread.jsx`, `src/chat/MarkdownReply.jsx`, `src/chat/ModelPicker.jsx`,
`src/chat/kitSxRegistry.js`, `src/i18n/chatTranslations.ts` and new `tests/chatLimitLinksSteps.test.jsx`. No other
file (no README, CHANGELOG, package files, lockfile, register, existing tests, no new exports in `src/entries/*.js` —
`tests/packageEntries` pins the export names).

### The server contract (DCM-CHAT-16, django-core-micha `docs/design/assistant-chat.md` at b6c7565)

- `GET <apiBase>limit/` (default `/api/assistant/limit/`) → `{ period: 'day'|'month', limit_usd_micros, used_usd_micros,
  resets_at }`, integer micro-USD (1 USD = 1 000 000), `resets_at` ISO-8601. Without a configured limit every field is
  `null` — that is "no limit data". An older dcm has no such route (404): treat any failure as "no limit data".
- Catalogue entries gain `average_cost_usd_micros` (integer micro-USD, mean cost per answer over 30 days, `null` below
  10 answers). The existing `estimate` field is unchanged. Only enabled entries are returned; with none enabled the
  catalogue is `{ default: null, entries: [] }` and status is `{ status: 'unavailable', reason: 'no_model_enabled' }`
  (already handled by the unavailable state).
- Every turn (in `listTurns` results and in the final `turn` frame) carries `tool_steps: [{ name, label }]` in tool
  order. Live `tool` frames are unchanged; sources stay in `sources`.
- A turn refused at the limit fails with `quota_exceeded` (the same code as a provider 429 today).

### Seams (verified against `main` at 42fb67b)

- `src/chat/wire.js:2-5` `chatApiUrls(base)` builds `catalogue`, `chats`, `chat(id)`, `turns(id)`, `status`.
  `src/chat/api.js:4-17` `createChatApi(overrides, { apiBase })` — defaults spread under app overrides.
- `src/chat/ChatWorkspace.jsx:60` props; `:76` `api`; `:164-205` start effect (status, catalogue, lists, UCM-CHAT-8);
  `:266-284` socket frames (`tool` → `setTool`, `turn` → `settleTurn`, `quota_exceeded` → `setProblem`); `:425-437`
  `noticeFor()` (the `quota_exceeded` notice "Chat.usageLimit" with "Change model"); `:490` `<ChatThread …>`;
  `:494-500` `<ChatComposer …>` with `<ModelPicker …>` as `actions`.
- `src/chat/ChatComposer.jsx:100-137`: `blocked = archived || !connected` disables input and Send; compact (`:108-127`)
  and standard (`:128-136`) layouts. Exported sx constants are registered in `src/chat/kitSxRegistry.js`.
- `src/chat/ChatThread.jsx:27-60` `Answer`: live tool chip only while generating (`:43`), `SourceChips` (`:44`);
  `:126` passes props to `Answer`; `ChatThread` props at `:66`.
- `src/chat/MarkdownReply.jsx:43`: every `a` renders as text "label (href)"; `allowed` elements `:36`. It is also the
  public `/markdown` entry (`src/entries/markdown.js`), so its default behaviour without new props must stay safe.
- `src/chat/ModelPicker.jsx:29-42` `estimateText(entry, effort, …)`; `:62-70` `entryRow` renders the estimate as the
  secondary line.
- `src/i18n/chatTranslations.ts`: keys `{ de, en, fr, sw }`; `tests/chatTranslations.test.js` checks completeness.

### What to build

1. **Limit state.**
   - `api.getLimit()` → `GET urls.limit` (add `limit: root + 'limit/'` to `chatApiUrls`), returning the body.
   - `ChatWorkspace` requests it when the assistant is available (alongside the start, never delaying it) and again
     after every settled turn (`turn` frame) and on `quota_exceeded`. Any failure, or `limit_usd_micros` not a
     non-negative integer, means no limit data. Answers for an old scope or after unmount are dropped.
   - New `ChatComposer` prop **`usageLimit`** (`{ period, limitUsdMicros, usedUsdMicros, resetsAt } | null`), passed by
     `ChatWorkspace` from the limit data.
     - With data below the limit, the composer shows a usage meter: a thin bar plus "<used> of <limit> USD"
       (`Chat.limitUsage`, amounts with two decimals in the UI language).
     - At or above the limit (`used >= limit`), input and Send are disabled. The composer shows "Monthly limit
       reached" / "Daily limit reached" (`Chat.limitReached.month` / `.day`) and "Resets <date>" (`Chat.limitResets`,
       `resets_at` as a localised date).
     - Both layouts.
     - Without `usageLimit` the composer is unchanged.
   - While the limit data says reached, the `quota_exceeded` thread notice with "Change model" is not shown (a model
     change does not help). Without limit data it stays as today.
2. **Clickable links.**
   - New optional `MarkdownReply` prop **`onNavigate(path)`**, passed from a new `ChatWorkspace` prop **`onNavigate`**
     through `ChatThread` → `Answer`.
   - Classify each `href` with `new URL(href, window.location.origin)`:
     - **app link:** the href starts with a single `/` (not `//`), or it is absolute http(s) on the same origin. It
       renders as `<a href=…>`. With `onNavigate`, a plain left click calls `preventDefault()` and
       `onNavigate(pathname + search + hash)`; modified clicks keep browser behaviour. Without `onNavigate` it is an
       ordinary link.
     - **external link:** any other `http:`/`https:` URL. It renders as
       `<a href target="_blank" rel="noopener noreferrer">`.
     - **anything else** (`javascript:`, `data:`, `mailto:`, bare relative, empty or unparsable): today's text
       rendering "label (href)".
   - Images stay text.
3. **Tool steps per answer.** On a non-generating turn with a non-empty `tool_steps`, `Answer` shows the step labels in
   order as small outlined chips (role list, `Chat.toolSteps` as the list's accessible name), before the sources. While
   generating, the live chip stays as today. Turns without `tool_steps` show nothing new.
4. **Model estimate.** When `average_cost_usd_micros` is a non-negative integer, `entryRow` adds the line "≈ <cost> USD
   per answer" (`Chat.estimatePerAnswer`, cost = micros / 1 000 000 formatted with at most two significant fraction
   digits in the UI language) under the existing estimate. Otherwise there is no line.
5. **Translations.** Add `Chat.limitUsage` ("{{used}} of {{limit}} USD"), `Chat.limitReached.month` / `.day`,
   `Chat.limitResets` ("Resets {{date}}"), `Chat.estimatePerAnswer` ("≈ {{cost}} USD per answer") and
   `Chat.toolSteps`, each with de/en/fr/sw.
6. **Kit sx.** Any new sx object on an MUI component is an exported top-level constant registered in
   `src/chat/kitSxRegistry.js`. Never set properties the theme already styles (for example radius).

### Required tests (maps Part A)

`tests/chatLimitLinksSteps.test.jsx` (`// @vitest-environment jsdom`, conventions and fake socket of
`tests/chatWorkspace.test.jsx` / `tests/chatCompactComposer.test.jsx`):
1. Workspace with `getLimit` at the limit: input and Send disabled, reached text and reset date shown. Below the limit:
   meter text. `getLimit` rejecting or returning nulls: composer as today. A `turn` frame refetches the limit.
2. `MarkdownReply`:
   - `[a](/projects/1)` with `onNavigate`: a click calls it with `/projects/1` and does not navigate.
   - `[b](https://example.org)`: `target="_blank"` with `rel` containing `noopener`.
   - `[c](javascript:alert(1))`: no anchor element.
3. A turn loaded via `listTurns` with `tool_steps` shows the step labels after reload.
4. `ModelPicker`: the estimate line is shown with `average_cost_usd_micros` and absent with `null`.

Work from this package; do not explore broadly.

### Preamble

> Part A is the complete scope; the text above is the COMPLETE spec — the committed WO file's content, not a plan to
> refine. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
> `C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. Do not edit
> WORK_ORDERS.md; do not install dependencies, change lockfiles, run a package manager or tidy foreign changes. Do not
> git add/commit/push, self-review or treat your own run as the gate. If repo state blocks you, stop with
> `RESULT: BLOCKED <reason>`. WRITE the required tests AND run only
> `node_modules/.bin/vitest run tests/chatLimitLinksSteps.test.jsx` from the target directory, once — your ONLY test
> run. Use explicit UTF-8 file I/O.
>
> Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
> before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with
> exactly one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator-only

**STOP — this section is for the Orchestrator, not a dispatched implementer.**

- Tier 3 (a change inside shared-core; link rendering is a security-relevant surface): all reviewers incl. `sec_reviewer` and `ui_reviewer`.
- After DCM-CHAT-16 (consumes its response shapes). Release per ucm's publish-from-main topology; hram bumps in HRAM-AI-2.
- Mapped by the Orchestrator (Claude) on 2026-10-25 against `main` at 42fb67b (4.21.0). The response shapes come from
  the DCM-CHAT-16 session's committed contract (django-core-micha b6c7565); DCM-CHAT-16 itself is implemented and
  released by that session, not here. Prop names `usageLimit` (composer), `onNavigate` (workspace, MarkdownReply) and
  the link classification are chosen by the Orchestrator within the Envelope. Because a missing limit route counts as
  no limit data, the ucm release does not require the dcm release first.
- Execution: codex/gpt-6-luna, one CLI dispatch, banner read back. Review: lenses envelope, regression, duplication,
  tests plus `ui_review` and `sec_review` (link rendering), codex/gpt-6-luna read-only. Verification: the new test, all
  `chat*` tests, `packageEntries`, `checkKitIntegration`, tsc; full suite in `ci.yml` on `ci-test/UCM-CHAT-9`. README
  chat section, CHANGELOG, minor version by the Orchestrator.
