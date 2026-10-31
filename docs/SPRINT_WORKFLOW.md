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

`docs/PLANS.md` is the current Phase with all Tasks; `docs/plans/history/` retains completed plans when `next` is explicitly requested. `docs/plans/proposals/` retains immutable proposals. Evidence and Handoff stay together in `docs/plans/progress/<phase-id>.md`. PH-001's original plan and historical progress are preserved; its appended controller index describes historical runs, not newly executed tests.

`status` reads these files and Coverage. Completed Sprint counts require READY_FOR_REVIEW **and valid completion evidence**; no additional human-acceptance state is introduced. A status label alone cannot advance `next`. Missing or altered evidence requires reconciliation. A failed worker or invalid completion becomes PAUSED.

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
        "log": {"path": "docs/plans/progress/<durable-log>", "sha256": "<actual sha256>"}
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
    "reusable": "<code, tests and durable evidence paths>",
    "decisions_limitations": "<decisions, exclusions and unapproved policies>",
    "remaining_gaps": "<Coverage IDs and missing behavior>",
    "next_objective": "<recommended next objective, not authorization>"
  }
}
```

For incomplete work use task status `PENDING`, `IN_PROGRESS`, `BLOCKED` or `COMPLETE` truthfully. All must be COMPLETE for completion. Each completed Task needs successful command records and hash-checked artifacts/logs; acceptance references must map to the planned covering Tasks. Historical failed commands remain in narrative/logs, with repairs and final successful reruns clearly distinguished. Record working directory, versions and relevant fixture limits in the narrative.

Implementation completion requires product source under `app/`, `lib/` or `components/` that changed since this sprint's durable `sprint-baseline` snapshot. Test/document-only delivery is rejected. If product code lives elsewhere in a future layout, extend this validator explicitly. Research completion instead requires `findings` and `reproduction` fields plus its planned specific blocker; a reproducible no-go can complete bounded research, unavailable resources cannot. Research cannot mark Coverage VERIFIED.

The controller checks completion, validates scoped Coverage updates, appends an idempotent Handoff to this same file and sets READY_FOR_REVIEW. On partial work it retains Coverage and adds the available Handoff (or a conservative stop record). Do not edit Coverage directly in the execution worker. No approvals of unresolved policy are implied by these records.

Hashes detect missing/changed recorded artifacts; they do not prove command execution or that tests assert every intended behavior. Worker-written records remain reviewable evidence, not cryptographic attestation. This gate is not hardened process isolation. Use an isolated checkout when stronger isolation is needed.

## Validation

```sh
python3 -m unittest discover -s scripts/tests -v
```

Tests use isolated temporary repositories and a simulated execution worker. They exercise planning/persistence, dependency and acceptance mapping, status counts, Coverage validation, stale Contract detection, duplicate/research prevention, explicit confirmation, interrupted resume, product deliverables, hash failures and appended Handoffs. They do not invoke a live Codex worker or repeat PH-001 experiments.

Upgrade verification on 2026-10-31: `python3 -m unittest discover -s scripts/tests -q` passed **29 tests**; Skill `quick_validate.py` passed; `git diff --check` passed. Byte comparisons against HEAD confirmed the approved Contract and active PH-001 plan unchanged, and all original PH-001 progress preserved as an exact prefix. The live `status` command reported one completed research Sprint, 8/8 Tasks, and Coverage MISSING=2, PARTIAL=7, BLOCKED=4, VERIFIED=0. No live Codex worker, product tests or PH-001 experiments were executed during this tooling upgrade.
