<!-- phase-plan-exec:managed -->
# WalletGate Sprint Plan

- **Phase ID:** `PH-002`
- **Status:** `READY_FOR_REVIEW`
- **Source proposal:** `docs/plans/proposals/2026-10-31T09-08-39.642825Z-cb5f9082-phase-priority.md`
- **Task count:** 5

The status above is authoritative. Proposal-derived readiness notes below were written **before** execution approval. A Yes authorizes this sprint's existing scope only; it does not resolve open product decisions.

## Sprint scope and all tasks

# Phase Priority Proposal

## Baseline

Authority: `AGENTS.md`, the approved [Product Contract v1.1](docs/PRODUCT_UNDERSTANDING_CONTRACT.md), the phase-plan-exec skill, and [Sprint Workflow](docs/SPRINT_WORKFLOW.md).

**Verified planning observations:**

- `docs/PLANS.md` is absent. The archived [PH-001 plan](docs/plans/history/PH-001.md) is `READY_FOR_REVIEW`.
- The entire available progress record, including its earlier interruptions, final completion record, structured evidence, and Handoff, was reviewed. Its final record supersedes the earlier blockers and marks all eight Tasks complete (`docs/plans/progress/PH-001.md:298`).
- Read-only SHA-256 checks matched all 12 unique artifact/log references in PH-001’s structured task evidence. This confirms retained artifact integrity; it does not independently reproduce the recorded executions.
- PH-001 records two successful final 36-test experiment runs, 18 SIWE regressions, and parent-observed success for 35 OAuth regressions. Its Handoff recommends production authentication safety work (`docs/plans/progress/PH-001.md:989`).
- The current Contract, `lib/auth.ts`, `lib/siwe.ts`, and lockfile hashes match PH-001’s recorded inputs. There is no relevant changed-input basis for repeating its architecture research.
- Repository `node_modules` is absent. The lockfile resolves Better Auth/core/OAuth provider 1.7.11, viem 2.57.10, and Next.js 16.3.4; current installed runtime behavior is unknown.
- The worktree contains existing workflow changes, the archived plan, and the deletion of the active plan. These are existing state, not changes made during this planning session.

Current production conflicts remain visible:

| Finding | Source evidence |
| --- | --- |
| Password signup and login are enabled | `lib/auth.ts:110` |
| Passkey and SSO plugins are configured | `lib/auth.ts:145`, `lib/auth.ts:195` |
| Unauthenticated registration is explicitly enabled | `lib/auth.ts:315` |
| The authentication wrapper delegates to Better Auth without a wallet authorization gate | `app/api/auth/[...all]/route.ts:25` |
| The main sign-in page offers password signup and passkey login | `app/(auth)/sign-in/page.tsx:44`, `app/(auth)/sign-in/_components/sign-in.tsx:42` |
| Existing production-oriented tests expect successful password authentication | `lib/auth.test.ts:54` |
| Playground helpers automatically register clients | `app/client-test-siwe/oauth-flow.ts:97`, `app/client-test/oauth-flow.ts:97` |

Both supplied historical assessments were reviewed. The [compliance report](docs/assessments/2026-10-30T01-23-40.381602Z-aeb940c4-contract-compliance.md) establishes historical source conflicts; the [feasibility report](docs/assessments/2026-10-30T02-12-49.882089Z-6b47ae5b-technical-feasibility.md) documents supported configuration and extension mechanisms in published 1.7.11 packages. Both remain unreviewed historical evidence. PH-001 subsequently demonstrated bounded runtime approaches, without approving production identity or lifecycle policies.

**Coverage reconciliation:** The approved Contract hash matches the ledger. Preserve WG-001 through WG-013 and their existing acceptance IDs. No requirement renumbering, retirement, or acceptance change is proposed. Coverage currently has zero VERIFIED product requirements; research completion supplies no product verification.

**Resume decision:** No incomplete PH-001 Task remains in the final evidence. Its research review status does not authorize production architecture choices. The candidate below therefore addresses the highest-priority unfinished production safety objective.

No files were modified, controller scripts invoked, packages installed, or tests executed during planning.

## Top 1 Phase

### PH-002 — Close unapproved login and anonymous registration entry points

**Kind:** Implementation  
**Objective key:** `close-unapproved-authentication-and-anonymous-registration`  
**Coverage:** WG-004 and WG-008  
**Task count:** Five

**Objective:** Enforce the approved SIWE-only boundary for new end-user authentication, deny anonymous OAuth client creation, and keep a usable wallet sign-in entry point with executable production acceptance tests.

**Priority rationale:** These are explicit current configuration conflicts with P2 and P5. They expose authentication and persistent client-creation capabilities. Closing them has immediate safety value and does not require selecting canonical subjects, migrating identities, or approving session and ownership policies.

