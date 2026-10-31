import { expect, it } from "vitest";
import { setup, wallets } from "./harness";

it("derives lowercase address IDs from verified context for two wallets and two clients, including refreshed signed tokens", async () => {
  const h = await setup(true);
  try {
    const logins = await Promise.all(wallets.map(w => h.login(w)));
    expect(logins.map(l => l.body.user.id)).toEqual(wallets.map(w => w.address.toLowerCase()));
    const results = await Promise.all(logins.flatMap(l => [h.flow(l.cookie), h.flow(l.cookie)]));
    expect(new Set(results.map(r => r.transaction.clientId)).size).toBe(4);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const address = wallets[Math.floor(i / 2)].address.toLowerCase();
      expect(result.claims.sub).toBe(address);
      expect(result.claims.nonce).toBe(result.transaction.nonce);
      expect(result.userinfo.sub).toBe(address);
      expect(result.userinfo.email_verified).not.toBe(true);
      const refresh = await h.refresh(result);
      expect(refresh.status).toBe(200);
      expect((await h.verifyID(refresh.body.id_token, result.transaction.clientId)).sub).toBe(address);
      const info = await h.request()("/api/auth/oauth2/userinfo", { headers: { Authorization: `Bearer ${refresh.body.access_token}` } });
      expect((await info.json()).sub).toBe(address);
      expect(result.transaction.clientId).not.toBe(address);
    }
    expect((await h.login(wallets[0], {}, true)).body.user.id).toBe(wallets[0].address.toLowerCase());
    expect((await h.login(wallets[0], {}, false, 10)).body.user.id).toBe(wallets[0].address.toLowerCase());
    expect(h.db.prepare('select count(*) n from user').get()!.n).toBe(2);
    expect(h.db.prepare('select count(*) n from walletAddress').get()!.n).toBe(3);
    console.log(JSON.stringify({ verifiedAddressSubjects: true, clients: 4, wallets: 2, casingAndChainReuse: true, rows: h.db.prepare('select id, name, emailVerified from user').all() }));
  } finally { h.close(); }
});

it("rejects supplied IDs and wallet metadata; email and hostile ENS name do not choose identity", async () => {
  const h = await setup(true);
  try {
    for (const extras of [{ id: wallets[1].address }, { walletAddress: wallets[1].address }, { name: wallets[1].address }, { siweVerified: true }]) {
      await expect(h.login(wallets[0], extras)).rejects.toThrow();
    }
    const login = await h.login(wallets[0], { email: "victim@example.invalid" });
    expect(login.body.user.id).toBe(wallets[0].address.toLowerCase());
    const row = h.db.prepare('select * from user').get()!;
    expect(row.name).toBe(wallets[1].address);
    expect(row.email).not.toBe("victim@example.invalid");
  } finally { h.close(); }
});

it("records concurrent first-login behavior without cross-wallet leakage or duplicate identities", async () => {
  const h = await setup(true);
  try {
    const results = await Promise.allSettled([h.login(wallets[0]), h.login(wallets[0]), h.login(wallets[1])]);
    const successes = results.filter(r => r.status === "fulfilled");
    expect(successes.length).toBeGreaterThanOrEqual(2);
    expect(h.db.prepare('select count(*) n from user').get()!.n).toBe(2);
    for (const [i, result] of results.entries()) if (result.status === "fulfilled") expect(result.value.body.user.id).toBe(wallets[i === 2 ? 1 : 0].address.toLowerCase());
    console.log(JSON.stringify({ firstLoginOutcomes: results.map(r => r.status), uniqueUsers: 2 }));
  } finally { h.close(); }
});
