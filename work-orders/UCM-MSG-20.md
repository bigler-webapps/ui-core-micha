# UCM-MSG-20 — Message composer collapses on narrow screens

# A. Envelope — authored by the Expertenchat

## Goal & expected outcome

- Goal: on a 375 px phone a person can type and send a message in every conversation type.
- Expected outcome:
  - The text field keeps a usable width (at least most of the row) next to the action icons; the send
    button is fully visible.
  - URLs in messages are clickable links.
  - The read marker next to the time explains itself (label or tooltip), or is not shown where it
    carries no information.

## Context — measured 2026-09-29 in jg-ferien's local browser test (ucm 3.5.0 installed there)

- jg-ferien, event announcement conversation, 375 px: next to four icon buttons (attach, emoji, poll,
  announce) the textarea is **16 px** wide (its field 44 px), "Senden" is clipped (44 px), the row
  overflows (315 of 295 px).
- Component: `src/messaging/Composer.jsx` (row layout incl. the four icon buttons,
  `allowAnnouncement` prop); `src/messaging/MessageBubble.jsx` shows a bare "0/0" next to the time.
- Long words and URLs wrap correctly inside the bubble; URLs are plain text.
- The dcm register is canonical for `MSG-*`; this is the ucm-side row.

## Scope + non-goals

- In scope: composer layout at narrow widths (e.g. actions collapse into one menu, or wrap to their
  own row), linkified URLs, an explained or hidden read marker.
- Explicit non-goals / do-not-touch:
  - No change to message sending, polls or announcements behaviour.

## Tier · gates

- **Tier 3** — shared-core component.
- Reviewer: `reviewer` (all lenses; linkify is new logic) · `ui_reviewer` · `sec_reviewer` (linkify
  must not create script or `javascript:` links).
- **Done means released and jg-ferien's pin bumped.**

## Risks

- Linkify is an injection surface: only `http(s)` URLs, `rel="noopener noreferrer"`, no HTML from
  message text.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the orchestrator's run is the gate)

1. At 375 px width the textarea has at least a defined minimum width and the send button is not
   clipped, with all four actions enabled.
2. `https://…` in a message renders as a link; `javascript:…` does not.
3. The read marker has an accessible label or is absent.

---

# B. Implementation map — filled by the Orchestrator — ADDRESSED TO THE IMPLEMENTER

## Context package — three independent fixes, same file family

### 1. Composer overflow at narrow widths — `src/messaging/Composer.jsx`

- The single overflowing row is at line 139:
  `<Stack direction="row" spacing={1} alignItems="flex-end">` — it holds, in order: the hidden file
  `<input>`, 4 `IconButton`s (attach `:141`, emoji `:142`, poll `:143`, announce `:144` conditional
  on `canAnnounce`), the `TextField` (`:145`, `fullWidth multiline minRows={2}`), and the Send
  `Button` (`:146`).
- **Fix: split into two stacked rows, not one collapsing menu** (the WO's "or wrap to their own
  row" option — simplest, lowest-risk, no new interaction pattern to test):
  1. First row: a `<Stack direction="row" spacing={1}>` containing only the icon buttons (attach,
     emoji, poll, and the conditional announce button) — 3–4 icon buttons at ~40px each comfortably
     fit 375px on their own.
  2. Second row: `<Stack direction="row" spacing={1} alignItems="flex-end">` containing only the
     `TextField` and the Send `Button`.
  3. Give the `TextField` `sx={{ flex: 1, minWidth: 120 }}` (so it never collapses to near-zero
     width when squeezed) and the Send `Button` `sx={{ flexShrink: 0 }}` (so it is never the thing
     that gets clipped — it should shrink last, if at all).
  4. Everything else in the file (state, handlers, the poll/announcement dialogs, the emoji
     popover) is unchanged — this is a pure JSX layout restructure of one `Stack`.
- Test file: extend `tests/messagingComposer.test.jsx` (existing — read it first for the render
  harness/mock-provider pattern already in use, follow it exactly rather than inventing a new one).
  Add: render the `Composer`, resize the test's container is not meaningful in jsdom (no real
  layout), so instead assert via computed style: the `TextField`'s wrapping element has
  `minWidth: '120px'` (or your chosen value) and the Send button's element has `flexShrink: '0'` —
  both readable via `window.getComputedStyle`, same technique as
  `tests/StatTile.test.jsx`'s `accent` test. Also assert all four action buttons
  (`MessagingComposer.ADD_ATTACHMENT`/`ADD_EMOJI`/`MessagingPoll.CREATE`/
  `MessagingAnnouncement.CREATE` — pass `allowAnnouncement` + a non-`direct` `conversation` prop to
  exercise the fourth) are present and not `disabled` (aside from the poll button's existing
  `pollOpen || files.some(isImage)` guard, unrelated to this WO).

### 2. Linkify `http(s)` URLs — new file `src/messaging/linkifyText.jsx`

- No linkify library exists in this repo's dependencies today (checked — do not add one; a
  dependency addition needs separate approval this WO does not have, and the requirement is narrow
  enough not to need one).
- Export a pure function `linkifyText(text)` returning an array of strings and `<a>` React elements
  (a `key`ed fragment-safe array, the same shape `.map()` output must have). URL matching: a strict
  **`http://` or `https://` prefix only** — e.g.
  `/(https?:\/\/[^\s<>"']+)/g` — so a `javascript:`, `data:`, or any other scheme can never match
  the pattern in the first place (that is the actual security property the sec_reviewer will check
  for — not an escaping step, an inclusion-list pattern that structurally cannot match anything
  else). Split `text` on that pattern; for each URL match render
  `<a href={url} target="_blank" rel="noopener noreferrer">{url}</a>`; non-matching segments pass
  through as plain strings (React renders an array of strings/elements fine as children).
