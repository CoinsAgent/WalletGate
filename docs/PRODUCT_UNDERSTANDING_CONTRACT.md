# Product Understanding Contract

**Version:** 1.1  
**Status:** Approved product requirements; implementation details identified below remain open  
**Project:** Wallet-Centric Identity Provider  
**Repository:** `CoinsAgent/better-auth`

## 1. Product vision

Build a self-hosted, Ethereum-wallet-centric OpenID Connect Identity Provider for third-party applications. Ethereum wallet addresses are the primary external identities for human users and application owners. The long-term vision includes human-to-human, human-to-agent, and agent-to-agent identity and authorization, but those capabilities are **outside the current implementation scope**.

The IdP authenticates wallet users with Sign-In with Ethereum (SIWE, ERC-4361) and exposes standard OAuth 2.0 / OIDC flows. A third-party relying party should not need to implement wallet connection or adopt Next.js, wagmi, or viem.

## 2. Identity model

**End user:** A verified Ethereum wallet address is the authoritative external user identity. In this product, the public OIDC `sub` **MUST** equal the authenticated Ethereum address in an approved, deterministic canonical representation. The same address **MUST** yield the same public `sub` for every OIDC client of this IdP. This deliberately adopts a linkable public-subject model; pairwise pseudonymous subjects conflict with this requirement unless the contract is changed.

**Application owner:** An owner is identified by a SIWE-verified wallet address. One wallet **MAY** create and manage multiple third-party applications, with appropriate permissions.

**OAuth client:** Every application **MUST** receive its own unique OAuth `client_id` and independent client configuration. Client ID is **not** the owner's wallet address and is **not** the authenticated end user's OIDC `sub`. Application ownership is not a grant to access its end users' accounts or data.

**Service identity:** Chat, email, and other applications **MAY** use a wallet address as their account identifier. Verified control of a wallet can authenticate a service account **only if that service account is reliably bound to the address**. SIWE does not itself prove ownership of unrelated mailboxes, accounts, or off-chain identities. Placeholder email values are not proof of mailbox ownership.

## 3. Binding principles

### P1 — Wallet-centric external identity

The Ethereum address is the authoritative external human identity identifier. OIDC `sub` must be the verified address; using an internal random user ID as the public `sub` does not satisfy this product contract, even if that is valid OIDC in general.

### P2 — SIWE-only end-user authentication

All new end-user authentication **MUST** prove wallet control through validated SIWE: trusted domain/origin, nonce replay protection, signed-message verification and validity bounds. Username, email, password, passkey, and external SSO **MUST NOT** operate as independent end-user login methods. Existing accepted SIWE-authenticated sessions **MAY** be reused under a defined session policy; mere presence of a linked wallet is insufficient evidence of the session's authentication origin.

This is a rule for **end-user authentication**, not an assertion that all OAuth grant types or non-human client authentication must use a user SIWE signature. In particular, OAuth `client_credentials` is a separate application-authentication role.

### P3 — One wallet, multiple OAuth clients

One SIWE-verified wallet owner **MAY** manage several applications. Each application has its own unique `client_id` and independent credentials, scopes, redirect URIs, and policy. Owner, client, and end-user identities remain distinct even when the same wallet participates in multiple roles.

### P4 — Wallet-anchored service identity

A trusted binding can associate a wallet identity with a service account. Verifying the bound wallet permits that service to authenticate the bound account subject to its own authorization policy. The IdP **MUST NOT** claim to have verified an unrelated existing chat/email/service account merely by verifying SIWE.

### P5 — Authenticated and authorized client registration

Unauthenticated OAuth client registration **MUST** be disabled. Application registration and management **MUST** be authorized for a verified wallet owner. Authenticated Dynamic Client Registration **MAY** be supported when this authorization boundary is enforced; non-session initial-access-token registration **MUST** also be tied to approved wallet-owner authorization if enabled.

### P6 — Standards interoperability

Maintain standard OAuth 2.0, OpenID Connect, and ERC-4361 protocol behavior. Third-party clients must be able to integrate through standard OAuth/OIDC endpoints without using the IdP frontend libraries. Do not conflate user `sub`, OAuth `client_id`, and machine-token subject semantics. Do not publish unverified identity claims (for example, `email_verified=true` for a placeholder email).

### P7 — Minimal intrusion and maintainability

Reuse supported Better Auth functionality where possible. Prefer external plugins, hooks, and supported customization over modifying upstream library internals. Any incompatible framework behavior is a **gap to investigate**, not permission to weaken this contract.

## 4. Current stack and objective

- Next.js: IdP application and authentication UI.
- wagmi: intended wallet discovery/connection frontend.
- viem: Ethereum message/signature utilities.
- Better Auth: authentication sessions and OAuth/OIDC provider infrastructure.

The current objective is a third-party-facing IdP with wallet-first, step-by-step browser/mobile login UX, SIWE-only end-user authentication, `sub = address`, wallet-authorized application management, and interoperable OAuth/OIDC consent and authorization flows. Existing demonstration capabilities do not imply production readiness.

Agent authentication, communication, and payments are future capabilities, not current acceptance criteria.

## 5. Open product and technical decisions

These remain **unapproved**, and must not be silently resolved by Codex:

1. Canonical Ethereum address representation for OIDC `sub` and database matching.
2. How wallet-address `sub` is implemented consistently in ID Token and UserInfo, including refreshing tokens; whether other token types also use an address subject.
3. Chain-ID semantics, EOA versus ERC-1271 smart-contract wallets, and future wallet-linking policy.
4. Trustworthy SIWE session provenance, wallet switching, session revocation, and old non-SIWE session policy.
5. Client owner reference representation, co-management, transfer of ownership, and administrative exceptions.
6. Actual deployed security controls and independent OIDC interoperability checks.

## 6. Codex operating contract

Before proposing changes to identity or authentication, read this document, inspect relevant code, separate verified observations from assumptions, and identify conflicts with these binding principles. Report unsupported framework capabilities honestly. Do not modify the approved identity model to match a demo or framework default without explicit product-owner approval.
