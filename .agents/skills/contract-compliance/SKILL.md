---
name: contract-compliance
description: Audit current wallet, SIWE, OAuth/OIDC, and application ownership behavior against the approved Product Understanding Contract, optionally comparing an earlier assessment. Use for explicit compliance reviews or identity-related regression checks, not routine code edits.
---

# Contract compliance assessment

## Goal

Determine **whether the current repository satisfies the approved product contract**, not how to implement missing features. Prefer focused checks when a scope is specified. A previous report provides a comparison baseline only; it is not current evidence.

## Authoritative sources

1. Applicable `AGENTS.md` instructions.
2. `docs/PRODUCT_UNDERSTANDING_CONTRACT.md` (normative requirements).
3. Current repo code, tests, lockfile, and runtime evidence actually executed (facts).
4. Optional prior `docs/assessments/*.md` report (historical comparison only).

Do not turn historical assumptions or framework defaults into approved product decisions.

## Procedure

1. Identify contract version, Git revision, and review scope. Read the relevant contract principles.
2. Read a supplied baseline only if one is provided; note its age, Git revision, contract version, and limitations. Do not silently select the latest file as an authoritative baseline.
3. Inspect the relevant code and existing tests. For upstream behavior, confirm the dependency version and precise sources rather than guessing from public documentation.
4. Map each in-scope requirement to the **current** implementation. Distinguish verified static behavior from executed tests and unknown runtime behavior.
5. Check negative paths and bypasses: alternate authentication, wallet/session provenance, subject consistency, unauthenticated registration, owner isolation, and client management authorization where relevant.
6. Classify each item as `Compliant`, `Partial`, `Conflict`, or `Unknown`. Include specific file paths, functions, and line ranges for significant claims.
7. If a baseline exists, report `Resolved`, `New`, `Unchanged`, or `Unverified` differences. Avoid a redundant full audit.
8. Record material security and interoperability risks and product decisions that remain unapproved.

## Required Markdown report body

Start with `# Contract Compliance Report`. Include these sections:

1. **Scope and evidence** — contract version, inspected areas, verified methods and limitations.
2. **Summary table** — requirement, status, evidence, significance.
3. **Findings** — verified current behavior; contract mismatch; source path/function/line, risk, open questions.
4. **Change versus baseline** — only if supplied; distinguish current from historical findings.
5. **Product Understanding Verdict** — concise assessment, not implementation authorization.
6. **Unresolved decisions and unknowns**.

Do not invent file paths, line numbers, package versions, test results, or fixes. State `Unknown` if not verified. Report **no** YAML front matter; deterministic metadata is owned by the publisher.

## Output and invocation contract

There are **two** supported execution contexts:

- **Unattended runner:** When the invoking prompt says `OUTPUT_MODE=BODY_ONLY`, return only the complete Markdown body as your final answer for the runner to capture. **Do not run any publishing script** or write files. The outer runner will save it using `scripts/run-assessment.sh`. This machine-output mode is the exception to the interactive response rule below.
- **Interactive Codex:** Save the completed assessment by default; invoking this skill authorizes creation of one new report in `docs/assessments/`. After analyzing, invoke `bash scripts/run-assessment.sh publish contract-compliance [--scope "..."] [--baseline docs/assessments/<file>.md]` with the finished report body on standard input (for example, a shell here-document). No separate save request or confirmation is needed. This command is the **only** authorized workspace write for a report task.
- **Interactive response:** Do not print the report body in the terminal or chat, or echo it through tools. After successful publication, return only a brief confirmation and a link to the generated Markdown file. If publication fails, report the failure concisely without claiming the report was saved or dumping its body. An explicit user instruction to avoid saving takes precedence over the default.

The script handles timestamps, metadata, unique names, and no-overwrite behavior. Do not write a report directly into `docs/assessments/`, assign metadata, alter past reports, or invoke the script's `run` mode from this skill.

## Restrictions

Read-only investigation: no code/config/dependency changes, migrations, Git mutations, or implementation roadmap. No tests that write to the workspace unless explicitly authorized. Interactive runs may write only the one new report through the shared publisher; unattended `OUTPUT_MODE=BODY_ONLY` runs must not write files.
