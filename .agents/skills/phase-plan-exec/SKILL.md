---
name: phase-plan-exec
description: Plan or resume one WalletGate vertical slice per sprint, deliver end-to-end acceptance with all supporting Tasks, require explicit Yes before execution, and never auto-start another sprint.
---

# Contract → Coverage → Sprint → Evidence → Handoff → Next Sprint

Use the existing controller and the three existing Skills. Read [docs/SPRINT_WORKFLOW.md](../../../../docs/SPRINT_WORKFLOW.md) for commands and record schemas. Assessments are optional historical evidence, never mandatory recurring stages.

## Sprint delivery rules

1. **One Sprint = One Vertical Slice.** Select one observable product outcome for one coherent user, application-owner or standard RP journey. Include all changes needed across the affected layers in this sprint. Several Tasks and Coverage requirements may support that same slice; do not bundle independent outcomes or equate one slice with one Task.
2. **End-to-End Acceptance.** Define the actor, starting state/trigger, complete production path and observable terminal result, plus relevant denial/recovery cases. Verification must exercise the real integration boundaries for the slice; unit tests and mocks support this evidence but cannot replace it. Use an actual browser when UI behavior is part of the outcome, or actual protocol/API boundaries for a protocol-only slice. State fixture and device limitations truthfully.
3. **No Layer-Only Delivery.** Parser, database, API, UI, infrastructure and investigation work are supporting Tasks, not completed product slices on their own. Narrow an oversized slice to a smaller end-to-end behavior rather than postponing its integration or acceptance to another sprint. Do not declare delivery because each isolated component passes.

Apply these rules to newly planned product sprints and work within the current sprint's approved scope. Preserve historical plans/receipts; do not silently amend an existing scope. Necessary research belongs inside the slice or in a separately requested assessment; a research-only result is not a delivered product slice. The controller retains legacy research support for existing records.

## Deferred cases

Keep every explicitly DEFERRED case in `docs/deferred/<stable-case-id>.md`; use [docs/deferred/README.md](../../../../docs/deferred/README.md) as the index. Each record identifies the originating phase/tasks/acceptance, authorization and reason, unexecuted behavior, retained evidence, Coverage limitation, reopening condition and closure criteria. Preserve existing case IDs. Progress, Handoff and plans link to this record instead of maintaining a separate active backlog. When consolidating older cases, retain historical records, immutable reports and receipt hashes; the directory record references them without rewriting them. The directory survives phase evidence cleanup.

**Deferred is parked, not the next sprint objective.** Read the directory before selecting a slice. Exclude deferred work from default phase/sprint prioritization; `next`, a general planning request, high severity, or newly available prerequisites do not authorize reactivation. Only an explicit user request naming the case or clearly requesting its deferred behavior may reopen it. Record that authorization, then plan the reopened slice through the normal Yes/No gate. Do not disguise deferred work as a renamed goal, supporting Task or investigation. If an otherwise eligible slice depends on a deferred case, choose another independent slice or report the dependency; do not silently pull it in. If no eligible slice remains, report the blocker rather than automatically reopening a case.

Deferral does not waive the Product Contract, mark acceptance passed or resolve an open policy. Keep related Coverage PARTIAL/BLOCKED as evidence requires. Report unresolved decisions and ordinary incomplete work as such; do not label everything DEFERRED to bypass completion.

## Interactive workflow

- Run `python3 scripts/phase-plan-exec.py plan`. It reuses unfinished work before generating a new Phase and persists all Tasks in `docs/PLANS.md`.
- Show Phase ID, task count and plan link; ask **Execute this sprint? Yes / No** and stop.
- Only a new explicit **Yes for that sprint** authorizes `python3 scripts/phase-plan-exec.py execute --yes`. Planning must never pass `--yes`. No, silence and ambiguous answers authorize no execution.
- `status` derives completed Sprint count, current Phase/status, completed/remaining Tasks, Coverage and next action from repository files.
- `next` is an explicit user action: validate the retained completion record and current source/test artifacts, archive the existing plan, then plan one new sprint and ask Yes/No. Never invoke it automatically after execution. READY_FOR_REVIEW means completion was validated and temporary evidence was removed, not human acceptance or approval of open policies.
- Interrupted RUNNING work can resume via `execute` with a new Yes. Preserve completed work and its initial product snapshot.
- For a tooling-upgrade request, change the tooling within the user's authorized scope; do not launch a product sprint merely because this Skill was named.

## Planning worker (`OUTPUT_MODE=BODY_ONLY`)

Do not invoke either planner/controller script, write files, execute tests that write to the project, or implement tasks in this mode. Return only a Markdown body beginning `# Phase Priority Proposal`.

Read sources in priority order:

