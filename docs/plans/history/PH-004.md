<!-- phase-plan-exec:managed -->
# WalletGate Sprint Plan

- **Phase ID:** `PH-004`
- **Status:** `READY_FOR_REVIEW`
- **Source proposal:** `docs/plans/proposals/2026-10-31T23-57-14.030178Z-bc6137fd-phase-priority.md`
- **Task count:** 5

**Human review:** The user confirmed PH-004 has been reviewed and explicitly requested committing and pushing this delivery to the remote. This accepts the recorded local interoperability scope: WG-001 is VERIFIED locally, WG-003 remains PARTIAL, and WG-002 sub=address remains BLOCKED. The controller status remains READY_FOR_REVIEW because the workflow has no separate reviewed Phase status.

The status above is authoritative. Proposal-derived readiness notes below were written **before** execution approval. A Yes authorizes this sprint's existing scope only; it does not resolve open product decisions.

## Sprint scope and all tasks

# Phase Priority Proposal

## Baseline

Authority: `AGENTS.md`, approved Product Contract v1.1, the phase-plan-exec skill, and `docs/SPRINT_WORKFLOW.md`.

**Verified repository state:**

- HEAD is `eae034b50ab30100a6be6bb9207b16f2d5ced1f1`.
- `docs/PLANS.md` is absent and appears deleted in the worktree. Archived plans PH-001, PH-002 and PH-003 record `READY_FOR_REVIEW`; PH-003’s archive is untracked.
- The latest structured progress records mark PH-001’s eight Tasks, PH-002’s five Tasks and PH-003’s five Tasks COMPLETE. Earlier interrupted and blocked records are superseded by their final evidence and Handoffs.
- All 36 artifact/log references in PH-003’s current evidence match their recorded hashes. Its historical final results include 111 acceptance tests, 164 root tests, 18 sign-in tests, 30 CLI tests, one MySQL concurrency test, and successful typechecking. These tests were **not rerun during planning**.
- PH-003 explicitly preserves the deferred statement-parsing defect and unresolved SQLite concurrency; WG-003 remains PARTIAL. Its final human-review record accepts only that amended scope (`docs/plans/progress/PH-003.md:1116`).
- Changed PH-001 evidence artifacts match their recorded versions at `7bdc917`; changed PH-002 artifacts match their recorded versions at `3f1151f`. Historical results remain usable within their original limits. Current files do not automatically inherit those results.
- The approved Contract hash matches Coverage. Requirement meanings and acceptance IDs remain unchanged. Coverage contains seven PARTIAL, four BLOCKED and two VERIFIED requirements.
- Installed package manifests identify Better Auth/core/OAuth provider **1.7.11**, viem **2.57.10**, and Next.js **16.3.4**.

**Resume decision:** No incomplete Task remains within an existing approved sprint. Preserve the completed deliveries and PH-003’s explicit deferrals; do not reopen its original broader acceptance by treating it as unfinished execution.

**Current source findings:**

| Observation | Evidence and implication |
| --- | --- |
| The configured JWT issuer is the site origin | `lib/auth.ts:311`, `lib/demo-url.ts:6`; discovery must be reachable for that issuer |
| No issuer-root discovery routes exist under `app/` | Repository file inspection; actual deployed responses remain unknown |
| Authentication endpoints are mounted under `/api/auth` | `app/api/auth/[...all]/route.ts:34` |
| Existing production acceptance obtains discovery through a server API and imports the repository’s RP helpers | `lib/auth-safety.test.ts:100`; useful regression evidence, but it does not establish issuer-root discovery or an independent RP integration |
| Supported discovery route helpers already exist | Published installed `@better-auth/oauth-provider@1.7.11`, `dist/index.d.mts:90` and `:105`; implementation in `dist/authorize-CtCi8mAs.mjs:800` and `:816` |

The supplied compliance report is unreviewed historical evidence. PH-002 supersedes its independent-login and anonymous-registration conflicts; PH-003 supersedes much of its SIWE-validation uncertainty. The supplied SQLite feasibility report establishes no executed asynchronous-driver repair. It does not justify reopening deferred database work.

**Priority inference:** Issuer discovery and an independent standard RP flow are the highest-priority implementable interoperability gap. Authentication safety fixes already delivered remain protected. Address subjects, session lifecycle and owner authorization depend on unapproved Contract §5 decisions; the remaining SIWE defects were explicitly deferred. Current evidence establishes no false mailbox-verification claim requiring an emergency claims repair.

This proposal uses read-only source inspection and hash comparisons. No files, controller scripts, dependencies, tests, builds or application state were changed.

## Top 1 Phase

### PH-004 — Publish issuer discovery and verify a standard relying-party flow