**Prerequisites:**

- A persisted plan and a new explicit Yes for this specific sprint.
- A writable isolated execution environment with exact locked dependencies and disposable SQLite storage.
- Loopback-listener permission for existing OAuth regression tests.
- No production credentials, live databases, or external email, payment, SSO, or RPC side effects.
- Supported Better Auth configuration, plugin composition, and extension points; no dependency upgrades or upstream patches.

**Reuse from PH-001:** Adapt its persistent SQLite setup, signed EOA fixtures, cleanup discipline, and negative-control techniques. Production tests must exercise production configuration. Do not copy the experiment’s lowercase identity IDs, chain allowlist, five-minute verification window, strict revocation rule, or session markers as approved policy.

**Scope boundaries:** This phase restricts new authentication and anonymous creation. Public address subjects, strict SIWE validation, legacy-session treatment, accepted session reuse, grant revocation, wallet switching, owner representation, and authenticated client management remain separate unresolved requirements. Ordinary session retrieval is not reclassified as a new login.

| Acceptance ID | Required product outcome |
| --- | --- |
| WG-004-A1 | Exposed password, passkey, SSO, and alternate independent login routes cannot establish end-user access. Tests use otherwise valid credentials or representative successful fixtures where applicable, assert no usable new session, and demonstrate that valid SIWE still works. The main login entry uses SIWE and preserves supported authorization continuation. |
| WG-008-A1 | Every exposed unauthenticated client-creation endpoint denies registration. Tests submit valid client metadata, assert no new client records or credentials, and cover missing credentials, invalid credentials, and misleading client-supplied identity fields. Existing configured-client OAuth behavior remains usable. |

Disabling anonymous registration does not establish wallet-owner authorization for remaining authenticated management routes. WG-009 remains BLOCKED.

## All Tasks for Top 1 Phase

All paths and verification commands below describe proposed execution work.

### PH-002-T01 — Establish production acceptance fixtures and endpoint coverage

- **Goal:** Make both requirements testable against the actual application configuration.
- **Dependencies:** Sprint approval and execution environment.
- **Scope:** Inventory configured authentication and client-creation endpoints, their HTTP methods, relevant Next.js wrappers, and server API entry points actually exposed by application routes. Include password signup/login, passkey, SSO callbacks, two-factor completion, impersonation, and session-transfer capabilities for classification.
- **Deliverable:** `lib/auth-safety.test.ts`, reusable disposable-storage fixtures under `lib/`, and an endpoint-to-acceptance matrix in sprint progress.
- **Implementation approach:** Adapt PH-001’s persistent SQLite harness. Instantiate the production auth configuration rather than a reduced plugin list or helper defaults that silently enable other login methods. Isolate external integrations and clean up every database.
- **Verification:** `pnpm exec vitest run lib/auth-safety.test.ts --reporter=verbose`.
- **Expected evidence:** Exact versions, fixture setup/cleanup results, covered routes and methods, valid request controls, and initial failing assertions demonstrating the current conflicts. Final acceptance requires these assertions to pass after enforcement.
- **Boundary:** Classify existing-session reuse separately under WG-005. If classification requires an unresolved product decision, record the exact blocker rather than inventing a lifecycle rule.
- **Acceptance mapping:** WG-004-A1, WG-008-A1.

### PH-002-T02 — Enforce SIWE-only independent authentication

- **Goal:** Prevent configured non-SIWE mechanisms from independently creating end-user access.
- **Dependencies:** PH-002-T01.
- **Scope:** `lib/auth.ts`, supported endpoint restrictions or local enforcement modules, affected authentication wrappers, and corresponding client integrations.
- **Deliverable:** Production enforcement plus acceptance tests for the complete independent-login inventory.
- **Implementation approach:** Disable password authentication and remove or restrict independent passkey and SSO authentication through supported APIs. Close exposed impersonation or alternate session-creation shortcuts that would independently authenticate without SIWE. Resolve client API/type references affected by plugin changes.
- **Verification:** `pnpm exec vitest run lib/auth-safety.test.ts lib/auth.test.ts --reporter=verbose`.
- **Expected evidence:** Valid password credentials fail; passkey and SSO authentication endpoints are unavailable or denied before establishing access; alternate independent session creation fails; no denial leaves a usable cookie/token or new session row. A genuinely signed SIWE request still creates a usable session.
- **Test maintenance:** Replace production tests that require forbidden password login. Retain separately constructed upstream negative-control fixtures when clearly labeled; they do not prove production compliance.
- **Boundary:** Do not migrate users, approve old sessions, introduce provenance fields, or change address representation.
- **Acceptance mapping:** WG-004-A1.

