# WalletGate — Product Map

Updated: 2026-11-02. Authority: [Product Contract v1.1](PRODUCT_UNDERSTANDING_CONTRACT.md), approved requirements; implementation decisions in §5 remain unapproved.

This map is a proposed strategic interpretation of the Contract. Scenario/story IDs are newly established here and must remain stable. Story wording, acceptance proposals and priority recommendations have not received separate product-owner approval. Recording this map authorizes no implementation, policy decision, Sprint, deployment or change to the Contract.

## Strategic summary

WalletGate has source and historical delivery evidence for guided fresh SIWE login and standard OIDC integration with provisioned test clients. That is useful integration groundwork. It does not establish the complete promised outcome: an application receives an approved canonical wallet-address identity, and a verified wallet owner can securely register and manage applications.

Recommended next outcome: **PM-US-003 — applications receive a consistent verified wallet-address identity**. First resolve PM-D01 and PM-D02 with the product owner; clarify relevant wallet/chain boundaries in PM-D03. Do not silently choose an address format or token-subject policy. PM-US-004 session trust and PM-US-005 owner authorization remain critical dependencies for a complete product journey, even while narrower fresh-login acceptance is considered.

Existing deferred cases remain parked. No Sprint is planned or started by this document.

## Value proposition and users

**PM-VP-001 — primary value proposition (retained wording):** WalletGate enables application developers to integrate Ethereum wallet-based sign-in through standard OpenID Connect, without building or maintaining wallet authentication in each application.

Source: [existing value proposition](PRODUCT_VALUE_PROPOSITION.md:7). Its wording is preserved; no explicit approval record for that document was found in the inspected materials. The underlying self-hosted OIDC, SIWE, wallet identity and owner-management requirements are approved by Contract §§1–4.

| Audience | Problem | Benefit | Contract |
| --- | --- | --- | --- |
| Application developers / owners — primary | Each application otherwise needs wallet authentication and identity integration | Standard OIDC integration; distinct clients managed by a wallet owner | §§1–2, P3, P5–P6 |
| End users — secondary | Wallet login can be fragmented and unclear | A guided wallet-proof journey and consistent public wallet identity across applications | P1–P2, §4 |
| Self-hosting operators — operational | Need to control identity infrastructure and verify its deployment | Self-hosted IdP with explicit interoperability and security evidence | §§1, 5.6, P6–P7 |

Differentiators are the combination of self-hosting, SIWE-only human authentication, public address subjects and wallet-authorized multi-application management. These are product commitments, not claims that all are delivered. Public subjects intentionally permit cross-client linkability (Contract §2). Applications need no wagmi, viem or Next.js integration. Wallet proof establishes address control; service accounts require independent trusted binding. Agent authentication, communication and payments remain outside current scope.

## Application scenarios

All scenarios below are Contract-derived proposals, with success conditions expressing intended behavior rather than current delivery claims.

| Stable ID | Actor and trigger | User goal | Successful outcome | Contract | Stories |
| --- | --- | --- | --- | --- | --- |
| PM-SC-001 | Developer adds wallet sign-in to an application | Use standard OIDC instead of implementing wallet authentication | RP discovers IdP, requests authorization, verifies tokens and identifies the verified wallet user | §§1–2, P1, P6 | PM-US-001, PM-US-003 |
| PM-SC-002 | End user selects sign-in from an RP | Understand and complete wallet proof | Choose wallet, connect, review address/domain, sign valid SIWE, consent and return to the original application; recover from rejection | P2, P6, §4 | PM-US-002, PM-US-003 |
| PM-SC-003 | Returning user reaches authorization with an existing session | Continue under a trustworthy session policy | Only a session with acceptable SIWE provenance is reused; switching and revocation obey approved policy | P2, §5.4 | PM-US-004 |
| PM-SC-004 | Wallet owner adds or changes an application | Manage several independently configured integrations | Authorized owner creates distinct clients and manages only permitted applications; another owner cannot take control | §2, P3, P5 | PM-US-005 |
| PM-SC-005 | Service consumes wallet identity to authenticate an account | Authenticate the correctly bound service account | Trusted binding permits the intended account; unrelated accounts and unverified identity claims remain unasserted | P4, P6 | PM-US-006 |
| PM-SC-006 | Operator prepares a self-hosted instance for real application use | Establish deployed readiness | Deployment-specific security and independent RP checks pass with explicit wallet, device and persistence limits | §§1, 5.6, P6–P7 | PM-US-007 |