**Kind:** `implementation`  
**Objective key:** `publish-issuer-discovery-and-standard-rp-flow`  
**Primary requirement:** WG-001  
**Regression requirements:** WG-004, WG-008  
**Task count:** 5

**Outcome:** A relying party can start with WalletGate’s configured issuer, discover its endpoints, complete authorization-code authentication with PKCE and SIWE, verify signed ID Tokens through discovered JWKS, and call UserInfo without adopting WalletGate’s frontend libraries.

**Production deliverables:**

- Next.js routes for `/.well-known/openid-configuration` and `/.well-known/oauth-authorization-server`, delegating to the installed provider’s supported helpers.
- Production-configured discovery acceptance tests.
- A separate standard HTTP RP fixture using `fetch` and the existing `jose` dependency, without importing WalletGate’s RP helpers or Better Auth client SDK.
- Reproducible local integration evidence and an operator-facing integration example.

**Prerequisites:**

- Persist this specific candidate through the normal controller workflow, then obtain a new explicit Yes.
- A writable isolated execution checkout with exact locked dependencies.
- Disposable databases and permission to bind local test servers. Existing restrictions must not be bypassed.
- Preconfigured disposable clients seeded through fixture setup. Client registration is not an RP prerequisite and no registration policy is introduced.

**Scope boundaries:** Preserve the configured issuer, existing subject behavior, session behavior and wallet verification. PH-001’s signed-token verification and persistent-fixture approaches are reusable; its experimental address IDs and strict provenance policies are not production approvals. Preserve PH-003’s parser/backend deferrals.

No canonicalization, identity migration, session lifecycle, wallet-linking, owner-reference, deployed-control or ERC-1271 policy is selected. If delivery requires one of those decisions, stop at BLOCKED with the exact decision required.

**Acceptance criteria:**

| ID | Required result |
| --- | --- |
| WG-001-A1 | From the configured issuer alone, an independent standard RP exercises discovery, authorization, signed tokens and UserInfo against production configuration. Verify initial and refreshed ID Tokens using discovered JWKS, issuer, audience and applicable nonce checks; UserInfo subjects agree with the corresponding ID Tokens. |
| WG-004-A1 | Independent non-SIWE authentication remains denied; valid SIWE authentication and signed OAuth continuation remain usable. |
| WG-008-A1 | Every exposed unauthenticated client-creation endpoint remains denied without client-state creation or returned credentials. |

WG-001 verification is bounded to reproducible local interoperability. It does not establish WG-002’s required wallet-address subject or WG-013’s deployed-security acceptance.

## All Tasks for Top 1 Phase

All commands below are proposed execution commands, not planning results.

### PH-004-T01 — Establish production discovery acceptance controls

- **Goal:** Make the issuer-discovery gap reproducible before adding routes.
- **Dependencies:** Sprint approval and execution prerequisites.
- **Scope:** Extend the existing production fixture; add `lib/oidc-discovery.test.ts`. Isolate environment/module state and use disposable persistence.
- **Deliverable:** Tests covering both issuer-root URLs, metadata issuer consistency, advertised authorization/token/UserInfo/JWKS endpoints, JSON responses and anonymous access to public metadata.
- **Verification:** `pnpm exec vitest run lib/oidc-discovery.test.ts --reporter=verbose`.
- **Expected evidence:** Exact versions, fixture setup/cleanup, baseline missing-route failures and passing controls showing existing provider metadata is available. Initial failures are baseline evidence; the completed Task requires final passing tests after T02.
- **Acceptance:** WG-001-A1.

### PH-004-T02 — Add supported issuer-root metadata routes

- **Goal:** Publish discovery at the configured issuer’s standard locations.
- **Dependencies:** PH-004-T01.
- **Scope:** Add the two Next.js route modules under `app/.well-known/`; reuse the existing `auth` instance and supported provider exports.
- **Deliverable:** Production GET handlers and passing route tests. Delegate metadata construction to the provider rather than duplicating endpoint lists or rewriting protocol responses.
- **Verification:** `pnpm exec vitest run lib/oidc-discovery.test.ts lib/auth-safety.test.ts --reporter=verbose`.
- **Expected evidence:** Both documents return successfully; issuer and endpoint URLs match production configuration; discovered JWKS is reachable; request Host/forwarded-header variations cannot silently replace the configured issuer. Record provider-controlled headers and any observed limitations.
- **Stop condition:** An unsupported framework requirement or required issuer change produces BLOCKED; do not patch dependencies.
- **Acceptance:** WG-001-A1.

### PH-004-T03 — Exercise an independent RP through the actual application routes

