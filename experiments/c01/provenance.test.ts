import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { expect, it } from "vitest";
import { setup, wallets } from "./harness";
import { exchangeCode } from "../../app/client-test-siwe/oauth-flow";

it.each([false, true])("persists trusted provenance and rejects forged or legacy sessions with cookie cache=%s", async (cookieCache) => {
  const h = await setup(true, { provenance: true, enforce: true, cookieCache });
  try {
    const login = await h.login();
    const session = await h.auth.api.getSession({ headers: new Headers({ cookie: login.cookie }) });
    expect(session?.session).toMatchObject({ siweAddress: wallets[0].address.toLowerCase() });
    expect(h.db.prepare('select siweAt from session').get()!.siweAt).toBeTruthy();
    const result = await h.flow(login.cookie);
    expect(result.userinfo.sub).toBe(wallets[0].address.toLowerCase());
    expect((await h.refresh(result)).status).toBe(200);
    // Direct fixture update models a legacy/invalidated session. Cache must not bypass the authoritative gate.
    h.db.prepare('update session set siweAddress = NULL, siweAt = NULL').run();
    await expect(h.flow(login.cookie)).rejects.toThrow("Experimental SIWE provenance required");
    expect((await h.request()("/api/auth/oauth2/userinfo", { headers: { Authorization: `Bearer ${result.tokens.access_token}` } })).status).toBe(403);
    const sessions = await h.request(login.cookie)("/api/auth/multi-session/list-device-sessions");
    expect(sessions.status).toBe(403);
    // Password sign-up ignores input-disabled fields; a wallet-linked record cannot make this SIWE.
    const forged = await h.post("/api/auth/sign-up/email", { name: "forged", email: "forged@example.invalid", password: "test-password-at-least-12", siweAddress: wallets[0].address.toLowerCase(), siweAt: new Date().toISOString() });
    expect(forged.status).toBe(200);
    const body = await forged.json();
    const row = h.db.prepare('select * from session where userId = ?').get(body.user.id)!;
    expect(row.siweAddress).toBeNull();
    const cookie = forged.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
    const context = await h.auth.$context;
    await context.adapter.create({ model: "walletAddress", data: { userId: body.user.id, address: wallets[0].address, chainId: 1, isPrimary: false, createdAt: new Date() } });
    await expect(h.flow(cookie)).rejects.toThrow("Experimental SIWE provenance required");
    // Other session origins get no marker even for a wallet user (e.g. passkey/admin/old session).
    const alternate = await context.internalAdapter.createSession(wallets[0].address.toLowerCase());
    expect((alternate as any).siweAddress).toBeNull();
    console.log(JSON.stringify({ cookieCache, forgedInputRejected: true, legacyAndPasswordDenied: true, alternateSessionUntrusted: true }));
  } finally { h.close(); }
});

it("rechecks provenance at consent continuation, code exchange, refresh, expiry and renewal", async () => {
  const h = await setup(true, { provenance: true, enforce: true });
  try {
    const login = await h.login();
    const pending = await h.authorize(login.cookie);
    h.db.prepare('update session set siweAddress = NULL').run();
    await expect(h.consent(pending)).rejects.toThrow("Experimental SIWE provenance required");
    expect((await h.post("/api/auth/oauth2/continue", { selected: true, oauth_query: pending.step.query }, login.cookie)).status).toBe(403);
    const valid = await h.login();
    const code = await h.consent(await h.authorize(valid.cookie));
    h.db.prepare('update session set siweAddress = NULL').run();
    await expect(exchangeCode(code.transaction, code.callback.code, code.fetcher)).rejects.toThrow("Experimental SIWE provenance required");
    const restored = await h.login();
    const result = await h.flow(restored.cookie);
    // Adapter fixture models server-side renewal of expiry; provenance must remain original.
    const context = await h.auth.$context;
    const session = await h.auth.api.getSession({ headers: new Headers({ cookie: restored.cookie }) });
    const oldAt = (session!.session as any).siweAt;
    await context.internalAdapter.updateSession(session!.session.token, { expiresAt: new Date(Date.now() + 86400000) });
    const renewed = await h.auth.api.getSession({ headers: new Headers({ cookie: restored.cookie }) });
    expect((renewed!.session as any).siweAt).toEqual(oldAt);
    h.db.prepare('update session set expiresAt = 0').run();
    expect((await h.refresh(result)).status).toBe(403);
    await expect(h.flow(restored.cookie)).rejects.toThrow();
  } finally { h.close(); }
});

