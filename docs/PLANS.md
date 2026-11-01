<!-- phase-plan-exec:managed -->
# WalletGate Sprint Plan

- **Phase ID:** `PH-005`
- **Status:** `PAUSED`
- **Source proposal:** `docs/plans/proposals/2026-11-01T01-50-10.467881Z-60317065-phase-priority.md`
- **Task count:** 10

The status above is authoritative. Proposal-derived readiness notes below were written **before** execution approval. A Yes authorizes this sprint's existing scope only; it does not resolve open product decisions.

## Sprint scope and all tasks

# Phase Priority Proposal

## Baseline

Authority: [AGENTS.md](/home/ubuntu/WalletGate/AGENTS.md), approved [Product Contract v1.1](/home/ubuntu/WalletGate/docs/PRODUCT_UNDERSTANDING_CONTRACT.md), the phase-plan-exec skill and [Sprint Workflow](/home/ubuntu/WalletGate/docs/SPRINT_WORKFLOW.md).

**Verified repository observations:**

- HEAD is `449ab0e4989ddbb79ab5d840aeae55178b787666`.
- `docs/PLANS.md` is absent and appears as deleted in Git. Archived plans PH-001–PH-004 exist. Their latest progress records mark every Task COMPLETE; later completion records supersede earlier blocked Handoffs.
- PH-004’s archived plan and [final Handoff](/home/ubuntu/WalletGate/docs/plans/progress/PH-004.md:669) record reviewed local interoperability delivery. Its current machine-record artifact/log hashes match retained files. PH-003’s final references also match.
- Earlier PH-001/PH-002 hashes have historical drift. PH-001’s three changed artifacts contain helper-path/documentation relocation; PH-002’s changed authentication artifacts were subsequently covered by PH-003/PH-004. Their original results remain historical evidence, not freshly executed acceptance.
- Installed package manifests report Better Auth and OAuth provider **1.7.11**, Next.js **16.3.4**, and viem **2.57.10**. No dependency installation or runtime tests occurred during planning.
- Existing unrelated worktree changes include the deleted current plan, untracked PH-004 archive, supplied feasibility report and Python cache. Planning preserved them.

**Resume determination:** No recorded unfinished Task remains within the four completed sprint scopes. PH-003’s approved amendment explicitly deferred statement parsing and SQLite concurrency; those remain requirement gaps rather than unfinished amended Tasks. Do not reopen them implicitly.

[Coverage](/home/ubuntu/WalletGate/docs/CONTRACT_COVERAGE.md:7) records three VERIFIED requirements, six PARTIAL and four BLOCKED. The Contract hash matches the ledger. Requirements and acceptance meanings remain unchanged; no renumbering, retirement or new requirement IDs are proposed.

| Prior evidence | Reusable outcome and limitation |
| --- | --- |
| PH-001 | Persistent fixtures, signed-token verification and supported-hook findings. Experimental address IDs and provenance rules remain unapproved for production. |
| PH-002 | Production SIWE-only entry, anonymous-registration denial, signed OAuth continuation and wallet helpers. Its [Handoff](/home/ubuntu/WalletGate/docs/plans/progress/PH-002.md:2153) explicitly excludes complete mobile discovery. |
| PH-003 | Strict callback validation and scoped replay evidence. Statement parsing and SQLite concurrency remain deferred; WG-003 remains PARTIAL. |
| PH-004 | Independent HTTP RP, disposable Next.js fixture, discovery, consent, token/UserInfo/refresh verification and protocol negatives. Local evidence does not certify deployment or wallet-address subjects. |

The supplied historical compliance report predates these production fixes; its password-login and anonymous-registration findings are superseded by later source and acceptance evidence. Its unresolved identity/ownership findings remain relevant. The supplied feasibility report addresses SQLite asynchronous execution and establishes no executed B2 repair. Neither report authorizes implementation or warrants repeated research.

