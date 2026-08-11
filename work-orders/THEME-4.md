# THEME-4 — Make it impossible for a kit component to silently defeat the baseline

**Target repo:** `ui-core-micha` (branch `main` — this repo has no `develop`)
**Tier:** 3 (shared core)
**Review:** independent `reviewer` — mandatory (new logic). **`ui_reviewer` becomes mandatory too if
the check surfaces findings that require touching a component's rendering**, which is likely; see
"What test 2 will probably do".
**Version target:** the next **minor** after `THEME-3` lands — a new exported check is additive API.
Read the published version at implementation time; do **not** hardcode a number from this file.
**Strand:** `DS-18`, first half
**Sequencing:** **after `THEME-3`.** See Risks — that work order is in flight in these exact files.

---

## A. Envelope

### Goal

A kit component can put a property in its own `sx` that the baseline already sets as a
`styleOverrides` default. Inline `sx` wins, so the baseline default becomes inert — the theme is
complete, green, and has no effect.

This is not hypothetical. It happened in `SHELL-3`: `MobileBottomNav` duplicated `borderTop` and
`borderColor` inline, killing the two defaults the same work order had just registered.
`SHELL-4` fixed it by hand and added a test asserting key-disjointness for that one component
(`tests/MobileBottomNav.test.jsx:215`). **Make that mechanical for the whole kit.**

### Why the whole kit, measured

- **51 `.jsx` files under `src/` carry an `sx=` prop.**
- **The baseline styles 23 MUI component keys** — `MuiAlert`, `MuiBottomNavigation`,
  `MuiBottomNavigationAction`, `MuiButton`, `MuiCard`, `MuiCheckbox`, `MuiChip`, `MuiContainer`,
  `MuiCssBaseline`, `MuiDialog`, `MuiDivider`, `MuiDrawer`, `MuiFilledInput`, `MuiFormControlLabel`,
  `MuiIconButton`, `MuiInput`, `MuiMenu`, `MuiOutlinedInput`, `MuiPaper`, `MuiSelect`,
  `MuiTableCell`, `MuiTextField`, `MuiTooltip`.
- `SHELL-4`'s test covers **one** component pair. The other 50 files are unchecked.

`MobileBottomNav` was not special. `ChartFrame`, `UserMenu`, `LoginForm`, `PageLayout` and the input
managers all render MUI components the baseline styles **and** carry their own `sx`.

### Why the assertion cannot see this

`assertThemeComplete` proves the theme **has** a value; nothing proves any component **uses** it.
And a hex-value grep does not catch it either, because the duplicated value is usually *correct* — it
is in the wrong layer, not the wrong colour. Reviewing for "no hardcoded colours" passes it. The one
thing that caught it was a human reading a diff.

### Scope

**1. A convention, already demonstrated.** A kit component that carries its own `sx` for a MUI
component the baseline styles **exports that `sx` object**. `MobileBottomNav` already does
(`MOBILE_BOTTOM_NAV_ROOT_SX`, `MOBILE_BOTTOM_NAV_ACTION_SX`) — follow that shape rather than
inventing a second one. A small registry maps each exported object to the MUI key it targets.

**2. An exported check.** Same finding contract as the existing assertion —
`{ findings: [{ surface, reason }] }` — so consumers and tests handle one shape, not two. For each
registry entry, assert the key sets of the component's `sx` and the baseline's `styleOverrides` for
that MUI key are **disjoint**. A collision names the component, the MUI key and the property.

**3. A bypass check, so the convention cannot be skipped in silence.** A source-level scan that flags
a kit component file containing an inline `sx={{ … }}` object literal which is not exported.
**Precedent in this repo:** `reportThemeAdoption(sources)` already takes source strings and regexes
them for `createTheme(` versus `createAppTheme(` — same module, same shape, so this is an established
pattern here rather than a new mechanism.

**4. Wire it as a hard failure in ucm's own suite.**

**This check cannot turn any consuming app red.** It is entirely internal: ucm's components against
ucm's baseline, run in ucm's tests. An earlier concern that a new invariant might break cockpit's
fresh adoption was raised and, on designing it, does not apply — an app's *own* components shadowing
the baseline is the broader case and is a named follow-up below.

### What test 2 will probably do, and what to do about it

**Expect findings.** 51 files have never been checked against 23 styled component keys. A clean first
run would be a pleasant surprise, not the base case.

- **Each finding is resolved by `SHELL-4`'s rule: one home per property.** The component owns what
  keeps it functional on any theme; the theme owns what makes it look like this estate. A property in
  both layers is the defect.
- **Do not exempt your way to green.** The exemption arm exists for a component that genuinely must
  override the baseline for its own purpose, with a stated reason — the same contract
  `assertThemeComplete` uses, where an exemption without a reason is itself a finding. A mass
  exemption converts this work order into a no-op.
- **If the finding count is large enough that fixing them all exceeds this work order, stop and
  report** with the list. Splitting into "land the check plus the fixes it can absorb" and "the
  remainder as a follow-up" is a scope decision for the operator, not something to absorb silently.

### Non-goals / do not touch

