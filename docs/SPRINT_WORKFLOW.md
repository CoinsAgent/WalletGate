# WalletGate Contract-driven sprint workflow

Contract → Coverage → Sprint → Evidence → Handoff → Next Sprint. The existing three Skills remain; no project service, additional approval stage or automatic next sprint is involved.

```sh
python3 scripts/phase-plan-exec.py status
python3 scripts/phase-plan-exec.py plan
python3 scripts/phase-plan-exec.py plan --proposal docs/plans/proposals/<file>.md
python3 scripts/phase-plan-exec.py execute
# Chat only, after an explicit Yes for the CURRENT sprint:
python3 scripts/phase-plan-exec.py execute --yes
# Explicit user request after completion; plans but never auto-approves:
python3 scripts/phase-plan-exec.py next
```

`plan` reuses unfinished work. The terminal asks **Execute this sprint? [Yes/No]**; only the full Yes executes. Non-TTY planning leaves confirmation pending. In chat show the saved plan, ask Yes/No and stop. `--yes` is accepted only with `execute`; do not infer it from prior sessions. Interrupted RUNNING work can be resumed with a new Yes using `execute`; preserve its initial product snapshot. No other sprint starts automatically.

`docs/PLANS.md` is the current Phase with all Tasks; `docs/plans/history/` retains completed plans when `next` is explicitly requested. `docs/plans/proposals/` retains immutable proposals. Durable command summaries, artifact references, completion receipts and Handoff stay together in `docs/plans/progress/<phase-id>.md`. PH-001's original plan and historical progress are preserved; its appended controller index describes historical runs, not newly executed tests.

`status` reads these files and Coverage. Completed Sprint counts require READY_FOR_REVIEW **and a valid completion record with unchanged retained artifacts**; no additional human-acceptance state is introduced. A status label alone cannot advance `next`. Missing or altered retained artifacts or changed completion records require reconciliation. Intentional removal of temporary evidence is covered by the controller receipt. A failed worker or invalid completion becomes PAUSED.

## Sprint delivery rules

1. **One Sprint = One Vertical Slice.** Each new product sprint delivers one coherent, observable outcome for a user, application owner or standard RP. Include all required layers and supporting Tasks in that sprint. Multiple Tasks or Coverage requirements may support one slice; independent outcomes belong in separate sprints.
2. **End-to-End Acceptance.** The plan identifies the actor, starting state/trigger, production path and observable terminal result, including relevant denial/recovery cases. Acceptance exercises the real integration boundaries: an actual browser for UI behavior, or actual API/protocol boundaries for a protocol-only slice. Unit tests and mocks supplement this evidence. Record fixture/device limits without claiming broader compatibility.
3. **No Layer-Only Delivery.** A parser, persistence change, API, screen or investigation is a supporting Task, not a delivered product slice by itself. Narrow oversized work to a smaller complete behavior. Do not postpone the defining integration or acceptance to the next sprint and mark the current slice delivered.

For example, accepting a legal field-like SIWE statement through authentication, consent and return to a standard RP is one slice; exposing parsed fields without integrating and verifying the login path is a layer-only task. The slice need not add a screen or touch every repository layer when the existing layers can be reused.

Under Top 1 Phase, describe **Vertical slice** (actor, trigger, production path, result), **End-to-end acceptance** (positive/negative journeys and verification), and scope limits. Under Dependency and Coverage Check, map every Task to that slice. Use `kind: implementation` for new product sprints. Investigation can support the slice; separately requested research assessments do not count as product delivery. Legacy research plans and receipts remain valid under their original rules.

Completion requires the slice's end-to-end acceptance as well as all Task evidence. Unavailable defining integration/checks leave the delivery BLOCKED/PAUSED. Explicit scope amendments and deferred checks must remain visible; they cannot silently remove the defining outcome or imply unexecuted acceptance passed. Preserve existing approved scopes, receipts and Product Contract decisions. These semantic review rules supplement the controller's structural/hash validation; the controller cannot prove a coherent slice from task counts or fingerprints.

## Deferred cases

Store every explicitly DEFERRED case in `docs/deferred/<stable-case-id>.md`, indexed in [docs/deferred/README.md](deferred/README.md). Record originating phase/tasks/acceptance, the explicit deferral authorization and reason, missing behavior/checks, historical evidence and its limits, affected Coverage, reopening conditions and closure criteria. Progress, Handoff and plans reference the durable case. Preserve historical plans/progress, immutable assessments and completion receipts when consolidating old cases; a directory entry may reference those records without altering their hashes. This directory is durable and outside `evidence/<phase-id>/` cleanup.