**Current product gap:** [SignIn](/home/ubuntu/WalletGate/app/(auth)/sign-in/_components/sign-in.tsx:55) selects only `window.ethereum` and combines connection and signing in one action. [signInWithWallet](/home/ubuntu/WalletGate/app/(auth)/sign-in/siwe-login.ts:24) immediately requests accounts, obtains a nonce and signs. Existing [wallet tests](/home/ubuntu/WalletGate/lib/wallet-login.test.ts:25) cover static rendering and helpers, without exercising interactive wallet discovery in a browser.

**Priority inference:** A guided wallet discovery and login flow is the highest-priority implementable unfinished slice. Identity, session lifecycle and ownership delivery require unapproved Contract §5 decisions. PH-003’s known defects remain explicitly deferred. Wallet discovery can improve production access while preserving those boundaries.

This proposal is based on source inspection, historical evidence review and hash comparisons. No files, scripts, tests, builds or application state were changed.

## Top 1 Phase

### PH-005 — Deliver guided wallet discovery and fresh SIWE login

**Kind:** `implementation`  
**Objective key:** `guided-injected-wallet-discovery-and-fresh-siwe-login`  
**Primary requirement:** WG-012  
**Regression requirements:** WG-001, WG-004, WG-008  
**Task count:** 6

**Outcome:** Users can discover an available wallet, explicitly choose it, connect, review the address and sign-in domain, sign SIWE, and continue through consent to their application. Desktop and mobile-sized browser journeys receive executable acceptance coverage.

Implement event-based multi-wallet discovery using [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963), with the existing injected-provider fallback. Handle provider events and errors using [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193). Discovery metadata identifies a selectable provider; it does not authenticate its vendor or the user.

**Production deliverables:**

- A reusable provider-discovery module and wallet chooser.
- Explicit connection, review, signing, verification and continuation states.
- Recoverable errors and mobile wallet-browser guidance.
- Browser tests through the actual sign-in and consent UI, backed by production SIWE and an independent RP.
- Durable acceptance evidence and same-file Handoff.

**Prerequisites:**

- Persist this candidate through the normal workflow and obtain a new explicit Yes for that sprint.
- A writable isolated execution environment with locked dependencies, disposable databases, browser binaries and permitted local listeners.
- A pinned browser-test development dependency if no suitable runner is already available. Record the selected version and lockfile change; production dependency upgrades are outside scope.
- Disposable seeded RP clients and public test-wallet keys, reusing PH-004’s isolation approach.

**Scope limits:** This slice supports discovered/injected providers, including the mobile wallet-browser path. Remote wallet transport, QR pairing, universal links and real-device compatibility certification remain outside this sprint. WG-012 therefore remains PARTIAL even if every sprint criterion passes.

Wallet/provider changes during an unfinished attempt invalidate that attempt and require fresh connection/signing. This introduces no authenticated-session switching, revocation or wallet-linking policy. Existing server identity and session behavior remain governed by the outstanding Contract decisions.

| Acceptance ID | Required result |
| --- | --- |
| PH-005-AC1 | Multiple announced providers and the legacy fallback are discoverable; the user explicitly selects the provider; discovery alone requests no account permission or signature. |
| PH-005-AC2 | Connection and SIWE signing are separate visible steps. The reviewed address/domain correspond to the signed attempt; retries obtain fresh nonces; stale asynchronous results cannot advance another attempt. |
| PH-005-AC3 | Missing wallets, rejected requests, disconnection, changed accounts/chains and server failures produce accessible recovery states. Mobile-sized layouts provide usable controls and truthful wallet-browser guidance. |
| PH-005-AC4 | Actual browser UI completes fresh SIWE, consent and return to an independent RP at desktop and mobile viewports. RP state, PKCE and signed-token checks remain effective; cancellation and tampered continuation are rejected. |
| PH-005-AC5 | Changed production code, browser evidence, regressions, input versions, hashed artifacts and Handoff fully support the scoped delivery and explicitly retain broader mobile limitations. |
| WG-001-A1 | Existing independent standard RP interoperability remains passing. |
| WG-004-A1 | Non-SIWE independent login remains denied while fresh SIWE and signed continuation remain usable. |
| WG-008-A1 | Exposed anonymous client creation remains denied without persisted clients or returned credentials. |

