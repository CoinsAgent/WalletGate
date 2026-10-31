# Contract Coverage

Stable IDs survive Contract revisions. Split requirements receive new IDs; superseded IDs remain RETIRED with successor links. Reconcile changed wording and invalidate affected verification before updating the recorded Contract hash. VERIFIED means actual product acceptance evidence, never prototype success or human policy approval.

Statuses: MISSING, PARTIAL, IMPLEMENTED (acceptance pending), VERIFIED, BLOCKED, RETIRED. The JSON below is authoritative; the table is generated from it.

| ID | Contract | Requirement | Status |
| --- | --- | --- | --- |
| WG-001 | §1, P6 | Self-hosted standard OAuth/OIDC IdP usable without frontend libraries | PARTIAL |
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
      "status": "PARTIAL",
      "acceptance": [
        "WG-001-A1"
      ],
      "acceptance_description": "Exercise discovery, authorization, signed tokens and UserInfo with an independent standard RP.",
      "code": [
        "app/api/auth/[...all]/route.ts",
        "lib/auth.ts"
      ],
      "tests": [
        "app/client-test/oauth-flow.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md"
      ],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
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
        "lib/siwe.ts"
      ],
      "tests": [
        "experiments/c01/security.test.ts",
        "app/(auth)/sign-in/siwe-login.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md"
      ],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
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
        "lib/wallet-login.ts",
        "lib/siwe.ts",
        "lib/oauth-login-client.ts",
        "lib/auth-client.ts"
      ],
      "tests": [
        "lib/auth-safety.test.ts",
        "lib/auth.test.ts",
        "lib/wallet-login.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-001.md",
        "docs/plans/progress/PH-002.md"
      ],
      "reason": "Production non-SIWE entry denials, valid SIWE, wallet-only login, real signed-query continuations (default, prompt=login, max_age=0), tamper rejection and retry pass. Parent full regression 115/115, CLI 30/30, targeted 62/62, SIWE 18/18 and final typecheck pass. This verifies new independent login only; session provenance/lifecycle and full mobile discovery remain outside scope."
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
        "lib/auth.ts"
      ],
      "tests": [
        "lib/auth-safety.test.ts"
      ],
      "evidence": [
        "docs/plans/progress/PH-002.md"
      ],
      "reason": "Anonymous creation denied across handler and Next HTTP boundary with missing/invalid credentials and forged identity fields, no new client state/credentials; server-only admin creation denied without authentication. Configured-client code/token/UserInfo and UI/CLI regressions pass; parent full suite 115/115 and CLI 30/30. Wallet-owner authorization for authenticated management is not certified."
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
        "app/(auth)/sign-in/_components/sign-in.tsx"
      ],
      "tests": [],
      "evidence": [],
      "reason": "Static baseline and bounded PH-001 research only; no product acceptance claimed. Contract §5 decisions remain unapproved."
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