Deferred cases are parked work and **must not become the default main aim of the next phase or sprint**. A general `next`, priority ranking, elapsed time or newly available prerequisite is not reactivation. Only an explicit user request naming a case or clearly requesting its deferred behavior makes it eligible for planning again; record that request and still obtain the sprint's explicit Yes before execution. Do not smuggle a parked case into a renamed objective, supporting Task or feasibility investigation. Choose an independent active slice if it depends on deferred work, or report the dependency/no eligible slice. Assessment findings may describe an unresolved deferred risk without reopening implementation.

Deferral is distinct from a blocker and from successful acceptance. It does not weaken the Product Contract, resolve unapproved policy or upgrade Coverage. Never defer the defining integration merely to claim a completed vertical slice. Reviews check these boundaries without editing registry records. Do not retroactively change legacy completed scopes.

## Temporary evidence lifecycle

Store all newly generated phase logs, captures and temporary verification artifacts under the repository-root `evidence/<phase-id>/` directory. Keep production source/tests in their normal paths and command outcomes, limitations and Handoff in progress. `evidence/` is ignored by Git. RUNNING, PAUSED and BLOCKED phases retain their evidence for resume.

Before setting READY_FOR_REVIEW, the controller validates live hashes and acceptance mappings, applies Coverage updates and appends Handoff. It saves a `json sprint-completion` receipt in progress, containing a fingerprint of the plan, evidence record and initial baseline plus the exact temporary artifact references validated. It then deletes only `evidence/<phase-id>/` and changes the status. Validation or cleanup failure prevents READY_FOR_REVIEW. Workers must not perform this cleanup themselves.

`status` and `next` accept missing temporary files only when covered by a matching completion receipt; retained source/tests and historical logs outside `evidence/<phase-id>/` still require live hashes. The receipt is a record of prior validation, not independent proof of execution. Review uses retained summaries and current checks, and must not claim deleted logs were inspected. Plans, progress, Handoffs, Coverage, immutable proposals and assessment reports are retained. Legacy evidence stays at its existing paths; this policy does not bulk-delete historical files or change existing phase statuses.

## Coverage

`docs/CONTRACT_COVERAGE.md` contains a generated summary and authoritative `json contract-coverage` block. Each stable requirement row contains `id`, Contract section, testable requirement, acceptance IDs/descriptions, status, source paths (`code`), `tests`, sprint `evidence` and a reason/limitation. The initial baseline is conservative static source review plus bounded PH-001 research, with **zero VERIFIED product requirements**.

Statuses: MISSING, PARTIAL, IMPLEMENTED (acceptance pending), VERIFIED, BLOCKED, RETIRED. VERIFIED requires all requirement acceptance checks, actual product acceptance evidence, source and tests. Prototype/research success is insufficient. Keep unresolved Contract §5 policies BLOCKED. Acceptance criteria can be split into more IDs for finer tracking while retaining the requirement ID.

On Contract revision, compare meaning and acceptance checks, keep unchanged requirement IDs, assign new IDs for new/split obligations, and retain superseded IDs as RETIRED with successor references. Invalidate affected verification and record why. Update the recorded Contract version/hash only after reconciliation; the controller blocks stale-hash planning, execution and Coverage updates. Never modify the Contract to fit code. On relevant code/test changes, recheck affected VERIFIED rows and downgrade unsupported verification before further planning. The ledger is maintained evidence, not a formal proof or an automatic semantic Contract parser.

## Proposal record

Keep the Skill's six Markdown headings, full human-readable scope/acceptance details, and `### C01 — title` / `### C01-T01 — title` Tasks. Include exactly one fenced block below within `## Dependency and Coverage Check`:

```json sprint-plan
{
  "kind": "implementation",
  "objective_key": "close-unauthenticated-client-registration",
  "requirements": ["WG-008"],
  "acceptance": ["WG-008-A1"],
  "tasks": [{
    "id": "C01-T01",
    "goal": "Deny unauthenticated registration on all exposed routes",
    "depends_on": [],
    "deliverable": "Production enforcement and route acceptance tests",
    "verification": "Exact relevant test command, including denied and allowed controls",
    "acceptance": ["WG-008-A1"]
  }]
}
```

IDs in the block and Markdown Tasks must agree and be in dependency order; every criterion must have a covering Task. The controller assigns permanent Phase/Task IDs. `objective_key` is a stable semantic identity, not a title. Completed objectives cannot be duplicated by renaming titles. Assessments are optional; no mandatory feasibility rerun precedes implementation.