## All Tasks for Top 1 Phase

All commands below are proposed execution checks, not planning results.

### PH-005-T01 — Establish interactive acceptance fixtures

- **Goal:** Extend existing evidence into browser interaction without rebuilding PH-001’s architecture experiments.
- **Dependencies:** Explicit sprint approval and execution prerequisites.
- **Scope:** Reuse PH-004’s isolated Next.js/database setup and independent RP; add a browser runner, provider fixture and desktop/mobile projects.
- **Deliverable:** Proposed `playwright.wallet.config.ts`, `tests/wallet-login.spec.ts` and reusable fixture support. Wallet signing stays in the test harness; no test keys or bypass routes enter production.
- **Verification:** `pnpm exec playwright test --config playwright.wallet.config.ts --list`; run the existing OIDC acceptance command before changing behavior.
- **Expected evidence:** Exact runner/browser versions, baseline observations, source/configuration isolation and cleanup. Confirm the real sign-in page loads and the test provider signs messages accepted by production verification.
- **Acceptance:** PH-005-AC4, PH-005-AC5, WG-001-A1.
- **Stop:** Unavailable browsers, listener permission or disposable persistence prevent dependent browser work; do not replace browser acceptance with static rendering.

### PH-005-T02 — Implement explicit wallet discovery and selection

- **Goal:** Let users choose among available injected wallets.
- **Dependencies:** PH-005-T01.
- **Scope:** Proposed `lib/wallet-discovery.ts`, its tests and sign-in chooser integration.
- **Deliverable:** EIP-6963 discovery with delayed announcements, duplicate handling, stable selection, listener cleanup and legacy fallback.
- **Verification:** `pnpm exec vitest run lib/wallet-discovery.test.ts --reporter=verbose`.
- **Expected evidence:** Multiple-provider, duplicate, malformed-announcement, late-arrival, fallback and cleanup cases. No `eth_requestAccounts`, nonce request or signature occurs during discovery. Treat names and icons as untrusted presentation data; render without executable markup.
- **Acceptance:** PH-005-AC1.

### PH-005-T03 — Separate connection, review and fresh SIWE authentication

- **Goal:** Make the user’s signing action explicit and keep each attempt internally consistent.
- **Dependencies:** PH-005-T02.
- **Scope:** Existing sign-in component, SIWE helper and wallet-login orchestration; introduce a testable flow controller where useful.
- **Deliverable:** Production state transitions for selection → connection → address/domain review → signing → verification → continuation.
- **Verification:** `pnpm exec vitest run lib/wallet-login.test.ts lib/wallet-login-flow.test.ts --reporter=verbose`.
- **Expected evidence:** Explicit signing confirmation, one active attempt, fresh nonce on retry, selected-provider use and unchanged signed continuation. Test account/chain changes, provider replacement, unmount and late responses before verification or navigation.
- **Boundary:** Pre-submission stale attempts must not verify or navigate. Once a verification request has reached the server, do not claim UI cancellation revokes its session; retain that lifecycle limitation explicitly.
- **Acceptance:** PH-005-AC2, PH-005-AC3.

### PH-005-T04 — Complete recovery states and responsive login presentation

- **Goal:** Make the flow usable when wallets or network operations fail.
- **Dependencies:** PH-005-T03.
- **Scope:** Sign-in UI, error mapping and focused consent presentation fixes required by the journey.
- **Deliverable:** Accessible status/error announcements, keyboard-operable selection and recovery, mobile layouts, and clear guidance when no injected wallet is available.
- **Verification:** `pnpm exec playwright test --config playwright.wallet.config.ts --grep 'discovery|recovery|layout'`.
- **Expected evidence:** Desktop/mobile screenshots and assertions for unavailable wallet, connection/signature rejection, unsupported request, disconnect and verification failure. Controls remain reachable without horizontal overflow; recovery preserves the original OAuth request.
- **Boundary:** Keep session JSON, token walkthroughs and other diagnostics outside the primary RP login path. Connection and linked-wallet display must not claim authenticated session provenance.
- **Acceptance:** PH-005-AC1, PH-005-AC2, PH-005-AC3.