it("does not bless admin impersonation or session switching; denies alternate session at OIDC boundary", async () => {
  const h = await setup(true, { provenance: true, enforce: true });
  try {
    const a = await h.login(wallets[0]);
    const b = await h.login(wallets[1]);
    h.db.prepare('update user set role = ? where id = ?').run("admin", wallets[0].address.toLowerCase());
    const impersonated = await h.post("/api/auth/admin/impersonate-user", { userId: wallets[1].address.toLowerCase() }, a.cookie);
    expect(impersonated.status).toBe(200);
    const cookie = impersonated.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
    const row = h.db.prepare('select * from session where impersonatedBy IS NOT NULL').get()!;
    expect(row.siweAddress).toBeNull();
    await expect(h.flow(cookie)).rejects.toThrow("Experimental SIWE provenance required");
    // A switched valid wallet remains itself; old grants retain original identity.
    expect((await h.flow(b.cookie)).claims.sub).toBe(wallets[1].address.toLowerCase());
    expect((await h.flow(a.cookie)).claims.sub).toBe(wallets[0].address.toLowerCase());
    const invalidPasskey = await h.post("/api/auth/passkey/verify-authentication", { response: { id: "missing-credential" } });
    expect(invalidPasskey.status).toBeGreaterThanOrEqual(400);
  } finally { h.close(); }
});

it.each([false, true])("records issued-grant retention versus experimental strict enforcement=%s", async (enforce) => {
  const h = await setup(true, { provenance: true, enforce });
  try {
    const a = await h.login(wallets[0]);
    const first = await h.flow(a.cookie);
    const b = await h.login(wallets[1]);
    const second = await h.flow(b.cookie);
    expect(first.claims.sub).not.toBe(second.claims.sub);
    h.db.prepare('delete from session where userId = ?').run(wallets[0].address.toLowerCase());
    const refresh = await h.refresh(first);
    expect(refresh.status).toBe(enforce ? 403 : 200);
    const info = await h.request()("/api/auth/oauth2/userinfo", { headers: { Authorization: `Bearer ${first.tokens.access_token}` } });
    // Stock opaque tokens can survive loss of the session; the extension supplies strict denial.
    expect(info.status).toBe(enforce ? 403 : 200);
    expect((await h.refresh(second)).status).toBe(200);
    console.log(JSON.stringify({ enforce, deletedSessionRefreshStatus: refresh.status, userInfoStatus: info.status }));
  } finally { h.close(); }
});