## User stories and end-to-end acceptance

Status meanings: **PARTIAL** = some source/historical evidence, full story acceptance absent; **BLOCKED — DECISION** = requires unapproved product policy; **EVIDENCE NEEDED** = intended outcome lacks sufficient current runtime evidence. None means accepted or production-ready. All acceptance below is proposed; Contract requirements remain binding independently of these proposals. WG IDs are preserved historical Coverage references, not a recreated Coverage ledger.

### PM-US-001 — Integrate through standard OIDC

- **Story:** As an application developer, I want standard OIDC endpoints so that I can add wallet sign-in without adopting the IdP frontend libraries.
- **Observable outcome:** An independent RP completes authorization and verifies the returned user identity.
- **End-to-end acceptance:** With an authorized client, discover endpoints; initiate code/PKCE authorization; complete fresh SIWE and consent; validate callback state, token signature, issuer, audience and nonce; call UserInfo and refresh where enabled. Reject wrong PKCE, code replay, unregistered redirects and denied consent. Include PM-US-003's address assertions before declaring the full wallet-identity integration complete.
- **Dependencies:** PM-US-002 and PM-US-003; PM-US-005 for owner self-service onboarding. Seeded test clients validate protocol behavior only.
- **Contract:** §§1–2, P1, P6–P7. Historical coverage: WG-001, WG-002, WG-011.
- **Status:** PARTIAL. Historical WG-001 is VERIFIED for its narrower local protocol scope; that does not complete this broader story. Evidence E03–E05.

### PM-US-002 — Complete guided fresh wallet login

- **Story:** As an end user, I want to choose a wallet, review the sign-in and approve SIWE so that I can knowingly enter my application.
- **Observable outcome:** Valid wallet proof reaches consent and the intended RP; rejection or an invalid attempt produces recovery without granting access.
- **End-to-end acceptance:** From RP sign-in, discover/select a wallet, connect, review address/domain, sign a fresh message, validate SIWE and return through consent. Verify denied connection/signature, changed account/chain, stale responses, nonce replay, bad origin and tampered continuation. Independent non-SIWE login and anonymous client creation stay denied. State exact tested wallet/device/database scope; do not infer real-device success from viewport tests.
- **Dependencies:** Approved wallet/chain scope PM-D03; PM-US-003 for the full identity outcome. Deferred cases below constrain SIWE and mobile completeness.
- **Contract:** P2, P5–P6, §4. Historical coverage: WG-003, WG-004, WG-008, WG-012.
- **Status:** PARTIAL. Guided injected/remote paths exist; historical automated acceptance is bounded. PH-003-B1, PH-003-B2 and PH-005-D01 remain DEFERRED. Evidence E01–E03, E05–E06.

### PM-US-003 — Receive a consistent verified wallet identity

- **Story:** As an RP developer, I want the verified wallet address as the public subject so that the same wallet is recognized consistently across applications.
- **Observable outcome:** ID Token and UserInfo identify the authenticated address in the approved canonical representation for every client, including after refresh.
- **End-to-end acceptance:** After approval of PM-D01–PM-D03 as applicable, run real SIWE → consent → RP token verification for two independently configured clients. Assert each subject equals the approved canonical verified address, agrees across ID Token/UserInfo/refresh and remains stable across approved address-input variations. A distinct verified wallet yields its distinct identity. Preserve client and machine-identity semantics; address equality alone cannot substitute for wallet proof.
- **Dependencies:** PM-D01, PM-D02, relevant PM-D03 scope; PM-US-002. Migration implications require evidence and approval if applicable. Session reuse requires PM-US-004.
- **Contract:** §2, P1–P2, P6–P7, §5.1–5.3. Historical coverage: WG-002, WG-007, WG-011.
- **Status:** BLOCKED — DECISION. Historical protocol tests assert subject consistency, which does not demonstrate address equality. Evidence E04–E05.