- **Goal:** Prove that discovery enables a complete standard integration.
- **Dependencies:** PH-004-T02.
- **Scope:** Add `lib/oidc-rp.integration.test.ts` and a separate HTTP RP fixture. Run the actual Next.js application in an isolated disposable environment so route mounting is exercised.
- **Deliverable:** A discovery-driven authorization-code/PKCE integration covering two independently configured fixture clients.
- **Approach:** The RP uses standard HTTP and `jose`; it imports no WalletGate OAuth-flow helpers, wagmi, viem, Next.js or Better Auth client SDK. A separate IdP-side wallet fixture may use existing signing utilities to authenticate through production SIWE.
- **Verification:** `pnpm exec vitest run lib/oidc-rp.integration.test.ts --reporter=verbose`.
- **Expected evidence:** Issuer-only initialization; discovery and JWKS retrieval; signed login continuation; consent; callback state validation; form-encoded token exchange; signature/issuer/audience/nonce validation; bearer UserInfo without session cookies; refresh and refreshed subject consistency. Assert no user-token exchange depends on client-registration access.
- **Fixture limits:** Client records are seeded as disposable setup, not evidence of wallet-owner registration. Use fresh successful SIWE authentication; do not adopt a session-reuse policy.
- **Acceptance:** WG-001-A1.

### PH-004-T04 — Verify protocol failures and preserve authentication restrictions

- **Goal:** Ensure successful interoperability does not depend on weakened validation.
- **Dependencies:** PH-004-T03.
- **Scope:** Independent RP negative cases and existing production authentication gates.
- **Deliverable:** Acceptance tests for wrong PKCE verifier, reused code, unregistered redirect URI, denied consent, invalid callback state, and rejected invalid-signature/issuer/audience tokens at the RP.
- **Verification:**
  - `pnpm exec vitest run lib/oidc-discovery.test.ts lib/oidc-rp.integration.test.ts lib/auth-safety.test.ts lib/wallet-login.test.ts lib/auth.test.ts --reporter=verbose`
  - `pnpm exec vitest run --config 'app/(auth)/sign-in/vitest.config.ts'`
  - `pnpm exec vitest run --config app/client-test/vitest.config.ts`
- **Expected evidence:** Each negative case reaches its intended boundary; rejected exchanges return no usable credentials; denied consent returns the expected OAuth error; SIWE-only and anonymous-registration restrictions retain their allowed/denied controls.
- **Repair boundary:** Repair only defects necessary for this discovery/RP integration. An unrelated policy-dependent defect is a documented blocker.
- **Acceptance:** WG-001-A1, WG-004-A1, WG-008-A1.

### PH-004-T05 — Complete verification, Coverage evidence and Handoff

- **Goal:** Deliver reviewable product functionality with complete acceptance evidence.
- **Dependencies:** PH-004-T04.
- **Scope:** Integration documentation, final verification, durable logs/artifacts and the assigned sprint progress file.
- **Deliverable:** Changed production route modules, a reproducible issuer-only RP example, one current `json sprint-evidence` record, proposed Coverage updates and a Handoff.
- **Verification:**
  - Repeat the final discovery/RP/authentication acceptance command from T04.
  - `pnpm exec vitest run --config vitest.config.ts`
  - `pnpm run typecheck`
  - `git diff --check`
- **Expected evidence:** Actual commands, exit codes, versions, assertion counts, fixture cleanup and hashed artifacts/logs. Record process startup/shutdown and disposable database isolation. Environmental failure is incomplete verification, not a pass.
- **Coverage:** Propose WG-001 VERIFIED only after its complete ledger acceptance succeeds. Revalidate WG-004/WG-008 before retaining VERIFIED. Preserve all other statuses, including WG-003 PARTIAL and the four BLOCKED requirements.
- **Handoff:** Record delivered routes, reusable RP/tests, exact supported APIs, local runtime limits, remaining identity/security gaps and the next recommended objective without starting it.
- **Acceptance:** WG-001-A1, WG-004-A1, WG-008-A1.

## Dependency and Coverage Check

Dependency order: approval/environment → T01 → T02 → T03 → T04 → T05. T01’s initial failing controls must become passing acceptance after implementation.

| Requirement | Acceptance | Covering Tasks | Completion treatment |
| --- | --- | --- | --- |
| WG-001 | WG-001-A1 | T01–T05 | Complete local production interoperability evidence before proposing VERIFIED |
| WG-004 | WG-004-A1 | T04–T05 | Revalidate SIWE-only authentication |
| WG-008 | WG-008-A1 | T04–T05 | Revalidate anonymous-registration denials |

No Coverage IDs are renumbered, retired or redefined. WG-002, WG-005, WG-009 and WG-013 remain BLOCKED. Discovery success cannot establish wallet-address subjects, trusted session provenance, owner authorization or deployed security.

