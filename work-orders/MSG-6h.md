# WORK ORDER MSG-6h (ui-core-micha) — attachment gallery (thumbnail/lightbox/right-click download), reaction overlap

**EXECUTION DIRECTIVE.** If you are the implementer reading this as your own spec, this section is not
addressed to you — it tells the Orchestrator how to invoke you; you ARE that invocation, do not shell
out to `codex exec`. Orchestrator: implement through `codex exec` in the background, invoked **directly
via Bash** (never the `debugger`/`*_coder` Agent wrappers) with **both** flags `--skip-git-repo-check`
and `--dangerously-bypass-approvals-and-sandbox`, prompt passed as a positional argument from this
file. Fall back to direct Claude implementation only on Codex quota / rate-limit / non-zero exit.

Feature-level WO (Expertenchat envelope). Operator report 2026-08-03 from a staging screenshot, seen
now for the first time end-to-end because `django-core-micha` `MSG-10` just fixed attachment uploads
(they were unconditionally rejected before — this display code has effectively never been exercised
against a real upload on the platform path).

## TIER
Tier 2 — shared-core UI consumed by every app. Independent `reviewer` + `ui_reviewer` mandatory.

## SCOPE

**A. Attachment gallery.**

Current state (`AttachmentList.jsx`): each attachment renders as a `Button` containing a 36×36px
thumbnail (if the file is an image and its thumbnail loaded) plus a text label
`t('MessagingAttachments.DOWNLOAD', { name: nameOf(attachment) })`. `nameOf` is
`attachment.filename || attachment.name || attachment.id` — since dcm's `serialize_attachment` has
never returned `filename` (see `django-core-micha` `work-orders/MSG-12.md`, its companion, fixing
that), this **always** fell through to the raw UUID `id`. Clicking anywhere on the button downloads
the file — there is no preview step.

Operator's target shape, verbatim: *"bitte kleines Vorschaubild, bei Klick darauf grosse Vorschau,
rechtsklick zum Kontextmenu mit Download (analog Whatsapp)"* — a small thumbnail; clicking it opens a
large preview (lightbox); right-click opens a context menu with a download action.

Build this:
- **Image attachments**: small thumbnail (reuse the existing `getAttachmentThumbnail` fetch — already
  wired). Click → a lightbox (MUI `Dialog` or `Modal`) showing the full-size image, fetched via the
  existing `getAttachment` blob endpoint. Right-click (`onContextMenu`) → a small context menu (MUI
  `Menu`, matching the pattern already used for message actions in `MessageBubble.jsx`) with a
  Download action, calling the same download logic `AttachmentList` already has.
- **Non-image attachments** (no thumbnail available): keep a compact file-type indicator (icon +
  filename, once `MSG-12` supplies a real one) as the tap target; single click downloads directly
  (there is nothing to preview) — right-click still offers the same context menu for consistency, even
  though its one item duplicates the click action.
- Filename: once `MSG-12` ships, `nameOf` should read the real `filename` first; keep the existing
  `|| attachment.id` fallback for interop with a not-yet-bumped dcm pin (an older host may still be on
  a dcm version that omits it) — never let a missing filename break rendering, just fall back visibly.
- Keep the download-only design principle: bytes never touch anything but the existing authenticated
  `getAttachment`/`getAttachmentThumbnail` blob fetches already in `MessagingProvider`. No new
  endpoints, no new byte-handling path.

**B. Reaction bar overlap.**

`MessageBubble.jsx:139` renders `ReactionBar` as a sibling *after* the bubble's `Paper`, with
`sx={{ mt: -0.5, ml: 0.75, position: 'relative', zIndex: 1 }}` — a small negative top margin
deliberately pulls it up to overlap the bubble's bottom edge (a common "chip peeking out" treatment).
Operator report: this overlap now reads as broken/unnatural, screenshotted on a message that has
attachments — worth checking specifically whether the fixed `-0.5` offset was tuned against a
plain-text bubble and no longer sits right against the bottom of an attachment row or (from `MSG-6g`)
a poll's result bars, both of which changed the bubble's actual bottom content since this offset was
last touched.

**Live-verify against the operator's original screenshot before considering this closed** — the
Orchestrator does not have staging credentials this round; if a local repro isn't conclusive, say so
and ask the operator to confirm the fix visually rather than guessing further.

