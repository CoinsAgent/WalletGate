---
name: technical-feasibility
description: Investigate a specific Better Auth, SIWE, OAuth/OIDC, Ethereum identity, or client-ownership technical feasibility question, optionally using a contract-compliance report as input. Use for focused technical research; never require a new compliance scan first.
---

# Technical feasibility assessment

## Goal

Determine **which supported technical approaches can satisfy a specific product requirement**, and what remains unverified. This is not a full contract audit, implementation task, or permission to change product principles.

## Sources and priority

1. Applicable `AGENTS.md`.
2. `docs/PRODUCT_UNDERSTANDING_CONTRACT.md` — authoritative requirements.
3. Current source, lockfile, installed package code (when accessible), targeted tests, and matching versioned upstream source — technical evidence.
4. Explicitly supplied compliance report and relevant earlier assessments — historical leads, never present-day proof.
5. Standards and primary technical documentation — distinguish protocol mandates from this product's extra constraints.

## Input mode A — follow up compliance findings

When a baseline Compliance Report is explicitly supplied:

1. Identify the exact findings relevant to the requested question.
2. Record report date, contract version, repository commit, package versions, and limits. Mark missing metadata as unknown.
3. Recheck cited findings against current source. Do not propagate stale findings unchecked.
4. Trace relevant implementation paths and investigate available extension mechanisms.
5. Compare alternatives and their risks; label recommendations as **unapproved**.

Do not repeat the full compliance scan. Do not require all findings to be investigated if the question is narrower.

## Input mode B — independent technical question

When a specific technical question is given without a baseline:

1. Identify the product requirement involved.
2. Check relevant current code and precise package versions.
3. Trace key runtime boundaries (identity mapping, sessions, code/token/refresh paths, and administrative authorization as applicable).
4. Inspect public supported APIs/plugins/hooks before considering internal changes.
5. Evaluate technical alternatives and constraints using code evidence.

**Do not automatically run or require `$contract-compliance`.** If no question and no baseline was supplied, explain that a concrete technical scope is needed rather than inventing one.

## Evidence and security requirements

- For important implementation claims give `package@version`, exact path, function/API, and line range when available.
- Label each conclusion `Verified`, `Inferred`, or `Unknown`; do not describe static source inspection as a passing runtime test.
- Distinguish OIDC/OAuth/ERC normative requirements from extra Product Contract constraints.
- Consider cross-surface consistency: ID Token, UserInfo, introspection, JWT/opaque access tokens, refresh, and `client_credentials` **only where relevant**. Do not assume the OAuth token `sub` has the same semantics as OIDC end-user `sub`.
- Pay attention to session provenance, nonce validation, wallet-account switching, replay, ownership isolation, privilege hooks, and unauthenticated registration according to scope.
- Verify dependency-version alignment and do not infer support from a newer upstream branch.
- State clearly when a framework does not expose a proven public extension; don't recommend patching internals unless documented alternatives have been shown insufficient.

## Required Markdown report body

Start with `# Technical Feasibility Assessment`. Include:

1. **Question and contract constraints**.
2. **Evidence baseline** — current Git commit, `package@version`, exact sources, prior compliance report if provided.
3. **Verified behavior and technical limitation**.
4. **Supported extension mechanisms / candidate approaches** — evidence, trade-offs, security, interoperability, unknowns.
5. **Feasibility verdict** — `Supported`, `Conditionally feasible`, `Unproven`, or `Not feasible in the checked version`, with confidence.
6. **Decisions requiring product-owner approval**; do not treat recommendations as decisions.

No YAML front matter; the publisher owns reproducible report metadata.

## Output and invocation contract

- **Unattended runner (`OUTPUT_MODE=BODY_ONLY`):** Return only full Markdown report body. Do not run publishing scripts or write files; the invoking runner persists the result.
- **Interactive Codex, explicit save request:** After investigating, call `scripts/run-assessment.sh publish technical-feasibility --question "..." [--baseline docs/assessments/<file>.md]` with full Markdown report body on standard input. The script creates exactly one immutable report. Without a save request, simply present the findings.
- Never invoke the script's `run` mode from this skill; that would recursively launch another Codex session.

## Restrictions

Read-only investigation. Do not change code, dependencies, configuration, contract, Git history, or past reports; do not produce an implementation roadmap. The only permitted workspace mutation when persistence is explicitly requested is the new assessment report created by the shared publisher.
