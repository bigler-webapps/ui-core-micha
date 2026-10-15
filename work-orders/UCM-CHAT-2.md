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

*To be filled by the Orchestrator.*

# C. Orchestrator only — not addressed to the implementer

> **If this WO was dispatched to you as an implementer: STOP here.**

Gate #1 open until recorded in the register row. Publish as a patch release; cockpit/CP-CHAT-4 pins the release that contains it.
