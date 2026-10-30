---
name: phase-planner
description: Generate a WalletGate proposal through scripts/run-phase-planner.py for the single highest-priority phase and ALL its tasks, grounded in the approved Product Contract, assessments, and current repository. Do not execute or approve plans.
---

# Phase planner — Top 1 phase and complete task plan

## Purpose and boundaries

Produce a **candidate planning proposal**, not an approved development plan or an execution order.

- Select and show **only the single highest-priority unfinished phase**. Consider competing work internally; do not output a multi-phase roadmap. If no unfinished phase is supported by evidence, state that rather than inventing work.
- Fully decompose the selected phase into **all necessary tasks**, including verification and documentation tasks; do not cap the task count artificially.
- Never treat a suggested task as authorized work. Do not modify application code or existing plans.
- Do not run `$contract-compliance` or `$technical-feasibility` automatically.

## Generation workflow

For an interactive proposal request, run from the repository root:

```bash
python3 scripts/run-phase-planner.py
```

Pass explicitly supplied reports with `--compliance docs/assessments/<report>.md` and `--feasibility docs/assessments/<report>.md`; pass any requested focus with `--focus '<focus>'`. Otherwise let the runner select reports. The runner launches a read-only Codex analysis, validates the body, and publishes one timestamped, unapproved proposal under `docs/plans/proposals/`.

Return a brief confirmation and a link to the generated file, not the full body. Do not write the proposal or its metadata yourself. If generation fails, report the error without claiming a proposal was saved or falling back to manual publication.

**Worker mode takes precedence:** when the runner supplies `OUTPUT_MODE=BODY_ONLY`, perform the investigation below and return only the report body. Never invoke the runner in worker mode; that would recurse. A request to edit this skill or runner does not itself request a new proposal.

## Sources and precedence

1. Applicable `AGENTS.md`.
2. `docs/PRODUCT_UNDERSTANDING_CONTRACT.md`: **normative requirements**.
3. `docs/PLANS.md` and `docs/plans/phases/*.md` if present: existing approved IDs, scopes, decisions, and progress.
4. The **explicitly supplied** Contract Compliance Report and Technical Feasibility Assessment, otherwise the latest relevant versions from `docs/assessments/` selected by report metadata.
5. Current repository files, tests, lockfile and available runtime evidence.

If material assessment findings concern an older contract, commit, or dependency version, revalidate them against current sources before using them. Report the mismatch and limits of revalidation. If the necessary evidence is missing, mark the affected recommendation `BLOCKED` or `UNVERIFIED`, not certain. Historical reports do not override the Product Contract or tested current behavior.

## Plan state and stable identity

- `docs/PLANS.md` is the **canonical, human-approved roadmap** once created. The planner never silently creates, overwrites, reorders, or approves it.
- Prioritize continuing an already `APPROVED` / `IN_PROGRESS` phase when its objective remains valid. Do not invent a competing phase for the same scope.
- Reuse existing approved phase/task IDs and acceptance criteria verbatim; don't renumber IDs merely because rankings change.
- For a new, not-yet-approved recommendation, use provisional phase ID `C01` and task IDs `C01-T01`, etc. Reuse an existing selected phase's IDs when applicable. Promotion to persistent IDs is a separate human-reviewed action.
- A candidate's `DRAFT` state does not become `APPROVED` or `ACCEPTED` through planning.
- If a phase is blocked by an unapproved architecture decision, propose a bounded technical experiment or explicit decision gate; do not assume the decision.

## Investigation procedure

1. Identify contract version, Git commit, current worktree status, source-report paths, versions and known review limits.
2. Extract unfinished product capabilities and relevant compliance gaps. Verify relevant gaps against current code; do not repeat the complete audits.
3. Use feasibility findings to identify *blocking prerequisites*, safe implementation surfaces, security risks, and unknowns.
4. Identify existing roadmap commitments and progress. Do not duplicate verified completed work.
5. Build a dependency graph of candidate phases. Rank eligible phases using, in order: existing approved work; prerequisite/architecture blockers; authentication and authorization safety; contract importance; testable value; implementation risk/cost.
6. Output **only the Top 1 phase** with selection rationale and clear, independently observable acceptance criteria. Explain material prerequisites without proposing additional phases.
7. For the highest-priority phase, derive **ALL tasks required to meet all phase acceptance criteria**. Topologically order tasks and include tests, integration, security-negative paths, verification evidence, and documentation as appropriate. Ensure every acceptance criterion maps to at least one task; ensure no task has no acceptance criterion or necessary prerequisite.
8. Distinguish `READY_TO_IMPLEMENT`, `RESEARCH_REQUIRED`, and `BLOCKED`. Do not label a task executable when it depends on missing human approval or unverified prerequisites.
9. Include a request for human review and explicit acceptance/revision in the proposal; do not implement anything.

## Required report content

Return a complete Markdown **report body**, starting with exactly:

`# Phase Priority Proposal`

Use these headings, in this order:

### `## Baseline`

- Contract version and exact file path; current commit and dirty/clean state.
- Chosen Compliance Report and Feasibility Assessment paths, report dates and version mismatches.
- Existing plan/status if available. Separate verified, inferred, and unknown claims.

### `## Top 1 Phase`

Describe the single selected phase with: existing/provisional ID; objective; related Contract principles; prerequisite work/decisions; expected observable deliverable; priority rationale; state (`DRAFT`, `APPROVED`, `IN_PROGRESS`, `BLOCKED`). Follow with **measurable acceptance criteria** and explicit *in/out of scope*. Explain why this phase has highest priority. If no unfinished phase qualifies, explain the evidence and mark the task and coverage sections not applicable.

### `## All Tasks for Top 1 Phase`

Name the selected first phase and its approval status. Include **every required task**, not merely the next task. Task list must be ordered by dependencies and cover all phase acceptance criteria. For **each** task, include:

- Stable/provisional `Task ID` and human-readable title.
- Goal, specific deliverable and related phase acceptance-criterion IDs.
- Prerequisites and `READY_TO_IMPLEMENT` / `RESEARCH_REQUIRED` / `BLOCKED` classification.
- In-scope and out-of-scope boundaries; possible code/test areas when supported by current evidence.
- Objective Definition of Done, including precise verification commands or executable test strategy, expected outcome, and evidence to record. Do not invent passing results.
- A required decision gate if attempting the task would need architectural change, contract change, migration, dependency upgrade, or broader permissions.

### `## Dependency and Coverage Check`

Show all phase acceptance criteria mapped to task IDs, the critical path, and blockers. State whether the task set is complete relative to the **currently known** requirements; if unknown, label incomplete and explain which investigation comes first.

### `## Approval Gate`

State: `PROPOSAL_ONLY — NO IMPLEMENTATION AUTHORIZED`. List the selected phase's exact scope/acceptance criteria requiring human approval; clearly separate approved existing decisions from new proposals. Request acceptance or revision of this phase only.

## Output conventions and safety

When invoked by `scripts/run-phase-planner.py` with `OUTPUT_MODE=BODY_ONLY`:

- Return only the Markdown body (no YAML front matter, no code-fence wrapper, no prose before the heading).
- Do not choose a filename, write files, call the runner/publisher, or change Git state.
- The script owns UTC timestamp, metadata, unique path, and no-overwrite behavior.

Interactive requests use the generation workflow above. Do not claim a generated report is approved.

The analysis must be read-only: no dependency installation, database migration, test commands that modify the repository, application implementation, commits, pushes, automatic promotion to `PLANS.md`, or automatic task execution. Only the runner may publish the new proposal file after analysis.