### PM-US-004 — Reuse only a trustworthy SIWE session

- **Story:** As a returning user, I want session reuse to respect my wallet authentication and lifecycle choices so that continued access reflects the identity I proved.
- **Observable outcome:** Reuse, rejection, switching and revocation follow an approved policy based on session provenance.
- **End-to-end acceptance:** Under approved PM-D04, create a valid SIWE session and revisit RP authorization; test accepted reuse, required fresh proof, legacy/non-SIWE or forged provenance, switching and revocation. Check authorization and relevant grant boundaries for the same policy. A linked wallet alone never qualifies a session.
- **Dependencies:** PM-D04; PM-D01–PM-D03 where identity/switching is involved; PM-US-002. No lifetime, revocation propagation rule or migration policy is chosen here.
- **Contract:** P2, §5.4. Historical coverage: WG-005.
- **Status:** BLOCKED — DECISION. New-login route enforcement explicitly excludes existing-session lifecycle; linked-wallet UI explicitly disclaims origin certification. Evidence E01–E02, E05.

### PM-US-005 — Manage multiple applications as a verified wallet owner

- **Story:** As a wallet owner, I want to register and manage separate applications so that each integration has independent credentials and configuration under my authority.
- **Observable outcome:** One authorized owner controls multiple distinct clients; unrelated wallets cannot read secrets or change their configuration.
- **End-to-end acceptance:** SIWE-authenticate owner A, create two distinct clients, independently configure permitted redirect URIs/scopes/policies and use both with an independent RP. Authenticate owner B and deny unauthorized management and credential access. Deny anonymous registration with no client persisted or credentials returned. If authenticated DCR or initial-access-token registration is enabled, demonstrate approved wallet-owner authorization; enabling those mechanisms is optional.
- **Dependencies:** PM-D05, PM-D04 and relevant PM-D01/PM-D03 identity decisions; PM-US-001–PM-US-003 for the complete registration-to-login journey. Co-management, transfers and admin exceptions require explicit policy if included.
- **Contract:** §2, P3, P5–P6, §5.5. Historical coverage: WG-006–WG-009.
- **Status:** BLOCKED — DECISION. Multiple provisioned RP fixtures and anonymous-registration denial establish neither wallet-owner registration nor ownership isolation. Evidence E03–E05.

### PM-US-006 — Authenticate only trusted service bindings

- **Story:** As a service developer, I want wallet identity claims to reflect proven facts so that only an account reliably bound to that wallet is authenticated.
- **Observable outcome:** A trusted service binding selects the intended account without asserting ownership of unrelated accounts or mailboxes.
- **End-to-end acceptance:** In an explicitly scoped service integration, establish the trusted binding independently, complete SIWE/OIDC and permit the bound account according to service authorization. Deny or leave unbound unrelated accounts; inspect issued claims for unverified email/ownership assertions. This story does not mandate email/chat integration or any account-recovery feature.
- **Dependencies:** PM-US-003, PM-US-004; service-specific trusted-binding policy and evidence before that integration is selected. No new binding mechanism is approved here.
- **Contract:** §2 service identity, P4, P6. Historical coverage: WG-010.
- **Status:** EVIDENCE NEEDED; any new binding-policy choice needs approval. Historical WG-010 remains PARTIAL; no inspected evidence proves an end-to-end external service binding. Evidence E05.

