import { expect, it } from "vitest";
import { setup, wallets } from "./harness";

it("retains legacy random-ID ownership and grants; address-ID hook does not migrate existing users", async () => {
  const h = await setup(true, { provenance: true });
  try {
    const ctx = await h.auth.$context;
    const legacy = await ctx.internalAdapter.createUser({ id: "legacy-random-id", name: "Legacy", email: "legacy@example.invalid", emailVerified: false }, { method: "admin" });
    expect(legacy.id).toBe("legacy-random-id");
    await ctx.adapter.create({ model: "walletAddress", data: { userId: legacy.id, address: wallets[0].address, chainId: 1, isPrimary: true, createdAt: new Date() } });
    await ctx.internalAdapter.createAccount({ userId: legacy.id, providerId: "siwe", accountId: `${wallets[0].address}:1` });
    const login = await h.login();
    expect(login.body.user.id).toBe(legacy.id);
    const first = await h.flow(login.cookie);
    const second = await h.flow(login.cookie);
    expect(first.claims.sub).toBe(legacy.id);
    expect(first.transaction.clientId).not.toBe(second.transaction.clientId);
    expect(h.db.prepare('select userId from oauthClient').all().map(r => r.userId)).toEqual([legacy.id, legacy.id]);
    expect(h.db.prepare('select userId from oauthConsent').all().every(r => r.userId === legacy.id)).toBe(true);
    expect(h.db.prepare('select userId from oauthRefreshToken').all().every(r => r.userId === legacy.id)).toBe(true);
    const pending = await h.consent(await h.authorize(login.cookie));
    const records = h.db.prepare('select value from verification').all().map(r => String(r.value));
    expect(records.some(v => v.includes(legacy.id))).toBe(true);
    expect(pending.callback.code).toBeTruthy();
    const references = h.db.prepare("select name, sql from sqlite_master where type = 'table'").all();
    const userReferences = references.filter(r => String(r.sql).includes('REFERENCES "user"') || String(r.sql).includes('references "user"'));
    expect(userReferences.length).toBeGreaterThan(0);
    expect(h.db.prepare('select count(*) n from oauthConsent').get()!.n).toBe(3);
    expect(h.db.prepare('select count(*) n from oauthRefreshToken').get()!.n).toBe(2);
    expect(h.db.prepare('select userId from oauthAccessToken').all().every(r => r.userId === legacy.id)).toBe(true);
    const fk = h.db.prepare('PRAGMA foreign_keys').get()!;
    expect(fk.foreign_keys).toBe(1);
    // Hypothetical disposable identity mutation is deliberately rolled back.
    h.db.exec('BEGIN');
    let mutation = "";
    try {
      h.db.prepare('update user set id = ? where id = ?').run(wallets[0].address.toLowerCase(), legacy.id);
      expect(h.db.prepare('select userId from oauthClient').get()!.userId).toBe(legacy.id);
      mutation = "update allowed; owner references left stale";
    } catch (error) { mutation = `update rejected: ${(error as Error).message}`; }
    finally { h.db.exec('ROLLBACK'); }
    expect(mutation).toContain("FOREIGN KEY constraint failed");
    expect(h.db.prepare('select id from user').get()!.id).toBe(legacy.id);
    console.log(JSON.stringify({ legacySubjectRemainsRandom: true, applicationOwners: 2, foreignKeys: fk, mutation, tables: references.map(r => r.name), userReferenceTables: userReferences.map(r => r.name) }));
  } finally { h.close(); }
});

it("fails closed on a pre-existing address-ID collision without granting the unrelated account", async () => {
  const h = await setup(true);
  try {
    const ctx = await h.auth.$context;
    await ctx.internalAdapter.createUser({ id: wallets[0].address.toLowerCase(), name: "Unbound legacy collision", email: "unbound@example.invalid", emailVerified: false }, { method: "admin" });
    await expect(h.login()).rejects.toThrow();
    expect(h.db.prepare('select count(*) n from session').get()!.n).toBe(0);
    expect(h.db.prepare('select count(*) n from walletAddress').get()!.n).toBe(0);
  } finally { h.close(); }
});

it("keeps machine grants separate from wallet end-user identity", async () => {
  const h = await setup(true, { provenance: true, enforce: true });
  try {
    const login = await h.login();
    const registration = await h.post("/api/auth/oauth2/register", { client_name: "machine fixture", redirect_uris: ["https://machine.example.invalid/callback"], token_endpoint_auth_method: "client_secret_post", grant_types: ["client_credentials"], scope: "" }, login.cookie);
    const client = await registration.json();
    expect(registration.status, JSON.stringify(client)).toBe(201);
    expect(client.client_id).not.toBe(wallets[0].address.toLowerCase());
    // Server-side scope assignment fixture; registration input cannot grant itself machine permissions.
    const ctx = await h.auth.$context;
    await ctx.adapter.update({ model: "oauthClient", where: [{ field: "clientId", value: client.client_id }], update: { clientCredentialsScopes: ["machine:read"] } });
    const token = await h.request()("/api/auth/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: client.client_id, client_secret: client.client_secret }) });
    const body = await token.json();
    expect(token.status, JSON.stringify(body)).toBe(200);
    expect(body.id_token).toBeUndefined();
    expect(body.refresh_token).toBeUndefined();
    const info = await h.request()("/api/auth/oauth2/userinfo", { headers: { Authorization: `Bearer ${body.access_token}` } });
    expect(info.status).toBeGreaterThanOrEqual(400);
    console.log(JSON.stringify({ machineTokenIssued: true, userIdToken: false, userInfoDenied: info.status }));
  } finally { h.close(); }
});
