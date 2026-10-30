---
name: technical-feasibility
description: Investigate Better Auth, SIWE, OAuth/OIDC, Ethereum identity, or client-ownership technical feasibility from a specific question or compliance report. With no input, use the latest saved contract-compliance report. Never require a new compliance scan first.
---

# Technical feasibility assessment

## Goal

Determine **which supported technical approaches can satisfy a specific product requirement**, and what remains unverified. This is not a full contract audit, implementation task, or permission to change product principles.

## Sources and priority

1. Applicable `AGENTS.md`.
2. `docs/PRODUCT_UNDERSTANDING_CONTRACT.md` — authoritative requirements.
3. Current source, lockfile, installed package code (when accessible), targeted tests, and matching versioned upstream source — technical evidence.
4. Explicitly supplied or automatically selected compliance report and relevant earlier assessments — historical leads, never present-day proof.
5. Standards and primary technical documentation — distinguish protocol mandates from this product's extra constraints.

## Select the input

- An explicit question or baseline takes precedence. A question without a baseline remains an independent investigation; do not attach a report automatically.
- For an interactive invocation with neither a question nor a baseline, select the latest existing `docs/assessments/*-contract-compliance.md` by the UTC timestamp in its filename, not filesystem modification time. Break equal-timestamp ties by descending filename order. Also recognize legacy date-only `YYYY-MM-DD-contract-compliance.md` names, treating their date as midnight UTC. Exclude feasibility reports and files outside this directory; do not use Git revision or contract version as a report creation date.
- Read the selected report and verify its `# Contract Compliance Report` heading and any available metadata. If its date cannot be established or its contents are invalid, ask for a baseline rather than silently substituting another file. If no saved compliance report exists, request a concrete question or baseline; do not run a compliance scan automatically.
- Record the exact selected path and selection rule in the assessment's evidence baseline. Treat the report as historical evidence even if it is the newest. Recheck its relevant findings against current source and the approved contract before drawing conclusions.
- With a baseline and no narrower question, investigate the report's conflicts, partial requirements, and material unknowns. Compare supported technical approaches and give a feasibility verdict for each investigated issue. Do not repeat the full compliance audit or invent an unrelated scope.

## Input mode A — follow up compliance findings

When a baseline Compliance Report is supplied or selected by the default above:

1. Identify the exact findings relevant to the requested question, or the baseline findings described above when no question was supplied.
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

**Do not automatically run or require `$contract-compliance`.** Use the input-selection rules above when no question or baseline was supplied.

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
2. **Evidence baseline** — current Git commit, `package@version`, exact sources, supplied or automatically selected compliance report and its metadata/limitations.
3. **Verified behavior and technical limitation**.
4. **Supported extension mechanisms / candidate approaches** — evidence, trade-offs, security, interoperability, unknowns.
5. **Feasibility verdict** — `Supported`, `Conditionally feasible`, `Unproven`, or `Not feasible in the checked version`, with confidence.
6. **Decisions requiring product-owner approval**; do not treat recommendations as decisions.

No YAML front matter; the publisher owns reproducible report metadata.

## Output and invocation contract

- **Unattended runner (`OUTPUT_MODE=BODY_ONLY`):** Return only the full Markdown report body for the runner to capture. Do not run publishing scripts or write files; the invoking runner persists the result. This machine-output mode is the exception to the interactive response rule below.
- **Interactive Codex:** Save the completed assessment by default; invoking this skill authorizes creation of one new report in `docs/assessments/`. After investigating the question or baseline findings, call `bash scripts/run-assessment.sh publish technical-feasibility [--question "..."] [--baseline docs/assessments/<file>.md]` with the full Markdown report body on standard input (for example, a shell here-document). Always pass the exact supplied or automatically selected baseline via `--baseline` so the publisher records its path and hash. For a baseline-only investigation, omit `--question` rather than inventing a question. The script creates exactly one immutable report; no separate save request or confirmation is needed. If input selection cannot establish a question or valid baseline, request scope before investigating or publishing.
- **Interactive response:** Do not print the report body in the terminal or chat, or echo it through tools. After successful publication, return only a brief confirmation and a link to the generated Markdown file. If publication fails, report the failure concisely without claiming the report was saved or dumping its body. An explicit user instruction to avoid saving takes precedence over the default.
- Never invoke the script's `run` mode from this skill; that would recursively launch another Codex session.

## Restrictions

Read-only investigation. Do not change code, dependencies, configuration, contract, Git history, or past reports; do not produce an implementation roadmap. Interactive runs may write only the one new assessment report through the shared publisher; unattended `OUTPUT_MODE=BODY_ONLY` runs must not write files.
