---
name: phase-plan-exec
description: Plan exactly one highest-priority WalletGate sprint, persist its full Phase/Task plan in docs/PLANS.md, ask the human Yes/No, and execute only after an explicit Yes. Use for sprint planning, continuation, and execution; never auto-start subsequent phases.
---

# Phase Plan & Execute — one sprint at a time

## User experience

The command for a terminal user is:

```bash
python3 scripts/phase-plan-exec.py
```

It reuses an unfinished sprint if present, otherwise:
1. Generates a **Top 1 Phase plus all necessary Tasks** from the Product Contract, assessment reports and current repository.
2. Persists the complete scope and Task list in `docs/PLANS.md` with a stable Phase ID and Task IDs.
3. Presents the plan and asks **Execute this sprint? [Yes/No]**.
4. **Yes:** execute Tasks in dependency order, test and record progress; stop at `READY_FOR_REVIEW`, `BLOCKED`, or `PAUSED`.
5. **No, blank or missing response:** do not execute; keep the plan `PENDING_EXECUTION`.

When invoked interactively as `$phase-plan-exec` in Codex chat:
- First run `python3 scripts/phase-plan-exec.py plan`. A non-TTY run prints the pending confirmation.
- Show the Phase ID, Task count, and `docs/PLANS.md`; ask the user **"Execute this sprint? Yes / No"**. Stop and wait.
- On the user's **new explicit Yes for this sprint**, run `python3 scripts/phase-plan-exec.py execute --yes`; then report its real result.
- On **No** or ambiguous response, do not run execution. A later Yes can resume the pending sprint.
- Never call `--yes` during planning, or infer approval from historical conversations.
- `python3 scripts/phase-plan-exec.py status` reads the active state; `... next` archives a `READY_FOR_REVIEW` sprint and plans the next, again asking Yes/No. Never auto-start the next sprint.

An existing proposal can be selected without regenerating:
```bash
python3 scripts/phase-plan-exec.py plan --proposal docs/plans/proposals/<proposal-file>.md
```

## Worker mode: generating the Phase proposal

When the low-level planner `scripts/run-phase-planner.py` invokes Codex with `OUTPUT_MODE=BODY_ONLY`, **do not run either script**; that would recurse. Read sources and return only the Markdown report body, starting with `# Phase Priority Proposal`.

**Authority and evidence:**
1. `AGENTS.md` and approved `docs/PRODUCT_UNDERSTANDING_CONTRACT.md` govern requirements.
2. Existing `docs/PLANS.md` and `docs/plans/history/*.md` document active and completed sprints.
3. Current code/tests/lockfile establish implementation reality.
4. The supplied (or latest relevant) Contract Compliance Report and Technical Feasibility Assessment are historical evidence; revalidate material stale findings.

Do not automatically rerun the other two assessment skills. Never reinterpret a technology limitation as permission to weaken the Product Contract.

**Select one Phase, not three:** rank all remaining product gaps and technical prerequisites internally, prioritizing unfinished current work, critical blockers, authentication safety, product value, and verifiable progress. Output the single highest-priority unfinished Phase, including all acceptance criteria, explicit in/out scope, technical dependencies, and security/architecture decision gates.

**Fully decompose all Tasks:** topologically order every necessary Task including research, security-negative tests, implementation, regression verification and documentation as appropriate. Every phase acceptance criterion must map to at least one Task. Each Task needs an ID, goal, dependencies, deliverable, scope, verification command/strategy and recorded evidence. Use provisional IDs `C01`, `C01-T01`, etc., for new proposals; the sprint controller assigns stable `PH-001`, `PH-001-T01`, etc. Reuse existing identities for an existing sprint.

**Report structure:** exact headings, in order:
- `# Phase Priority Proposal`
- `## Baseline`
- `## Top 1 Phase`
- `## All Tasks for Top 1 Phase`
- `## Dependency and Coverage Check`
- `## Approval Gate`

In the Approval Gate write exactly `PROPOSAL_ONLY — NO IMPLEMENTATION AUTHORIZED`. This is a pre-execution planning artifact; the sprint controller later asks for explicit Yes. If the prerequisite research is impossible, mark it `BLOCKED`; do not fabricate executable tasks or test results.

Do not include YAML metadata, choose filenames, write project files, invoke a publisher, execute tests that change the repository, or implement anything in worker mode. The runner owns timestamping and immutable proposal publication.

## Execution and stop rules

After an actual Yes, the sprint controller invokes a *separate* Codex execution with workspace-write access. Respect `docs/PLANS.md` as the current sprint scope, not as higher authority than Product Contract v1.1.

- Execute only this sprint's Tasks, in dependency order; create tests and record commands, actual outcomes, and evidence in `docs/plans/progress/<phase-id>.md`.
- Routine implementation decisions and test repairs can proceed automatically within the agreed scope.
- Never silently settle unresolved wallet identity, OAuth security, migration, or ownership policies.
- Never modify the Product Contract or the sprint's `docs/PLANS.md`, touch production data, deploy, commit, push, or start the next Phase.
- If a material product, security, architecture, or permission decision is needed, report `BLOCKED`. If work is incomplete due to execution limits, report `PAUSED`.
- Only report `READY_FOR_REVIEW` when all acceptance criteria have actual verification evidence; do not claim human acceptance.

This is a **human Yes/No execution gate**, not cryptographic or OS-level authorization. Never promise the instructions prevent all out-of-scope edits; use isolated worktrees/sandbox controls when greater protection is required.

