import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { generateKeyPair, SignJWT } from "jose";
import { StandardRP, type Transaction } from "../examples/oidc-rp";
import { nextHTTPFixture } from "./oidc-http-fixture";

vi.mock("./email/send.ts", () => ({ sendDemoEmail: vi.fn() }));
let fixture: Awaited<ReturnType<typeof nextHTTPFixture>>;
let rp: StandardRP;
beforeAll(async () => {
  fixture = await nextHTTPFixture(vi);
  rp = await StandardRP.discover(fixture.issuer);
  console.log(JSON.stringify({ actualNextHTTP: true, disposableSQLite: true, clients: fixture.clients.length }));
}, 180_000);
afterAll(async () => { await fixture?.close(); }, 15_000);

async function expectDeniedExchange(transaction: Transaction, code: string, verifier = transaction.verifier) {
  const response = await fetch(rp.metadata.token_endpoint, {
    method: "POST", redirect: "error", credentials: "omit",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: transaction.clientId,
      redirect_uri: transaction.redirectURI, code, code_verifier: verifier }),
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe("invalid_grant");
  for (const key of ["access_token", "id_token", "refresh_token"]) expect(body).not.toHaveProperty(key);
  expect(response.headers.getSetCookie()).toEqual([]);
}

it.each([0, 1])("completes independent client %i discovery, PKCE, SIWE, signed tokens, UserInfo and refresh", async index => {
  const { transaction, url } = rp.start(fixture.clients[index], fixture.redirectURI);
  const callback = await fixture.authorize(url);
  const code = rp.callback(transaction, callback);
  const tokens = await rp.exchange(transaction, code);
  expect(tokens.id_token).toBeTruthy(); expect(tokens.refresh_token).toBeTruthy();
  const initial = await rp.verifyIDToken(tokens.id_token!, transaction.clientId, transaction.nonce);
  expect((await rp.userInfo(tokens.access_token)).sub).toBe(initial.sub);
  const refreshed = await rp.refresh(transaction.clientId, tokens.refresh_token!);
  expect(refreshed.id_token).toBeTruthy();
  const next = await rp.verifyIDToken(refreshed.id_token!, transaction.clientId, transaction.nonce, true);
  expect(next.sub).toBe(initial.sub);
  expect((await rp.userInfo(refreshed.access_token)).sub).toBe(initial.sub);
  await expectDeniedExchange(transaction, code);
}, 60_000);

it("rejects a wrong PKCE verifier without returning tokens", async () => {
  const { transaction, url } = rp.start(fixture.clients[0], fixture.redirectURI);
  const code = rp.callback(transaction, await fixture.authorize(url));
  await expectDeniedExchange(transaction, code, "x".repeat(43));
}, 60_000);

it("rejects an unregistered redirect URI without following it or issuing a code", async () => {
  const { url } = rp.start(fixture.clients[0], "https://unregistered.example/callback");
  const response = await fetch(url, { redirect: "manual", headers: { Accept: "application/json" } });
  const body = await response.json();
  // With Accept: application/json the provider represents a browser redirect
  // as HTTP 200 JSON. The error must stay on the IdP, never the untrusted URI.
  expect(response.status).toBe(200);
  expect(body.redirect).toBe(true);
  const errorURL = new URL(body.url);
  expect(errorURL.origin).toBe(fixture.issuer);
  expect(errorURL.pathname).toBe("/api/auth/error");
  expect(errorURL.searchParams.get("error")).toBe("invalid_redirect");
  expect(errorURL.searchParams.has("code")).toBe(false);
  expect(response.headers.get("location")).toBeNull();
  expect(body).not.toHaveProperty("code");
  expect(body).not.toHaveProperty("access_token");
}, 30_000);

it("returns access_denied for denied consent and rejects callback state tampering", async () => {
  const { transaction, url } = rp.start(fixture.clients[1], fixture.redirectURI);
  const callback = await fixture.authorize(url, false);
  expect(new URL(callback).searchParams.get("error")).toBe("access_denied");
  expect(new URL(callback).searchParams.has("code")).toBe(false);
  expect(() => rp.callback(transaction, callback)).toThrow("Authorization denied");
  const tampered = new URL(callback); tampered.searchParams.set("state", "wrong");
  expect(() => rp.callback(transaction, tampered.href)).toThrow("Callback state mismatch");
}, 60_000);

it("verifies signatures, issuer, audience and nonce at the independent RP", async () => {
  const { transaction, url } = rp.start(fixture.clients[0], fixture.redirectURI);
  const tokens = await rp.exchange(transaction, rp.callback(transaction, await fixture.authorize(url)));
  const valid = await rp.verifyIDToken(tokens.id_token!, transaction.clientId, transaction.nonce);
  await expect(rp.verifyIDToken(tokens.id_token!, "wrong-client", transaction.nonce)).rejects.toThrow();
  await expect(rp.verifyIDToken(tokens.id_token!, transaction.clientId, "wrong-nonce")).rejects.toThrow("nonce");
  const alternate = await StandardRP.discover(fixture.issuer);
  alternate.metadata.issuer = "https://wrong-issuer.example";
  await expect(alternate.verifyIDToken(tokens.id_token!, transaction.clientId, transaction.nonce)).rejects.toThrow();
  const parts = tokens.id_token!.split(".");
  parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
  await expect(rp.verifyIDToken(parts.join("."), transaction.clientId, transaction.nonce)).rejects.toThrow();
  const { privateKey } = await generateKeyPair("EdDSA");
  const forged = await new SignJWT({ sub: valid.sub, nonce: transaction.nonce }).setProtectedHeader({ alg: "EdDSA", kid: "untrusted" })
    .setIssuer(fixture.issuer).setAudience(transaction.clientId).setIssuedAt().setExpirationTime("5m").sign(privateKey);
  await expect(rp.verifyIDToken(forged, transaction.clientId, transaction.nonce)).rejects.toThrow();
}, 60_000);

it("serves both discovery URLs through actual Next HTTP and keeps public registration closed", async () => {
  for (const name of ["openid-configuration", "oauth-authorization-server"]) {
    const response = await fetch(`${fixture.issuer}/.well-known/${name}`);
    expect(response.status).toBe(200);
    expect((await response.json()).issuer).toBe(fixture.issuer);
    expect(response.headers.get("cache-control")).toContain("public");
  }
  const before = await fixture.count("oauthClient");
  const response = await fetch(`${fixture.issuer}/api/auth/oauth2/register`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: fixture.issuer },
    body: JSON.stringify({ client_name: "Unauthorized RP", application_type: "native", redirect_uris: [fixture.redirectURI],
      token_endpoint_auth_method: "none", grant_types: ["authorization_code"], response_types: ["code"] }),
  });
  expect([401, 403]).toContain(response.status);
  const body = await response.json();
  expect(body).not.toHaveProperty("client_id"); expect(body).not.toHaveProperty("client_secret");
  expect(await fixture.count("oauthClient")).toBe(before);
}, 30_000);
