import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { productionFixture } from "./auth-safety-fixture";
vi.mock("./email/send.ts", () => ({ sendDemoEmail: vi.fn() }));
let f: Awaited<ReturnType<typeof productionFixture>>;
beforeAll(async () => { f = await productionFixture(); });
afterAll(async () => { await f?.close(); });
it("denies password signup without creating a session", async () => {
  const before = f.count("session");
  const response = await f.post("/api/auth/sign-up/email", { name: "Control", email: "control@example.com", password: "valid-control-password" });
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(f.count("session")).toBe(before);
});
it("denies anonymous valid dynamic registration without persisting credentials", async () => {
  const before = f.count("oauthClient");
  const response = await f.post("/api/auth/oauth2/register", { client_name: "Control", application_type: "native", scope: "openid profile email offline_access", redirect_uris: ["http://127.0.0.1:8765/callback"], token_endpoint_auth_method: "none" as const, grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] });
  expect(response.status).toBe(401);
  expect(f.count("oauthClient")).toBe(before);
});
it("valid signed SIWE establishes a usable session", async () => {
  const login = await f.login();
  expect(login.response.status).toBe(200);
  expect(login.cookie).toContain("session_token");
  expect((await f.auth.api.getSession({ headers: new Headers({ cookie: login.cookie }) }))?.user.id).toBe(login.body.user.id);
});

it("otherwise valid stored password credentials cannot authenticate", async () => {
  const user = await f.ctx.internalAdapter.createUser({ name: "Password control", email: "stored@example.com", emailVerified: true }, { method: "email-password" });
  const password = "valid-existing-password";
  await f.ctx.internalAdapter.createAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: await f.ctx.password.hash(password) });
  const before = f.count("session");
  const result = await f.post("/api/auth/sign-in/email", { email: user.email, password });
  expect(result.status).toBe(403);
  expect((await result.json()).code).toBe("SIWE_REQUIRED");
  expect(result.headers.getSetCookie()).toEqual([]);
  expect(f.count("session")).toBe(before);
  expect(await f.auth.api.getSession({ headers: result.headers })).toBeNull();
});

