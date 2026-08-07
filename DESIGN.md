# Frontend Design Principles

How we design app frontends across the estate. **Consistency here is consistency of METHOD, not one identical look** — every app honors its OWN theme tokens (principle 1); the shared surface (`ui-core-micha` components, charts, layout) carries the structural consistency. hram is the worked example throughout, not a look other apps must copy.

These principles are the spec a **prototype** encodes and the implementation matches. `frontend-engineering` (build) and `ui_reviewer` (review) point here; the prototype workflow is the `frontend-design` skill.

## Identity

1. **Honor the existing system, don't invent one.** Pull the app's real tokens and apply them consistently (hram: primary blue `#468AB2`, DM Sans, white, small radii, MUI `ToggleButton` / outlined-`Select` shapes from its `theme.js`). **Match first, then elevate.** Never invent a parallel language — a made-up teal / pills / breadcrumb vocabulary was the v1 mistake.
2. **One accent, deliberately placed.** Interactive = the app's one accent colour. **Data colours are a separate layer.** Status (green / amber / red) is semantic and is NEVER repurposed as a series colour. Restraint over decoration.
3. **Commit to the app's theme reality — with intent.** If the app is single-theme (hram is light-only), commit to that deliberately rather than bolting on dark mode as an afterthought — a decision, not an omission. The estate does NOT mandate light-only; it is per-app — but whichever it is, it is on purpose.

## Information design (it's a tool, not a document)

4. **Scan and operate, not read.** Summary before detail; state encoded in form (chips, knee-markers); interactive things look interactive.
5. **The user's language, not the system's.** Humanize labels (`incidence_scale` → "Incidence scale"); keep the raw name reachable on hover for the technicians — readability without losing traceability. Words are design material.
6. **Reduce help, don't remove it.** Explanation lives in on-demand affordances (ⓘ-popover, provisional-chip), not permanent banners — less noise, same information.
7. **Design the edge-states, not just the happy path.** An empty / "no frontier" state gets a real design (statement + CTA), never a bare alert.

## Charts (read by humans, executed by code)

8. **Every chart earns:** axis labels (with units), a legend only when >1 series, a tooltip, theme-token colours, container-responsive sizing, and empty/loading states. **Single-hue for magnitude; diverging (blue/red around zero) ONLY for signed data.** The concrete data palette is per-app / the `ui-core-micha` chart kit — this states the rules, not a fixed palette.
   **Dual-axis is a default-off exception, opt-in only** (CHART-5, operator decision): the shared `TimeSeriesChart` preset supports a second y-axis via a per-series `axis: 'secondary'` field specifically for two series sharing one axis at very different scales/units (e.g. a user count vs. hours) where series-toggles alone leave one series unreadable. Reach for it only under that same condition, not as a general layout choice — a single shared axis (or toggles) stays the default everywhere else.
9. **Ground it in the real subject matter.** Faithful structures from the real panels (hram: Morris-tornado, Pareto/knee, CI-strip, allocation-scatter with shape-encoded sources) — no lorem, no generic charts. Hence: **scout the real subject before building.**

## Craft

10. **Prototype = spec, parity = guardrail — both directions, within a DECLARED coverage.** Purely visual/UX — function stays; **"No behaviour / permission / data-contract change"** is the hard condition in the WO. Prototypes are routinely **partial** (tabs undrawn, flows stubbed), and nobody downstream can tell a deliberate omission from a required removal — so **prototype silence never authorizes a removal; the Envelope's "Replaces / removes" list does.** Every prototype therefore **declares what it covers and what it leaves untouched**. Inside the covered area each omission is resolved at authoring time into *removes* or *deliberately keeps*, leaving nothing ambiguous; outside it the prototype says nothing. Parity is then checked both ways **within that coverage**: everything drawn is present, and nothing listed as removed survives. **A redesign that ends up net-additive has failed**, however good its new parts — shipping MORE UI than before is the estate's recurring cleanup failure (status bands, duplicated badges, tip text layered on top of the very legacy the redesign was meant to replace).
11. **Align to the shipped reality.** When related features land, pull the prototype onto them so it is a truthful spec, not a contradicting vision.
12. **Avoid the generic "AI look"; take details seriously.** No cream / serif / neon default; embed the real font (CSP-safe as a data-URI, not a silent-fallback risk); `tabular-nums` for aligned numbers; a11y (role/aria on chart regions, focusable info). **Template tells to CUT** (unless the app's design system genuinely specifies them): monospace-uppercase **eyebrow / kicker labels** (e.g. `IMARA · ADVANCING RESILIENT HEALTH SYSTEMS`), decorative **pills / badges**, `FIG. 01 ·` / `F.01` **figure captions**, `↳`-prefixed **micro-links**, **oversized display** headlines, **sketchy / hand-drawn** styling, and **explanatory paragraphs that restate the UI** (help is on-demand — see #6). Restraint is the default; each of these is added only with a real reason.

For the **design craft** of a prototype (an HTML artifact) and its charts, load Claude's built-in **`artifact-design`** (design fundamentals) and **`dataviz`** (charts) skills and apply them WITHIN these principles — this doc adds the estate method (honor the app's OWN tokens, restraint), it does not replace that craft, and it must not crowd it out (load both). Do NOT default to **`swisstph-design`**: it imposes the Swiss-TPH house brand and conflicts with #1 (honor the app's own tokens).

## Also — structural dimensions

13. **Spacing / density = tool density, not document width.** A defined spacing rhythm, dense enough to scan and operate — not airy like a reading document. Use the theme's spacing scale; don't hand-pick pixel gaps.
14. **Responsive = container-sized, not fixed px.** Layouts and charts size to their container; define breakpoint behaviour deliberately (what stacks, what hides, what scrolls) — the same container-responsive rule the charts already follow.
15. **Motion = restrained and functional.** Transitions serve orientation/feedback (state change, reveal), never decoration. Short, few, purposeful; respect `prefers-reduced-motion`.
16. **Prefer icons for secondary actions where the meaning is conventional.** A dense action row reads better as one labelled primary action plus **icon buttons** (preview, download, edit, delete, overflow) than as a row of text buttons — and a labelled `Button` is simply the cheapest thing to type, so implementations drift toward text-heavy rows the prototype never had. Conditions: use an **established glyph** (never invented iconography); always pair it with a **`Tooltip` AND an `aria-label`**, since an icon-only control otherwise has no accessible name; and **keep the text label** when the action is primary, destructive without a confirm step, or app-specific enough that no conventional icon exists. A tooltip may NAME an action — if it has to explain a concept, the control needs a label, or on-demand help (#6).
