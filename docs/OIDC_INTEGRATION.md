# Integrating an application with WalletGate

Start with the operator-provided issuer, for example `https://walletgate.example`.
WalletGate publishes these public discovery documents:

- `/.well-known/openid-configuration`
- `/.well-known/oauth-authorization-server`

Use the advertised authorization, token, JWKS and UserInfo endpoints rather than
constructing their paths. Discovery uses the configured issuer; request Host or
forwarded headers do not select a different issuer. The routes delegate JSON and
cache headers to `@better-auth/oauth-provider`'s supported metadata helpers.

Your application needs an already configured OAuth client ID and a registered
redirect URI. Anonymous client registration is disabled. The test suite seeds
disposable client records as fixture setup; it does not demonstrate wallet-owner
registration or authorize a new registration mechanism.

## Public client with authorization code and PKCE

[The independent TypeScript example](../examples/oidc-rp.ts) uses Node's HTTP and
crypto APIs and `jose` (tested with 6.2.3). It imports no WalletGate application
helpers, Better Auth client SDK, wagmi, viem or Next.js. Other standard OIDC
libraries and programming languages can implement the same protocol.

```ts
import { StandardRP } from "./oidc-rp";

const rp = await StandardRP.discover("https://walletgate.example");
const { transaction, url } = rp.start(clientId, registeredRedirectURI);
// Store transaction in the user's server-side browser session, then redirect
// the browser to url. WalletGate handles wallet authentication and consent.

// In your registered callback handler, load and delete that same transaction
// from the browser session. Reject a missing or previously consumed transaction.
const code = rp.callback(transaction, callbackURL);
const tokens = await rp.exchange(transaction, code);
if (!tokens.id_token) throw new Error("Missing ID Token");
const identity = await rp.verifyIDToken(
  tokens.id_token, clientId, transaction.nonce,
);
const userInfo = await rp.userInfo(tokens.access_token);
if (userInfo.sub !== identity.sub) throw new Error("Subject mismatch");
```

The example generates fresh state, nonce and an S256 PKCE verifier. It checks
callback destination, state and issuer before code exchange, then verifies ID
Token signature, issuer, audience, required claims, expiration and nonce using
discovered public keys. Token exchange is form encoded; UserInfo uses a bearer
token without IdP session cookies. Keep tokens and PKCE verifiers server-side;
do not log them. Use HTTPS outside local loopback development.

When `offline_access` is granted and a refresh token is returned:

```ts
const refreshed = await rp.refresh(clientId, tokens.refresh_token!);
if (!refreshed.id_token) throw new Error("Missing refreshed ID Token");
const nextIdentity = await rp.verifyIDToken(
  refreshed.id_token, clientId, transaction.nonce, true,
);
if (nextIdentity.sub !== identity.sub) throw new Error("Subject changed");
const nextUserInfo = await rp.userInfo(refreshed.access_token);
if (nextUserInfo.sub !== identity.sub) throw new Error("UserInfo subject changed");
// Store a replacement refresh token if returned, using your application's
// secure token storage and concurrency policy.
```

A refreshed ID Token may omit nonce; when present it must match the original
transaction. This example covers a public client with no client secret. A
confidential client must use its configured token-endpoint authentication.

## Reproduce the local interoperability checks

With the repository's locked dependencies installed:

```sh
pnpm exec vitest run lib/oidc-discovery.test.ts --reporter=verbose
pnpm exec vitest run lib/oidc-rp.integration.test.ts --reporter=verbose
```

The HTTP integration requires permission to bind loopback ports. It copies an
explicit set of application source files into a temporary directory, links
installed dependencies, creates and migrates a disposable SQLite database,
seeds two distinct clients, and starts the actual Next.js application with the
development server and webpack. It does not copy `.env`, development databases
or an existing `.next` directory. It stops the server and removes the directory
after the run. Missing local-server permission or failed startup is a failure,
not a skipped interoperability pass.

The RP discovers the issuer over HTTP. A separate IdP-side driver signs fresh
SIWE challenges and traverses the real login/consent endpoints; the RP itself
does not implement wallet signing. Acceptance covers both clients, refresh and
subject consistency, wrong PKCE, reused codes, unregistered redirects, denied
consent, callback state mismatch, token signature/issuer/audience/nonce rejection,
and continued anonymous-registration denial. Route tests additionally cover
untrusted Host and forwarded headers.

These are reproducible local interoperability checks against complete application
authentication configuration, not deployed security or independent third-party
OIDC certification. Current subject behavior is preserved: `sub = address`
remains the separate unresolved WG-002 requirement. PH-003's deferred statement
parsing and SQLite concurrency limitations remain recorded under WG-003.