This is production implementation, not repeated feasibility research. No new research blocker is asserted. The input fingerprints below identify the reviewed baseline; they do not establish executed acceptance.

```json sprint-plan
{
  "kind": "implementation",
  "objective_key": "publish-issuer-discovery-and-standard-rp-flow",
  "requirements": ["WG-001", "WG-004", "WG-008"],
  "acceptance": ["WG-001-A1", "WG-004-A1", "WG-008-A1"],
  "inputs": {
    "docs/PRODUCT_UNDERSTANDING_CONTRACT.md": "e7105be4084e2620494274feeb6faaa7b8265e71420fe18051b4f1ea9eacba71",
    "docs/CONTRACT_COVERAGE.md": "5089acd87fc481df9963e3174429c46afdc3be9a9a5594f173244d7e12707630",
    "lib/auth.ts": "3667d9bde161d20fa542d5fd404989a7f3bb7a72e0843b0b2d31c82e3266ab79",
    "lib/demo-url.ts": "6f4f947e4bd2d40f6c889db541068cb4d6006483122670bb22380ee45438bdef",
    "lib/siwe.ts": "0e849f0470b247f21df7d0077fde573f97017a9b0e84e6567a8a843a264a9aa8",
    "lib/auth-safety-fixture.ts": "b3cfc3c66e829b1bed09fb4170ced5ef511ab53a42fa43eb5015588bfff9e043",
    "lib/auth-safety.test.ts": "fa7a8b7f06c402aece87c0ec56f149f03e46892a6c01fbca8f1c5c95a9091766",
    "app/api/auth/[...all]/route.ts": "032b93c627944b4d48d7a59f2ed8dd65ef97240cf74b25f9ee28c73f95030312",
    "pnpm-lock.yaml": "8cf4e9073142d5eb6cef1825a6e8eaea94dfa347103529ca71ec77b24af037e0"
  },
  "tasks": [
    {
      "id": "PH-004-T01",
      "goal": "Establish production-configured issuer discovery acceptance controls",
      "depends_on": [],
      "deliverable": "Disposable discovery fixtures, baseline missing-route evidence and final passing metadata acceptance tests",
      "verification": "pnpm exec vitest run lib/oidc-discovery.test.ts --reporter=verbose",
      "acceptance": ["WG-001-A1"]
    },
    {
      "id": "PH-004-T02",
      "goal": "Publish both issuer-root discovery documents through supported provider helpers",
      "depends_on": ["PH-004-T01"],
      "deliverable": "Production Next.js metadata routes with issuer, endpoint, JWKS and header-manipulation acceptance tests",
      "verification": "pnpm exec vitest run lib/oidc-discovery.test.ts lib/auth-safety.test.ts --reporter=verbose",
      "acceptance": ["WG-001-A1"]
    },
    {
      "id": "PH-004-T03",
      "goal": "Complete discovery-driven standard RP authentication through actual application routes",
      "depends_on": ["PH-004-T02"],
      "deliverable": "Independent HTTP RP fixture covering two configured clients, PKCE, SIWE continuation, consent, signed tokens, UserInfo and refresh",
      "verification": "pnpm exec vitest run lib/oidc-rp.integration.test.ts --reporter=verbose",
      "acceptance": ["WG-001-A1"]
    },
    {
      "id": "PH-004-T04",
      "goal": "Verify protocol failures and preserve SIWE-only and registration restrictions",
      "depends_on": ["PH-004-T03"],
      "deliverable": "Passing protocol-negative tests and production authentication regressions with allowed and denied controls",
      "verification": "pnpm exec vitest run lib/oidc-discovery.test.ts lib/oidc-rp.integration.test.ts lib/auth-safety.test.ts lib/wallet-login.test.ts lib/auth.test.ts --reporter=verbose; pnpm exec vitest run --config 'app/(auth)/sign-in/vitest.config.ts'; pnpm exec vitest run --config app/client-test/vitest.config.ts",
      "acceptance": ["WG-001-A1", "WG-004-A1", "WG-008-A1"]
    },
    {
      "id": "PH-004-T05",
      "goal": "Complete acceptance evidence, integration documentation, Coverage proposals and Handoff",
      "depends_on": ["PH-004-T04"],
      "deliverable": "Changed production routes, reproducible RP example, hashed successful evidence, acceptance mappings and same-file Handoff",
      "verification": "Repeat final discovery/RP/authentication acceptance; pnpm exec vitest run --config vitest.config.ts; pnpm run typecheck; git diff --check",
      "acceptance": ["WG-001-A1", "WG-004-A1", "WG-008-A1"]
    }
  ]
}
```