For `kind: research`, also require `blocker` (the specific unanswered technical obstacle) and `inputs` mapping relevant repository paths to their current SHA-256. Repeated research overlapping prior requirements is rejected unless at least one previously fingerprinted relevant input changed. Adding a new report, renaming the objective or changing the fingerprint text without changing the file cannot bypass this check. Record why the changed assumption matters in the proposal. Fingerprint relevant Contract, code and lockfile inputs, not incidental generated documents. This deterministic check cannot judge semantic relevance; the planner must do so.

## Execution record

The worker records real commands and artifacts; it must not fabricate results or execute the controller recursively. Preserve earlier narrative, replace only the current machine record on resume, and keep one block. Use actual SHA-256 values below; placeholder hashes are rejected.

```json sprint-evidence
{
  "phase": "PH-002",
  "tasks": {
    "PH-002-T01": {
      "status": "COMPLETE",
      "artifacts": [{"path": "lib/auth.ts", "sha256": "<actual sha256>"}],
      "commands": [{
        "command": "<actual acceptance command>",
        "exit_code": 0,
        "result": "<observed assertions and test counts>",
        "log": {"path": "evidence/PH-002/<log>", "sha256": "<actual sha256>"}
      }]
    }
  },
  "acceptance": {"WG-008-A1": ["PH-002-T01"]},
  "product_deliverables": [{"path": "lib/auth.ts", "sha256": "<actual sha256>"}],
  "coverage_updates": [{
    "id": "WG-008",
    "status": "VERIFIED",
    "acceptance": ["WG-008-A1"],
    "reason": "<actual complete product acceptance result>",
    "code": ["lib/auth.ts"],
    "tests": ["<existing acceptance test path>"]
  }],
  "handoff": {
    "delivered": "<functionality delivered>",
    "reusable": "<code/test paths, command results and retained progress path>",
    "decisions_limitations": "<decisions, exclusions and unapproved policies>",
    "remaining_gaps": "<Coverage IDs and missing behavior>",
    "next_objective": "<recommended next objective, not authorization>"
  }
}
```

For incomplete work use task status `PENDING`, `IN_PROGRESS`, `BLOCKED` or `COMPLETE` truthfully. All must be COMPLETE for completion. Each completed Task needs successful command records and hash-checked artifacts/logs; acceptance references must map to the planned covering Tasks. Historical failed commands remain in narrative/logs, with repairs and final successful reruns clearly distinguished. Record working directory, versions and relevant fixture limits in the narrative.

Implementation completion requires product source under `app/`, `lib/` or `components/` that changed since this sprint's durable `sprint-baseline` snapshot. Test/document-only delivery is rejected. If product code lives elsewhere in a future layout, extend this validator explicitly. Research completion instead requires `findings` and `reproduction` fields plus its planned specific blocker; a reproducible no-go can complete bounded research, unavailable resources cannot. Research cannot mark Coverage VERIFIED.

The controller checks completion, validates scoped Coverage updates, appends an idempotent Handoff to this same file, records the completion receipt, removes the phase's temporary evidence directory and sets READY_FOR_REVIEW. On partial work it retains Coverage and adds the available Handoff (or a conservative stop record). Do not edit Coverage directly in the execution worker. No approvals of unresolved policy are implied by these records.

Hashes detect missing/changed recorded artifacts; they do not prove command execution or that tests assert every intended behavior. Worker-written records remain reviewable evidence, not cryptographic attestation. This gate is not hardened process isolation. Use an isolated checkout when stronger isolation is needed.

## Validation

```sh
python3 -m unittest discover -s scripts/tests -v
```

Tests use isolated temporary repositories and a simulated execution worker. They exercise planning/persistence, dependency and acceptance mapping, status counts, Coverage validation, stale Contract detection, duplicate/research prevention, explicit confirmation, interrupted resume, product deliverables, hash failures, appended Handoffs, phase-scoped cleanup, cleanup failures and completion validation after cleanup. They do not invoke a live Codex worker or repeat PH-001 experiments.

Upgrade verification on 2026-10-31: `python3 -m unittest discover -s scripts/tests -q` passed **29 tests**; Skill `quick_validate.py` passed; `git diff --check` passed. Byte comparisons against HEAD confirmed the approved Contract and active PH-001 plan unchanged, and all original PH-001 progress preserved as an exact prefix. The live `status` command reported one completed research Sprint, 8/8 Tasks, and Coverage MISSING=2, PARTIAL=7, BLOCKED=4, VERIFIED=0. No live Codex worker, product tests or PH-001 experiments were executed during this tooling upgrade.
