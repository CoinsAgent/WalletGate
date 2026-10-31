<!-- phase-plan-exec:managed -->
# WalletGate Sprint Plan

- **Phase ID:** `PH-001`
- **Status:** `READY_FOR_REVIEW`
- **Source proposal:** `docs/plans/proposals/2026-10-31T00-58-34.373009Z-22e4fc8d-phase-priority.md`
- **Task count:** 8

The status above is authoritative. Proposal-derived readiness notes below were written **before** execution approval. A Yes authorizes this sprint's existing scope only; it does not resolve open product decisions.

## Sprint scope and all tasks

# Phase Priority Proposal

## Baseline

The authority is [Product Understanding Contract v1.1](docs/PRODUCT_UNDERSTANDING_CONTRACT.md), together with `AGENTS.md` and `.agents/skills/phase-plan-exec/SKILL.md`. Public wallet-address identity, SIWE-only end-user authentication, distinct client IDs, and wallet-authorized client management remain binding requirements. Contract §5 implementation decisions remain unapproved.

**Verified repository state:**

- `docs/PLANS.md` and `docs/plans/history/` do not exist. There is no recorded active or completed sprint to resume.
- The existing [phase proposal](docs/plans/proposals/2026-10-30T06-45-47.426427Z-e1650238-phase-priority.md) proposes **PH-001 — Supported identity architecture proof**, with eight tasks. It records `approved: false`; it provides no execution authorization. This candidate retains those provisional identities and bounded research scope.
- The worktree is clean. Current HEAD differs from the assessments’ recorded revision, but comparison against that revision shows no changes under `lib/`, `app/`, `package.json`, `pnpm-lock.yaml`, or the Product Contract.
- Locked versions include Better Auth/core/OAuth provider **1.7.11**, viem **2.57.10**, and Next.js **16.3.4**. `node_modules` is absent. Installed versions and runtime behavior are unknown.

**Supplied historical evidence:**

| Report | Relevant findings | Verification limits |
| --- | --- | --- |
| [Contract compliance](docs/assessments/2026-10-30T01-23-40.381602Z-aeb940c4-contract-compliance.md) | Non-SIWE login and open registration conflict with requirements; session provenance and address subjects are unestablished | Unreviewed static assessment; no executed tests |
| [Technical feasibility](docs/assessments/2026-10-30T02-12-49.882089Z-6b47ae5b-technical-feasibility.md) | Supported hooks offer candidate integration points; ordinary claim callbacks cannot replace public subjects in the inspected provider version | Unreviewed exact-package source investigation; no runtime proof |

Material application findings were rechecked:

| Observation | Current source evidence |
| --- | --- |
| Password authentication and passkeys remain enabled | `lib/auth.ts:110–120,145` |
| Unauthenticated client registration remains enabled | `lib/auth.ts:312–316` |
| Authentication route delegates without adding wallet-owner authorization | `app/api/auth/[...all]/route.ts:25–40` |
| Wallet-session display relies on linked SIWE accounts | `app/client-test-siwe/wallet-client.tsx:48–51` |
| Account selection lists device sessions without a visible provenance filter | `app/(auth)/oauth/select-account/page.tsx:12–29` |
| Local SIWE verifier checks URI origin and signature, without complete local grammar/time validation | `lib/siwe.ts:16–33` |
| Existing test expects UserInfo subject to equal internal user ID | `app/client-test-siwe/siwe-login.test.ts:141–147` |
| SQLite, MySQL, and Turso configuration branches exist | `lib/auth.ts:41–78` |
| Root test discovery excludes a separate experiment directory | `vitest.config.ts:5` |

The feasibility report attributes fixed public-subject behavior to published `@better-auth/oauth-provider@1.7.11`, specifically `dist/utils-vIo_wPv5.mjs:815–818` and `dist/introspect-B-5vOvYK.mjs:13–51,1230–1263,1399–1426`. This remains **historical source evidence**, not independently reproduced runtime behavior in this planning session.

**Priority inference:** A supported identity architecture remains the highest-priority unresolved prerequisite. Subject representation affects user persistence, session provenance, ownership references, and existing grants. Implementing those capabilities before proving the architecture risks incompatible identity models.

No files were modified, scripts invoked, dependencies installed, or tests executed for this proposal.

## Top 1 Phase

### PH-001 — Supported identity architecture proof

