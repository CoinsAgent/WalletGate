import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getMigrations } from "better-auth/db/migration";
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";

export const testOrigin = "http://localhost:3000";
export const testWallet = privateKeyToAccount(`0x${"1".padStart(64, "0")}`);

/** Production configuration, persistent disposable SQLite, no reduced plugin list. */
export async function productionFixture() {
  const directory = mkdtempSync(join(tmpdir(), "ph002-"));
  process.env.DEMO_SQLITE_PATH = join(directory, "auth.sqlite");
  process.env.BETTER_AUTH_URL = testOrigin;
  process.env.BETTER_AUTH_SECRET = "ph002-disposable-test-secret-at-least-32-characters";
  process.env.SCIM_DEMO_ENABLED = "false";
  const { auth } = await import("./auth");
  const migration = await getMigrations(auth.options);
  await migration.runMigrations();
  const ctx = await auth.$context;
  const db = new DatabaseSync(process.env.DEMO_SQLITE_PATH);
  const request = (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("Origin", testOrigin);
    return new Request(new URL(path, testOrigin), { ...init, headers });
  };
  const post = (path: string, body: unknown, headers?: HeadersInit) => auth.handler(request(path, {
    method: "POST", headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers)) }, body: JSON.stringify(body),
  }));
  const count = (table: string) => Number((db.prepare(`SELECT count(*) AS n FROM "${table}"`).get() as { n: number }).n);
  const login = async () => {
    const nonce = await (await post("/api/auth/siwe/nonce", {})).json();
    const message = createSiweMessage({ address: testWallet.address, chainId: 1, domain: "localhost:3000", uri: testOrigin, version: "1", nonce: nonce.nonce });
    const response = await post("/api/auth/siwe/verify", { message, signature: await testWallet.signMessage({ message }) });
    return { response, cookie: response.headers.getSetCookie().map(c => c.split(";")[0]).join("; "), body: await response.json() };
  };
  return { auth, ctx, db, request, post, count, login, async close() {
    db.close();
    // Migration and production auth share the configured DatabaseSync handle.
    const driver = auth.options.database.dialect.createDriver();
    await driver.init();
    await driver.destroy();
    rmSync(directory, { recursive: true, force: true });
  } };
}
