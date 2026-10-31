<!-- phase-plan-exec:managed -->
# WalletGate Sprint Plan

- **Phase ID:** `PH-003`
- **Status:** `READY_FOR_REVIEW`
- **Source proposal:** `docs/plans/proposals/2026-10-31T11-55-53.574645Z-14924d3c-phase-priority.md`
- **Task count:** 5

**Human review:** On 2026-11-01, the user confirmed PH-003 was reviewed and requested committing and pushing the delivery to GitHub. Acceptance applies to the amended scope: the statement-parsing edge case remains deferred, SQLite concurrency remains unresolved, and WG-003 remains PARTIAL. The controller status remains READY_FOR_REVIEW because there is no separate reviewed Phase status.

The status above is authoritative. Proposal-derived readiness notes below were written **before** execution approval. A Yes authorizes this sprint's existing scope only; it does not resolve open product decisions.

## Approved PH-003 scope amendment — 2026-11-01

The user explicitly instructed: “Defer this statement-parsing edge case, retain WG-003 as PARTIAL, and finish PH-003’s remaining work.” This authorizes resuming the existing PH-003 sprint under the narrowed scope below. This amendment supersedes conflicting completion expectations in the original proposal-derived plan; the immutable proposal and Product Contract remain unchanged.

- **Deferred B1:** A statement containing expiration-like text is excluded from this sprint's acceptance. Better Auth 1.7.11's pre-callback parsing limitation remains a known standards-interoperability gap; deleting its test does not fix or approve that behavior. Preserve prior failing results in progress history.
- **T02:** Complete strict callback validation against the remaining grammar, timestamp, signature, origin and valid-message controls. Do not replace the upstream handler, patch packages, or add policy to fix deferred B1.
- **T03 / B2:** Use the user-requested independent-instance MySQL concurrency test and current successful execution evidence. SQLite retains grammar and sequential replay coverage; SQLite concurrent-login success is excluded from this sprint's completion claim and remains unresolved. MySQL results do not certify SQLite, Turso or multiple processes.
- **T04:** Run the planned production-configured wallet, signed OAuth continuation, non-SIWE denial, anonymous-registration denial, sign-in and CLI regression checks; repair only in-scope failures.
- **T05:** Run final acceptance including the separate MySQL suite, root regressions, typechecking and whitespace checks. Refresh hashed artifacts/logs and the single current sprint-evidence record; preserve the original sprint baseline and earlier narrative. Retain **WG-003 PARTIAL** with explicit B1 and adapter limits. Revalidate WG-004 and WG-008 before retaining VERIFIED.
- **Acceptance mapping:** WG-003-A1 continues to identify the unchanged full Contract requirement. PH-003 completion evidence covers only the subset explicitly scoped here, not full WG-003-A1 fulfillment. All five Tasks must have actual successful evidence for their amended deliverables. No Contract or Coverage acceptance ID/meaning is changed.
- **Completion:** READY_FOR_REVIEW is permitted for this narrowed delivery after T01–T05 are complete and evidence passes controller validation. It is not a full SIWE-compliance or production-readiness claim. Do not start another phase, commit, push or deploy.

## Sprint scope and all tasks

# Phase Priority Proposal

## Baseline

Authority: `AGENTS.md`, approved Product Contract **v1.1**, `.agents/skills/phase-plan-exec/SKILL.md`, and `docs/SPRINT_WORKFLOW.md`.

**Verified repository observations:**

- Current HEAD is `3bfedfcb39c7110362e652ed63e978874d4e0615`.
- `docs/PLANS.md` is absent. Archived PH-001 and PH-002 plans both record `READY_FOR_REVIEW`.
- Both progress files were reviewed, including interrupted executions, preserved evidence records, reconciliation, and Handoffs.
- PH-002’s current structured evidence marks **5/5 Tasks COMPLETE**. All referenced artifact and log hashes match current files. Its final reconciliation records targeted **63/63**, root **116/116**, sign-in **18/18**, CLI **30/30**, and successful typechecking (`docs/plans/progress/PH-002.md:2149`). These are historical executions, not tests run during this proposal.
- PH-001 records **8/8 Tasks COMPLETE**. Three current artifacts differ from its recorded hashes: `README.md`, `harness.ts`, and `provenance.test.ts`. Their versions at commit `7bdc917` match the original evidence hashes. Subsequent differences relocate walkthrough imports and a documented test command. Original results remain historical evidence; current migrated artifacts do not inherit executed verification automatically.
- No incomplete implementation Task remains to resume in PH-002. PH-001’s original tested artifacts are recoverable; another architecture research sprint is unwarranted.
- The Contract hash matches Coverage. No requirement meaning changed, so existing requirement and acceptance IDs remain applicable.
- Coverage records **WG-004 and WG-008 VERIFIED**, seven requirements PARTIAL, and four BLOCKED.
- `node_modules` is absent. The lockfile resolves Better Auth/core/OAuth provider **1.7.11**, viem **2.57.10**, and Next.js **16.3.4**. Installed versions and current runtime behavior are unknown.