**Candidate status:** Unapproved proposal; execution prerequisites are unmet.

**Objective:** Prove or falsify a supported architecture that derives consistent public wallet-address subjects and trustworthy session provenance from validated SIWE, then document its lifecycle and ownership consequences.

**Why this phase:** It continues the existing unfinished research proposal and addresses the principal framework uncertainty identified by the supplied feasibility report. The known password-login and open-registration conflicts remain unresolved security gaps; completing this research does not make the current application compliant.

**Observable deliverables:** An isolated executable experiment suite, exact-version source references, recorded runtime results, a lifecycle/ownership impact matrix, and a supported architecture verdict with explicit outstanding decisions.

**Prerequisites:**

- A new explicit Yes for this specific sprint after the controller persists its concrete scope.
- A separate writable disposable checkout, dependency retrieval, and disposable database access.
- Experimental assumptions documented before use: address representation, chain fixtures, wallet type, session lifecycle, and legacy-record treatment.
- No production credentials or external email, payment, or SSO side effects.
- Production policy decisions remain outside experimental authorization.

**In scope:** Supported-hook investigation; disposable prototype implementation; subject, provenance, and security-negative experiments; reference/adapter analysis; reproducibility and decision documentation.

**Out of scope:** Application authentication/UI changes; production client management; live migrations or resets; dependency upgrades; upstream patches; provider replacement; service-account binding implementation; deployment; conformance certification; Product Contract changes.

**Acceptance criteria:**

| ID | Criterion |
| --- | --- |
| PH-001-AC1 | Exact-version baseline and supported integration points are reproducible; helper-based and application-equivalent persistence results are distinguished. |
| PH-001-AC2 | Address-subject customization receives an executed verdict across two wallets, two clients, initial issuance, refresh, and UserInfo, including normalization and concurrency. |
| PH-001-AC3 | Server-controlled SIWE provenance receives an executed verdict across session persistence and relevant user-authorization/grant boundaries, including negative cases. |
| PH-001-AC4 | Relevant Contract §5 decisions, existing-data references, token roles, ownership implications, and adapter limitations have explicit evidence or blockers. |
| PH-001-AC5 | Experiments have documented commands, assertions, actual outcomes, and a clean rerun; baseline application regressions are accounted for. |
| PH-001-AC6 | The decision package identifies a supported candidate or reproducible no-go, separates experimental assumptions from production approvals, and maps every criterion to evidence. |

A reproducible no-go may satisfy this **research** phase. Missing experiments caused by unavailable resources do not count as a technical no-go or completed verification.

## All Tasks for Top 1 Phase

All tasks below are proposed future work. Commands are verification instructions, not executed results. Experiment paths are proposed suite locations in the disposable checkout.

### PH-001-T01 — Define the experiment charter and decision ledger

- **Goal:** Bound the research without silently selecting production identity or security policies.
- **Dependencies:** Explicit sprint authorization.
- **Scope:** Contract §5; canonicalization; internal IDs; chains and EOA/ERC-1271 boundaries; wallet linking; session freshness, switching, revocation and legacy sessions; existing grants; owner references; registration modes; truthful claims.
- **Deliverable:** A charter and ledger listing candidate assumptions, evidence required, consequences, approval status, and stop conditions for each relevant decision.
- **Verification strategy:** Trace each Contract §5 item to an experiment or an explicit exclusion. Label EOA fixtures and alternative casing/lifecycle fixtures as experimental. Identify facts requiring human decisions before dependent work.
- **Recorded evidence:** Completed decision checklist and reviewed scope boundaries.
- **Gate:** Any unresolved decision that cannot be represented safely as a disposable experiment is `BLOCKED`; do not adopt it as policy.

### PH-001-T02 — Establish the isolated exact-version harness

- **Goal:** Make subsequent findings reproducible against the locked stack and persistent storage.
- **Dependencies:** T01; writable disposable environment and dependency access.
- **Scope:** Explicit experiment Vitest configuration, fresh SQLite persistence matching the application’s configured adapter path, schema setup/teardown, and isolated environment variables. Document differences from `getTestInstance` in existing SIWE tests.
- **Deliverable:** Runnable experiment harness with deterministic cleanup and no external-service side effects.
- **Verification commands:**

  ```sh
  node --version
  pnpm --version
  pnpm install --frozen-lockfile
  pnpm list better-auth @better-auth/core @better-auth/oauth-provider viem --depth 0
  git diff --exit-code -- package.json pnpm-lock.yaml
  ```

  Demonstrate fresh database creation, disposal, and recreation.