- Trim likely trailing punctuation that is prose, not part of the URL (a trailing `.`, `,`, `)`,
  `!`, `?` immediately followed by a word boundary or end of string) so `"see https://x.com."` does
  not link the sentence-ending period — check `tests/` for whether any existing kit code already
  does this trimming (grep `messagingContractConformance` / `messagingApi` tests for a URL-trimming
  precedent) before inventing your own rule; if none exists, a simple trailing-punctuation strip is
  sufficient, name it in your `PROGRESS` narration.
- Wire it into `src/messaging/MessageBubble.jsx:149` — the `<Typography sx={{ whiteSpace:
  'pre-wrap', overflowWrap: 'anywhere' }}>{...}</Typography>` that renders the message body: replace
  the raw string child with `linkifyText(<same expression>)` for the non-deleted, non-empty case
  (deleted messages keep rendering `t('MessagingThread.DELETED')` as plain text, unlinkified).
- Test file: new `tests/messagingLinkify.test.jsx` (or extend an existing `MessageBubble` test if
  one already covers body rendering — check `tests/messagingChunk6.test.jsx` and
  `tests/messagingCompactBubble.test.jsx` first).
  1. A message body containing `https://example.com/path` renders an `<a>` with that exact `href`,
     `target="_blank"`, and `rel="noopener noreferrer"`.
  2. A message body containing the literal text `javascript:alert(1)` renders it as plain text —
     assert `screen.queryByRole('link')` is `null` and the literal string is present as text.
  3. A message body containing both a URL and surrounding prose renders the prose as plain text
     and only the URL portion as a link (i.e. the split doesn't eat the surrounding words).

### 3. Read marker explains itself — `src/messaging/ReadTicks.jsx`

- Both existing branches already set `aria-label` (line 74's `<span role="img">`/`<ButtonBase>` for
  the counted case, line 80's `<StatusIcon role="img">` for the DM case) — that covers screen
  readers, but `aria-label` is invisible to a SIGHTED user looking at a bare "0/0", which is the
  Envelope's actual complaint ("explains itself (**label or tooltip**)" — the current label is
  ARIA-only, not a visible one).
- Fix, at the `hasCounts` branch (line 56 onward): wrap the returned ratio element in MUI's
  `Tooltip` (already imported patterns exist elsewhere in the kit, e.g. `UserListComponent.jsx`'s
  `<Tooltip title={...}>`) using the same `label` text as the `title`, so hovering explains it
  visually too. Import `Tooltip` from `@mui/material` at the top of the file (currently only
  imports `List, ListItem, Popover, Typography, ButtonBase`).
- Additionally: when `status.recipient_count === 0` (a message with literally nobody to read it —
  "0/0" carries no information per the Envelope's alternative: "or is not shown where it carries no
  information"), return `null` before rendering the ratio, same early-return style already used at
  line 41 (`if (!status) return null;`) and line 50 (`if (!hasCounts && conversation?.kind !==
  'direct') return null;`).
- Do NOT change the DM branch (line 78–80) — it already carries a real icon-shape + colour +
  aria-label signal (not a bare number), out of this fix's actual complaint.
- Test file: extend `tests/messagingReadTicks*.test.*` if one exists (grep `tests/` for
  `ReadTicks`); otherwise create `tests/messagingReadTicksTooltip.test.jsx`.
  1. With `read_count: 2, recipient_count: 5`, assert a `title` attribute (MUI `Tooltip` renders
     one on the wrapped element before hover, or use `@testing-library/user-event` to hover and
     assert the tooltip text appears — follow whatever pattern this repo's other `Tooltip` tests
     already use, grep for one) explaining the ratio is present.
  2. With `recipient_count: 0`, assert the component renders nothing (e.g. `container.textContent`
     is empty, or the specific test id/role used elsewhere for "renders null" assertions in this
     test suite).

## Do-not-touch / invariants

- No change to message sending, polls, or announcements behaviour (Envelope non-goal) — items 1–3
  above are the complete scope; do not touch `submit`/`submitPoll`/`submitAnnouncement`.
- `sec_reviewer` will specifically check the linkify regex cannot match a non-`http(s)` scheme —
  keep the pattern an explicit `https?://` prefix, never a generic "looks like a URL" heuristic.

## Target repo working directory (absolute)

`C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`)

## Preamble — a REQUIRED block IN this file, not something appended at invocation

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there
> is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the
> app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI
> unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register
> row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source
> and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies,
> touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state
> blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT
> `git add`/`commit`/`push` — leave every
> change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests
> the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute
> and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review).
> The orchestrator re-runs the authoritative set + does the independent review after you finish —
> those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line
> `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on
> completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final
> `RESULT: DONE|BLOCKED <reason>`.

---

# C. Orchestrator only — NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it — no
> reviewers, no verification run, no register edit, no commit.**

*(to be filled by the Orchestrator: execution directive; `reviewer` (all lenses) + `ui_reviewer` + `sec_reviewer`; release; jg-ferien pin bump and 375 px check in an event conversation; register rows here, in dcm (MSG canonical) and in jg (`JG-UX-14`).)*