The supplied compliance and feasibility reports were reviewed as **unreviewed historical evidence**. PH-002 supersedes their password-login and anonymous-registration findings. Their SIWE-validation concern remains relevant to current source.

`createDemoSIWEPlugin` checks URI origin, signature encoding, and the signature in its application callback (`lib/siwe.ts:17`). It contains no complete local message-grammar or timestamp validation. PH-001 demonstrated a signed Version 2 acceptance control and a stricter callback candidate (`experiments/c01/security.test.ts:67`). That candidate deliberately assumes chains 1/10, a five-minute issuance window, and generated-message round-tripping (`experiments/c01/harness.ts:44`); those assumptions are **not approved production policy**.

PH-002’s Handoff recommends address subjects **after explicit canonicalization and architecture decisions** (`docs/plans/progress/PH-002.md:2161`). Those prerequisites remain unapproved. Strict SIWE validation is therefore the highest-priority implementable authentication-safety gap.

This proposal used read-only inspection and hash comparisons. No files were changed, controller scripts invoked, dependencies installed, or tests executed.

## Top 1 Phase

### PH-003 — Enforce production SIWE message validation and replay safety

**Kind:** Implementation
**Objective key:** `enforce-production-siwe-validation-and-replay-safety`
**Primary requirement:** WG-003
**Regression requirements:** WG-004, WG-008
**Task count:** 5

**Outcome:** New wallet authentication rejects malformed or invalid SIWE messages before identity/session creation, preserves single-use nonce behavior, and retains valid wallet login and signed OAuth continuation.

Reuse PH-001’s demonstrated callback integration and security cases, together with PH-002’s production-configured persistent fixtures and composed SIWE/OAuth endpoint. Deliver production code and acceptance tests.

**Prerequisites:**

- A newly persisted sprint scope and explicit Yes for that specific sprint.
- A writable isolated execution environment with exact locked dependencies, disposable databases, and loopback access for existing CLI tests.
- No production credentials, databases, email, payment, SSO, or RPC side effects.
- Disposable adapter environments for any additional backend included in the acceptance claim.

**Scope:** SIWE structural validation, required and optional field validation, existing trusted domain/origin enforcement, signature verification, signed validity bounds, durable nonce consumption, negative-state assertions, and affected authentication/OAuth regressions.

**Policy boundaries:** Preserve existing identity storage, address matching, chain behavior, and local signature-verification scope. Do not adopt PH-001’s chain whitelist, five-minute server freshness rule, or whole-message normalization shortcut. Optional expiration remains optional unless separately approved. Session provenance, wallet switching, revocation, address subjects, owner policy, and ERC-1271/RPC policy remain unresolved. Any implementation dependency on those decisions produces `BLOCKED`.

**Acceptance criteria:**

| ID | Required result |
| --- | --- |
| WG-003-A1 | Production rejects invalid signatures, wrong domain/URI, malformed fields, expired messages, and sequential/concurrent replay. Include malformed required/optional dates, wrong version, missing required fields, duplicate fields, trailing material, and not-before bounds. Valid standards-permitted messages remain usable. |
| WG-004-A1 | Existing independent non-SIWE authentication denials remain effective, and valid SIWE authentication remains usable. |
| WG-008-A1 | Every exposed unauthenticated client-creation endpoint continues to deny registration without creating client state or returning credentials. |

These retain the ledger’s acceptance IDs. The detailed cases make its existing obligations executable; they do not approve new product policies.

## All Tasks for Top 1 Phase

### PH-003-T01 — Establish production SIWE acceptance fixtures