- **Recorded evidence:** Runtime/package versions, package integrity references, commands and exit codes, database configuration, and isolation checks.
- **Gate:** Installation, runtime, or persistence incompatibility is `BLOCKED`. Do not upgrade dependencies automatically.

### PH-001-T03 — Reproduce baseline subjects and trace supported hooks

- **Goal:** Establish an executed control case before evaluating customization.
- **Dependencies:** T02.
- **Scope:** Real signed SIWE through provider handlers; user/session creation ordering; subject resolution; reserved-claim handling; UserInfo lookup; refresh issuance; documented request and database hooks.
- **Deliverable:** Baseline tests and an exact-version integration-point map.
- **Verification command:**

  ```sh
  pnpm exec vitest run --config experiments/c01/vitest.config.ts experiments/c01/baseline.test.ts --reporter=verbose
  ```

  Verify ID Token signatures using JWKS and validate issuer, audience, nonce, and subject. Exercise ordinary subject claim overrides as controls. Record differences between test helpers and persistent execution.
- **Recorded evidence:** Installed source paths/lines, redacted protocol results, hook ordering, assertions, and failures.
- **Gate:** No monkey-patching, package edits, or JWT-response rewriting as an identity solution. Unsupported customization must be reported.

### PH-001-T04 — Test verified address identity and subject consistency

- **Goal:** Prove or falsify address-based internal IDs through supported extension points.
- **Dependencies:** T03; documented experimental address/chain fixtures.
- **Scope:** Identity derived only after successful SIWE validation; two wallets and two clients; repeat login; casing variants; concurrent first login; interleaved requests; initial and refreshed identity surfaces.
- **Deliverable:** Subject experiment suite and a supported-candidate/no-go verdict.
- **Verification command:**

  ```sh
  pnpm exec vitest run --config experiments/c01/vitest.config.ts experiments/c01/subject.test.ts --reporter=verbose
  ```

  Assert deterministic subjects across clients, ID Token/UserInfo equality, correct refreshed behavior, and no cross-request wallet leakage. Reject identity substitution through names, emails, ENS labels, supplied IDs, or unverified wallet fields. Preserve distinct client IDs and machine-token roles.
- **Recorded evidence:** Verified claims, persisted identity/account rows, concurrency outcomes, negative assertions, and adapter behavior.
- **Gate:** If refreshed ID Tokens are not issued, record that limitation and verify existing refreshed surfaces. Address-ID success does not approve production internal IDs or migration.

### PH-001-T05 — Test trustworthy provenance and grant enforcement

- **Goal:** Determine whether supported mechanisms can persist trusted SIWE provenance and enforce experimental lifecycle rules.
- **Dependencies:** T03 and T04 verdict; documented session fixtures.
- **Scope:** Provenance creation after successful verification; persistence/retrieval; configured cache behavior; account selection; authorization and consent continuation; code exchange; refresh; bearer identity use; renewal, switching, expiry and revocation.
- **Deliverable:** Provenance suite and boundary matrix.
- **Verification command:**

  ```sh
  pnpm exec vitest run --config experiments/c01/vitest.config.ts experiments/c01/provenance.test.ts --reporter=verbose
  ```

  Test forged fields, wallet-linked password/passkey sessions, legacy sessions, alternate creation routes and impersonation where exposed, concurrent wallets, and previously issued codes/refresh grants under each experimental rule. Keep application authentication separate from end-user provenance.
- **Recorded evidence:** Persisted fields, redacted session/grant traces, expected denials, and unsupported enforcement points.
- **Gate:** Diagnostic research may continue after a T04 no-go, but cannot establish a viable combined architecture. Production freshness, revocation, switching, and legacy-grant policies remain unapproved.

### PH-001-T06 — Assess lifecycle, adapter, and ownership consequences

