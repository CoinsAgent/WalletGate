# Contract Coverage

Stable IDs survive Contract revisions. Split requirements receive new IDs; superseded IDs remain RETIRED with successor links. Reconcile changed wording and invalidate affected verification before updating the recorded Contract hash. VERIFIED means actual product acceptance evidence, never prototype success or human policy approval.

Statuses: MISSING, PARTIAL, IMPLEMENTED (acceptance pending), VERIFIED, BLOCKED, RETIRED. The JSON below is authoritative; the table is generated from it.

| ID | Contract | Requirement | Status |
| --- | --- | --- | --- |
| WG-001 | §1, P6 | Self-hosted standard OAuth/OIDC IdP usable without frontend libraries | VERIFIED |
| WG-002 | §2, P1 | Public sub equals the verified canonical address across all clients and identity surfaces | BLOCKED |
| WG-003 | P2 | Every new end-user login validates SIWE domain, signature, validity and single-use nonce | PARTIAL |
| WG-004 | P2 | Non-SIWE routes cannot independently authenticate end users | VERIFIED |
| WG-005 | P2, §5.4 | Session reuse requires trustworthy SIWE origin and approved lifecycle policy | BLOCKED |
| WG-006 | §2, P3 | One verified wallet owner manages multiple independently configured clients | PARTIAL |
| WG-007 | §2, P3, P6 | Owner, end-user and OAuth client/machine identities have distinct authorization roles | PARTIAL |
| WG-008 | P5 | Unauthenticated client registration is disabled | VERIFIED |
| WG-009 | P5, §5.5 | Registration and client management require verified wallet-owner authorization | BLOCKED |
| WG-010 | P4, P6 | SIWE never asserts unrelated service-account ownership or unverified claims | PARTIAL |
| WG-011 | P7 | Use supported Better Auth extension points and preserve protocol semantics | PARTIAL |
| WG-012 | §4 | Wallet-first step-by-step browser and mobile login UX | PARTIAL |
| WG-013 | §5.6 | Deployed security controls and independent OIDC interoperability are verified | BLOCKED |