1. `AGENTS.md` and approved `docs/PRODUCT_UNDERSTANDING_CONTRACT.md`.
2. `docs/CONTRACT_COVERAGE.md`, `docs/deferred/`, current `docs/PLANS.md`, archived plans, and previous `docs/plans/progress/` evidence **including Handoffs**.
3. Current code, tests and lockfile; relevant assessment findings only as historical evidence.

Reconcile Contract revisions against stable Coverage IDs. Keep IDs for unchanged requirements; add IDs for new/split requirements and retain superseded rows as RETIRED with successor links. Do not renumber the ledger or carry verification across changed acceptance criteria. Extract current, stable, testable obligations; Contract §5 decisions stay unapproved. Downgrade verification when relevant implementation or test assumptions change.

Resume incomplete Tasks before proposing another Phase. Select **only the highest-priority unfinished vertical slice** as one Phase, ranking critical blockers, authentication safety, product value and verifiable end-to-end delivery. Reuse PH-001's validated approaches unless relevant source, dependency, Contract assumptions or runtime observations changed. Investigation needs a **specific documented blocker**, reproducible findings and fingerprinted relevant inputs; repeat it only with new relevant evidence, never a renamed objective or another report alone. Unresolved decisions are BLOCKED, not permission to invent a policy.

Decompose **all necessary Tasks** in dependency order, covering every acceptance criterion. Each Task needs ID, goal, dependencies, deliverable, scope, verification strategy/command and expected evidence. Implementation must deliver product code and acceptance tests; prototypes/documents alone cannot complete it.

Under Top 1 Phase, state **Vertical slice** (actor, trigger, production path, terminal result), **End-to-end acceptance** (positive and relevant negative journeys with commands/evidence), and explicit scope limits. Under Dependency and Coverage Check, explain how every Task supports that same slice. Use `kind: implementation` for new product sprints. Keep the existing six headings and JSON schema; these narrative descriptions do not require changing historical records.

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

Execute the current scope in dependency order. Read prior progress first; retain completed work, reproduce material evidence when assumptions changed, and continue unfinished Tasks. Implement production functionality for implementation sprints. Run relevant tests, repair failures within scope, and record **actual** commands, exit codes, observations, hashed artifact/log references and acceptance-to-task mappings in the existing `docs/plans/progress/<phase-id>.md` file.

Complete and verify the approved slice through its terminal result in the same sprint. Do not add unrelated improvements or stop at a completed layer. If required integration or end-to-end acceptance is unavailable, preserve partial work as BLOCKED/PAUSED rather than counting the slice delivered. A scope amendment must be explicit; deferred checks remain unverified and may not remove the defining end-to-end outcome while retaining a delivery claim.

Store generated logs, captures and temporary verification artifacts only in `evidence/<phase-id>/`; keep production source and tests in their normal paths. Preserve this directory for RUNNING, PAUSED and BLOCKED phases. The controller validates live evidence, retains a `json sprint-completion` receipt in progress, and removes only this phase's evidence directory before setting READY_FOR_REVIEW. Do not delete evidence yourself or treat deleted logs as available for later inspection. Keep actual command results and limitations in progress/Handoff.

Maintain one `json sprint-evidence` block in that file, preserving earlier narrative and run records. Include proposed Coverage changes with acceptance mappings, code/test references and reasons. The controller validates and applies them after successful completion. Research cannot mark product requirements VERIFIED. VERIFIED requires all requirement acceptance checks, production source, tests and actual successful evidence.

Include concise Handoff fields: delivered functionality; reusable code and test evidence; technical decisions and limitations; remaining Contract gaps; recommended next objective. The controller appends them as a **Handoff section in the same progress file**; add a Handoff yourself on a worker stop when possible. Do not create a separate handoff system.

Link DEFERRED cases to their `docs/deferred/` records in remaining gaps. The recommended next objective must come from eligible active work, not automatically from the deferred list. If no active objective is eligible, state what input is missing instead of selecting a parked case.

- READY_FOR_REVIEW: every Task and criterion has actual acceptance evidence; a product sprint includes verifiable changed production code and successful end-to-end acceptance of its one slice. For legacy research scopes, retain their existing blocker/reproduction completion rules without presenting research as a delivered product slice. A final status line alone is insufficient.
- BLOCKED: an unresolved product/security/architecture/permission decision or unavailable prerequisite prevents progress. Preserve partial delivery and exact unblock needed. Do not infer approval.
- PAUSED: incomplete due to execution limits or failed evidence validation. Preserve work for resume.

Never edit the approved Contract, current plan, immutable proposals/assessments, production state or historical progress/completion records. Append progress without rewriting prior history. Do not commit, push, deploy, start another Phase, or add approval stages. Prefer supported Better Auth APIs over upstream modifications. This Yes/No gate and evidence validation provide workflow checks, not OS isolation or independent proof that worker claims are true.
