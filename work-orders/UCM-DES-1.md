# UCM-DES-1: Clarify failure recovery and reduced-motion design
# A. Envelope
## Goal and approval
Apply the canonical portion of the design-principle proposal approved in this chat on 2026-11-12 (operator: "Gut, kannst du das so umsetzen?"). Paired workspace integration: WS-DES-1 at C:/Users/Micha Bigler/Documents/webapps/work-orders/WS-DES-1.md. Final prose v2 independently reviewed by codex/gpt-6-luna with no remaining findings.
## Scope and boundaries
Documentation only: append the approved additions to DESIGN.md principles 7 and 15, preserve both existing paragraphs, and place the shared scope note once in the introduction. Other skills reference these canonical principles. Add immutable source provenance. Do not change source, version, dependencies, CI, other design principles, product contracts, permissions, tokens, or prototypes.
Tier 3 because the target is shared-core. Tests to write: none (documentation only). Risks: implying new recovery/storage behavior, extra testing duties, or weakened existing acceptance.
## Approved wording
Introduction, explicitly scoped to these additional checks:
> Apply these checks to the affected surface and change. They add no review role, gate, separate report or blanket test matrix. Existing mandatory acceptance criteria remain binding; use their existing evidence record. They do not authorize new product behavior, copy, tokens or data contracts. Resolve missing scope through the existing Envelope/approval process.

4. ui-core-micha/DESIGN.md principle 7, append; frontend-engineering UX checks cross-reference #7 instead of duplicating this principle:
Distinguish first use, no results after filtering, and a loading failure when these states occur in the affected flow. Each state offers the relevant next step where the approved flow permits one. State only known failure causes. Preserve entered work across recoverable failures where the approved state and data-lifecycle contract allows it; do not introduce storage, retry behavior or new explanatory copy without the existing scope approval.


7. ui-core-micha/DESIGN.md principle 15, append; frontend-engineering refers to #15:
Reduced motion must preserve orientation and feedback. When nonessential movement is removed or reduced, keep the resulting state and any necessary focus or status feedback understandable without that movement. Verify this for changed motion; do not add animation merely to satisfy the check.

## Provenance
- Principle 7: [Impeccable clarify](https://github.com/pbakaus/impeccable/blob/b4bff1626c344067788c2679f048a20057c7cc5a/skill/reference/clarify.md) and [harden](https://github.com/pbakaus/impeccable/blob/b4bff1626c344067788c2679f048a20057c7cc5a/skill/reference/harden.md).
- Principle 15: [Impeccable audit](https://github.com/pbakaus/impeccable/blob/b4bff1626c344067788c2679f048a20057c7cc5a/skill/reference/audit.md).
These are inspiration, not authority. No package or upstream code is installed or executed.
# B. Implementation map
## Target and seam
Target repository: C:/Users/Micha Bigler/Documents/webapps/ui-core-micha; launch from the workspace root.
Only implementation file: C:/Users/Micha Bigler/Documents/webapps/ui-core-micha/DESIGN.md.
- Intro follows the canonical-purpose paragraphs before Identity.
- Principle 7 (line 37) currently requires designed edge states instead of a bare alert; retain that text.
- Principle 15 (line 59) already requires restrained, functional motion and prefers-reduced-motion; retain that text.
Preserve existing English, heading structure, numbering and encoding. No code, release/version bump, consumer change, or independent duplicate principle list.
## Preamble and progress contract
The text above is the COMPLETE approved spec, not a plan to refine. Read the named files only for surrounding conventions. You are not alone in this workspace: preserve all foreign edits and do not revert, reformat or clean unrelated files. Do not edit either WORK_ORDERS.md, either WO, MEMORY.md, AGENTS.md, CLAUDE.md, runtime settings, hooks, source code or dependencies. Your tools are for reading and editing the named documentation only; no tests are requested. Do not install dependencies, run a package manager, stage, commit, push, review your own work or dispatch agents. Stop and report a real blocker rather than changing scope. Your result is not the acceptance gate.
First tool action: run the diagnostic command `codex-hook-canary-ws-gov-60`; an expected denial means continue, and absent denial means report unverified coverage once and continue under the existing restrictions.
Emit PLAN, then concise PROGRESS before each step, and exactly one final RESULT: DONE or RESULT: BLOCKED with the reason.

# C. Orchestrator only
> IMPLEMENTER STOP: You do none of the work below. Do not dispatch another implementer, review, edit registers or commit.
## Execution and acceptance

Implementation review completed on 2026-11-12: codex/gpt-6-luna, provider openai, read-only, lenses envelope/regression/duplication/tests. Two P2 findings raised, zero accepted, no confirmed remaining findings. Envelope R1 alleged the frontend-design UX-check cross-reference was missing; the reviewed addition explicitly says 'For applicable criteria, reference the existing frontend-engineering UX quality checks rather than restating them.' Regression R1 alleged token authority was not preserved; the reviewed rule 10 explicitly says 'the existing token authority still applies', and design-language retains its authority ladder. Both rejected on the actual diff, with no change warranted. Duplication and tests lenses reported no findings. The Orchestrator inspected the complete five-file diff against all eight approved items; source URLs match the approved immutable references, existing numbered principles/acceptance rules remain present, and scoped git diff --check passed in both repositories. No application tests/builds were run because no executable behavior changed.

Initial implementer outcome: RESULT: BLOCKED after editing three workspace skills; the child could not edit the read-only .codex subtree and left DESIGN.md unchanged. The Orchestrator completed those in-scope omissions through the available parent editing tool and removed repeated composition wording. No bypass, dependencies, application code, runtime configuration or foreign edits were introduced. Scoped whitespace checks passed; actual implementation-diff reviews remain required.

Preparatory WO/register diff: four independent codex/gpt-6-luna lenses (envelope, regression, duplication, tests), no findings. Implementation launched on 2026-11-12: codex/gpt-6-luna, provider openai, workspace-write; process session 73137, Codex session 01a1cef2-355b-7c90-be6e-bfd61ba9247d. Both paired WOs supplied on stdin; application tests not requested.

Use configured codex/gpt-6-luna, workspace-write, starting at C:/Users/Micha Bigler/Documents/webapps, and pass both paired WOs. No prototype applies to this documentation-only change.
Independent configured codex/gpt-6-luna reviews: envelope, regression, duplication, tests, concurrently. No frontend code or security surface is changed, so no UI/security reviewer is required. Review the actual documentation diff against the approved wording and surrounding rules. No application tests/builds; check whitespace, scope, links/anchors and completeness of the eight approved items. Finalize only our explicit paths, preserve foreign changes, commit and push to the existing trunk after review. Update each register with the review result and its own landing commit.