### PH-005-T05 — Verify browser consent and return to the independent RP

- **Goal:** Prove the complete UI journey against actual application routes.
- **Dependencies:** PH-005-T04.
- **Scope:** Browser interaction with sign-in and consent; independent RP code exchange and token verification.
- **Deliverable:** Desktop/mobile browser acceptance using two selectable provider fixtures and two seeded RP clients.
- **Verification:** `pnpm exec playwright test --config playwright.wallet.config.ts`.
- **Expected evidence:** Fresh-context discovery, selected-wallet signing, real SIWE verification, UI consent, callback state, PKCE, signed ID Token and bearer UserInfo. Include denied consent, rejected signing, retry, tampered continuation and safe callback controls.
- **Fixture limits:** Browser-injected providers are deterministic fixtures. Mobile viewport emulation does not establish real wallet-app handoff or device compatibility. Seeded clients do not demonstrate owner-authorized registration.
- **Acceptance:** PH-005-AC4, WG-001-A1, WG-004-A1, WG-008-A1.

### PH-005-T06 — Complete regressions, Coverage proposals and Handoff

- **Goal:** Finish with reviewable product code and complete scoped evidence.
- **Dependencies:** PH-005-T05.
- **Scope:** Final checks, concise support documentation and the assigned sprint’s progress file.
- **Deliverable:** One current `json sprint-evidence` record, acceptance mappings, actual command outcomes, hashed logs/artifacts and same-file Handoff.
- **Verification, sequentially:**
  - `pnpm exec playwright test --config playwright.wallet.config.ts`
  - `pnpm exec vitest run --config vitest.config.ts`
  - `pnpm exec vitest run --config 'app/(auth)/sign-in/vitest.config.ts'`
  - `pnpm exec vitest run --config app/client-test/vitest.config.ts`
  - `pnpm run typecheck`
  - `git diff --check`
- **Expected evidence:** Passing assertions with no required cases skipped, test-server/browser/database cleanup, and exact dependency changes. Preserve failed attempts and distinguish environmental failures from assertions.
- **Coverage:** Retain WG-012 PARTIAL with this slice’s production references and limitations. Revalidate WG-001/WG-004/WG-008 before retaining VERIFIED. Preserve WG-003’s deferrals and all BLOCKED policies.
- **Handoff:** Delivered behavior, reusable modules/tests, supported provider boundary, simulated/mobile limits, remaining gaps and recommended next objective.
- **Acceptance:** PH-005-AC1–PH-005-AC5, WG-001-A1, WG-004-A1, WG-008-A1.

## Dependency and Coverage Check

Dependency order: approval/environment → T01 → T02 → T03 → T04 → T05 → T06.

| Requirement | Sprint acceptance | Covering Tasks | Completion treatment |
| --- | --- | --- | --- |
| WG-012 | PH-005-AC1–PH-005-AC5 | T01–T06 | Production discovery/guided-login slice; retain PARTIAL |
| WG-001 | WG-001-A1 | T01, T05, T06 | Revalidate independent RP interoperability |
| WG-004 | WG-004-A1 | T05, T06 | Revalidate denied alternate login and allowed SIWE |
| WG-008 | WG-008-A1 | T05, T06 | Revalidate anonymous-registration denial |

PH-005 acceptance IDs describe this bounded slice; they do not replace or weaken WG-012-A1. Complete browser/mobile requirement verification remains outstanding.

No new feasibility phase is proposed. Reuse PH-001’s validated persistence/signature methods and PH-002–PH-004’s production integration. Their experimental identity policies are not adopted. The SQLite feasibility report supplies no reason to repeat research within this UX objective.

The following fingerprints identify relevant reviewed inputs, not executed acceptance:

```json sprint-plan
{
  "kind": "implementation",
  "objective_key": "guided-injected-wallet-discovery-and-fresh-siwe-login",
  "requirements": [
    "WG-012",
    "WG-001",
    "WG-004",
    "WG-008"
  ],
  "acceptance": [
    "PH-005-AC1",
    "PH-005-AC2",
    "PH-005-AC3",
    "PH-005-AC4",
    "PH-005-AC5",
    "WG-001-A1",
    "WG-004-A1",
    "WG-008-A1",
    "PH-005-AC6",
    "PH-005-AC7",
    "PH-005-AC8",
    "PH-005-AC9"
  ],
  "inputs": {
    "docs/PRODUCT_UNDERSTANDING_CONTRACT.md": "e7105be4084e2620494274feeb6faaa7b8265e71420fe18051b4f1ea9eacba71",
    "docs/CONTRACT_COVERAGE.md": "062391d67ef158ee40a8b7842d2f7f5ce6d5be47c17b1b05610f1b4373df7975",
    "app/(auth)/sign-in/_components/sign-in.tsx": "fa8c3f62fca1990e5fbadde5a9c48c11ee2687cf1fded543b46eba558efe54a9",
    "app/(auth)/sign-in/siwe-login.ts": "216335d514ecdb698e2bb61e2a319c04d3d0eeb0e663075652982f90699cad7d",
    "lib/wallet-login.ts": "ee36418dd794a9b2acda98ee6e245880fd97b3537ab3de5c3829ae29f94bfb7b",
    "lib/oauth-login-client.ts": "3ec3d0bdad4b97f25aedd7eadc8957d177abff222740ecc95122e21478645b60",
    "lib/auth.ts": "3667d9bde161d20fa542d5fd404989a7f3bb7a72e0843b0b2d31c82e3266ab79",
    "lib/siwe.ts": "0e849f0470b247f21df7d0077fde573f97017a9b0e84e6567a8a843a264a9aa8",
    "lib/oidc-http-fixture.ts": "53fc6c7f3a2a56079fb00e12facd9f4a8081e4423541ab05e6547f5d7c1e055b",
    "examples/oidc-rp.ts": "78e2dfd5faeb7a1d69fd0bd562a376895d583ddddf59c98e6c68331ba2f1c5d6",
    "package.json": "af6d5ee87c397464653e722b21fc05d5d30c63b8602c2cb9cebe4160c40986f6",
    "pnpm-lock.yaml": "8cf4e9073142d5eb6cef1825a6e8eaea94dfa347103529ca71ec77b24af037e0"
  },
  "tasks": [
    {
      "id": "PH-005-T01",
      "goal": "Establish isolated interactive browser and independent RP acceptance fixtures",
      "depends_on": [],
      "deliverable": "Pinned browser runner, desktop/mobile projects, disposable production fixture and test-only wallet provider",
      "verification": "pnpm exec playwright test --config playwright.wallet.config.ts --list; pnpm exec vitest run lib/oidc-discovery.test.ts lib/oidc-rp.integration.test.ts --reporter=verbose",
      "acceptance": [
        "PH-005-AC4",
        "PH-005-AC5",
        "WG-001-A1"
      ]
    },
    {
      "id": "PH-005-T02",
      "goal": "Implement explicit multi-wallet discovery and selection",
      "depends_on": [
        "PH-005-T01"
      ],
      "deliverable": "Production discovery module and chooser with EIP-6963 announcements, legacy fallback and safe presentation",
      "verification": "pnpm exec vitest run lib/wallet-discovery.test.ts --reporter=verbose",
      "acceptance": [
        "PH-005-AC1"
      ]
    },
    {
      "id": "PH-005-T03",
      "goal": "Separate connection, review, signing and verification while isolating attempts",
      "depends_on": [
        "PH-005-T02"
      ],
      "deliverable": "Production guided login flow with fresh nonce retries, stale-result protection and preserved OAuth continuation",
      "verification": "pnpm exec vitest run lib/wallet-login.test.ts lib/wallet-login-flow.test.ts --reporter=verbose",
      "acceptance": [
        "PH-005-AC2",
        "PH-005-AC3"
      ]
    },
    {
      "id": "PH-005-T04",
      "goal": "Deliver accessible recovery and responsive wallet login presentation",
      "depends_on": [
        "PH-005-T03"
      ],
      "deliverable": "Desktop/mobile chooser, progress, recovery and no-wallet guidance with browser assertions",
      "verification": "pnpm exec playwright test --config playwright.wallet.config.ts --grep 'discovery|recovery|layout'",
      "acceptance": [
        "PH-005-AC1",
        "PH-005-AC2",
        "PH-005-AC3"
      ]
    },
    {
      "id": "PH-005-T05",
      "goal": "Verify actual browser SIWE, consent and independent RP return",
      "depends_on": [
        "PH-005-T04"
      ],
      "deliverable": "Desktop/mobile browser journeys for two providers and clients, protocol denials and production authentication controls",
      "verification": "pnpm exec playwright test --config playwright.wallet.config.ts",
      "acceptance": [
        "PH-005-AC4",
        "WG-001-A1",
        "WG-004-A1",
        "WG-008-A1"
      ]
    },
    {
      "id": "PH-005-T06",
      "goal": "Complete acceptance evidence, regressions, scoped Coverage proposals and Handoff",
      "depends_on": [
        "PH-005-T05"
      ],
      "deliverable": "Changed production code, hashed successful logs, acceptance mappings, documented support limits and same-file Handoff",
      "verification": "pnpm exec playwright test --config playwright.wallet.config.ts; pnpm exec vitest run --config vitest.config.ts; pnpm exec vitest run --config 'app/(auth)/sign-in/vitest.config.ts'; pnpm exec vitest run --config app/client-test/vitest.config.ts; pnpm run typecheck; git diff --check",
      "acceptance": [
        "PH-005-AC1",
        "PH-005-AC2",
        "PH-005-AC3",
        "PH-005-AC4",
        "PH-005-AC5",
        "WG-001-A1",
        "WG-004-A1",
        "WG-008-A1"
      ]
    },
    {
      "id": "PH-005-T07",
      "goal": "Integrate the supported MetaMask remote provider",
      "depends_on": [
        "PH-005-T06"
      ],
      "deliverable": "Lazy client-only pinned MetaMask connector adapter with explicit mobile app choice, lifecycle cleanup, transport error mapping and documented network/RPC configuration. Preserve injected providers and separate connect/review/sign steps. Inspect exact installed package sources and lockfile before relying on API behavior.",
      "verification": "Focused connector and wallet-flow tests; package/lockfile inspection; typecheck",
      "acceptance": [
        "PH-005-AC6",
        "PH-005-AC7",
        "PH-005-AC8"
      ]
    },
    {
      "id": "PH-005-T08",
      "goal": "Deliver mobile app handoff and original-browser recovery",
      "depends_on": [
        "PH-005-T07"
      ],
      "deliverable": "Production chooser and connection states for mobile Chrome -> MetaMask app -> original Chrome tab, retaining the OAuth request. Handle foreground/background, rejection, timeout, cancellation, stale results and provider changes without introducing session reuse or wallet-switch policy.",
      "verification": "Focused flow/adapter tests and mobile browser interaction checks",
      "acceptance": [
        "PH-005-AC6",
        "PH-005-AC7",
        "PH-005-AC8"
      ]
    },
    {
      "id": "PH-005-T09",
      "goal": "Verify remote wallet browser journeys and device checklist",
      "depends_on": [
        "PH-005-T08"
      ],
      "deliverable": "Controlled SDK/transport boundary in isolated tests with no production bypass: no injected wallet, app-launch signal and return, real signature accepted by production SIWE, consent and independent RP; failures/retry/PKCE/state/continuation negatives. Retain existing discovery/security cases. Device checklist records OS, Chrome, MetaMask versions and actual outcomes; if no physical device is available explicitly leave that check pending.",
      "verification": "pnpm exec playwright test --config playwright.wallet.config.ts; focused transport tests; real Android Chrome/MetaMask checklist when a device is available",
      "acceptance": [
        "PH-005-AC6",
        "PH-005-AC7",
        "PH-005-AC8",
        "PH-005-AC9",
        "WG-001-A1",
        "WG-004-A1",
        "WG-008-A1"
      ]
    },
    {
      "id": "PH-005-T10",
      "goal": "Finalize amended phase regressions and evidence",
      "depends_on": [
        "PH-005-T09"
      ],
      "deliverable": "Reconciled ten-task sprint-evidence record, hashed logs/artifacts, connector dependency/source versions, support guide, updated handoff and proposed Coverage updates. Revalidate prior tasks affected by shared code changes. Keep WG-012 PARTIAL until complete acceptance and real-device evidence justify otherwise.",
      "verification": "Sequentially: pnpm exec playwright test --config playwright.wallet.config.ts; pnpm exec vitest run --config vitest.config.ts; pnpm exec vitest run --config app/\\(auth\\)/sign-in/vitest.config.ts; pnpm exec vitest run --config app/client-test/vitest.config.ts; pnpm run typecheck; git diff --check",
      "acceptance": [
        "PH-005-AC1",
        "PH-005-AC2",
        "PH-005-AC3",
        "PH-005-AC4",
        "PH-005-AC5",
        "PH-005-AC6",
        "PH-005-AC7",
        "PH-005-AC8",
        "PH-005-AC9",
        "WG-001-A1",
        "WG-004-A1",
        "WG-008-A1"
      ]
    }
  ],
  "amendment": {
    "reason": "User requested mobile Chrome -> MetaMask app -> original Chrome login as additional tasks in PH-005",
    "previous_plan": "docs/plans/progress/PH-005-original-six-task-plan.md",
    "previous_plan_sha256": "6326bdba0cd7c11f0c2726d1bdb47579111c5f59def811bfe7cdf7a8857ec139",
    "added_tasks": [
      "PH-005-T07",
      "PH-005-T08",
      "PH-005-T09",
      "PH-005-T10"
    ],
    "execution_approval": "pending explicit Yes for amended scope"
  }
}
```