- **`DS-18`'s second half — "which components *can violate* a rule".** That is the shadow-array idea:
  nine MUI components read `shadows[…]`, three are declared, six would become findings. It is
  deliberately **out of scope** because it rests on a `grep 'shadows\['` **lower bound** and its
  findings demand *new* theme entries — pressure toward the gold-plating the estate's YAGNI guardrail
  rejects. Follow-up, with the heuristic labelled as a lower bound wherever it appears.
- **App-side scanning.** An app's own components can shadow the baseline too (a `Header` putting
  `borderColor` in `sx` over a `MuiAppBar` default). Real, and a follow-up — `reportThemeAdoption`
  already shows the shape for it.
- **No rendering-based check.** Asserting that each of 23 components tracks a changed theme needs a
  fixture per component: expensive, fragile, and not what this WO buys. `SHELL-4`'s cross-theme
  render test stays the pattern for individual components.
- **No baseline token or component-default change**, unless a finding forces one — and then it is a
  fix, listed, not a redesign.
- No change to `assertThemeComplete`'s own surface registry, `createAppTheme`'s signature, or any
  component's public props.

### Risks

- **`THEME-3` is in flight in this repo right now.** Verified: `src/theme/tokens.js`,
  `src/theme/themeCompleteness.js`, `tests/createAppTheme.test.js` and
  `tests/themeCompleteness.test.js` are all modified in the working tree with Codex running. **Those
  are exactly this work order's files.** Do not start concurrently: let `THEME-3` land and publish,
  then `git pull` and work from that state. Check `git status` and `git log origin/main..HEAD` first.
- **The convention is only as strong as its adoption**, which is what item 3 exists to guarantee. If
  item 3 is dropped, the check degrades to "whatever someone remembered to export".
- **Known bound, state it in the code rather than discovering it later:** the check sees only `sx`
  objects a component exports, at their top level. A **conditional or nested** `sx` is not covered —
  `MobileBottomNav`'s own `emphasis` circle is exactly such a case. This is a lower bound on
  shadowing, not coverage, and must be documented as such so nobody reads green as proof.
- **No staging net.** A version bump on `main` publishes to npm; the independent review is the only
  gate and cannot be back-filled.

### Required tests to WRITE

1. **Non-vacuity, reconstructing the real incident.** A fixture component whose exported `sx`
   duplicates a baseline `styleOverrides` key produces a finding naming the component, the MUI key
   and the property. This is `SHELL-3`'s arrangement; the test must fail if the check is inert.
2. **The current kit.** Run the check across the whole registry and assert the result is empty —
   after fixing whatever it legitimately finds (see above).
3. **The bypass check** flags an inline non-exported `sx={{ … }}` in a fixture source string and does
   **not** flag an exported one.
4. **The exemption contract matches the existing one:** an exemption with a reason suppresses exactly
   one finding; an exemption without a reason is itself a finding.
5. `SHELL-4`'s existing `MobileBottomNav` disjointness test still passes, and is **not** replaced by
   the generic check — the specific test documents that component's split, the generic one guards the
   kit. Keeping both is deliberate.

Plus `tsc -p tsconfig.build.json --noEmit` clean. **No full-suite run** — the affected set is the
theme module's specs plus any component spec a fix touches.

### Verification

Static work with no visual surface of its own, so the standing rendered gate does not apply **unless
a finding forces a component change** — then the two-width side-by-side applies to that component,
and `ui_reviewer` becomes mandatory alongside it. Say in the register note which of the two happened.

The check's own value is proven by test 1, not by a screenshot: a check that cannot fail is worth
nothing, and that is the assertion this work order actually has to make about itself.

### Parity guardrail

No intended change to any rendered output. If the kit renders differently after this work order, it
is because a real shadowing defect was fixed — and every such change must be listed in the register
note, not folded in as tidying.

---

## B. Implementation map

*Filled by the Orchestrator on `git pull` — see `AGENTS.md` → "Work Order".*

### Execution directive (read this first)

> **If you are the implementer reading this work order as your own specification: this section is
> NOT addressed to you.** It tells the Orchestrator how to invoke you. **You ARE that invocation —
> do NOT shell out to `codex exec`.**
>
> Implement through `codex exec` in the background — invoked directly via Bash (never the
> `debugger`/`*_coder` Agent wrappers) with BOTH flags `--skip-git-repo-check` and
> `--dangerously-bypass-approvals-and-sandbox`. **Pass the WO via stdin, not as a positional
> argument** (a positional arg hits Windows' command-line length limit — proven repeatedly in this
> repo). Fallback to direct Claude implementation only on Codex quota/rate-limit/non-zero exit — and
> note that the fallback flips authorship, so the independent `reviewer` stays mandatory either way.
>
> **Two things this repo has learned the hard way, both on the two immediately preceding work
> orders:** Codex committed its own change and wrote a self-reported review into
> `WORK_ORDERS.md` on `SHELL-3` **and** on `SHELL-4`. Read `git log origin/main..HEAD` and
> `git status` before your own review; an implementer commit is a blocker to surface, and a register
> row naming a review the Orchestrator did not itself start is invalid.

### Mini-handover

Repo: `ui-core-micha` (`C:\Users\biglmi\Documents\webapps\ui-core-micha`), branch `main`.
WO: `work-orders/THEME-4.md`. **Wait for `THEME-3` to land and publish first** — same files.
Follow `orchestrate-codex`.
