# UCM-THEME-16: Dark-safe info box in `QrSignupManager`

# A. Envelope, authored by the Expertenchat

## Goal & expected outcome

The "Signup Access / valid until" box under a generated signup QR code stays readable in dark mode. Today it
paints a fixed light ground, `grey.50` (`#FAFAFA`), under the theme's secondary text; in dark that is
`#AAB5BF` on `#FAFAFA`, **2.00:1**. After this order the box takes `background.subtle`, which resolves per
mode: light `#F4F5F6` (5.37:1 for its text), dark `#20262C` (7.32:1).

## Decided (operator, 2026-10-02)

- **`src/components/QrSignupManager.jsx:376`**: `bgcolor: 'grey.50'` -> `bgcolor: 'background.subtle'`.
  **The light change is accepted**: `#FAFAFA` -> `#F4F5F6`, a 1.05:1 step, barely visible.
- **`src/components/QrSignupManager.jsx:361`** (`bgcolor: '#ffffff'` behind the QR code itself) **stays white
  on purpose**: a QR code needs a light quiet zone to scan. Recorded in `docs/DARK-TOKENS.md`.
- **`src/messaging/ReadTicks.jsx:14`** (`DM_SENT_COLOR = 'grey.500'`) **stays unchanged.** It already clears
  contrast in dark (6.07:1 on the dark paper). The candidate `text.disabled` (`#6A7178`) is the value the file's
  own comment records as rejected, because it read too close to the "read" state. In light the tick sits at
  2.68:1 on white. That is a pre-existing condition, softened by the icon shape (Done vs DoneAll), and not
  part of this order.

These decisions replace the register row's original question ("accept the small light change, or add a
token"), raised by the `UCM-THEME-14` review.

## Scope + non-goals

In scope: the one property at `QrSignupManager.jsx:376`; `CHANGELOG.md`; a **patch** release.

Non-goals: no change to `ReadTicks.jsx`, to the QR code's white ground, or to any token value.

## Tier · precondition / gate

- **Tier 3 · tests: one rendered-style assertion per mode for the info box; the component's existing tests.**
  A change inside shared-core, even at one line (`AGENTS.md` -> Tiering).
- Precondition: `UCM-THEME-14` landed (3.11.0, confirmed 2026-10-02).

## Risks

- The light change is the only light-output change since `UCM-THEME-14`'s regression fixture. If that fixture
  covers this component, it needs this one entry updated, named, and nothing else.

## Required tests to WRITE (you write them and run YOUR OWN new ones; the Orchestrator's run is the gate)

1. In a light theme from `createAppTheme`, the info box's background resolves to `#F4F5F6`; in a dark theme to
   `#20262C`. Assert against the theme's own `background.subtle`, not a copied hex.

Run, do not write: the existing `QrSignupManager` tests and the light regression fixture.

## Parity guardrail

No behaviour change. One background, both modes.

---

# B. Implementation map, filled by the Orchestrator and ADDRESSED TO THE IMPLEMENTER

*Placeholder. The Orchestrator fills the context package, the absolute working directory, the
progress contract and the preamble block on `git pull`, per `AGENTS.md` -> "Work Order". A one-line change
may be implemented by the Orchestrator directly; authorship then sits with it and the independent review
carries independence. Do not dispatch while this placeholder stands.*

---

# C. Orchestrator only, NOT ADDRESSED TO THE IMPLEMENTER

> **If you are the implementer reading this work order as your own specification: STOP at this line.**
> Everything below describes what the Orchestrator does AFTER you finish. You do none of it: no
> reviewers, no verification run, no register edit, no `git add`/`commit`/`push`.

- Check `.claude/codex-status.md` first (newest-first). Before `git push`, run `git log origin/main..HEAD` and
  push only if every listed commit is this order's.
- Review: Tier 3, independent `reviewer` (all configured lenses) and `ui_reviewer`, one batch, before the
  commit.
- Release: verify the publish through the job log (`npm view` lags for provenance publishes). Row -> `done`
  with the review Notiz and the version.

Mini-handover: `Orchestrator: implement work-orders/UCM-THEME-16.md in ui-core-micha (main). git pull first,
read the WO, then follow orchestrate-codex.`
