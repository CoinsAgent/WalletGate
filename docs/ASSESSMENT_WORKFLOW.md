# Reusable Codex assessment workflow

This repository separates **requirements**, **review procedures**, and **results**:

| Item | Location | Responsibility |
| --- | --- | --- |
| Project agent instructions | `AGENTS.md` | Scope, trust boundaries, and where to find guidance |
| Approved product contract | `docs/PRODUCT_UNDERSTANDING_CONTRACT.md` | What the IdP must become |
| Compliance skill | `.agents/skills/contract-compliance/SKILL.md` | How to check the implementation against the contract |
| Feasibility skill | `.agents/skills/technical-feasibility/SKILL.md` | How to investigate a specific technical obstacle |
| Report runner/publisher | `scripts/run-assessment.sh` | Timestamp, metadata, no-overwrite storage |
| Historic reports | `docs/assessments/*.md` | Results from particular code/contract/dependency states |

## First-time setup

From the repository root on Ubuntu/Linux:

```bash
command -v codex
command -v git
command -v python3
bash -n scripts/run-assessment.sh
chmod +x scripts/run-assessment.sh # optional: bash scripts/run-assessment.sh also works
```

Codex must already be installed and authenticated. Start a **new Codex session** after adding or updating `.agents/skills/` so skill discovery sees the current manifests. Skills can be invoked as `$contract-compliance` and `$technical-feasibility`.

## Option 1 — recommended, unattended and read-only

The script starts Codex in read-only mode, captures its Markdown answer outside the repository, and *after it finishes* publishes a new Markdown report. Codex itself cannot modify the working tree in this mode.

```bash
# General or focused compliance review
bash scripts/run-assessment.sh run contract-compliance \
  --scope 'SIWE-only login and OAuth authorization enforcement'

# Investigate a particular technical question without a compliance report
bash scripts/run-assessment.sh run technical-feasibility \
  --question 'Can the installed Better Auth version issue OIDC sub = verified Ethereum address consistently?'

# Investigate findings from one specific historical compliance report
bash scripts/run-assessment.sh run technical-feasibility \
  --question 'How can the wallet-verified owner authorize multiple OAuth clients?' \
  --baseline docs/assessments/2026-10-28-contract-compliance.md
```

`--baseline` is **optional**. A feasibility investigation does **not** automatically execute a compliance review. Supply `--question` or `--baseline` to limit feasibility scope; a report without matching current evidence must be revalidated.

The `run` mode writes a report only on successful nonempty Codex output. It uses Codex CLI's `--output-last-message`; console text is not the report. If the Codex process fails, no report is published.

## Option 2 — interactive Codex → Skill → Script → Report

Start from the repository root:

```bash
codex --sandbox workspace-write
```

Then ask Codex, for example:

> Use `$contract-compliance` to review SIWE-only login against the Product Contract. Save a timestamped Markdown report using the shared publisher. Change no source files.

Or:

> Use `$technical-feasibility` to analyze `OIDC sub = verified wallet address`. Use `docs/assessments/2026-10-28-contract-compliance.md` as historical context and publish the report. Change no source files.

The skill conducts the analysis, then uses **`scripts/run-assessment.sh publish` with the Markdown body on stdin**. It must never call `run` from within a Codex session: `run` itself launches Codex and would recurse.

`workspace-write` grants write access to more than the final report at the sandbox level; the skill restricts itself by instruction, **not** by filesystem permissions. For security-sensitive reviews, prefer the read-only unattended mode above.

## Publishing an already-reviewed Markdown body

From the repository root:

```bash
bash scripts/run-assessment.sh publish contract-compliance \
  --scope 'Current SIWE login' < /tmp/compliance-body.md

bash scripts/run-assessment.sh publish technical-feasibility \
  --question 'ERC-1271 support' \
  --baseline docs/assessments/2026-10-28-contract-compliance.md \
  < /tmp/feasibility-body.md
```

The publisher does not run Codex. It adds metadata and creates one new report, without changing the body or modifying existing reports.

## Report naming and traceability

Examples:

```text
docs/assessments/2026-10-28T05-30-42.123456789Z-contract-compliance.md
docs/assessments/2026-10-28T05-40-22.987654321Z-technical-feasibility.md
```

All timestamps are **UTC**. The filename/run ID is an execution identifier, not the product version. YAML front matter includes:

- `schema_version`, `report_id`, `assessment_type`, `created_at_utc`, `review_status`.
- `contract_version` and `contract_sha256`.
- `repository_commit`, `worktree_dirty_at_start`, and `skill_sha256`.
- `better_auth_lock_version`, `better_auth_installed_version` when detectable.
- `scope` or `question`, and optional `baseline_report`.

Historic results must not be overwritten, edited to claim later correctness, or confused with approved product decisions. A report with a dirty working tree may not be reproducible from its commit alone.

## Version control and review

```bash
git status --short
git diff --check
# Review any new docs/assessments/<timestamp>-*.md files.
git add docs/assessments/<timestamp>-<assessment-type>.md
git commit -m 'docs: record identity assessment'
```

**Do not automate Git commit/push from an assessment skill.** Review the report, sources, and unknowns before adding it to project history. For important approved design decisions, use a separately reviewed architecture decision document; an assessment recommendation is not an approval.

## Known limitations

This workflow does not prove OIDC conformance or SIWE correctness without executed tests. Static findings are classified explicitly. Timestamped names make reports unique but do not replace Git revisions. A new dependency or Contract revision can make earlier conclusions obsolete.

The two 2026-10-28 baseline reports shipped with this repository were transcribed from an earlier conversation/review; their original checked worktree revision is not established. They serve as historical context, not output from the new workflow or a substitute for a fresh assessment.