### PM-US-007 — Operate a verified self-hosted IdP

- **Story:** As an operator, I want deployment-specific acceptance evidence so that I can assess readiness for real applications and supported wallets.
- **Observable outcome:** An independent application completes the promised login journey on the target deployment with documented security controls and limits.
- **End-to-end acceptance:** Agree target deployment, supported persistence/wallet/device scope and controls; exercise actual HTTPS issuer/discovery, wallet proof, consent, tokens/UserInfo/refresh and applicable negative cases with an independent RP. Verify deployed trust configuration, nonce/session controls, owner isolation and honest claims. Record environment/version evidence and outstanding gaps. No local fixture result alone establishes this outcome.
- **Dependencies:** PM-D06 and relevant PM-D01–PM-D05; PM-US-001–PM-US-005 for the full product journey. Include PM-US-006 only when a service-binding integration is in scope. Deferred checks require explicit reactivation if required for the selected target.
- **Contract:** §§1, 4, 5.6, P2, P5–P7. Historical coverage: WG-013 with related identity/session/ownership requirements.
- **Status:** EVIDENCE NEEDED plus unresolved decision dependencies. No deployed readiness or real-phone compatibility is established here. Evidence E05–E06.

## Decision register

These IDs map the existing Contract §5 items; they introduce no approved answers. Product decisions require explicit approval; technical choices require current evidence and must preserve the Contract.

| Stable ID | Open question and type | Blocks | Next useful action |
| --- | --- | --- | --- |
| PM-D01 | §5.1 canonical address representation and database matching — unapproved product/identity decision | PM-US-003, dependent owner/session matching | Present representation alternatives and migration implications for approval |
| PM-D02 | §5.2 consistent ID Token/UserInfo/refresh implementation and other token subjects — mixed product/technical decision | PM-US-003 | Separate required human public-subject equality from optional token policies; validate supported extension approach after policy is clear |
| PM-D03 | §5.3 chain semantics, EOA/ERC-1271 support and future linking — unapproved support/policy decisions | Full PM-US-002/003, identity-dependent cases | Define the intended initial supported wallet/chain scope without implying linking or smart-wallet support |
| PM-D04 | §5.4 provenance, reuse, switching, revocation and legacy sessions — unapproved security/product policy | PM-US-004, safe owner authorization and full readiness | Define what qualifies a session and lifecycle behavior before implementation |
| PM-D05 | §5.5 owner reference, co-management, transfer and admin exceptions — unapproved authorization policy | PM-US-005 | Define owner authorization and explicit handling/scope of exceptional operations |
| PM-D06 | §5.6 deployed controls and independent interoperability — missing target/runtime evidence plus scope decisions | PM-US-007 | Specify target and acceptance environment; existing local RP evidence is reusable groundwork |

## Critical path and priority comparison

Priority is a recommendation, not an approved backlog order. Technical evidence gaps do not constitute permission to choose policy, and policy approval does not constitute passed acceptance.

| Candidate outcome | Value now | Constraint | Recommendation |
| --- | --- | --- | --- |
| PM-US-003 canonical address identity | Makes the central wallet identity promise usable by every RP | PM-D01/02 and relevant PM-D03 decisions remain open | Highest-value next outcome; resolve its decisions first |
| PM-US-004 trustworthy session reuse | Protects authorization after initial sign-in and enables sound owner sessions | PM-D04 remains open | Critical security dependency; clarify alongside identity, never skip for release |
| PM-US-005 owner-managed applications | Enables self-service onboarding instead of provisioned fixtures | Depends on session trust and PM-D05 | Follow with a complete owner-registration-to-RP-login slice once authorized |
| Further PM-US-002 mobile/SIWE edge acceptance | Reduces specific known gaps | Named cases are explicitly DEFERRED | Keep visible; do not reactivate from this recommendation or a general next request |
| PM-US-006 service binding | Enables a concrete service account integration | No selected integration or binding evidence | Lower priority than core IdP identity and ownership; retain P4 claim limits throughout |
| PM-US-007 deployed readiness | Establishes actual operator confidence | Core policy gaps and no target acceptance evidence | Define target early; claim readiness only after complete acceptance |

