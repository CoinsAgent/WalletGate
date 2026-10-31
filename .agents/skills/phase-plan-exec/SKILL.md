---
name: phase-plan-exec
description: Deliver WalletGate's Product Contract through Coverage, one sprint, evidence and handoff. Plan or resume the highest-priority unfinished Phase with all Tasks, require explicit Yes before execution, and never auto-start another sprint.
---

# Contract → Coverage → Sprint → Evidence → Handoff → Next Sprint

Use the existing controller and the three existing Skills. Read [docs/SPRINT_WORKFLOW.md](../../../../docs/SPRINT_WORKFLOW.md) for commands and record schemas. Assessments are optional historical evidence, never mandatory recurring stages.

## Interactive workflow

- Run `python3 scripts/phase-plan-exec.py plan`. It reuses unfinished work before generating a new Phase and persists all Tasks in `docs/PLANS.md`.
- Show Phase ID, task count and plan link; ask **Execute this sprint? Yes / No** and stop.
- Only a new explicit **Yes for that sprint** authorizes `python3 scripts/phase-plan-exec.py execute --yes`. Planning must never pass `--yes`. No, silence and ambiguous answers authorize no execution.
- `status` derives completed Sprint count, current Phase/status, completed/remaining Tasks, Coverage and next action from repository files.
- `next` is an explicit user action: validate completion evidence, archive the existing plan, then plan one new sprint and ask Yes/No. Never invoke it automatically after execution. READY_FOR_REVIEW means evidence is ready, not human acceptance or approval of open policies.
- Interrupted RUNNING work can resume via `execute` with a new Yes. Preserve completed work and its initial product snapshot.
- For a tooling-upgrade request, change the tooling within the user's authorized scope; do not launch a product sprint merely because this Skill was named.

## Planning worker (`OUTPUT_MODE=BODY_ONLY`)

Do not invoke either planner/controller script, write files, execute tests that write to the project, or implement tasks in this mode. Return only a Markdown body beginning `# Phase Priority Proposal`.

Read sources in priority order:

1. `AGENTS.md` and approved `docs/PRODUCT_UNDERSTANDING_CONTRACT.md`.
2. `docs/CONTRACT_COVERAGE.md`, current `docs/PLANS.md`, archived plans, and previous `docs/plans/progress/` evidence **including Handoffs**.
3. Current code, tests and lockfile; relevant assessment findings only as historical evidence.

Reconcile Contract revisions against stable Coverage IDs. Keep IDs for unchanged requirements; add IDs for new/split requirements and retain superseded rows as RETIRED with successor links. Do not renumber the ledger or carry verification across changed acceptance criteria. Extract current, stable, testable obligations; Contract §5 decisions stay unapproved. Downgrade verification when relevant implementation or test assumptions change.

Resume incomplete Tasks before proposing another Phase. Select **only the highest-priority unfinished Phase**, ranking critical blockers, authentication safety, product value and verifiable delivery. Reuse PH-001's validated approaches unless relevant source, dependency, Contract assumptions or runtime observations changed. Prefer production implementation to repeated feasibility work. Research needs a **specific documented blocker**, reproducible findings and fingerprinted relevant inputs; repeat it only with new relevant evidence, never a renamed objective or another report alone. Unresolved decisions are BLOCKED, not permission to invent a policy.

Decompose **all necessary Tasks** in dependency order, covering every acceptance criterion. Each Task needs ID, goal, dependencies, deliverable, scope, verification strategy/command and expected evidence. Implementation must deliver product code and acceptance tests; prototypes/documents alone cannot complete it.

Use provisional IDs `C01`, `C01-T01`, etc.; the controller assigns permanent PH IDs. Include the `json sprint-plan` block defined in the workflow document within Dependency and Coverage Check. Use a stable semantic `objective_key`, Coverage requirement IDs and explicit acceptance IDs (use the ledger's acceptance IDs when completing a whole requirement). Never claim commands were run during planning.

Output these exact headings in order:

- `# Phase Priority Proposal`
- `## Baseline`
- `## Top 1 Phase`
- `## All Tasks for Top 1 Phase`
- `## Dependency and Coverage Check`
- `## Approval Gate`

Use `### C01 — <title>` and `### C01-T01 — <task>` headings. In Approval Gate write `PROPOSAL_ONLY — NO IMPLEMENTATION AUTHORIZED`. The runner owns metadata and immutable proposal publication.

## Execution worker (after Yes)

Execute the current scope in dependency order. Read prior progress first; retain completed work, reproduce material evidence when assumptions changed, and continue unfinished Tasks. Implement production functionality for implementation sprints. Run relevant tests, repair failures within scope, and record **actual** commands, exit codes, observations, hashed artifacts/logs and acceptance-to-task mappings in the existing `docs/plans/progress/<phase-id>.md` file.

Maintain one `json sprint-evidence` block in that file, preserving earlier narrative and run records. Include proposed Coverage changes with acceptance mappings, code/test references and reasons. The controller validates and applies them after successful completion. Research cannot mark product requirements VERIFIED. VERIFIED requires all requirement acceptance checks, production source, tests and actual successful evidence.

Include concise Handoff fields: delivered functionality; reusable code and test evidence; technical decisions and limitations; remaining Contract gaps; recommended next objective. The controller appends them as a **Handoff section in the same progress file**; add a Handoff yourself on a worker stop when possible. Do not create a separate handoff system.

- READY_FOR_REVIEW: every Task and criterion has actual acceptance evidence; implementation includes verifiable changed product code; research includes its specific blocker, reproducible commands and findings. A final status line alone is insufficient.
- BLOCKED: an unresolved product/security/architecture/permission decision or unavailable prerequisite prevents progress. Preserve partial delivery and exact unblock needed. Do not infer approval.
- PAUSED: incomplete due to execution limits or failed evidence validation. Preserve work for resume.

Never edit the approved Contract, current plan, immutable proposals/assessments, production state or historical evidence. Append progress without rewriting prior history. Do not commit, push, deploy, start another Phase, or add approval stages. Prefer supported Better Auth APIs over upstream modifications. This Yes/No gate and evidence validation provide workflow checks, not OS isolation or independent proof that worker claims are true.
