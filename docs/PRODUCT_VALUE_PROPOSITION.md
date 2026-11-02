# WalletGate — Value Proposition

**Product tagline:** Your wallet. Your way in.

**Core Value Proposition**

WalletGate enables application developers to integrate Ethereum wallet-based sign-in through standard OpenID Connect, without building or maintaining wallet authentication in each application.

It provides a self-hosted identity provider with SIWE authentication, consistent wallet-address identities, and wallet-authorized management of OAuth applications.

Build wallet authentication once, integrate it through standard OIDC everywhere.

## Target Users

**Primary — Application Developers / Owners**

Developers who want to offer Ethereum wallet sign-in without implementing their own wallet authentication and identity provider infrastructure.

**Secondary — End Users**

People who want to use their Ethereum wallets to sign in to third-party applications through a consistent authentication experience.

**Operational — Self-Hosting Operators**

Teams that want to operate their own wallet-centric identity provider while preserving standard OAuth/OIDC interoperability.

## Core User Benefits

- **Simpler integration:** Applications use standard OAuth/OIDC instead of implementing wallet-specific authentication.
- **Wallet-centric identity:** A verified Ethereum address serves as the consistent public identity.
- **Application ownership:** Wallet owners can create and independently manage multiple OAuth clients.
- **Self-hosting:** Operators control the deployment and identity infrastructure.
- **Standards-based interoperability:** Applications remain independent of WalletGate's frontend libraries.

## Product Boundaries

WalletGate does not automatically prove ownership of unrelated email or service accounts. SIWE authentication does not authorize an application to access another application or its users.

Agent authentication, communication, and payments belong to the future vision, not the current product scope.