it.each([false, true])("checks device-list targets, real set-active switching and bearer authorization with cache=%s", async (cookieCache) => {
  const h = await setup(true, { provenance: true, enforce: true, cookieCache });
  // Preserve multi-session cookies while replacing the active cookie, like a browser.
  const jar = new Map<string, string>();
  const merge = (cookie: string) => {
    for (const part of cookie.split("; ")) {
      const equals = part.indexOf("=");
      jar.set(part.slice(0, equals), part.slice(equals + 1));
    }
    return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  };
  try {
    const a = await h.login(wallets[0]);
    merge(a.cookie);
    const grantA = await h.flow(a.cookie);
    const b = await h.login(wallets[1]);
    const cookies = merge(b.cookie);
    const list = await h.request(cookies)("/api/auth/multi-session/list-device-sessions");
    expect(list.status).toBe(200);
    expect((await list.json()).map((s: any) => s.user.id).sort()).toEqual(wallets.map(w => w.address.toLowerCase()).sort());
    const tokenA = h.db.prepare('select token from session where userId = ?').get(wallets[0].address.toLowerCase())!.token;
    const switched = await h.post("/api/auth/multi-session/set-active", { sessionToken: tokenA }, cookies);
    expect(switched.status).toBe(200);
    expect((await switched.json()).user.id).toBe(wallets[0].address.toLowerCase());
    const switchedCookies = merge(switched.headers.getSetCookie().map(c => c.split(";")[0]).join("; "));
    expect((await h.flow(switchedCookies)).claims.sub).toBe(wallets[0].address.toLowerCase());
    expect((await h.refresh(grantA)).body.id_token).toBeTruthy();
    // A valid active A must never authorize selection or disclosure of invalid B.
    h.db.prepare('update session set siweAddress = NULL where userId = ?').run(wallets[1].address.toLowerCase());
    const tokenB = h.db.prepare('select token from session where userId = ?').get(wallets[1].address.toLowerCase())!.token;
    expect((await h.request(switchedCookies)("/api/auth/multi-session/list-device-sessions")).status).toBe(403);
    expect((await h.post("/api/auth/multi-session/set-active", { sessionToken: tokenB }, switchedCookies)).status).toBe(403);
    expect((await h.post("/api/auth/multi-session/set-active", { sessionToken: "forged-target" }, switchedCookies)).status).toBe(403);
    // The bearer plugin exposes session handles; the same authoritative gate applies.
    const continuation = (token: unknown) => h.request()("/api/auth/oauth2/continue", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ selected: true, oauth_query: "" }),
    });
    const validBearer = await h.request()("/api/auth/get-session", { headers: { Authorization: `Bearer ${tokenA}` } });
    expect((await validBearer.json()).user.id).toBe(wallets[0].address.toLowerCase());
    expect((await continuation(tokenB)).status).toBe(403);
    console.log(JSON.stringify({ cookieCache, actualDeviceSwitch: true, mixedListDenied: true, invalidTargetDenied: true, bearerProvenanceDenied: true }));
  } finally { h.close(); }
});


it("does not mark a valid passkey authentication of an existing wallet user as SIWE", async () => {
  const h = await setup(true, { provenance: true, enforce: true });
  try {
    const walletLogin = await h.login();
    // Seed only credential enrollment. The actual authentication handler verifies
    // a fresh challenge and real ES256 signature from this virtual authenticator.
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const jwk = publicKey.export({ format: "jwk" });
    const cose = Buffer.concat([Buffer.from("a5010203262001215820", "hex"), Buffer.from(jwk.x!, "base64url"), Buffer.from("225820", "hex"), Buffer.from(jwk.y!, "base64url")]);
    const credentialID = Buffer.from("ph001-virtual-credential").toString("base64url");
    const context = await h.auth.$context;
    await context.adapter.create({ model: "passkey", data: {
      userId: walletLogin.body.user.id, publicKey: cose.toString("base64"), credentialID,
      counter: 0, deviceType: "singleDevice", backedUp: false, createdAt: new Date(),
    } });
    const optionsResponse = await h.request()("/api/auth/passkey/generate-authenticate-options");
    expect(optionsResponse.status).toBe(200);
    const options = await optionsResponse.json();
    const challengeCookie = optionsResponse.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
    const clientData = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge: options.challenge, origin: "http://localhost:3000", crossOrigin: false }));
    const authenticatorData = Buffer.concat([createHash("sha256").update(options.rpId).digest(), Buffer.from([5, 0, 0, 0, 1])]);
    const signature = sign("sha256", Buffer.concat([authenticatorData, createHash("sha256").update(clientData).digest()]), privateKey);
    const result = await h.post("/api/auth/passkey/verify-authentication", { response: {
      id: credentialID, rawId: credentialID, type: "public-key", clientExtensionResults: {},
      response: { clientDataJSON: clientData.toString("base64url"), authenticatorData: authenticatorData.toString("base64url"), signature: signature.toString("base64url"), userHandle: null },
    } }, challengeCookie);
    const body = await result.json();
    expect(result.status, JSON.stringify(body)).toBe(200);
    expect(body.user.id).toBe(wallets[0].address.toLowerCase());
    expect(h.db.prepare('select counter from passkey').get()!.counter).toBe(1);
    expect(h.db.prepare('select siweAddress from session where id = ?').get(body.session.id)!.siweAddress).toBeNull();
    const cookie = result.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
    await expect(h.flow(cookie)).rejects.toThrow("Experimental SIWE provenance required");
    console.log(JSON.stringify({ realPasskeySignatureVerified: true, walletLinkedPasskeySessionDenied: true, credentialEnrollmentSeeded: true }));
  } finally { h.close(); }
});
