# Repository instructions — WalletGate

WalletGate — **Your wallet. Your way in.**

An OpenID Connect provider for signing in to applications with your Ethereum wallet.

This repository is building WalletGate, a self-hosted, Ethereum-wallet-centric OpenID Connect Identity Provider (IdP) for third-party applications. It is **not** merely a SIWE demo or a general-purpose username/password IdP.

## Product authority

- **Approved product requirements:** [`docs/PRODUCT_UNDERSTANDING_CONTRACT.md`](docs/PRODUCT_UNDERSTANDING_CONTRACT.md). Read relevant sections before changing authentication, identity, SIWE, sessions, OAuth/OIDC, client registration, or application ownership.
- **Current technical facts:** source code, installed dependency versions, tests, and actual runtime behavior. The existing demo is not a product specification.
- **Historical investigation:** `docs/assessments/`. Reports can become stale; check their recorded contract version, Git revision, dependencies, and verification limits before relying on them.
- **Current task:** controls the scope and whether changes are authorized; it may not silently redefine approved product principles.

### Non-negotiable identity boundaries

1. Verified Ethereum wallet address is the external end-user identity. The required public OIDC `sub` is that verified address in one canonical representation (representation still requires approval).
2. SIWE is the **only** currently approved end-user login method. A valid pre-existing SIWE-authenticated session may be reused under a defined policy. A wallet link alone does not prove that the *current session* originated from SIWE.
3. One wallet can own **multiple** applications, each with a distinct OAuth `client_id`. A client's `client_id`, its owner's address, and the end-user `sub` are different roles.
4. A wallet proof authenticates control of an address, **not** ownership of unrelated existing email, chat, or service accounts. Service accounts require an independently trusted binding to that address.
5. Username/email/password or other non-SIWE authentication must not serve as alternate end-user login routes. Unauthenticated OAuth client registration is prohibited. Authenticated registration and protected client-registration mechanisms require wallet-authorized policy.
6. Preserve OAuth 2.0, OpenID Connect, and ERC-4361 semantics. Third-party applications must not be required to use wagmi, viem, or Next.js.
7. Prefer supported Better Auth APIs/extension points over upstream patches. If the framework conflicts with the contract, report it rather than weakening the product requirement.

These statements are a quick index, not a replacement for the full Product Contract. Unresolved implementation decisions remain unresolved until explicitly approved.

## Repeatable assessment skills

- `$contract-compliance`: inspect current code against approved requirements and produce a compliance report.
- `$technical-feasibility`: investigate a **specific technical question** or specific findings from a compliance report; a previous compliance report is optional input, not a mandatory prerequisite.

- `$phase-plan-exec`: plan one sprint delivering one vertical slice (highest-priority unfinished Phase and **all** its supporting Tasks), write `docs/PLANS.md`, and ask for explicit Yes/No before execution. No task execution without a current, explicit Yes. See `docs/SPRINT_WORKFLOW.md`.
- `$phase-review`: review a completed phase; an explicit invocation authorizes committing and pushing its scoped delivery after a passing review. Use the phase's main aim as the commit subject and report only in chat, without generating files. This is separate from sprint execution.

Skill manifests live at `.agents/skills/<skill-name>/SKILL.md`. For a requested assessment, use the relevant skill. Do not automatically run both skills for routine code changes.

### Report generation

Reports are generated under `docs/assessments/` with timestamped, immutable filenames. The shared publisher/runner is `scripts/run-assessment.sh`; see `docs/ASSESSMENT_WORKFLOW.md` for commands.

- **Interactive Codex → Skill → Script → Report:** investigate using the selected skill, then publish the finished Markdown body through `scripts/run-assessment.sh publish ...`. Invoking `$contract-compliance` or `$technical-feasibility` saves **one new report** by default after completing the assessment and returns only a brief confirmation and file link, without printing the report body. With no question or baseline, interactive technical feasibility uses the latest saved compliance report as historical input and rechecks its findings against current evidence. Never modify source code in an assessment task.
- **Read-only unattended execution:** the user invokes `scripts/run-assessment.sh run ...`, which runs `codex exec --sandbox read-only` and subsequently publishes its final Markdown answer. In this mode, return the report body **only** and do not invoke the publisher yourself.
- Script-owned metadata (run ID, UTC timestamp, contract version and hash, Git revision, worktree state, dependency version) must not be invented or hand-edited by the model.
- Generated reports have `review_status: unreviewed` until independently reviewed. Reports are evidence, never authorization to implement changes.

## Engineering behavior

- State what is verified, inferred, or unknown; cite file paths/functions and line numbers for consequential claims.
- For upstream implementation claims, record package version and exact source/tag. Do not call a source read an executed test.
- Keep assessments focused; do not repeat prior full audits when a narrow verification answers the question.
- In read-only tasks, do not install packages, run migrations, edit code or configuration, alter Git history, or perform builds/tests that write into the project.
- Never commit generated reports or change product decisions unless the current task expressly authorizes doing so.

## Sprint execution boundary

- The Product Contract governs product behavior; assessments and proposals are evidence, not permission to change it.
- **One Sprint = One Vertical Slice; End-to-End Acceptance; No Layer-Only Delivery.** Deliver one observable product outcome through all required layers and verify the complete production journey in that sprint. Tasks may be organized by layer, but isolated parser/database/API/UI work is not a completed slice. Narrow the behavior instead of deferring its defining integration. Preserve approved historical scopes and explicit device/fixture limitations.
- Keep all explicitly DEFERRED cases in `docs/deferred/`, indexed by stable case ID, with source authorization, reason, missing acceptance, evidence links, Coverage limits and reopening/closure conditions. Preserve historical records and receipts. Deferred cases are parked work, not default next-phase/sprint objectives or automatic supporting Tasks; a general `next` request does not reactivate them. Require an explicit user request for the case/behavior before planning it through the normal Yes/No gate. Deferral never means passed acceptance or waived product requirements.
- Invoke `$phase-plan-exec` for one sprint at a time; it invokes `scripts/phase-plan-exec.py` to persist the task list in `docs/PLANS.md`.
- After planning, ask the human **Execute this sprint? (Yes/No)** and stop. A missing, ambiguous, or negative answer means **do not execute**.
- A new explicit **Yes** for that specific sprint permits `python3 scripts/phase-plan-exec.py execute --yes`. Never infer Yes from prior preferences or the mere existence of `docs/PLANS.md`.
- During execution, complete tasks within the sprint only, verify results, and write progress to `docs/plans/progress/`. Do not modify the approved Product Contract, commit/push, deploy, change production state, or begin the next Phase.
- Store generated phase logs, captures and temporary verification artifacts only in `evidence/<phase-id>/`. Keep source/tests in their normal paths and durable command summaries/Handoff in `docs/plans/progress/`. The controller validates live evidence and saves a completion receipt, then removes only that phase's evidence directory when setting `READY_FOR_REVIEW`. Retain evidence on `PAUSED`/`BLOCKED`; do not delete progress, plans, Coverage or immutable assessment reports. Reviews and assessments must distinguish retained summaries from deleted logs.
- Stop at `BLOCKED` for unresolved product/security decisions; a `READY_FOR_REVIEW` status means evidence is ready, not proof of human acceptance.