- **Goal:** Identify the data and authorization consequences of the candidate architecture.
- **Dependencies:** T04 and T05 results.
- **Scope:** Users, accounts/wallets, sessions, clients, consents, codes, tokens, and enabled-plugin references. Compare internal-user ownership with server-derived wallet references. Examine session registration, initial-access-token registration, and administrative exceptions.
- **Deliverable:** Reference inventory, lifecycle tests, adapter matrix, and transition alternatives.
- **Verification strategy:** Run `experiments/c01/lifecycle.test.ts` through the explicit experiment configuration. Seed a legacy random-ID user, related grants, and two applications. Assert collision/reference behavior and identify ownership-retention and invalidation requirements. Document proposed dry-run and rollback invariants without performing a live transition.
- **Recorded evidence:** Fixture queries, schema/source references, failed invariants, and SQLite/MySQL/Turso classifications as executed, source-inspected, or unverified.
- **Gate:** No live migration, reset, ownership transfer, co-management policy, administrative exception, or protected-DCR policy is approved by this task.

### PH-001-T07 — Consolidate security-negative and regression verification

- **Goal:** Ensure candidate success cannot depend on accepting invalid authentication or silently changing application behavior.
- **Dependencies:** T03–T06.
- **Scope:** Combined experiment suite; relevant existing SIWE/OAuth tests; strict-validation experiments through supported callbacks; clean rerun and scope review.
- **Deliverable:** Reproducible verification record with failures classified.
- **Verification strategy:** Cover wrong signer, domain and URI; missing/malformed required fields; wrong version; invalid dates; expiration/not-before; nonce replay and concurrent consumption; nonce burning after invalid attempts; forged provenance; alternate-login and cross-wallet leakage. Use explicitly labeled time/chain fixtures rather than selecting production policy.

  ```sh
  pnpm exec vitest run --config experiments/c01/vitest.config.ts --reporter=verbose
  pnpm exec vitest run --config app/client-test-siwe/vitest.config.ts
  pnpm exec vitest run --config app/client-test/vitest.config.ts
  ```

  Compare existing-suite results against the unchanged baseline, recreate disposable storage, and rerun the experiments. Review the checkout diff for unexpected application or lockfile changes.
- **Recorded evidence:** Commands, exit codes, assertions, clean-rerun results, baseline/new failure classification, and remaining limitations.
- **Gate:** A security-negative failure prevents a positive architecture verdict unless resolved within the approved experimental scope. Unavailable resources remain incomplete work.

### PH-001-T08 — Produce the reviewable architecture decision package

- **Goal:** Make the research outcome independently assessable.
- **Dependencies:** T01–T07 results.
- **Scope:** Experiment documentation, evidence index, compatibility matrix, recommendation, alternatives, and outstanding approvals.
- **Deliverable:** A complete supported-candidate or reproducible-no-go package.
- **Verification strategy:** Map every acceptance criterion to executed evidence or an explicit unresolved blocker. Check documented commands against actual rerun records. Separate source inspection, executed observations, inference, and unknowns. Confirm production files, approved contract, and immutable assessments were preserved.
- **Recorded evidence:** Coverage table, reproducibility instructions, limitations, decision ledger, and final scope review.
- **Gate:** Research completion and production architecture acceptance are separate human decisions. Do not begin implementation or another phase.

## Dependency and Coverage Check

**Dependency order:** Approval and environment → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08.

A T04 failure permits bounded diagnostic work in T05–T07, with its limitations preserved. Infrastructure failure does not justify skipping experiments and declaring completion.

| Acceptance criterion | Covering tasks |
| --- | --- |
| PH-001-AC1 — Reproducible baseline | T01, T02, T03, T07 |
| PH-001-AC2 — Address-subject verdict | T03, T04, T07 |
| PH-001-AC3 — Provenance verdict | T03, T05, T07 |
| PH-001-AC4 — Lifecycle and policy coverage | T01, T04, T05, T06, T08 |
| PH-001-AC5 — Reproducibility and regressions | T02, T07, T08 |
| PH-001-AC6 — Reviewable decision package | T01, T06, T08 |

**Current execution constraints:** No sprint authorization, no installed dependencies, and a read-only environment. These constrain execution, not preparation of this candidate.

**Technical unknowns:** Supported validated-context propagation, deterministic-ID persistence, concurrency, provenance storage, refresh enforcement, and adapter compatibility require experiments.

The eight tasks cover the bounded research phase. Newly discovered work outside its scope requires proposal revision. `READY_FOR_REVIEW` requires actual evidence for all research criteria; it does not establish product compliance or human acceptance. Unresolved material decisions requiring intervention produce `BLOCKED`; incomplete execution produces `PAUSED`.
