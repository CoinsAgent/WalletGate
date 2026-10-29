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

Skill manifests live at `.agents/skills/<skill-name>/SKILL.md`. For a requested assessment, use the relevant skill. Do not automatically run both skills for routine code changes.

### Report generation

Reports are generated under `docs/assessments/` with timestamped, immutable filenames. The shared publisher/runner is `scripts/run-assessment.sh`; see `docs/ASSESSMENT_WORKFLOW.md` for commands.

- **Interactive Codex → Skill → Script → Report:** investigate using the selected skill, then publish the finished Markdown body through `scripts/run-assessment.sh publish ...` only if the user requested a persisted report. Publication may write **one new report**; never modify source code in an assessment task.
- **Read-only unattended execution:** the user invokes `scripts/run-assessment.sh run ...`, which runs `codex exec --sandbox read-only` and subsequently publishes its final Markdown answer. In this mode, return the report body **only** and do not invoke the publisher yourself.
- Script-owned metadata (run ID, UTC timestamp, contract version and hash, Git revision, worktree state, dependency version) must not be invented or hand-edited by the model.
- Generated reports have `review_status: unreviewed` until independently reviewed. Reports are evidence, never authorization to implement changes.

## Engineering behavior

- State what is verified, inferred, or unknown; cite file paths/functions and line numbers for consequential claims.
- For upstream implementation claims, record package version and exact source/tag. Do not call a source read an executed test.
- Keep assessments focused; do not repeat prior full audits when a narrow verification answers the question.
- In read-only tasks, do not install packages, run migrations, edit code or configuration, alter Git history, or perform builds/tests that write into the project.
- Never commit generated reports or change product decisions unless the current task expressly authorizes doing so.