### PH-002-T03 — Deny anonymous OAuth client creation

- **Goal:** Close every anonymous client-creation path without relying on browser behavior or CORS.
- **Dependencies:** PH-002-T02.
- **Scope:** OAuth provider configuration, exposed creation routes, and `lib/auth-safety.test.ts`.
- **Deliverable:** Production registration restrictions and persistent-state acceptance tests.
- **Implementation approach:** Disable `allowUnauthenticatedClientRegistration`; verify the exact-version managed creation endpoints also require authentication. Cover any application wrapper identified in T01. Do not introduce initial-access-token registration or a new authorization mechanism.
- **Verification:** `pnpm exec vitest run lib/auth-safety.test.ts --reporter=verbose`.
- **Expected evidence:** Well-formed creation requests fail without authentication, with stale/invalid cookies, with arbitrary bearer tokens, and with forged owner metadata. Client counts remain unchanged and no credentials are returned. Test through the application HTTP boundary as well as the underlying handler where necessary.
- **Positive control:** Seed an existing client through disposable test setup and verify discovery and a normal authorization-code flow remain available. Fixture provisioning is not a production registration policy.
- **Boundary:** Do not certify authenticated registration, ownership isolation, or protected DCR. An unexpected bypass requires production enforcement within scope or an explicit BLOCKED record.
- **Acceptance mapping:** WG-008-A1.

### PH-002-T04 — Keep the login and playground entry points usable

- **Goal:** Align user-facing entry points with the enforced restrictions.
- **Dependencies:** PH-002-T03.
- **Scope:** Main sign-in components, affected client plugin consumers, wallet sign-in helper, both OAuth playgrounds, and registration-dependent CLI instructions.
- **Deliverable:** A wallet-only main login entry, tested continuation handling, and clear registration-denial behavior.
- **Implementation approach:** Reuse the existing signed-wallet flow and supported SIWE/OAuth continuation mechanism. Remove active password/signup/passkey/SSO login offers. Preserve validated local return destinations and authorization query state. Handle missing wallet, rejected signature, verification failure, and retry with a fresh nonce.
- **Registration behavior:** Playground and CLI entry points must report that registration requires authorization, or use an already configured client. They must not gain a public provisioning endpoint or silently restore anonymous registration.
- **Verification:** `pnpm exec vitest run lib/wallet-login.test.ts --reporter=verbose`, with proposed tests for rendered login choices, wallet-flow behavior, continuation, and registration errors.
- **Expected evidence:** SIWE is the offered login method; successful wallet login continues the intended authorization; unsafe return destinations are rejected; denied registration produces actionable behavior.
- **Boundary:** Do not claim complete mobile wallet discovery or WG-012 verification. Do not infer current-session provenance from linked wallets.
- **Acceptance mapping:** WG-004-A1, WG-008-A1.

### PH-002-T05 — Complete regressions, coverage evidence, and Handoff

- **Goal:** Demonstrate the delivered restrictions and retain reviewable evidence for every Task.
- **Dependencies:** PH-002-T04.
- **Scope:** Relevant production tests, affected existing fixtures, type verification, and the assigned phase’s progress record.
- **Deliverable:** Passing acceptance/regression results, changed production source, one structured sprint-evidence record, proposed Coverage updates, and Handoff.
- **Verification commands:**
  - `pnpm exec vitest run lib/auth-safety.test.ts lib/wallet-login.test.ts lib/auth.test.ts --reporter=verbose`
  - `pnpm exec vitest run --config app/client-test-siwe/vitest.config.ts`
  - `pnpm exec vitest run --config app/client-test/vitest.config.ts`
  - `pnpm exec vitest run --config vitest.config.ts`
  - `pnpm run typecheck`
  - `git diff --check`
- **Expected evidence:** Actual commands, working directory, exit codes, assertion counts, durable logs and SHA-256 values, production artifact hashes, and acceptance-to-task mappings. Record and repair failures without discarding earlier observations.
- **Coverage:** Propose VERIFIED for WG-004 or WG-008 only when its complete acceptance criterion has production source, tests, and successful actual evidence. Preserve other statuses and limitations.
- **Handoff:** Record delivered functionality, reusable fixtures, supported integration choices, session/ownership limits, remaining Coverage gaps, and a recommended next objective without starting it.
- **Stop conditions:** Missing resources or unresolved failures prevent completion. An unresolved product/security decision produces BLOCKED; partial execution retains its evidence.
- **Acceptance mapping:** WG-004-A1, WG-008-A1.

## Dependency and Coverage Check

Dependency order: approval and environment → T01 → T02 → T03 → T04 → T05.