## NON-GOALS / DO NOT TOUCH
- Do not touch `PollCard.jsx`, `ReadTicks.jsx`, or conversation titles — unrelated recent WOs.
- Do not add any new backend endpoint — scope A only consumes what already exists (plus `MSG-12`'s
  additive `filename` field).
- Do not change the reaction *toggle* logic (`ReactionBar.jsx`'s `react`/`pending` mechanics) — only
  its positioning relative to the bubble, scope B.
- Do not implement a generic lightbox/gallery component library dependency — build directly with MUI
  primitives already used elsewhere in this codebase (`Dialog`, `Menu`), matching existing patterns.

## RISKS
- A right-click context menu on a message bubble already exists for message-level actions
  (`MessageBubble.jsx`'s `openMenu`/`canOpenMenu`, triggered by `onContextMenu`). An attachment's own
  right-click context menu must not fight with or accidentally trigger the message-level one when the
  attachment sits inside the bubble — `event.stopPropagation()` where appropriate.
- Lightbox must be keyboard-dismissable (Escape) and trap focus reasonably — it is a modal.
- The thumbnail fetch already exists and works (`AttachmentList.jsx`'s current `useEffect`); reuse it,
  don't re-invent — but the full-size lightbox fetch (`getAttachment`) is a new call path, verify it
  doesn't double-fetch what the thumbnail effect already has cached.

## REQUIRED TESTS TO WRITE
Narrow and behavioural. Do NOT run the full suite.

1. An image attachment renders a thumbnail; clicking it opens a lightbox showing the full image
   (fetched via `getAttachment`).
2. Right-clicking an image attachment opens a context menu with a Download action; selecting it
   downloads (same assertion shape as the existing pre-redesign download test, if one exists — check).
3. A non-image attachment (no `thumbnail_url`) renders a file indicator, not a broken image; clicking
   it downloads directly.
4. `nameOf` prefers `attachment.filename` when present, falls back to `attachment.id` when absent
   (interop with a dcm pin that predates `MSG-12`) — assert both cases render without crashing.
5. The attachment's own context menu does not also trigger the message-level action menu (no
   double-open, no propagation leak) — regression guard given `MessageBubble.jsx` already has its own
   `onContextMenu`.

## TEST SCOPE FOR THE GATE (orchestrator)
Attachment- and reaction-bar-adjacent messaging test files. Not the full suite.

## TARGET REPO
`C:\Users\biglmi\Documents\webapps\ui-core-micha`. Branch `main`. Publish per the repo's release flow;
consuming pin bumps (jg-ferien, and `django-core-micha` `MSG-12` for the filename) are separate,
subsequent steps — **but per standing feedback this session, do not report this WO as "done" until
those consuming steps have actually landed**, not merely published.

## MINI-HANDOVER (pastable)

> Repo: `C:\Users\biglmi\Documents\webapps\ui-core-micha` (branch `main`). Work order:
> `work-orders/MSG-6h.md` — read it fully, then follow the `orchestrate-codex` skill.
>
> Two independent scopes, both operator-reported live on staging: (A) `AttachmentList.jsx` needs a
> real thumbnail-click-lightbox / right-click-download-menu gallery, WhatsApp-style, instead of a bare
> download button showing a raw UUID (the UUID-fallback root cause is fixed separately in
> `django-core-micha` `MSG-12`, a companion WO — consume its new `filename` field with a graceful
> fallback for an older pin). (B) `MessageBubble.jsx:139`'s `ReactionBar` has a fixed `mt: -0.5`
> negative-margin overlap trick that now reads as visually broken against certain bubble content
> (attachments, and possibly `MSG-6g`'s poll bars) — investigate and fix, but flag if it needs a live
> staging screenshot to confirm rather than guessing blind.

## PROGRESS CONTRACT
Emit `PLAN: <steps>` up front, then a single-line `PROGRESS: [<n>/<total>] <action>` before every
relevant action and `PROGRESS: [<n>/<total>] done` on completion, spaced so no gap exceeds ~2 min,
stdout unbuffered, and exactly one final `RESULT: DONE|BLOCKED <reason>`.
