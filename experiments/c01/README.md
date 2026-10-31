# PH-001 architecture decision package

Research verdict: **supported candidate for new EOA identities on the tested
SQLite stack**, with explicit lifecycle and deployment limits. This is ready for
human review of the research; no production architecture or policy is approved.

## Candidate and reproduced alternatives

Better Auth/core/OAuth provider 1.7.11 can issue consistent wallet-address public
subjects without package patches. After successful SIWE validation, private
request-scoped state is read by supported user/session database hooks. For new
users the user creation hook assigns the candidate lowercase address ID; provider
subject resolution then uses that ID for signed initial and refreshed ID Tokens
and UserInfo. Two EOA wallets and two clients per wallet are tested, including
casing, a second chain fixture and interleaved requests
(`harness.ts:31`, `:55`, `:107`; `subject.test.ts:4`).

Ordinary custom ID Token/UserInfo `sub` claims cannot replace the stock random-ID
subject in this version. The baseline reproduces that no-go while retaining a
nonreserved control claim (`baseline.test.ts:7`). This does not establish that
every possible random-ID architecture is impossible.

Server-only session fields record SIWE origin and time only in the validated
request context. Authoritative database reads enforce a disposable strict rule
at authorization, consent, continuation, selection, code/refresh issuance and
UserInfo. Both cookie-cache modes, real device-session switching, forged targets,
bearer-session use, password-linked users, valid passkey authentication of a
wallet user, impersonation and alternate creation are exercised
(`harness.ts:32`, `:68`, `:72`, `:101`, `:113`; `provenance.test.ts`).
The passkey test seeds enrollment and verifies a real ES256 authentication
challenge/signature; browser registration and hardware behavior are untested.

Recommendation: retain this candidate for human architecture review. Do not
apply it to the application until canonicalization, identity persistence,
existing-data treatment, session policies and owner authorization are approved.
A new-record prototype is insufficient to transition existing installations.

## Executed boundary and compatibility matrix

| Surface | Observation | Limit or consequence |
| --- | --- | --- |
| Initial ID Token / UserInfo | Signature, issuer, audience, nonce and subjects checked; two wallets, four clients | Test-local issuer and keys; no external conformance certification |
| Refresh | Signed refreshed ID Token and refreshed UserInfo keep address subject | Refresh does not intrinsically require live SIWE session; strict extension supplies that experimental rule |
| Casing / chain fixtures | Lowercase repeat and chain 10 reuse the candidate identity; 2 users / 3 wallet rows | Lowercase and chain semantics remain unapproved; only EOA fixtures |
| Concurrent first login | Two unique users, no cross-wallet leakage; duplicate same-wallet request can fail | Availability limitation, not retry/migration policy approval |
| Session persistence/cache | Trusted fields persist; invalidated stored markers denied with cache on/off | No distributed cache, secondary storage or production load proof |
| Account selection | Valid switch retains wallet identity; mixed untrusted list and invalid target denied | Denying entire mixed list is experimental; no UI filtering/UX approval |
| Code / consent / bearer / grants | Invalidated provenance denied at tested continuation, exchange, refresh and UserInfo boundaries | Opaque introspection callback lacks sessionId; this candidate claims no universal introspection enforcement |
| Expiry / renewal / revocation | Expired sessions denied; adapter expiry renewal retains original SIWE time; stock deletion allows refresh/UserInfo while strict extensions deny | Renewal fixture uses server adapter update, not elapsed-time browser renewal; no freshness/revocation policy selected |
| Other authentication origins | Password, valid passkey, impersonation and adapter-created sessions acquire no SIWE marker; OIDC denied | Harness retains these routes solely as negative controls; production SIWE-only route closure is not implemented |
| Legacy users / owners | Existing wallet user keeps random ID; client owners, consent, token and serialized code references retain legacy ID | Creation hook does not migrate legacy users; positive candidate applies to new identities only |
| Collision / mutation | Unbound address-ID collision fails closed; SQLite FK blocks primary-key mutation, rolled back | No migration or ownership transfer performed |
| Machine credentials | Distinct client ID, access token only; no user ID Token/refresh; UserInfo denied | Machine scope assigned server-side in fixture; no production machine policy approval |
| Truthful claims | Placeholder email is not reported verified | No independent mailbox or service-account binding |
| SQLite | Persistent NodeSqliteDialect, schema creation/disposal/recreation, hooks and FK tests executed | Application-equivalent adapter branch; bounded plugins; harness does not configure application's 5-second contention timeout |
| MySQL / Turso | Application and installed adapter sources inspected | Runtime, collation, transaction and concurrency behavior unverified |

See [REFERENCES.md](REFERENCES.md) for exact published source paths/lines,
reference inventory, owner/initial-access-token/admin analysis, and proposed
dry-run/rollback invariants. Every production decision in Contract §5 remains
unapproved; [CHARTER.md](CHARTER.md) is the decision ledger. No unresolved decision
must be adopted to review the completed bounded research.

