# PH-003 MySQL concurrency follow-up

The user explicitly requested updating PH-003's concurrency test against MySQL
after installing and configuring MySQL locally. This is a targeted test update,
not execution of the remaining sprint tasks or a sprint completion claim.

## Change

- Moved the independent-instance concurrency control from
  `lib/siwe-validation.test.ts` to `lib/siwe-concurrency.mysql.test.ts`.
- The new suite loads full production auth options, creates a second auth
  instance with a distinct MySQL pool, and shares a disposable MySQL database.
  It retains `[200,401]`, exactly one identity/session and zero nonce records;
  additionally checks session reuse and subsequent replay rejection on both
  instances, including no cookies/tokens on rejected requests.
- `vitest.mysql.config.ts` and `pnpm test:mysql` run this integration suite
  separately. The default suite retains SQLite grammar and sequential-replay
  coverage. Neither missing MySQL credentials nor setup failures count as a pass.
- A separate local test account is limited to `walletgate_test_*` databases.
  Credentials are in ignored `.env.test` (0600). Every run creates and drops its
  own random database; no development database fallback, truncation, or data
  migration is used. No application authentication code or dependency changed
  during this follow-up.

## Executed verification

Working directory: `/home/ubuntu/WalletGate`. MySQL server 8.4.11;
Better Auth and Kysely adapter 1.7.11; mysql2 3.24.2; Kysely 0.28.17;
Vitest 5.0.0. Connections use UTC timestamp conversion.

1. Initial sandbox integration attempt failed to connect with `EPERM` on
   localhost:3306; it is not a test pass. Approved outside-sandbox execution
   succeeded. After adding the explicit no-token assertion, the final command
   `pnpm --config.verify-deps-before-run=false test:mysql --reporter=verbose`
   exited **0**, **1/1 passed**. Output:
   `{"backend":"mysql","statuses":[200,401],"sessions":1,"nonces":0}`.
   Teardown succeeded, including dropping the disposable database.
2. `pnpm --config.verify-deps-before-run=false exec vitest run
   lib/siwe-validation.test.ts lib/auth-safety.test.ts --reporter=verbose`
   exited **1**, **79 passed / 1 failed**. The sole failure is the existing B1
   `accepts statementField` case: expected 200, received 401. The removed
   SQLite concurrency control is now executed in the MySQL suite rather than
   counted as skipped or passing SQLite coverage.
3. `pnpm --config.verify-deps-before-run=false typecheck` passed.
   Scoped `git diff --check` passed for changed tracked configuration,
   documentation and test files.

Fresh database initialization can emit Better Auth schema diagnostics before
fixture migrations finish. The final successful login, persisted-state checks
and usable-session assertions run after migration; diagnostics are retained in
the log.

## Durable results

- [MySQL concurrency result](mysql-concurrency-followup.log), SHA-256
  `9a8ebcff1527f16fc7662b044c8a22fa1593414c41d8ea6445e3f4022ab13c72`.
- [SQLite validation and auth regressions](mysql-followup-regressions.log), SHA-256
  `b304d725cd33ce406f79109904193a7dce3ecb44fc6084fdc73eb6868c2d75fc`.

## Limits and sprint status

B2's expected concurrency behavior is now demonstrated for MySQL in two auth
instances in one Node process. This does not repair or certify SQLite, prove
multi-process behavior, or migrate all PH-003 acceptance to MySQL. The historical
SQLite failure and prior evidence remain historical records. B1 remains open;
T04/T05 acceptance is unfinished. PH-003 remains **BLOCKED**; the plan, Coverage,
Product Contract and prior machine evidence were not rewritten.