- **Goal:** Transfer relevant historical security cases into production-configured acceptance tests.
- **Dependencies:** Sprint approval and execution prerequisites.
- **Scope:** Extend `lib/auth-safety-fixture.ts`; add `lib/siwe-validation.test.ts`. Isolate module/environment state so each fixture uses its intended database.
- **Deliverable:** Persistent disposable fixtures, controllable test time, valid signed controls, and a field/route/acceptance matrix.
- **Approach:** Reuse PH-001’s negative cases and PH-002’s actual plugin configuration. Document the three historical import/documentation changes without rewriting prior evidence. Remove experimental chain and freshness assumptions from production expectations.
- **Verification:** `pnpm exec vitest run lib/siwe-validation.test.ts --reporter=verbose`.
- **Expected evidence:** Exact runtime/dependency versions, database creation/disposal, meaningful initial failures, and valid controls proving requests reach the intended verification path. Initial failures are baseline evidence, not completion.
- **Acceptance:** WG-003-A1.

### PH-003-T02 — Implement strict validation through the supported SIWE callback

- **Goal:** Reject invalid signed messages before authentication succeeds.
- **Dependencies:** PH-003-T01.
- **Scope:** `lib/siwe.ts` and, if useful, a dedicated local validation module.
- **Deliverable:** Production validator, callback integration, and grammar/time acceptance tests.
- **Approach:** Validate required fields, Version 1, field cardinality/order, complete message consumption, address agreement, chain syntax, nonce syntax, and valid timestamp representations. Enforce supplied expiration/not-before bounds and existing trusted domain/origin checks. Test legal optional statement, scheme, request ID, resources, and timestamp variants.
- **Integration:** Preserve upstream nonce processing, original-message signature verification, strict endpoint schema, and the composed `oauth_query` handling (`lib/siwe.ts:38`). Inspect the exact installed 1.7.11 interfaces before changing composition; do not patch packages.
- **Verification:** `pnpm exec vitest run lib/siwe-validation.test.ts lib/auth-safety.test.ts --reporter=verbose`.
- **Expected evidence:** Each invalid class is rejected; valid optional-field controls succeed; rejected requests create no identity/session rows or usable credentials.
- **Stop condition:** Record any required freshness, clock-tolerance, chain, or wallet-type policy decision as `BLOCKED`.
- **Acceptance:** WG-003-A1, WG-004-A1.

### PH-003-T03 — Verify durable nonce consumption and rejection side effects

- **Goal:** Establish replay safety through actual production authentication paths.
- **Dependencies:** PH-003-T02.
- **Scope:** Production nonce issuance/consumption, persistent storage, handler and Next HTTP boundaries, and server API verification where exposed.
- **Deliverable:** Sequential, concurrent, expired/missing challenge, invalid-attempt, and fresh-retry acceptance tests.
- **Approach:** Submit the same correctly signed message concurrently through independently issued requests, including separate auth instances sharing a disposable database. Assert at most one successful authentication and one resulting session. Verify sequential replay fails and invalid signatures do not create access. Retain fresh-nonce retry behavior.
- **Repair boundary:** If nonce atomicity fails, repair application integration through supported storage/extension APIs. Do not substitute a process-local lock or weaken the assertion. An unavailable supported solution is an explicit blocker.
- **Verification:** `pnpm exec vitest run lib/siwe-validation.test.ts --reporter=verbose`.
- **Expected evidence:** Response outcomes, persistent nonce/session counts, independent-instance behavior, database cleanup, and exact adapter configuration.
- **Adapter limit:** SQLite results do not establish MySQL/Turso concurrency. Test any backend included in the completed requirement claim against disposable storage; unavailable required environments prevent that claim.
- **Acceptance:** WG-003-A1.

### PH-003-T04 — Preserve wallet login, OAuth continuation, and registration restrictions

- **Goal:** Verify that stricter validation preserves the delivered product entry flow.
- **Dependencies:** PH-003-T03.
- **Scope:** Main wallet helper, composed SIWE endpoint, signed OAuth continuation, production authentication gates, and registration denials.
- **Deliverable:** Passing production integration and regression tests; any necessary in-scope compatibility repairs.
- **Verification commands:**
  - `pnpm exec vitest run lib/siwe-validation.test.ts lib/auth-safety.test.ts lib/wallet-login.test.ts lib/auth.test.ts --reporter=verbose`
  - `pnpm exec vitest run --config 'app/(auth)/sign-in/vitest.config.ts'`
  - `pnpm exec vitest run --config app/client-test/vitest.config.ts`
