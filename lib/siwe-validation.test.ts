import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createSiweMessage } from "viem/siwe";
import { privateKeyToAccount } from "viem/accounts";
import { validSIWEMessage } from "./siwe-validation";
import { productionFixture, testOrigin, testWallet } from "./auth-safety-fixture";
vi.mock("./email/send.ts", () => ({ sendDemoEmail: vi.fn() }));
let f: Awaited<ReturnType<typeof productionFixture>>;
const now = new Date("2026-10-31T12:00:00Z");
beforeEach(async () => {
  vi.resetModules(); // auth.ts captures its database at module initialization.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  f = await productionFixture();
});
afterEach(async () => { await f?.close(); vi.useRealTimers(); });
async function message() {
  const response = await f.post("/api/auth/siwe/nonce", {});
  expect(response.status).toBe(200);
  const { nonce } = await response.json();
  return createSiweMessage({ address: testWallet.address, chainId: 1, domain: "localhost:3000", uri: testOrigin, version: "1", nonce, issuedAt: now });
}
async function signed(message: string, wallet = testWallet) {
  return { message, signature: await wallet.signMessage({ message }) };
}
async function rejected(body: {message: string; signature: string}) {
  const before = ["user", "account", "walletAddress", "session"].map(f.count);
  const response = await f.post("/api/auth/siwe/verify", body);
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(500);
  expect(response.headers.getSetCookie()).toEqual([]);
  const result = await response.json();
  expect(result).not.toHaveProperty("token");
  expect(["user", "account", "walletAddress", "session"].map(f.count)).toEqual(before);
  expect(await f.auth.api.getSession({ headers: response.headers })).toBeNull();
}
const mutations: Record<string, (m: string) => string> = {
  wrongDomain: m => m.replace("localhost:3000 wants", "evil.example wants"),
  domainPath: m => m.replace("localhost:3000 wants", "localhost:3000/path wants"),
  wrongURI: m => m.replace(`URI: ${testOrigin}`, "URI: https://evil.example"),
  wrongVersion: m => m.replace("Version: 1", "Version: 2"),
  missingAddress: m => m.replace(testWallet.address, ""),
  addressWhitespace: m => m.replace(testWallet.address, ` ${testWallet.address}`),
  missingURI: m => m.replace(/^URI: .*\n/m, ""),
  missingVersion: m => m.replace(/^Version: .*\n/m, ""),
  missingChain: m => m.replace(/^Chain ID: .*\n/m, ""),
  invalidChain: m => m.replace("Chain ID: 1", "Chain ID: 1e0"),
  missingNonce: m => m.replace(/^Nonce: .*\n/m, ""),
  invalidNonce: m => m.replace(/Nonce: .*/, "Nonce: !!!"),
  missingIssuedAt: m => m.replace(/\nIssued At: .*/, ""),
  invalidIssuedAt: m => m.replace(/Issued At: .*/, "Issued At: not-a-date"),
  dateOnly: m => m.replace(/Issued At: .*/, "Issued At: 2026-10-31"),
  impossibleDate: m => m.replace(/Issued At: .*/, "Issued At: 2026-02-30T12:00:00Z"),
  invalidExpiry: m => `${m}\nExpiration Time: not-a-date`,
  invalidNotBefore: m => `${m}\nNot Before: not-a-date`,
  expired: m => `${m}\nExpiration Time: 2026-10-31T11:59:59Z`,
  expiresNow: m => `${m}\nExpiration Time: 2026-10-31T12:00:00Z`,
  notYetValid: m => `${m}\nNot Before: 2026-10-31T12:00:01Z`,
  duplicateVersion: m => `${m}\nVersion: 1`,
  duplicateIssuedAt: m => `${m}\nIssued At: 2026-10-31T12:00:00Z`,
  reversedFields: m => m.replace("Version: 1\nChain ID: 1", "Chain ID: 1\nVersion: 1"),
  trailingJunk: m => `${m}\ntrailing-junk`,
  trailingNewline: m => `${m}\n`,
  invalidRequestId: m => `${m}\nRequest ID: bad request`,
  badPercentRequestId: m => `${m}\nRequest ID: %xz`,
  invalidResource: m => `${m}\nResources:\n- not a URI`,
  statementControl: m => m.replace("\n\n\nURI:", "\n\nbad\tstatement\n\nURI:"),
};
it.each(Object.entries(mutations))("rejects %s without identity or access state (WG-003-A1)", async (_, transform) => {
  await rejected(await signed(transform(await message())));
});
it("rejects an invalid signature and permits a fresh challenge retry", async () => {
  const m = await message();
  const other = privateKeyToAccount(`0x${"2".padStart(64, "0")}`);
  await rejected(await signed(m, other));
  await rejected(await signed(m)); // upstream burns invalid-attempt nonce
  const response = await f.post("/api/auth/siwe/verify", await signed(await message()));
  expect(response.status).toBe(200);
  expect(f.count("session")).toBe(1);
});
const valid: Record<string, (m: string) => string> = {
  minimal: m => m,
  optionalStatement: m => m.replace("\n\n\nURI:", "\n\nSign in: https://localhost:3000/?a=b&c=d\n\nURI:"),
  explicitScheme: m => `http://${m}`,
  resourcesAndRequest: m => `${m}\nRequest ID: a%20b:@!$&'()*+,;=\nResources:\n- ipfs://example/path\n- urn:example:resource`,
  emptyOptionals: m => `${m}\nRequest ID: \nResources:`,
  offsetFraction: m => m.replace(/Issued At: .*/, "Issued At: 2026-10-31T13:00:00.123456+01:00"),
  oldIssuedNoExpiry: m => m.replace(/Issued At: .*/, "Issued At: 2020-01-01T00:00:00Z"),
  notBeforeNow: m => `${m}\nExpiration Time: 2026-10-31T13:00:00Z\nNot Before: 2026-10-31T12:00:00Z`,
  existingChainBehavior: m => m.replace("Chain ID: 1", "Chain ID: 137"),
};
it.each(Object.entries(valid))("accepts %s without a new freshness/chain policy", async (_, transform) => {
  const m = transform(await message());
  expect(validSIWEMessage(m, testWallet.address, testOrigin)).toBe(true);
  const response = await f.post("/api/auth/siwe/verify", await signed(m));
  if (response.status !== 200) console.log(JSON.stringify({ validLocalGrammar: true, response: await response.clone().json() }));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.token).toBeTruthy();
  expect(f.count("session")).toBe(1);
  const cookie = response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  expect((await f.auth.api.getSession({ headers: new Headers({ cookie }) }))?.user.id).toBe(body.user.id);
});

