# WalletGate — One-sprint Phase Plan & Execute

**One phase at a time. The human decides Yes/No; Codex handles all Tasks within that phase.**

## Terminal: one command

```bash
cd /path/to/WalletGate
python3 scripts/phase-plan-exec.py
```

- If no sprint is active, Codex analyzes the Product Contract, latest relevant assessments, and current code to select **Top 1 Phase + ALL its Tasks**.
- The script writes **docs/PLANS.md** with persistent IDs such as `PH-001` and `PH-001-T01`.
- It asks **Execute sprint PH-001 now? [y/N]**.
- **Yes** executes only this sprint, recording results at `docs/plans/progress/PH-001.md`.
- **No** or Enter preserves `PENDING_EXECUTION`; no implementation starts.
- If there is an existing pending or paused sprint, the command reuses it rather than replanning.

## Codex chat (Skill)

Invoke `$phase-plan-exec`. Codex prepares `docs/PLANS.md` and asks **Execute this sprint? Yes / No**.

- Say **Yes** to launch `python3 scripts/phase-plan-exec.py execute --yes`.
- Say **No** to stop with the plan saved.
- Do not interpret silence as approval.

## Useful commands

```bash
# Read current sprint status
python3 scripts/phase-plan-exec.py status

# Reuse an existing immutable proposal; no second planning analysis
python3 scripts/phase-plan-exec.py plan --proposal docs/plans/proposals/<file>.md

# Resume a paused or pending sprint; asks Yes/No
python3 scripts/phase-plan-exec.py execute

# After READY_FOR_REVIEW, archive it and plan a NEW sprint; asks Yes/No again
python3 scripts/phase-plan-exec.py next
```

## Boundaries and evidence

- `docs/PLANS.md` is the single current sprint: objective, acceptance criteria, **all** Tasks and dependencies.
- `docs/plans/proposals/` stores immutable historical suggestions.
- `docs/plans/history/` stores completed sprint plan snapshots when `next` is explicitly invoked.
- `docs/plans/progress/` stores Codex execution evidence and remaining blockers.
- The script does **not** auto-commit, push, deploy, migrate production data, or start another sprint.
- `READY_FOR_REVIEW` means Codex reports that its criteria were verified; independent human acceptance is not implied.
- Use a dedicated Git branch/worktree for stronger change isolation. The Yes/No prompt is a workflow gate, not hardened OS authorization.

Requirements and product decisions always come from `docs/PRODUCT_UNDERSTANDING_CONTRACT.md`; assessments and generated plans are subordinate.

