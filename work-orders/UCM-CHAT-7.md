# UCM-CHAT-7 — Compact chat composer: context row with model choice, full-width input, one-line notices

## Part A — Envelope (everyone)

**Tier:** 3 — a change inside shared core (`src/chat`), consumed by Maana; existing consumers must keep working.
**Repository:** `bigler-webapps/ui-core-micha`, `main`.
**Prototype:** [MAANA-CHAT-1-assistant.html](../../maana/work-orders/assets/MAANA-CHAT-1-assistant.html), composer of
the chat panel, addition of 2026-10-22 (see "Umfang und Grenzen" in the prototype frame).

### Goal and expected outcome

In Maana's chat panel the composer takes too much height and wraps: the context, two links, a long-conversation
alert, the input, the model button, Stop and Send compete for space (`ChatComposer` lays the input, actions, Stop and
Send out in one wrapping row; `ChatWorkspace` puts the long-chat `Alert` and the host's composer extra above it).
Expected outcome: the composer is two rows — a context row with what the host added plus the model choice at its end,
and a full-width input row — and notices in the composer are one line and dismissible.

### Settled decisions (operator, 2026-10-22)

1. **Context row:** one line above the input. The host supplies its content (in Maana: the excerpts added to the
   chat); the model choice sits at the end of this row. The row never wraps; host content is cut with an ellipsis
   before the model choice shrinks.
2. **Input row:** the input uses the full width. Enter sends, Shift+Enter inserts a line break (as today). Send is an
   icon button inside the input row; while a turn runs it is replaced by Stop in the same place. The input grows up to
   a few lines.
3. **Model choice label** is short: model family and effort without the vendor prefix (for example "Sonnet ·
   Gründlich"); the picker itself is unchanged.
4. **Notices in the composer area** (today the long-conversation alert) are one line, carry their action ("Neuer
   Chat") and a close button, and once closed stay closed for that chat. No explanatory second sentence.
5. **Compatibility:** consumers that do not opt into the new layout keep today's composer unchanged; the new layout
   is an explicit option. The existing `renderComposerExtra` keeps working.

### Scope and acceptance

`ChatComposer`, the composer part of `ChatWorkspace`, `ModelPicker`'s button label, the long-chat notice; DE and EN;
desktop and phone. Accepted when the prototype's composer states render equivalently at 375 and 1280 px (empty
context, one and several added items, running with Stop, notice shown and closed) and existing consumers are
unchanged without the option.

### Non-goals and do-not-touch

Maana's context content and links (MAANA-CHAT-15), the model picker's content and catalogue, chat history and
streaming, grants, the side panel, other apps.

### Risks

A shared component used by several apps: the old layout must stay the default. Closing a notice must not hide a
different, later notice.

### Required tests to write

Two-row layout with host content and model choice in one non-wrapping row; Enter sends and Shift+Enter breaks a line;
Send becomes Stop while running and back; notice closes per chat and stays closed after re-render, a new chat shows it
again; default layout unchanged for a consumer without the option; short model label.

### Visual specification

Prototype above, composer only. **Token delta:** none. **Copy:** "Lange Unterhaltung: ältere Teile werden
zusammengefasst." with "Neuer Chat" (replaces the current two-sentence long-chat text), "Antwort stoppen" as the Stop
label; English equivalents.

## Part B — Implementation map (implementer)

### Target and ownership

Target working directory (absolute): `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha`. A library: you are
the single implementer. Shared checkout: preserve foreign edits, including the untracked `scratchpad/` directory.

You own exactly: `src/chat/ChatComposer.jsx`, `src/chat/ChatWorkspace.jsx` (composer part and the notice state only),
`src/chat/ModelPicker.jsx` (button label only), `src/chat/kitSxRegistry.js`, `src/i18n/chatTranslations.ts`,
`dev/entries.jsx` (one new entry), and new `tests/chatCompactComposer.test.jsx`. No other file: no exports in
`src/entries/chat.js` or `src/index.js` (`tests/packageEntries.test.js` pins the exact sub-path export names), no
README, CHANGELOG, package files, lockfile, register or existing tests.

### Seams (verified against `main` at af06c95)

- **Composer today.** `src/chat/ChatComposer.jsx:11-38`: one wrapping `Stack` row with the multiline input
  (`CHAT_COMPOSER_INPUT_SX`, `maxRows={6}`), the `actions` slot, Stop (outlined, only while `running`) and Send
  (contained). Enter sends, Shift+Enter breaks a line, IME composition is respected (:29-31); Send is disabled while
  running, archived, disconnected or empty (:13-15). This stays the default, byte-for-byte.
- **Workspace today.** `src/chat/ChatWorkspace.jsx:458-461`: `renderComposerExtra({ chat })` in a box keyed by chat,
  then the long-chat `Alert` (`longChat`, :124) with "Neue Unterhaltung" → `createChat`, then `ChatComposer` with
  `ModelPicker` in `actions`. Props are declared at :59.
- **Model label.** `src/chat/ModelPicker.jsx:105`: trigger text `${cleanLabel(active)} · ${effort} ▾`; `cleanLabel`
  (:22) only strips a trailing version. The picker content is unchanged.
- **Kit sx convention.** Every `sx` on an MUI component that `themeCompleteness` checks (Alert, Button, IconButton,
  TextField, Chip, Paper, …) must be a top-level exported object registered in `src/chat/kitSxRegistry.js`
  (`createKitSxEntry(name, muiKey, object, exportName)`); an inline object fails `tests/themeCompleteness.test.js`
  ("kit sx disjointness"). Do not set properties the theme already styles (radius, border colour).

### What to build (binding names)

- `ChatWorkspace` gains `composerLayout` (`'standard'` default, `'compact'`) and `renderComposerContext({ chat })`
  (host content for the context row, used only in the compact layout). `renderComposerExtra` keeps rendering where it
  renders today in both layouts.
- `ChatComposer` gains `layout` (`'standard'` default, `'compact'`), `context` (node) and `notice` (node). Compact:
  1. optional notice line; 2. context row: `context` then `actions` (the model choice) at its end, one line that never
  wraps — the context is clipped/ellipsised and the actions keep their width; 3. input row: one outlined field across
  the full width containing the multiline input (grows to about five lines) and, at its end, an icon button Send
  (accessible name `Chat.send`), replaced in the same place by Stop (accessible name `Chat.stopAnswer`, "Antwort
  stoppen") while `running`. Same enabling and Enter/Shift+Enter/IME rules as today. The prototype's measurements:
  context row min 30px with 6px gaps, input row padding 3px 3px 3px 10px, 36px square action, focus ring on the row.
- Notice line (internal component, not exported): one line, text ellipsised, its action as a text button and a close
  icon button (accessible name `Chat.dismissNotice`). In the compact layout `ChatWorkspace` renders the long-chat
  notice there with `Chat.longChatShort` ("Lange Unterhaltung: ältere Teile werden zusammengefasst.") and the action
  `Chat.newChat` ("Neuer Chat") → `createChat`, instead of the `Alert`. Dismissal is held in workspace state keyed by
  chat id and notice id: it stays closed for that chat across re-renders and turns, another chat (or a new one) shows
  it again, and dismissing one notice never hides a different notice. In memory only (no storage). The standard
  layout keeps today's `Alert` and text.
- `ModelPicker` gains `shortLabel` (boolean, default false): the trigger shows family and effort without a leading
  vendor word (`Claude`, `Anthropic`, `OpenAI`) and without the version, e.g. "Sonnet · Gründlich ▾". `ChatWorkspace`
  passes it only in the compact layout.
- New keys in `src/i18n/chatTranslations.ts` (`de`, `en`, `fr`, `sw`, as the bundle does): `Chat.longChatShort`,
  `Chat.stopAnswer`, `Chat.dismissNotice`. Existing keys and texts stay.
- Dev harness: an entry `chat-compact-composer` in `dev/entries.jsx` rendering the compact `ChatComposer` with the
  real `ModelPicker` (`shortLabel`) and switchable states: empty context, one added item, several items (a "+n" chip),
  running (Stop), notice shown, notice closed; context items are simple `Chip`s supplied as host content. Mark it
  `fullViewport: true` so `#chat-compact-composer` opens it alone at the browser viewport (see `dev/main.jsx`).

### Required tests (maps Part A)

`tests/chatCompactComposer.test.jsx` (`// @vitest-environment jsdom`, conventions of `tests/chatPicker.test.jsx` and
`tests/chatWorkspace.test.jsx`): compact layout renders context and model choice in one row and the input with Send
in the next; Enter sends, Shift+Enter does not; Send becomes Stop while running and back, Stop calls `onStop`; the
workspace notice closes for that chat, stays closed after a re-render, shows again for another chat, and a different
notice id is not hidden; without `composerLayout` the workspace renders today's composer (outlined Stop and contained
Send buttons, the long-chat `Alert` with today's text); `shortLabel` drops vendor and version.

Work from this package; do not explore broadly.

### Required preamble and progress contract

The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate
plan file. Read the workspace `AGENTS.md` and `.codex/skills/frontend-engineering/SKILL.md` (both under
`C:/Users/Micha Bigler/Documents/webapps/`) only for conventions. Stay in scope; do not update `MEMORY.md`. **Do NOT
edit `WORK_ORDERS.md` — the register row and the review verdicts are the Orchestrator's alone.** Your tools are for
editing the assigned files and for running the test you wrote — nothing else. Do NOT install dependencies, touch a
lockfile, run a package manager or tidy stray files; if repo state blocks you, stop with `RESULT: BLOCKED <reason>`.
Do NOT `git add`/`commit`/`push`; leave every change uncommitted. WRITE the required tests AND run only
`node_modules/.bin/vitest run tests/chatCompactComposer.test.jsx` from the target directory, once — your ONLY test run;
the Orchestrator's run and the independent review are the gate. Use explicit UTF-8 file I/O.

Start with `PLAN: <step1> | <step2> | ...`, print a single-line `PROGRESS: [<n>/<total>] <present-tense action>`
before every relevant action (and `... done` after), with no gap above ~2 minutes, unbuffered, and finish with exactly
one `RESULT: DONE` or `RESULT: BLOCKED <reason>`.

## Part C — Orchestrator only

STOP — this part is not an instruction to the implementer.

> If you are the implementer reading this work order as your own specification: STOP at this line. You do none of
> what follows — no reviewers, no verification, no register edit, no commit, no further dispatch.

Mapped by the Orchestrator (Claude) on 2026-10-22 against `main` at af06c95 (4.15.0). Execution: codex/gpt-6-luna,
one CLI dispatch, banner read back; launch evidence: 2026-10-22, model gpt-6-luna, reasoning high, workdir
ui-core-micha, session 01a16284-fc97-7d33-abd0-84e0ddaa9cac; `RESULT: DONE`, assigned files only, no commit.
Orchestrator: restored the `ChatComposer` doc comment, filled primary Send (`CHAT_COMPOSER_SEND_SX`), uncapped short
model label (`CHAT_MODEL_TRIGGER_SHORT_SX`, the 140px cap clipped "Gründlich" at 375), vertically centred input line,
German harness entry with shrinkable chips, test fixes (the standard-layout test expected Stop before the server
started a turn), README, CHANGELOG, version 4.16.0. Rendered comparison (3 app screenshots: several+notice and
running at 375, several+notice at 1280; prototype via the existing static server on 8896): same structure; deltas:
the theme's 44px input minimum height (touch target) makes the input row 52px instead of 44px, radius from the theme,
kit labels. Verification: the new test, all `chat*`
tests, `themeCompleteness`, `packageEntries`, `chatTranslations`, `i18nAggregate`, tsc; full suite in `ci.yml` on
`ci-test/UCM-CHAT-7`; 375/1280 comparison of the harness entry against the prototype composer (at most four app
screenshots).

Gate #1 approved by the operator on 2026-10-22 in the Maana Expertenchat (session
local_cbfc9d51-5217-42a4-99ba-27a315c854ce). Tier 3: all reviewer lenses and `ui_reviewer`; 375/1280 comparison
against the prototype's composer. Publish a minor release; report the version back so MAANA-CHAT-15 can adopt it.
No consumer pin changes.
