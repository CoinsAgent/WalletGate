import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { productionFixture, testOrigin } from "./auth-safety-fixture";

vi.mock("./email/send.ts", () => ({ sendDemoEmail: vi.fn() }));
let fixture: Awaited<ReturnType<typeof productionFixture>>;
beforeEach(async () => { vi.resetModules(); fixture = await productionFixture(); });
afterEach(async () => { await fixture?.close(); });

const documents = ["openid-configuration", "oauth-authorization-server"] as const;
async function handler(document: typeof documents[number]) {
  return document === "openid-configuration"
    ? (await import("../app/.well-known/openid-configuration/route")).GET
    : (await import("../app/.well-known/oauth-authorization-server/route")).GET;
}

it.each(documents)("publishes anonymous %s metadata and reachable configured endpoints", async document => {
  const get: (request: Request) => Promise<Response> = await handler(document);
  const response = await get(new Request(`${testOrigin}/.well-known/${document}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(response.headers.get("cache-control")).toBe("public, max-age=15, stale-while-revalidate=15, stale-if-error=86400");
  const metadata = await response.json();
  expect(metadata.issuer).toBe(testOrigin);
  for (const key of ["authorization_endpoint", "token_endpoint", "userinfo_endpoint", "jwks_uri"]) {
    expect(new URL(metadata[key]).origin).toBe(testOrigin);
    expect(new URL(metadata[key]).pathname).toMatch(/^\/api\/auth\//);
  }
  expect(metadata.response_types_supported).toContain("code");
  expect(metadata.code_challenge_methods_supported).toContain("S256");
  const jwks = await fixture.auth.handler(fixture.request(metadata.jwks_uri));
  expect(jwks.status).toBe(200);
  expect((await jwks.json()).keys.length).toBeGreaterThan(0);
});

it.each(documents)("does not derive the %s issuer from untrusted request headers", async document => {
  const get: (request: Request) => Promise<Response> = await handler(document);
  const response = await get(new Request(`http://attacker.example/.well-known/${document}`, {
    headers: { host: "attacker.example", "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https", forwarded: "host=attacker.example;proto=https" },
  }));
  expect(response.status).toBe(200);
  const metadata = await response.json();
  expect(metadata.issuer).toBe(testOrigin);
  expect(new URL(metadata.authorization_endpoint).origin).toBe(testOrigin);
  expect(response.headers.getSetCookie()).toEqual([]);
});