- **Expected evidence:** Valid wallet login; fresh-nonce retry after rejection; successful default, `prompt=login`, and `max_age=0` signed continuations; preserved RP/state; tampered-query denial; unchanged non-SIWE and anonymous-registration denials.
- **Boundary:** Helper suites with permissive registration remain labeled controls. They cannot substitute for production-configured acceptance.
- **Acceptance:** WG-003-A1, WG-004-A1, WG-008-A1.

### PH-003-T05 — Complete verification, Coverage evidence, and Handoff

- **Goal:** Produce reviewable completion evidence for every criterion and Task.
- **Dependencies:** PH-003-T04.
- **Scope:** Final acceptance runs, root regressions, typechecking, artifact integrity, proposed Coverage updates, and sprint progress.
- **Deliverable:** Changed production source, successful acceptance evidence, one current `json sprint-evidence` record, and a Handoff in the assigned progress file.
- **Verification commands:**
  - Repeat the combined acceptance command from T04 after final repairs.
  - `pnpm exec vitest run --config vitest.config.ts`
  - `pnpm run typecheck`
  - `git diff --check`
- **Expected evidence:** Actual working directory, versions, commands, exit codes, assertion counts, durable hashed logs/artifacts, and acceptance-to-task mappings. Preserve failed attempts and distinguish environmental failures from assertion failures.
- **Coverage:** Propose WG-003 VERIFIED only when its complete acceptance has product evidence, including every backend claimed by that verification. Otherwise retain a truthful partial status and identify unfinished work. Revalidate WG-004/WG-008 because shared authentication code changes; do not carry verification across failed or changed assumptions.
- **Handoff:** Record delivered behavior, reusable code/tests, supported integration choices, adapter and policy limits, remaining Coverage gaps, and a recommended next objective.
- **Completion boundary:** Missing acceptance evidence prevents `READY_FOR_REVIEW`. Do not start another phase.
- **Acceptance:** WG-003-A1, WG-004-A1, WG-008-A1.

## Dependency and Coverage Check

Dependency order: approval/environment → T01 → T02 → T03 → T04 → T05.

| Requirement | Acceptance | Covering Tasks | Proposed treatment |
| --- | --- | --- | --- |
| WG-003 | WG-003-A1 | T01–T05 | Complete production validation/replay evidence before proposing VERIFIED |
| WG-004 | WG-004-A1 | T02, T04, T05 | Revalidate existing verification after shared SIWE changes |
| WG-008 | WG-008-A1 | T04, T05 | Preserve and revalidate registration restrictions |

WG-002, WG-005, WG-009, and WG-013 remain BLOCKED. Other requirements retain their existing status. No IDs are renumbered or retired because the approved Contract and requirement meanings are unchanged.

This is implementation, with no new research blocker asserted. Historical prototype limitations require careful adaptation and product acceptance tests, not another feasibility phase. Any later research proposal must identify a specific documented obstacle and fingerprint changed relevant inputs.