The dependency path for the full promise is: approved identity/session/wallet decisions → proven SIWE and address identity → wallet-authorized application management → owner registers clients → independent RPs complete login → deployed acceptance within an explicit supported scope. Session policy is not a prerequisite for every bounded fresh-login experiment, but it cannot be bypassed for the complete product outcome. Existing SIWE and device deferrals continue to limit any readiness claim.

**Next action:** product-owner decision review for PM-D01/PM-D02, relevant PM-D03 scope and PM-D04. Then use the separate sprint-planning workflow for one observable outcome and its normal explicit Yes/No execution gate. This map supplies no execution approval.

## Evidence and strategic memory

Evidence read on 2026-11-02; Git baseline `ce8ed01471bda192b87b7b15bb2c5fca8ebe9253`. No tests, builds, deployments or upstream-package verification ran for this map. Source reads establish implementation structure and test intent, not current passing behavior.

The current worktree deletes the historical Coverage, plans/progress, integration guides and deferred records. Those deletions were preserved. References E05/E06 identify immutable Git objects, readable with `git show ce8ed01471bda192b87b7b15bb2c5fca8ebe9253:<path>`; they do not imply the files remain on disk. Raw evidence cleaned by the historical controller is unavailable for fresh inspection. Existing WG/PH/case IDs and approval limits are retained without restoring or editing historical records.

| Evidence ID | Exact reference | What it establishes and limits |
| --- | --- | --- |
| E01 | [auth options](../lib/auth.ts:95), [entry policy](../lib/auth-entry-policy.ts:3) | New-login enforcement wired into auth; email/password disabled at `lib/auth.ts:115`. Existing-session lifecycle explicitly separate. No new execution claim. |
| E02 | [sign-in UI](../app/(auth)/sign-in/_components/sign-in.tsx:80) and `:107` | Guided wallet/remote-app guidance and address review; linked wallet does not certify session origin. Source inspection only. |
| E03 | [browser test scenarios](../tests/wallet-login.spec.ts:113), remote fixture path at `:224` | Fresh SIWE/consent/RP and controlled remote-path test definitions. Controlled providers/SDK substitution do not prove physical installed-app behavior. |
| E04 | [RP subject assertions](../lib/oidc-rp.integration.test.ts:30) | Tests compare ID Token/UserInfo/refresh subjects; these assertions alone do not require canonical address equality. |
| E05 | Baseline Git objects `docs/CONTRACT_COVERAGE.md:7`, `docs/PLANS.md:5`, `docs/plans/progress/PH-005.md:5645` | Historical WG states: protocol/new-login/anonymous-denial slices verified; address, session and owner policy gaps remain. PH-005 Handoff reports 28 controlled browser cases, 43 focused tests and 2 actual SDK Chromium launch checks. These are retained historical summaries, not rerun results. READY_FOR_REVIEW and commit subjects do not independently prove human acceptance. |
| E06 | Baseline Git objects `docs/deferred/README.md:7`, `docs/deferred/PH-003-B1.md`, `docs/deferred/PH-003-B2.md`, `docs/deferred/PH-005-D01.md:3` | Preserved deferrals: SIWE field-like statement parsing; SQLite independent-instance concurrency; physical Android Chrome/MetaMask acceptance. No new approval, reactivation or closure. |

No previously approved product map or stable scenario/story IDs were found in the working tree. Existing value-proposition wording and historical requirement/case IDs are preserved. Future accepted-sprint updates should append the accepted capability and evidence, change only affected story status, retain remaining blockers and revise the next-action recommendation. Require an explicit acceptance reference before marking a story accepted; never infer acceptance from READY_FOR_REVIEW, a commit or a passing subset.
