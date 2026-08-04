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

8. **Every chart earns:** axis labels (with units), a legend only when >1 series, a tooltip, theme-token colours, container-responsive sizing, and empty/loading states. **Single-hue for magnitude; diverging (blue/red around zero) ONLY for signed data. Never dual-axis.** The concrete data palette is per-app / the `ui-core-micha` chart kit — this states the rules, not a fixed palette.
9. **Ground it in the real subject matter.** Faithful structures from the real panels (hram: Morris-tornado, Pareto/knee, CI-strip, allocation-scatter with shape-encoded sources) — no lorem, no generic charts. Hence: **scout the real subject before building.**

## Craft

10. **Prototype = spec, parity = guardrail.** Purely visual/UX — function stays. **"No behaviour / permission / data-contract change"** is the hard condition that goes into the WO.
11. **Align to the shipped reality.** When related features land, pull the prototype onto them so it is a truthful spec, not a contradicting vision.
12. **Avoid the generic "AI look"; take details seriously.** No cream / serif / neon default; embed the real font (CSP-safe as a data-URI, not a silent-fallback risk); `tabular-nums` for aligned numbers; a11y (role/aria on chart regions, focusable info).

## Also — structural dimensions

13. **Spacing / density = tool density, not document width.** A defined spacing rhythm, dense enough to scan and operate — not airy like a reading document. Use the theme's spacing scale; don't hand-pick pixel gaps.
14. **Responsive = container-sized, not fixed px.** Layouts and charts size to their container; define breakpoint behaviour deliberately (what stacks, what hides, what scrolls) — the same container-responsive rule the charts already follow.
15. **Motion = restrained and functional.** Transitions serve orientation/feedback (state change, reveal), never decoration. Short, few, purposeful; respect `prefers-reduced-motion`.