// Entire route families are denied by the supported before hook, before parsing
// credentials or contacting an upstream SSO provider. Representative payloads
// exercise the HTTP path; a real SIWE session also cannot bypass the restriction.
const alternateRoutes: [string, string, unknown][] = [
  ["POST", "/sign-in/social", { provider: "github", callbackURL: "/dashboard" }],
  ["GET", "/callback/github?code=valid-code&state=state", undefined],
  ["GET", "/passkey/generate-authenticate-options", undefined],
  ["POST", "/passkey/verify-authentication", { response: { id: "credential", type: "public-key", response: { clientDataJSON: "e30", authenticatorData: "e30", signature: "e30" } } }],
  ["POST", "/passkey/verify-registration", { response: { id: "credential", type: "public-key" }, name: "Control" }],
  ["POST", "/sign-in/sso", { providerId: "sso", callbackURL: "/dashboard" }],
  ["GET", "/sso/callback/sso?code=valid-code&state=state", undefined],
  ["GET", "/sso/callback?code=valid-code&state=state", undefined],
  ["POST", "/sso/saml2/sp/acs/sso", { SAMLResponse: "PHNhbWxwOlJlc3BvbnNlLz4=" }],
  ["POST", "/two-factor/verify-totp", { code: "123456" }],
  ["POST", "/two-factor/verify-otp", { code: "123456" }],
  ["POST", "/two-factor/verify-backup-code", { code: "stored-backup-code" }],
  ["POST", "/admin/impersonate-user", { userId: "target" }],
  ["POST", "/electron/token", { token: "transfer-code", client_id: "electron" }],
  ["POST", "/electron/transfer-user", { client_id: "electron", redirect_uri: "com.better-auth.demo:/callback" }],
  ["POST", "/device/token", { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: "approved-device-code", client_id: "client" }],
  ["GET", "/verify-email?token=signed-email-token&callbackURL=/dashboard", undefined],
];
it.each(alternateRoutes)("%s %s cannot create access even with an existing SIWE session", async (method, path, body) => {
  const login = await f.login();
  const before = f.count("session");
  const response = await f.auth.handler(f.request(`/api/auth${path}`, {
    method, headers: { "Content-Type": "application/json", cookie: login.cookie }, ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  expect(response.status).toBe(403);
  expect((await response.json()).code).toBe("SIWE_REQUIRED");
  expect(response.headers.getSetCookie()).toEqual([]);
  expect(f.count("session")).toBe(before);
});
it("server API calls use the same independent-login enforcement", async () => {
  await expect(f.auth.api.signInEmail({ body: { email: "stored@example.com", password: "valid-existing-password" } })).rejects.toMatchObject({ status: "FORBIDDEN", body: { code: "SIWE_REQUIRED" } });
  await expect(f.auth.api.impersonateUser({ body: { userId: "target" }, headers: new Headers() })).rejects.toMatchObject({ status: "FORBIDDEN", body: { code: "SIWE_REQUIRED" } });
});

const metadata = { client_name: "Valid native client", application_type: "native" as const, redirect_uris: ["http://127.0.0.1:8765/callback"], token_endpoint_auth_method: "none" as const, grant_types: ["authorization_code", "refresh_token"], response_types: ["code" as const], scope: "openid profile email offline_access" };
const creationRoutes = ["/oauth2/register", "/oauth2/create-client", "/admin/oauth2/create-client"];
const badCredentials: Record<string, string>[] = [{}, { cookie: "better-auth.session_token=expired.invalid" }, { authorization: "Bearer arbitrary-token" }, { cookie: "better-auth.session_token=forged", authorization: "Bearer arbitrary-token" }];
it.each(creationRoutes)("denies anonymous %s through handler and Next HTTP wrapper", async path => {
  const wrapper = await import("../app/api/auth/[...all]/route");
  for (const headers of badCredentials) {
    for (const boundary of [f.auth.handler, wrapper.POST]) {
      const before = f.count("oauthClient");
      const response = await boundary(f.request(`/api/auth${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ ...metadata, userId: "forged-owner", owner: "0x1111111111111111111111111111111111111111", client_id: "forged-client" }) }));
      expect(response.status).toBe(path.startsWith("/admin/") ? 404 : 401);
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      expect(body).not.toHaveProperty("client_id");
      expect(body).not.toHaveProperty("client_secret");
      expect(response.headers.getSetCookie().every((cookie: string) => cookie.includes("Max-Age=0"))).toBe(true);
      expect(f.count("oauthClient")).toBe(before);
    }
  }
});
it("existing configured client completes authorization code, tokens and UserInfo", async () => {
  const { createHash } = await import("node:crypto");
  const { startAuthorization, submitConsent, exchangeCode, fetchUserInfo } = await import("../app/(auth)/sign-in/oauth-flow");
  await f.ctx.adapter.create({ model: "oauthClient", data: {
    clientId: "preconfigured-client", name: "Preconfigured fixture", redirectUris: metadata.redirect_uris,
    tokenEndpointAuthMethod: "none", grantTypes: metadata.grant_types, responseTypes: ["code"],
    scopes: ["openid", "profile", "email", "offline_access"], applicationType: "native", requirePKCE: true,
    disabled: false, createdAt: new Date(), updatedAt: new Date(),
  } });
  const discovery = await f.auth.api.getOpenIdConfig();
  expect(discovery.authorization_endpoint).toContain("/oauth2/authorize");
  const login = await f.login();
  const fetcher = (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (init?.credentials !== "omit") headers.set("cookie", login.cookie);
    return f.auth.handler(f.request(path, { ...init, headers }));
  };
  const tx = { clientId: "preconfigured-client", origin: "http://localhost:3000", issuer: discovery.issuer, verifier: "a".repeat(64), challenge: createHash("sha256").update("a".repeat(64)).digest("base64url"), state: "ph002-state", nonce: "ph002-nonce" };
  const step = await startAuthorization(tx, fetcher);
  expect(step.type).toBe("consent");
  if (step.type !== "consent") throw new Error(JSON.stringify(step));
  const callback = await submitConsent(tx, step.query, true, fetcher);
  expect(callback.type).toBe("code");
  if (callback.type !== "code") throw new Error(JSON.stringify(callback));
  const tokens = await exchangeCode(tx, callback.code, fetcher);
  expect(tokens.id_token).toBeTruthy();
  expect(tokens.access_token).toBeTruthy();
  expect((await fetchUserInfo(tokens.access_token, fetcher)).sub).toBe(login.body.user.id);
});

it("server-only administrative client creation also denies missing authentication", async () => {
  const before = f.count("oauthClient");
  await expect(f.auth.api.adminCreateOAuthClient({ body: metadata, headers: new Headers() })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  expect(f.count("oauthClient")).toBe(before);
});

it("rejects a real signed passkey assertion that succeeds in a labeled upstream control", async () => {
  const { betterAuth } = await import("better-auth");
  const { generateKeyPairSync, createHash, sign } = await import("node:crypto");
  // Control only: production options with the wallet-entry hook deliberately
  // removed. This does not approve passkeys as a product authentication method.
  const control = betterAuth({ ...f.auth.options, hooks: {} });
  const login = await f.login();
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  const cose = Buffer.concat([Buffer.from("a5010203262001215820", "hex"), Buffer.from(jwk.x!, "base64url"), Buffer.from("225820", "hex"), Buffer.from(jwk.y!, "base64url")]);
  const credentialID = Buffer.from("ph002-virtual-credential").toString("base64url");
  await f.ctx.adapter.create({ model: "passkey", data: { userId: login.body.user.id, publicKey: cose.toString("base64"), credentialID, counter: 0, deviceType: "singleDevice", backedUp: false, createdAt: new Date() } });
  const optionsResponse = await control.handler(f.request("/api/auth/passkey/generate-authenticate-options"));
  expect(optionsResponse.status).toBe(200);
  const options = await optionsResponse.json();
  const cookie = optionsResponse.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const clientData = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge: options.challenge, origin: "http://localhost:3000", crossOrigin: false }));
  const authenticatorData = Buffer.concat([createHash("sha256").update(options.rpId).digest(), Buffer.from([5, 0, 0, 0, 1])]);
  const signature = sign("sha256", Buffer.concat([authenticatorData, createHash("sha256").update(clientData).digest()]), privateKey);
  const body = { response: { id: credentialID, rawId: credentialID, type: "public-key", clientExtensionResults: {}, response: { clientDataJSON: clientData.toString("base64url"), authenticatorData: authenticatorData.toString("base64url"), signature: signature.toString("base64url"), userHandle: null } } };
  const before = f.count("session");
  const denied = await f.post("/api/auth/passkey/verify-authentication", body, { cookie });
  expect(denied.status).toBe(403);
  expect(denied.headers.getSetCookie()).toEqual([]);
  expect(f.count("session")).toBe(before);
  const allowed = await control.handler(f.request("/api/auth/passkey/verify-authentication", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body) }));
  expect(allowed.status).toBe(200);
  expect(f.count("session")).toBe(before + 1);
});

it.each([{}, { prompt: "login" }, { max_age: "0" }])("preserves signed OAuth authorization through the real wallet client (%j)", async extra => {
  const { testWallet } = await import("./auth-safety-fixture");
  const { createHash } = await import("node:crypto");
  const query = new URLSearchParams({ client_id: "preconfigured-client", response_type: "code", redirect_uri: metadata.redirect_uris[0], scope: "openid profile email", state: "continuation-state", nonce: "continuation-nonce", code_challenge: createHash("sha256").update("b".repeat(64)).digest("base64url"), code_challenge_method: "S256" });
  for (const [key, value] of Object.entries(extra)) query.set(key, value!);
  const response = await f.auth.handler(f.request(`/api/auth/oauth2/authorize?${query}`, { headers: { accept: "application/json" } }));
  const redirect = await response.json();
  const loginURL = new URL(redirect.url, "http://localhost:3000");
  expect(loginURL.pathname).toBe("/sign-in");
  expect(loginURL.searchParams.has("sig")).toBe(true);
  const { createAuthClient } = await import("better-auth/client");
  const { siweClient } = await import("better-auth/client/plugins");
  const { walletOAuthProviderClient } = await import("./oauth-login-client");
  const { loginWithWallet } = await import("./wallet-login");
  let cookie = "";
  const client = createAuthClient({ baseURL: "http://localhost:3000", plugins: [siweClient(), walletOAuthProviderClient()], fetchOptions: {
    customFetchImpl: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (cookie) headers.set("cookie", cookie);
      const response = await f.auth.handler(f.request(String(input), { ...init, headers }));
      const received = response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
      if (received) cookie = received;
      return response;
    },
  } });
  const provider = { request: async ({ method, params }: { method: string; params?: readonly unknown[] }) => {
    if (method === "eth_requestAccounts") return [testWallet.address];
    if (method === "eth_chainId") return "0x1";
    return testWallet.signMessage({ message: { raw: params![0] as `0x${string}` } });
  } };
  vi.stubGlobal("window", { location: { search: loginURL.search } });
  let next: string;
  try { next = await loginWithWallet(provider, "http://localhost:3000", client.siwe, loginURL.searchParams); }
  finally { vi.unstubAllGlobals(); }
  const destination = new URL(next, "http://localhost:3000");
  expect(destination.searchParams.has("error"), destination.href).toBe(false);
  if (destination.pathname === "/callback") {
    expect(destination.origin).toBe("http://127.0.0.1:8765");
    expect(destination.searchParams.get("code")).toBeTruthy();
  } else expect(["/oauth/consent", "/oauth/select-account"]).toContain(destination.pathname);
  expect(destination.searchParams.get("state")).toBe("continuation-state");
  expect(cookie).toContain("session_token");
  // Altering a signed field must fail before another session can be minted.
  const altered = new URLSearchParams(loginURL.search);
  altered.set("state", "tampered-state");
  const before = f.count("session");
  const denied = await f.post("/api/auth/siwe/verify", { message: "unused", signature: "unused", oauth_query: altered.toString() });
  expect(denied.status).toBe(400);
  expect(await denied.json()).toMatchObject({ error: "invalid_signature" });
  expect(denied.headers.getSetCookie()).toEqual([]);
  expect(f.count("session")).toBe(before);
});