```json contract-coverage
{
  "contract_version": "1.1",
  "contract_sha256": "e7105be4084e2620494274feeb6faaa7b8265e71420fe18051b4f1ea9eacba71",
  "requirements": [
    {
      "id": "WG-001",
      "contract": "§1, P6",
      "requirement": "Self-hosted standard OAuth/OIDC IdP usable without frontend libraries",
      "status": "VERIFIED",
      "acceptance": [
        "WG-001-A1"
      ],
      "acceptance_description": "Exercise discovery, authorization, signed tokens and UserInfo with an independent standard RP.",
      "code": [
        "lib/auth.ts",
        "app/.well-known/openid-configuration/route.ts",
        "app/api/auth/[...all]/route.ts"
      ],
      "tests": [
        "lib/oidc-discovery.test.ts",
        "lib/oidc-rp.integration.test.ts",
        "tests/wallet-login.spec.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md",
        "docs/plans/progress/PH-004.md",
        "docs/plans/progress/PH-005.md"
      ],
      "reason": "Revalidated independent standard RP using actual Next HTTP: final browser 24/24 covers both seeded clients, code/PKCE, state, JWKS signed-token verification and bearer UserInfo; root 201/201 includes discovery/RP refresh and protocol negatives. Desktop and mobile use fresh SIWE. Seeded clients do not authorize owner registration; deployment and wallet-address subjects remain separate gaps."
    },
    {
      "id": "WG-002",
      "contract": "§2, P1",
      "requirement": "Public sub equals the verified canonical address across all clients and identity surfaces",
      "status": "BLOCKED",
      "acceptance": [
        "WG-002-A1"
      ],
      "acceptance_description": "Approved canonical representation; product ID Token, UserInfo and refreshed subjects agree across wallets and clients.",
      "code": [
        "lib/auth.ts"
      ],
      "tests": [
        "experiments/c01/subject.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md"
      ],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
    },
    {
      "id": "WG-003",
      "contract": "P2",
      "requirement": "Every new end-user login validates SIWE domain, signature, validity and single-use nonce",
      "status": "PARTIAL",
      "acceptance": [
        "WG-003-A1"
      ],
      "acceptance_description": "Product rejects invalid signatures, wrong domain/URI, malformed fields, expired messages and sequential/concurrent replay.",
      "code": [
        "lib/siwe.ts",
        "lib/siwe-validation.ts"
      ],
      "tests": [
        "lib/siwe-validation.test.ts",
        "lib/siwe-concurrency.mysql.test.ts",
        "lib/auth-safety.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md",
        "docs/plans/progress/PH-003.md"
      ],
      "reason": "PH-003 amended scoped acceptance passes: strict production callback validation, SQLite sequential replay and disposable MySQL independent-instance concurrency [200,401], one session, zero nonces. User explicitly deferred the Better Auth 1.7.11 statement/Expiration Time parsing edge case. SQLite concurrency remains unresolved; Turso, other adapters, multiple processes and exhaustive standards edge cases are not certified. Full WG-003-A1 is not fulfilled; preserve PARTIAL."
    },
    {
      "id": "WG-004",
      "contract": "P2",
      "requirement": "Non-SIWE routes cannot independently authenticate end users",
      "status": "VERIFIED",
      "acceptance": [
        "WG-004-A1"
      ],
      "acceptance_description": "Product password, passkey, SSO and alternate routes cannot establish end-user access; valid SIWE remains usable.",
      "code": [
        "lib/auth.ts",
        "lib/auth-entry-policy.ts",
        "lib/siwe.ts",
        "app/(auth)/sign-in/_components/sign-in.tsx"
      ],
      "tests": [
        "lib/auth-safety.test.ts",
        "lib/wallet-login.test.ts",
        "lib/oidc-rp.integration.test.ts",
        "tests/wallet-login.spec.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md",
        "docs/plans/progress/PH-002.md",
        "docs/plans/progress/PH-003.md",
        "docs/plans/progress/PH-004.md",
        "docs/plans/progress/PH-005.md"
      ],
      "reason": "Final root 201/201, sign-in 18/18, client 30/30 and browser 24/24 pass: production independent non-SIWE entry points remain denied, fresh SIWE works and signed OAuth continuation remains bound. Tampered continuation creates no session. Session provenance/reuse/lifecycle remains outside this requirement slice."
    },
    {
      "id": "WG-005",
      "contract": "P2, §5.4",
      "requirement": "Session reuse requires trustworthy SIWE origin and approved lifecycle policy",
      "status": "BLOCKED",
      "acceptance": [
        "WG-005-A1"
      ],
      "acceptance_description": "Approved lifecycle policy; product denies forged, legacy and non-SIWE sessions at authorization and grant boundaries, including switching and revocation.",
      "code": [
        "lib/auth.ts",
        "app/(auth)/oauth/select-account/page.tsx"
      ],
      "tests": [
        "experiments/c01/provenance.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md"
      ],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
    },
    {
      "id": "WG-006",
      "contract": "§2, P3",
      "requirement": "One verified wallet owner manages multiple independently configured clients",
      "status": "PARTIAL",
      "acceptance": [
        "WG-006-A1"
      ],
      "acceptance_description": "One owner creates two distinct client IDs with independent credentials, redirect URIs, scopes and policies.",
      "code": [
        "lib/auth.ts"
      ],
      "tests": [
        "experiments/c01/lifecycle.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md"
      ],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
    },
    {
      "id": "WG-007",
      "contract": "§2, P3, P6",
      "requirement": "Owner, end-user and OAuth client/machine identities have distinct authorization roles",
      "status": "PARTIAL",
      "acceptance": [
        "WG-007-A1"
      ],
      "acceptance_description": "Product owner access grants no end-user data access; client credentials preserve machine semantics and distinct client IDs.",
      "code": [
        "lib/auth.ts"
      ],
      "tests": [
        "experiments/c01/lifecycle.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md"
      ],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
    },
    {
      "id": "WG-008",
      "contract": "P5",
      "requirement": "Unauthenticated client registration is disabled",
      "status": "VERIFIED",
      "acceptance": [
        "WG-008-A1"
      ],
      "acceptance_description": "Every exposed unauthenticated client creation endpoint denies registration.",
      "code": [
        "lib/auth.ts",
        "lib/auth-entry-policy.ts"
      ],
      "tests": [
        "lib/auth-safety.test.ts",
        "lib/oidc-rp.integration.test.ts",
        "tests/wallet-login.spec.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-002.md",
        "docs/plans/progress/PH-003.md",
        "docs/plans/progress/PH-004.md",
        "docs/plans/progress/PH-005.md"
      ],
      "reason": "Final root 201/201 and browser 24/24 revalidate anonymous registration denial on exposed routes with unchanged stored client counts and no returned credentials; disabled/nonexistent admin creation route stays 404. Existing handler/server API denials remain passing; seeded fixture clients are not owner-policy approval."
    },
    {
      "id": "WG-009",
      "contract": "P5, §5.5",
      "requirement": "Registration and client management require verified wallet-owner authorization",
      "status": "BLOCKED",
      "acceptance": [
        "WG-009-A1"
      ],
      "acceptance_description": "Approved owner policy; product denies non-SIWE and cross-owner creation/read/update/delete; enabled initial-access-token routes require wallet-authorized binding.",
      "code": [
        "lib/auth.ts"
      ],
      "tests": [],
      "evidence": [],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
    },
    {
      "id": "WG-010",
      "contract": "P4, P6",
      "requirement": "SIWE never asserts unrelated service-account ownership or unverified claims",
      "status": "PARTIAL",
      "acceptance": [
        "WG-010-A1"
      ],
      "acceptance_description": "Product emits truthful email_verified and service identity claims; unrelated accounts require independently trusted binding.",
      "code": [
        "lib/auth.ts"
      ],
      "tests": [
        "experiments/c01/baseline.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md"
      ],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
    },
    {
      "id": "WG-011",
      "contract": "P7",
      "requirement": "Use supported Better Auth extension points and preserve protocol semantics",
      "status": "PARTIAL",
      "acceptance": [
        "WG-011-A1"
      ],
      "acceptance_description": "Production extension integration has exact-version supported API evidence, no upstream patch, and relevant protocol regressions pass.",
      "code": [
        "lib/auth.ts",
        "lib/siwe.ts"
      ],
      "tests": [
        "experiments/c01/baseline.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md"
      ],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
    },
    {
      "id": "WG-012",
      "contract": "§4",
      "requirement": "Wallet-first step-by-step browser and mobile login UX",
      "status": "PARTIAL",
      "acceptance": [
        "WG-012-A1"
      ],
      "acceptance_description": "Browser/mobile acceptance covers wallet discovery, connection, SIWE, consent, errors and return to a standard RP.",
      "code": [
        "lib/wallet-discovery.ts",
        "lib/wallet-login-flow.ts",
        "lib/wallet-login.ts",
        "lib/auth-client.ts",
        "app/(auth)/sign-in/siwe-login.ts",
        "app/(auth)/sign-in/_components/sign-in.tsx",
        "app/(auth)/oauth/consent/consent-buttons.tsx",
        "app/(auth)/oauth/consent/page.tsx",
        "lib/metamask-remote.ts"
      ],
      "tests": [
        "tests/wallet-login.spec.ts",
        "lib/wallet-discovery.test.ts",
        "lib/wallet-login-flow.test.ts",
        "lib/wallet-login.test.ts",
        "lib/metamask-remote.test.ts",
        "tests/metamask-launch.spec.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-005.md"
      ],
      "reason": "PH-005 automated delivery validated: 28/28 desktop/mobile controlled-wallet browser cases through real SIWE/consent/independent RP, 206/206 broad regressions, 18/18 sign-in, 30/30 client, 43/43 remote/flow checks, 2/2 actual pinned SDK Chromium launch checks and typecheck. Physical Android/Chrome/MetaMask acceptance is explicitly DEFERRED as PH-005-D01 because no device is available. App opening/approval/original-tab return and device-specific recoveries remain unverified; phase review readiness does not complete WG-012-A1 or certify mobile compatibility."
    },
    {
      "id": "WG-013",
      "contract": "§5.6",
      "requirement": "Deployed security controls and independent OIDC interoperability are verified",
      "status": "BLOCKED",
      "acceptance": [
        "WG-013-A1"
      ],
      "acceptance_description": "Approved deployed control profile and independent OIDC RP/security verification evidence; deployment requires separate authorization.",
      "code": [
        "lib/auth.ts"
      ],
      "tests": [],
      "evidence": [],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
    }
  ]
}
```
