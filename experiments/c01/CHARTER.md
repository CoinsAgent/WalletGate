# PH-001 experiment charter and decision ledger

Authority: AGENTS.md and Product Understanding Contract v1.1. This suite is
disposable research, with no authority to select production policies. Sprint
authorization covers PH-001 only. No application files or installed package
sources may be patched. No real credentials, RPC, email, Stripe, or SSO calls.

## Experimental assumptions (not production approvals)

| Contract §5 item | Disposable fixture / evidence required | Consequences and approval boundary |
| --- | --- | --- |
| 1: address representation | Compare lowercase and checksum forms of two locally generated EOA addresses; use lowercase as one candidate, never a production default. Test repeat login and mixed casing. | Subject stability, account matching and uniqueness must agree. Production representation remains unapproved. |
| 2: subject implementation | Control uses stock random IDs; candidate uses supported validated request context plus user creation hooks, only after successful SIWE verification. Inspect ID Token, UserInfo, refresh, and machine grants separately. | Address internal IDs and migration are not approved. Never substitute unsigned body fields or rewrite JWT responses. Failure is a research result, not authority to weaken public address subjects. |
| 3: chain and wallet support | Chain 1 EOA fixtures, a different chain fixture for collision analysis; no RPC. ERC-1271 and wallet linking are explicit exclusions from executed support claims. | Chain-independent public subject and chain-specific account keys need comparison. Smart-contract support and linking require later decisions. |
| 4: provenance/lifecycle | Candidate server-only session fields with input disabled; SIWE, password-linked, legacy and forged fixtures. Compare strict invalidation with retention of issued grants, using disposable users only. Exercise switching, renewal, expiry, revocation, cache and authorization boundaries. | No production freshness period, switching, revocation or legacy-grant rule is selected. A wallet link never establishes current-session provenance. |
| 5: owner references | Seed a legacy random-ID user, two clients and related grants; inventory references and collisions. Compare internal-user keys with independently server-derived wallet owner references. | No transfer, co-management, admin exception or initial-access-token policy. Document dry-run/rollback invariants only. |
| 6: deployed controls/interoperability | Verify signatures via fixture JWKS and issuer/audience/nonce/sub; run local negative and regression suites. | No deployment, conformance certification or claim about actual deployed controls. Independent interoperability is excluded and remains unknown. |

## Scope and stop checklist

- [x] Every §5 item has experimental evidence requirements or an explicit exclusion.
- [x] Canonicalization, internal IDs, chain and session fixtures are candidate assumptions only.
- [x] Legacy users, sessions, grants, ownership and registration modes remain explicit research topics.
- [x] Placeholder email is not verified mailbox ownership; service-account binding is excluded.
- [x] No production decision is required to begin these disposable experiments.
- [x] Stop for unavailable dependency/runtime/persistence prerequisites; do not upgrade the locked stack.
- [x] Stop if proceeding requires production credentials, data mutation, upstream patches, or policy approval.

## Planned evidence sequence

T02 exact-version SQLite harness → T03 stock SIWE/OIDC control and hook map →
T04 address identity → T05 provenance → T06 lifecycle/owner references →
T07 negative tests, baseline comparison and clean rerun → T08 decision package.
Executed observations and command outcomes belong in docs/plans/progress/PH-001.md.

## Resumed boundary fixtures

T07 extends the existing strict session rule to real device-session selection:
validate each signed target against authoritative persisted provenance, and deny
an entire mixed trusted/untrusted list. This is a disposable denial fixture, not
an approved production account-selection UX. Exercise both cookie-cache modes,
a real switch between two SIWE wallets, an invalidated target, forged target and
bearer-session access. Full browser rendering and WebAuthn enrollment remain excluded. A seeded virtual
P-256 credential exercises real challenge/signature validation at the passkey
authentication handler; it must not create SIWE provenance. The alternate-creation
seam is also tested separately and source-inspected.