## Security verification and limits

`security.test.ts` covers wrong signer/domain/URI, missing or malformed required
fields (including nonce), version, invalid dates, expiry/not-before, future
issued-at, duplicate/trailing fields, replay, concurrent nonce consumption and
nonce burning after an invalid signature. Invalid cases create no user/session.
The unchanged application callback accepts a signed Version 2 control; the
bounded strict callback rejects it. This is a reproduced application gap.

The strict callback is a fixture profile (chains 1/10, EOA, five-minute issued-at
window and generated-message round trip). It is not an exhaustive ERC-4361
validator: complete grammar/optional-field coverage, ERC-1271, wallet linking,
remote adapters, all enabled application plugins, browser UX, external RP
interoperability and deployed controls are excluded. It is not a deployable
replacement for approved validation and lifecycle policies.

## Reproduce safely

Run from an isolated source snapshot, with no project `.env` or production data.
All signing keys and secrets in the harness are public disposable test values.
Use recorded HEAD `af891282a47b756c4e868f3197bef35c08e77d69`, Node 22.22.1,
pnpm 11.1.1 and the frozen lockfile. Dependency retrieval and the unchanged OAuth
regression listener require an environment that permits those operations.

From the repository containing this experiment directory:

```sh
repo="$PWD"
snapshot=$(mktemp -d /tmp/walletgate-ph001-review-XXXXXX)
git archive af891282a47b756c4e868f3197bef35c08e77d69 | tar -x -C "$snapshot"
mkdir -p "$snapshot/experiments"
cp -R "$repo/experiments/c01" "$snapshot/experiments/c01"
cd "$snapshot"
pnpm install --frozen-lockfile --registry https://registry.npmjs.org
node --version
pnpm --version
pnpm list better-auth @better-auth/core @better-auth/oauth-provider viem --depth 0
pnpm exec tsc --noEmit --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --esModuleInterop experiments/c01/*.ts
pnpm exec vitest run --config experiments/c01/vitest.config.ts --reporter=verbose
pnpm exec vitest run --config "app/(auth)/sign-in/vitest.config.ts"
pnpm exec vitest run --config app/client-test/vitest.config.ts
pnpm exec vitest run --config experiments/c01/vitest.config.ts --reporter=verbose
```

Each setup creates a new `/tmp/ph001-sqlite-*` database, runs schema setup, and
closes/removes that directory in test cleanup. The baseline explicitly proves
independent-connection durability, disposal and recreation. Final rerun storage
inventories verify no new leaked directories. No persistent application DB is
used. `getTestInstance` regressions use helper defaults; they do not substitute
for persistent harness results. Original application and dependencies are not
modified by this candidate.

## Evidence and acceptance coverage

Logs are evidence, not approvals. Earlier failure logs remain historical; final
logs below supersede their outcomes. Source fingerprints identify the exact
installed artifacts rather than relying only on upstream version names.

| Criterion / tasks | Durable evidence and verdict |
| --- | --- |
| AC1 / T01–T03, T07 | CHARTER.md, REFERENCES.md, source-fingerprints.txt, environment-final.log; baseline included in combined-final.log and clean-rerun.log; exact-version persistent baseline reproduced |
| AC2 / T03–T04, T07 | baseline.test.ts, subject.test.ts, combined-final.log, clean-rerun.log; new-record address-ID candidate and ordinary-claim no-go executed |
| AC3 / T03, T05, T07 | provenance.test.ts, provenance-final.log, combined-final.log, clean-rerun.log; persisted origin and relevant tested authorization/grant denials reproduced |
| AC4 / T01, T04–T06, T08 | CHARTER.md, REFERENCES.md, lifecycle.test.ts and final suite logs; ownership/lifecycle consequences executed, adapters and excluded surfaces explicitly classified |
| AC5 / T02, T07–T08 | final-runs.json, typecheck-final.log, combined-final.log, clean-rerun.log: exit 0; 36 experiment tests per final run, 18 SIWE regressions in regression-siwe-final.log; 35 OAuth regressions passed in parent observation below |
| AC6 / T01, T06, T08 | This package, decision ledger, source map and scope-final.log; supported candidate qualified by explicit exclusions and production approval gates |

Paths in that table are relative to `evidence/` for logs and fingerprints.
The OAuth suite initially failed on loopback `listen EPERM` (regression-oauth.log).
The parent controller subsequently observed the unchanged command pass with exit
0, 2 files / 35 tests, duration 10.62s (tool session 85637), and recorded that result
in docs/plans/progress/PH-001.md. This worker relies on that explicit run record;
it did not rerun the listener or fabricate a replacement success log. Source
comparison confirms the same 106 tracked application/source/lock/report files
match HEAD in the disposable and original checkouts. The final source manifest
identifies the experiment inputs tested by this worker.
