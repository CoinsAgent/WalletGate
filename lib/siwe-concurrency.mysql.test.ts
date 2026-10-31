import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";
import { MysqlDialect } from "kysely";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { createSiweMessage } from "viem/siwe";
import { testOrigin, testWallet } from "./auth-safety-fixture";

vi.mock("./email/send.ts", () => ({ sendDemoEmail: vi.fn() }));

let admin: Pool | undefined;
let observer: Pool | undefined;
let secondPool: Pool | undefined;
let first: typeof import("./auth").auth | undefined;
function independentAuth(auth: typeof import("./auth").auth, pool: Pool) {
  return betterAuth({
    ...auth.options,
    database: { dialect: new MysqlDialect(pool), type: "mysql", transaction: true },
  });
}
let second: ReturnType<typeof independentAuth> | undefined;
let databaseCreated = false;
const database = `walletgate_test_${randomUUID().replaceAll("-", "")}`;

beforeAll(async () => {
  const configuredURL = process.env.TEST_MYSQL_DATABASE_URL;
  if (!configuredURL) throw new Error("Set TEST_MYSQL_DATABASE_URL in .env.test (see README.md) before running test:mysql.");
  const url = new URL(configuredURL);
  // Require explicit test credentials; never fall back to MYSQL_DATABASE_URL.
  if (url.protocol !== "mysql:" || url.pathname !== "/walletgate_test") {
    throw new Error("TEST_MYSQL_DATABASE_URL must be a mysql:// URL with /walletgate_test as its database marker.");
  }
  url.pathname = "/";
  admin = createPool({ uri: url.href, timezone: "Z" });
  await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  databaseCreated = true;
  url.pathname = `/${database}`;
  observer = createPool({ uri: url.href, timezone: "Z" });
  vi.stubEnv("DEMO_SQLITE_PATH", "");
  vi.stubEnv("USE_MYSQL", "true");
  vi.stubEnv("MYSQL_DATABASE_URL", url.href);
  vi.stubEnv("BETTER_AUTH_URL", testOrigin);
  vi.stubEnv("BETTER_AUTH_SECRET", "mysql-disposable-test-secret-at-least-32-characters");
  vi.stubEnv("SCIM_DEMO_ENABLED", "false");
  vi.resetModules();
  ({ auth: first } = await import("./auth"));
  await (await getMigrations(first.options)).runMigrations();
  await first.$context;
  // Same complete production options, a distinct auth instance and MySQL pool.
  secondPool = createPool({ uri: url.href, timezone: "Z" });
  second = independentAuth(first, secondPool);
  await second.$context;
});

afterAll(async () => {
  try {
    if (first) {
      const driver = first.options.database.dialect.createDriver();
      await driver.init();
      await driver.destroy();
    }
  } finally {
    try {
      await secondPool?.end();
      await observer?.end();
    } finally {
      try {
        // Identifier is generated here, never taken from the configured URL.
        if (databaseCreated) await admin!.query(`DROP DATABASE \`${database}\``);
      } finally {
        await admin?.end();
        vi.unstubAllEnvs();
      }
    }
  }
});

async function count(table: "user" | "account" | "walletAddress" | "session" | "verification") {
  const [rows] = await observer!.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return Number(rows[0].n);
}

function post(auth: NonNullable<typeof first> | NonNullable<typeof second>, path: string, body: unknown) {
  return auth.handler(new Request(new URL(path, testOrigin), {
    method: "POST", headers: { Origin: testOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
}

it("independent auth instances share durable MySQL nonce consumption and create exactly one session", async () => {
  expect(first).not.toBe(second);
  expect(first!.options.database).not.toBe(second!.options.database);
  expect(first!.options.database.type).toBe("mysql");
  const nonceResponse = await post(first!, "/api/auth/siwe/nonce", {});
  expect(nonceResponse.status).toBe(200);
  const { nonce } = await nonceResponse.json();
  const message = createSiweMessage({
    address: testWallet.address, chainId: 1, domain: "localhost:3000", uri: testOrigin,
    version: "1", nonce, issuedAt: new Date(),
  });
  const body = { message, signature: await testWallet.signMessage({ message }) };
  const responses = await Promise.all([
    post(first!, "/api/auth/siwe/verify", body),
    post(second!, "/api/auth/siwe/verify", body),
  ]);
  const statuses = responses.map(response => response.status).sort();
  // Never log successful response bodies: they contain session tokens.
  console.log(JSON.stringify({ backend: "mysql", statuses, sessions: await count("session"), nonces: await count("verification") }));
  expect(statuses).toEqual([200, 401]);
  for (const table of ["user", "account", "walletAddress", "session"] as const) expect(await count(table)).toBe(1);
  expect(await count("verification")).toBe(0);

  const denied = responses.find(response => response.status === 401)!;
  expect(denied.headers.getSetCookie()).toEqual([]);
  const deniedBody = await denied.json();
  expect(deniedBody).toMatchObject({ code: "UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE" });
  expect(deniedBody).not.toHaveProperty("token");
  const allowed = responses.find(response => response.status === 200)!;
  const result = await allowed.json();
  expect(result.token).toBeTruthy();
  const cookie = allowed.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  expect(cookie).toContain("session_token");
  for (const auth of [first!, second!]) {
    expect((await auth.api.getSession({ headers: new Headers({ cookie }) }))?.user.id).toBe(result.user.id);
    const replay = await post(auth, "/api/auth/siwe/verify", body);
    expect(replay.status).toBe(401);
    expect(replay.headers.getSetCookie()).toEqual([]);
    expect(await replay.json()).not.toHaveProperty("token");
  }
  for (const table of ["user", "account", "walletAddress", "session"] as const) expect(await count(table)).toBe(1);
  expect(await count("verification")).toBe(0);
});
