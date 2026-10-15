# UCM-CHAT-2 — Readable driver names in the chat model picker

Prepared: 2026-10-15. Target repository: `ui-core-micha` (`main`). Correction to `UCM-CHAT-1`, found at acceptance.

# A. Envelope — addressed to everyone

## Goal and expected outcome

The model picker of the shared chat surface groups its entries by driver. In the UCM-CHAT-1 implementation, each group heading shows the raw driver id the catalogue returns (`claude_cli`, `anthropic_api`, `openai_api`). The prototype `work-orders/assets/UCM-CHAT-1-ai-chat.html` shows readable names instead.

Expected outcome: the three drivers that `django-core-micha/DCM-CHAT-1` ships appear under readable, translated names, both in the picker and wherever else ui-core-micha shows a driver. An unknown driver id still appears as its raw id, so a driver added later (`django-core-micha/DCM-CHAT-2`) stays usable before it gets a name.

## Scope

- A mapping from the three driver ids to translated names, registered in ui-core-micha's chat translations:

| Driver id | en | de | fr | sw |
|---|---|---|---|---|
| `claude_cli` | Claude Code subscription | Claude Code (Abo) | Claude Code (abonnement) | Claude Code (usajili) |
| `anthropic_api` | Anthropic API | Anthropic API | API Anthropic | API ya Anthropic |
| `openai_api` | OpenAI API | OpenAI API | API OpenAI | API ya OpenAI |

- The picker's group heading and the group's accessible name use the translated name.
- Any other place in the chat surface that shows a driver uses the same name. One example is the model-change divider in the thread.
- Unknown driver ids fall back to the raw id.

## Copy list (released with this Envelope)

The twelve names in the table above, verbatim. No other new text.

## Non-goals

- Any change to the catalogue contract or to django-core-micha. The names live in ui-core-micha.
- Other picker behaviour, layout or styling.
- The post-landing re-review of UCM-CHAT-1's last fix batch. That is UCM-CHAT-1's own follow-up.

## Tier

Tier 3: a change inside shared-core. Small and copy-only in effect.

## Risks

- **Id mismatch:** the ids must match exactly what DCM-CHAT-1 returns (`django_core_micha/assistant/catalogue.py`, `DRIVERS`). A mismatch silently falls back to raw ids. The existing picker test fixture uses `openai`, which is not a real driver id.

## Required tests to write

- Picker: groups for `claude_cli`, `anthropic_api` and `openai_api` show their translated names as heading and accessible name. Fixtures use the real driver ids.
- Unknown driver: an entry with an unknown driver id is grouped under its raw id.
- Translations: the three new keys exist in all four languages.

# B. Implementation map — addressed to the implementer

## Context package

Tier 3 · tests: picker + translations (see Part A). Work from this package; do not explore broadly. Target working directory: `C:/Users/Micha Bigler/Documents/webapps/ui-core-micha` (never the workspace root).

- `src/chat/ModelPicker.jsx` — `groupByDriver` groups `entries` by `entry.driver`; the group is rendered at about line 38 as `<Box key={driver} role="group" aria-label={driver}>` with `<Typography variant="overline">{driver}</Typography>`. Both the accessible name and the heading must show the translated name. `t` comes from `useTranslation()` already in the file.
- `src/i18n/chatTranslations.ts` — one `chatTranslations` const, entries `'Chat.xxx': { de, en, fr, sw }`. Add exactly three keys, flat like the existing `Chat.effort.low`: `Chat.driver.claude_cli`, `Chat.driver.anthropic_api`, `Chat.driver.openai_api`, with the Envelope's twelve names verbatim (en/de/fr/sw columns). No other new text.
- A small helper keeps the lookup in one place: export `driverName(t, id)` from `src/chat/ModelPicker.jsx` (or a new `src/chat/driverName.js` if cleaner) returning `t(`Chat.driver.${id}`, { defaultValue: id })`, so an unknown id falls back to the raw id with real i18next. Use it in the picker. The thread's model-change divider (`src/chat/ChatThread.jsx`, `selectionLine`) shows only model and effort, no driver; leave it unchanged. No other place in `src/chat/**` renders a driver id (verify with a search for `driver`).
- Tests: `tests/chatPicker.test.jsx` mocks `react-i18next` with `t: (key) => key`; make the mock return `values.defaultValue` when the key starts with `Chat.driver.` and a `defaultValue` is given and the id is not one of the three known ids, and the key otherwise, so every other assertion keeps expecting keys. Update the fixture entries to the real ids `claude_cli`, `anthropic_api` (replace the fake `openai`), keep one extra fixture with an unknown id (for example `mystery_driver`). Assert: group role name and heading text for each known driver equal the translation KEY `Chat.driver.<id>` (the mocked t returns keys); the unknown id group is named by the raw id. Also assert with the REAL `chatTranslations` that the three keys exist with the Envelope's exact English names, and that each key is non-empty in de/en/fr/sw (add to `tests/chatTranslations.test.js`). `tests/chatWorkspace.test.jsx` uses `openai`/`claude_cli` ids in its catalogue fixture and finds the group by name `openai`: update that lookup to the new key-based name.
- Do not edit: `package.json`, lockfile, CHANGELOG, README, `WORK_ORDERS.md`, anything outside `src/chat/**`, `src/i18n/chatTranslations.ts`, `tests/chat*.test.*`. No catalogue contract change.
- Pitfall: the existing aggregate test `tests/i18nAggregate.test.js` iterates all bundle keys; every value needs all four locales as non-empty strings.

## Preamble

> The text above is the COMPLETE spec — the committed WO file's content, not a plan to refine; there is no separate plan file. Read the nearest `AGENTS.md`, the relevant `.codex/skills/<role>/SKILL.md`, and the app `MEMORY.md` ONLY for conventions. Stay in scope; do not touch auth/permissions/deps/schema/CI unless the spec says so; do not update `MEMORY.md`. **Do NOT edit `WORK_ORDERS.md` — the register row and the review verdicts are the orchestrator's alone.** **Your tools are for editing source and test files and for running the tests you wrote — nothing else.** Do NOT install dependencies, touch a lockfile, run a package manager, or tidy up stray files; if something in the repo state blocks you, stop and report it as `RESULT: BLOCKED <reason>` instead of fixing it. Do NOT `git add`/`commit`/`push` — leave every change uncommitted in the working tree for the orchestrator's independent review. WRITE the tests the `Required tests` section calls for AND **RUN the tests you just wrote** to confirm they execute and pass — that is the ONLY test run you do (NOT the app's affected/full suite, NOT any review). The orchestrator re-runs the authoritative set + does the independent review after you finish — those are the gate; your own run does not count as the gate.
>
> Narrate continuously: a `PLAN: <step1> | <step2> | …` line up front, then a single-line `PROGRESS: [<n>/<total>] <present-tense action>` before every relevant action (and `… done` on completion), spaced so no gap exceeds ~2 min, stdout unbuffered, plus exactly one final `RESULT: DONE|BLOCKED <reason>`.


# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Publish as a patch release; cockpit/CP-CHAT-4 pins the release that contains it.