| Coverage requirement | Acceptance | Covering Tasks | Completion limit |
| --- | --- | --- | --- |
| WG-004 | WG-004-A1 | T01, T02, T04, T05 | New independent authentication; WG-005 lifecycle policy remains unresolved |
| WG-008 | WG-008-A1 | T01, T03, T04, T05 | Anonymous creation; WG-009 wallet-owner management remains unresolved |

WG-002, WG-005, WG-009, and WG-013 remain BLOCKED. WG-003’s validation gaps remain PARTIAL; preserving valid SIWE is a regression control, not full SIWE verification. This phase does not certify general OIDC interoperability or complete wallet UX.

The following inputs fingerprint the relevant current baseline. Their unchanged values support reuse of PH-001 rather than another feasibility sprint. This is an implementation proposal; no research blocker is asserted.

```json sprint-plan
{
  "kind": "implementation",
  "objective_key": "close-unapproved-authentication-and-anonymous-registration",
  "requirements": ["WG-004", "WG-008"],
  "acceptance": ["WG-004-A1", "WG-008-A1"],
  "inputs": {
    "docs/PRODUCT_UNDERSTANDING_CONTRACT.md": "e7105be4084e2620494274feeb6faaa7b8265e71420fe18051b4f1ea9eacba71",
    "lib/auth.ts": "a735360f38ec8c9c4103d90a1f7e2ec439134546a0130e071211416c3de0a91b",
    "lib/siwe.ts": "5ec5b1569362d13025f6b95ed4ac8a99cec09167732ea689e870945dec9d22ac",
    "lib/auth-client.ts": "b2d106731725b159ae199fcece454b1f083e63ad3b0e15d4354a9b7947db99f3",
    "app/api/auth/[...all]/route.ts": "032b93c627944b4d48d7a59f2ed8dd65ef97240cf74b25f9ee28c73f95030312",
    "pnpm-lock.yaml": "8cf4e9073142d5eb6cef1825a6e8eaea94dfa347103529ca71ec77b24af037e0",
    "experiments/c01/harness.ts": "8e4c5f96b51b8ab4a9d6d09090af800a2830123c434e85d9e624734a8b2406f9"
  },
  "tasks": [
    {
      "id": "PH-002-T01",
      "goal": "Establish production acceptance fixtures and endpoint coverage",
      "depends_on": [],
      "deliverable": "Persistent production-configured acceptance fixtures, lib/auth-safety.test.ts, and endpoint coverage matrix",
      "verification": "pnpm exec vitest run lib/auth-safety.test.ts --reporter=verbose; record initial failures and require final passing assertions after enforcement",
      "acceptance": ["WG-004-A1", "WG-008-A1"]
    },
    {
      "id": "PH-002-T02",
      "goal": "Enforce SIWE-only independent authentication",
      "depends_on": ["PH-002-T01"],
      "deliverable": "Production non-SIWE login restrictions and valid-SIWE acceptance controls",
      "verification": "pnpm exec vitest run lib/auth-safety.test.ts lib/auth.test.ts --reporter=verbose",
      "acceptance": ["WG-004-A1"]
    },
    {
      "id": "PH-002-T03",
      "goal": "Deny anonymous OAuth client creation",
      "depends_on": ["PH-002-T02"],
      "deliverable": "Production registration restrictions with HTTP denials, unchanged-client-state assertions, and existing-client controls",
      "verification": "pnpm exec vitest run lib/auth-safety.test.ts --reporter=verbose",
      "acceptance": ["WG-008-A1"]
    },
    {
      "id": "PH-002-T04",
      "goal": "Keep login and playground entry points usable under the enforced restrictions",
      "depends_on": ["PH-002-T03"],
      "deliverable": "Wallet-only login entry, safe continuation, registration-denial handling, and lib/wallet-login.test.ts",
      "verification": "pnpm exec vitest run lib/wallet-login.test.ts --reporter=verbose",
      "acceptance": ["WG-004-A1", "WG-008-A1"]
    },
    {
      "id": "PH-002-T05",
      "goal": "Complete regressions, coverage evidence, and Handoff",
      "depends_on": ["PH-002-T04"],
      "deliverable": "Verified production changes, durable command evidence, acceptance mappings, proposed Coverage updates, and Handoff",
      "verification": "Run targeted acceptance tests, both client-test configurations, the root Vitest suite, pnpm run typecheck, and git diff --check; record actual outcomes and artifact hashes",
      "acceptance": ["WG-004-A1", "WG-008-A1"]
    }
  ]
}
```

Any later proposal to repeat research must identify a specific documented blocker, fingerprint relevant inputs, and explain which changed input invalidates prior findings. A renamed objective or additional report is insufficient.