```json sprint-plan
{
  "kind": "implementation",
  "objective_key": "enforce-production-siwe-validation-and-replay-safety",
  "requirements": [
    "WG-003",
    "WG-004",
    "WG-008"
  ],
  "acceptance": [
    "WG-003-A1",
    "WG-004-A1",
    "WG-008-A1"
  ],
  "inputs": {
    "docs/PRODUCT_UNDERSTANDING_CONTRACT.md": "e7105be4084e2620494274feeb6faaa7b8265e71420fe18051b4f1ea9eacba71",
    "lib/auth.ts": "5492d885b9823d3103b050b07010cc74145a9b3c8a4ac6ea10db2e1865687111",
    "lib/siwe.ts": "84dd65e673c6623043afc677df77dac3a985f88edb5bb32250a22bec48937eaa",
    "lib/auth-safety-fixture.ts": "ca9a1a9d0fe81debdae4a876c6a746d123c77575698198e79c6b282d02656896",
    "lib/auth-safety.test.ts": "fa7a8b7f06c402aece87c0ec56f149f03e46892a6c01fbca8f1c5c95a9091766",
    "experiments/c01/harness.ts": "5065110e879ebd0fe7011bcd54eac0b661fee5e82b9b6ec397b19f45ea6f78a7",
    "experiments/c01/security.test.ts": "b09e779f9939be37c20a2df459ce9ae1af1a5caca4af58259dd63482e3b6dc99",
    "app/(auth)/sign-in/siwe-login.ts": "216335d514ecdb698e2bb61e2a319c04d3d0eeb0e663075652982f90699cad7d",
    "app/(auth)/sign-in/siwe-login.test.ts": "2769712de3e4d76dfb5e9907e525aaec31c569b456da67ca217dedd40c0f4017",
    "pnpm-lock.yaml": "8cf4e9073142d5eb6cef1825a6e8eaea94dfa347103529ca71ec77b24af037e0"
  },
  "tasks": [
    {
      "id": "PH-003-T01",
      "goal": "Establish production-configured SIWE validation acceptance fixtures",
      "depends_on": [],
      "deliverable": "Persistent disposable fixtures, valid controls, negative cases, and field-to-acceptance matrix",
      "verification": "pnpm exec vitest run lib/siwe-validation.test.ts --reporter=verbose; record baseline failures and require final passing acceptance",
      "acceptance": [
        "WG-003-A1"
      ]
    },
    {
      "id": "PH-003-T02",
      "goal": "Implement strict production SIWE validation through supported callback composition",
      "depends_on": [
        "PH-003-T01"
      ],
      "deliverable": "Production validator and callback integration with required-field, optional-field, grammar, signature, and validity-bound tests; exclude explicitly deferred statement-field parsing case and record unresolved upstream limitation",
      "verification": "pnpm exec vitest run lib/siwe-validation.test.ts lib/auth-safety.test.ts --reporter=verbose",
      "acceptance": [
        "WG-003-A1",
        "WG-004-A1"
      ]
    },
    {
      "id": "PH-003-T03",
      "goal": "Verify durable single-use nonces and rejection side effects",
      "depends_on": [
        "PH-003-T02"
      ],
      "deliverable": "Sequential replay and rejection side effects on SQLite; independent-instance concurrent replay on disposable MySQL with exactly one successful session; SQLite concurrency remains unresolved",
      "verification": "pnpm --config.verify-deps-before-run=false exec vitest run lib/siwe-validation.test.ts --reporter=verbose; pnpm --config.verify-deps-before-run=false test:mysql --reporter=verbose",
      "acceptance": [
        "WG-003-A1"
      ]
    },
    {
      "id": "PH-003-T04",
      "goal": "Preserve wallet login, signed OAuth continuation, and registration restrictions",
      "depends_on": [
        "PH-003-T03"
      ],
      "deliverable": "Passing production integration and regression tests with any necessary in-scope compatibility repairs",
      "verification": "pnpm exec vitest run lib/siwe-validation.test.ts lib/auth-safety.test.ts lib/wallet-login.test.ts lib/auth.test.ts --reporter=verbose; pnpm exec vitest run --config 'app/(auth)/sign-in/vitest.config.ts'; pnpm exec vitest run --config app/client-test/vitest.config.ts",
      "acceptance": [
        "WG-003-A1",
        "WG-004-A1",
        "WG-008-A1"
      ]
    },
    {
      "id": "PH-003-T05",
      "goal": "Complete acceptance evidence, Coverage proposals, and Handoff",
      "depends_on": [
        "PH-003-T04"
      ],
      "deliverable": "Changed production artifacts, hashed successful verification evidence, acceptance mappings, proposed Coverage updates, and Handoff; WG-003 stays PARTIAL with deferred statement parsing and backend limitations recorded",
      "verification": "Repeat final combined acceptance tests; pnpm exec vitest run --config vitest.config.ts; pnpm run typecheck; git diff --check",
      "acceptance": [
        "WG-003-A1",
        "WG-004-A1",
        "WG-008-A1"
      ]
    }
  ],
  "scope_amendment": {
    "authorized_by": "User instruction on 2026-11-01 to defer the statement-parsing edge case, retain WG-003 PARTIAL, and finish PH-003",
    "deferred": [
      "B1: statement containing expiration-like text is misclassified upstream",
      "B2 SQLite concurrent-login success; concurrency acceptance is MySQL only"
    ],
    "coverage_limit": "WG-003 remains PARTIAL; WG-003-A1 evidence is scoped partial delivery only; Contract and full acceptance remain unchanged"
  }
}
```