it.each(["handler", "next", "server"])("single-use sequential replay at %s boundary", async boundary => {
  const body = await signed(await message());
  const next = await import("../app/api/auth/[...all]/route");
  const submit = async () => {
    const request = f.request("/api/auth/siwe/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (boundary === "next") return next.POST(request);
    if (boundary === "server") return f.auth.api.verifySiweMessage({ body, request, asResponse: true });
    return f.auth.handler(request);
  };
  const first = await submit();
  expect(first.status).toBe(200);
  const replay = await submit();
  expect(replay.status).toBe(401);
  expect(replay.headers.getSetCookie()).toEqual([]);
  expect(await replay.json()).not.toHaveProperty("token");
  expect(f.count("session")).toBe(1);
  expect(f.count("verification")).toBe(0);
});
// Independent-instance concurrency is covered against MySQL in
// siwe-concurrency.mysql.test.ts. Sequential replay remains covered above.
it.each(["missing", "expired"])("rejects %s stored challenge and permits fresh retry", async kind => {
  const body = await signed(await message());
  if (kind === "missing") f.db.prepare('DELETE FROM verification').run();
  else f.db.prepare('UPDATE verification SET expiresAt = ?').run(now.getTime() - 1);
  await rejected(body);
  expect((await f.post("/api/auth/siwe/verify", await signed(await message()))).status).toBe(200);
  expect(f.count("session")).toBe(1);
});
it.each(["next", "server"])("rejects invalid signatures without side effects at %s boundary", async boundary => {
  const m = await message();
  const body = { message: m, signature: "0xdeadbeef" };
  const request = f.request("/api/auth/siwe/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const next = await import("../app/api/auth/[...all]/route");
  const response = boundary === "next" ? await next.POST(request) : await f.auth.api.verifySiweMessage({ body, request, asResponse: true });
  expect(response.status).toBe(401);
  expect(response.headers.getSetCookie()).toEqual([]);
  expect(await response.json()).not.toHaveProperty("token");
  for (const table of ["user", "account", "walletAddress", "session"]) expect(f.count(table)).toBe(0);
});
it("preserves strict endpoint schema and prevents unsigned identity overrides", async () => {
  const body = await signed(await message());
  const response = await f.post("/api/auth/siwe/verify", { ...body, address: privateKeyToAccount(`0x${"2".padStart(64, "0")}`).address });
  expect(response.status).toBe(400);
  expect(f.count("session")).toBe(0);
});