## Requested amendment — mobile Chrome and MetaMask app

The user requested this scope as additional tasks in PH-005. Original T01–T06 scoped delivery remains preserved in `docs/plans/progress/PH-005-original-six-task-plan.md` and prior evidence. That completion does not cover this amendment. This amendment supersedes the original injected-only scope limit **only for the MetaMask mobile remote transport**. Generic multi-wallet remote transport, new identity/session/owner policies and production deployment remain outside scope. The original immutable source proposal and Product Contract are unchanged.

Use the currently supported MetaMask EVM connector, pinned after checking registry/source compatibility; do not default to the deprecated SDK. Official references: https://docs.metamask.io/metamask-connect/evm/ and https://docs.metamask.io/metamask-connect/supported-platforms/. New connector dependencies are within proposed scope; no dependency installation has occurred during planning. No new RPC/relay credential may be invented; use supported configurable endpoints, document any required configuration, and stop for unavailable required credentials. Never transmit a full OAuth authorization query as public wallet metadata.

The current public preview runs this checkout in development mode. Execution must avoid silently hot-deploying unreviewed changes: use an isolated checkout/worktree for implementation and tests, or stop with the concrete preview-exposure issue before editing served production files. Do not stop/reconfigure the public service or deploy without separate authorization.

Existing six-task evidence is historical. For the amended phase preserve the initial sprint baseline, keep exactly one current sprint-evidence block, retain past records as history and recompute hashes after any shared-code edits. The controller may mark the amended phase ready only when required executable acceptance passes. A physical-device check must be recorded as passed or pending; if its absence prevents establishing AC6/AC9, keep the amended phase incomplete rather than claiming real-phone success.

