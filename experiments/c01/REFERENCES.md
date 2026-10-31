# PH-001 integration and lifecycle evidence

This is research data, not production approval. Runtime records are in `evidence/`.
All package references below refer to installed published artifacts: Better Auth,
core, OAuth provider and Kysely adapter 1.7.11; viem 2.57.10. Exact artifact SHA-256
values are in `evidence/source-fingerprints.txt`. Paths start at `node_modules/`
inside the disposable snapshot. No upstream sources were modified.

## Integration map

| Point | Exact source | Observation |
| --- | --- | --- |
| Successful SIWE callback before persistence | `better-auth/dist/plugins/siwe/index.mjs:101`, user creation at 189, session creation at 240 | Request-scoped verified address can be captured before user/session hooks. Ordering also executed by baseline/subject tests. |
| Supported endpoint context | `@better-auth/core/dist/context/endpoint-context.mjs:26` | Exported context accessor identifies the current request; candidate keeps private verification state in a WeakMap. |
| User/session create hooks | `better-auth/dist/db/with-hooks.mjs:7` | Hook result merges into creation data; adapter call uses forceAllowId. Executed with address IDs. |
| Public subject | `@better-auth/oauth-provider/dist/utils-vIo_wPv5.mjs:815` | Public subject resolves from user ID. No ordinary address-sub callback. |
| ID Token and UserInfo | `@better-auth/oauth-provider/dist/introspect-B-5vOvYK.mjs:1399`, `:1239` | Reserved ID claims stripped; UserInfo sub comes from base identity. Executed controls confirm. |
| Provenance enforcement | `@better-auth/oauth-provider/dist/oauth-DXiqbRzK.d.mts:959` | Extension claim callbacks expose sessionId at issuance and validated JWT payload at UserInfo. Opaque introspection lacks callback sessionId; this candidate does not claim introspection enforcement. |
| Refresh | `@better-auth/oauth-provider/dist/introspect-B-5vOvYK.mjs:2111` | Refresh resolves stored grant and user without requiring live SIWE provenance. Executed stock-versus-strict deletion tests distinguish this. |

## Reference and ownership inventory

Executed SQLite schema has direct user references in session, account, passkey,
walletAddress, oauthClient, oauthRefreshToken, oauthAccessToken and oauthConsent.
Refresh/access records also refer to sessions/clients; consents refer to clients.
Verification records contain serialized authorization-code identity/session/query
data, so relational foreign-key inventory alone is insufficient. The lifecycle
fixture seeds a legacy user, wallet/account, sessions, two owned clients, consents,
tokens and a pending code. Both applications retain the same legacy owner; their
client IDs remain distinct. User primary-key mutation is rejected by foreign keys
and rolled back. A separate address-ID collision fails without creating a session.

The application enables additional plugins beyond the bounded runtime harness.
Source inspection identifies organization membership/invitation owner references,
two-factor user references, admin impersonatedBy, device authorization userId,
SSO user/organization references, and Stripe customer/subscription referenceId
and external metadata containing userId. Relevant installed sources include
`better-auth/dist/plugins/organization/schema.mjs:21`,
`better-auth/dist/plugins/two-factor/schema.mjs:21`,
`better-auth/dist/plugins/admin/schema.mjs:26`,
`better-auth/dist/plugins/device-authorization/schema.mjs:13`,
`@better-auth/sso/dist/index.mjs:206`, and
`@better-auth/stripe/dist/index.mjs:33,151,1606,1668`.
Multi-session cookies and bearer sessions also carry session handles. JWT keys
are independent signing material. Display/customSession/lastLoginMethod fields
are not proof of SIWE authentication. No full enabled-plugin migration or external
service integration was executed; optional SCIM configuration needs a separate
inventory if enabled for a later approved transition.

Provider ownership source: `@better-auth/oauth-provider/dist/authorize-CtCi8mAs.mjs:1820`
assigns either userId or clientReference; `:2375` checks management ownership.
`:1628` supports an initial access-token validator returning optional referenceId.
An accepted token can yield an unowned client if no reference is returned; a wallet
binding is deployment policy, not an upstream guarantee. `clientPrivileges`
also exposes administrative scope-management exceptions (public type at
`oauth-DXiqbRzK.d.mts:1511`). None of these mechanisms approves registration policy.
The harness deliberately retains open registration as a current-application control.
It does not implement wallet-authorized client management.

## Adapter classification

| Adapter | Evidence | Limits |
| --- | --- | --- |
| SQLite / NodeSqliteDialect | Executed persistent schema, hooks, identities, grants, concurrency and FK collision/rollback fixtures | Same adapter branch as `lib/auth.ts:41`; bounded plugin set and Node 22 runtime. No deployed-data claim. |
| MySQL | Source-inspected application branch `lib/auth.ts:52`; installed Kysely adapter `dist/index.mjs:271,326,356` | No runtime server. Insertion retrieval differs where RETURNING is unavailable. Canonical matching, collation and concurrent inserts unverified. |
| Turso / LibsqlDialect | Source-inspected application configuration `lib/auth.ts:67` | No remote database or credentials used. SQLite success does not establish remote transaction/concurrency behavior. |

## Transition alternatives and unresolved approvals

Creation-time address IDs are a supported experimental candidate for new EOA
records. They do not transition legacy users and do not prove an immediately
deployable architecture. Duplicate first login can return an error. Keeping random
IDs and overriding ordinary claims is a reproduced no-go for public subjects in
this version. Upstream patches, token rewriting and provider replacement are excluded.

A future approved transition would need a dry-run inventory of every direct and
serialized reference, canonical-address collision detection, independently trusted
wallet bindings, owner retention for every client, and explicit invalidation or
retention rules for sessions/codes/tokens/consents. Rollback would require a bijective
old/new identity mapping, reference-count reconciliation, ownership invariants,
restorable backups and a grant policy that does not revive invalidated credentials.
No migration, reset, transfer, co-management or exception has been performed.

Lowercase subjects, chain fixtures, five-minute validation window, strict session
invalidation, internal address IDs and owner representations remain experimental.
ERC-1271, browser WebAuthn enrollment, complete device-selection UI rendering,
remote adapters, independent OIDC conformance and deployed security are not
established. T07 now executes real multi-session API selection and a valid ES256
WebAuthn authentication with a seeded virtual credential; this establishes neither
browser enrollment nor SIWE origin for that session. See README.md for the final
T08 decision package and final evidence index.

## Additional exact-version boundary references

`better-auth/dist/plugins/multi-session/index.mjs:38,71,86` enumerates signed
multi-session cookies and resolves selection targets. The experimental before
hook validates current and target sessions independently, rejecting a mixed list
under the stated strict fixture. `@better-auth/passkey/dist/index.mjs:472,500`
verifies authentication and calls createSession; this path does not execute the
SIWE callback. Runtime negative tests confirm the newly authenticated passkey
session lacks SIWE markers and cannot authorize OIDC even though its user has a
verified wallet. Credential registration is seeded, not executed.