### Additional acceptance criteria

- **PH-005-AC6:** In mobile Chrome without an injected provider, an explicit MetaMask app option starts a supported relay/deeplink transport only after a user action. Return to the original browser preserves the authorization transaction. Moving the page into the MetaMask browser alone does not satisfy this criterion.
- **PH-005-AC7:** The remote provider participates in separate connection, address/domain review and fresh SIWE signing. Only the server-verified signature creates the WalletGate session in the original browser; a restored connector session alone never authenticates the user.
- **PH-005-AC8:** Rejected/blocked app launch, missing app, relay failures, timeout, cancellation, account/chain changes, background/foreground and stale async results have safe recovery. No untrusted return URL or signature/session in a navigation URL; original OAuth state, PKCE and signed continuation remain protected.
- **PH-005-AC9:** Automated browser/adapter tests cover the no-injected-provider remote path through real SIWE, consent and independent RP return plus negative cases; original injected paths and regressions pass. Real Android Chrome/MetaMask acceptance has an explicit checklist and truthful executed/pending status; emulation is never represented as device certification.

## Additional Tasks for PH-005

### PH-005-T07 — Integrate the supported MetaMask remote provider

- **Dependencies:** PH-005-T06.
- **Deliverable/scope:** Lazy client-only pinned MetaMask connector adapter with explicit mobile app choice, lifecycle cleanup, transport error mapping and documented network/RPC configuration. Preserve injected providers and separate connect/review/sign steps. Inspect exact installed package sources and lockfile before relying on API behavior.
- **Verification:** Focused connector and wallet-flow tests; package/lockfile inspection; typecheck.
- **Acceptance:** PH-005-AC6, PH-005-AC7, PH-005-AC8.

### PH-005-T08 — Deliver mobile app handoff and original-browser recovery

- **Dependencies:** PH-005-T07.
- **Deliverable/scope:** Production chooser and connection states for mobile Chrome -> MetaMask app -> original Chrome tab, retaining the OAuth request. Handle foreground/background, rejection, timeout, cancellation, stale results and provider changes without introducing session reuse or wallet-switch policy.
- **Verification:** Focused flow/adapter tests and mobile browser interaction checks.
- **Acceptance:** PH-005-AC6, PH-005-AC7, PH-005-AC8.

### PH-005-T09 — Verify remote wallet browser journeys and device checklist

- **Dependencies:** PH-005-T08.
- **Deliverable/scope:** Controlled SDK/transport boundary in isolated tests with no production bypass: no injected wallet, app-launch signal and return, real signature accepted by production SIWE, consent and independent RP; failures/retry/PKCE/state/continuation negatives. Retain existing discovery/security cases. Device checklist records OS, Chrome, MetaMask versions and actual outcomes; if no physical device is available explicitly leave that check pending.
- **Verification:** pnpm exec playwright test --config playwright.wallet.config.ts; focused transport tests; real Android Chrome/MetaMask checklist when a device is available.
- **Acceptance:** PH-005-AC6, PH-005-AC7, PH-005-AC8, PH-005-AC9, WG-001-A1, WG-004-A1, WG-008-A1.

### PH-005-T10 — Finalize amended phase regressions and evidence

- **Dependencies:** PH-005-T09.
- **Deliverable/scope:** Reconciled ten-task sprint-evidence record, hashed logs/artifacts, connector dependency/source versions, support guide, updated handoff and proposed Coverage updates. Revalidate prior tasks affected by shared code changes. Keep WG-012 PARTIAL until complete acceptance and real-device evidence justify otherwise.
- **Verification:** Sequentially: pnpm exec playwright test --config playwright.wallet.config.ts; pnpm exec vitest run --config vitest.config.ts; pnpm exec vitest run --config app/\(auth\)/sign-in/vitest.config.ts; pnpm exec vitest run --config app/client-test/vitest.config.ts; pnpm run typecheck; git diff --check.
- **Acceptance:** PH-005-AC1, PH-005-AC2, PH-005-AC3, PH-005-AC4, PH-005-AC5, PH-005-AC6, PH-005-AC7, PH-005-AC8, PH-005-AC9, WG-001-A1, WG-004-A1, WG-008-A1.

## Amendment approval gate

PROPOSAL_ONLY — NO IMPLEMENTATION AUTHORIZED for T07–T10. A new explicit Yes for amended PH-005 is required. Previous approvals applied to the original scope only.
