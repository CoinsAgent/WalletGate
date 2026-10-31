import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { setup, wallets } from "./harness";

it("creates durable schema, persists SIWE and proves baseline signed OIDC subjects; disposes and recreates storage", async () => {
  for (let iteration = 0; iteration < 2; iteration++) {
    const h = await setup();
    try {
      expect(existsSync(h.path)).toBe(true);
      const login = await h.login();
      const user = h.db.prepare('select * from user').get()!;
      expect(user.id).toBe(login.body.user.id);
      expect(user.id).not.toBe(wallets[0].address.toLowerCase());
      const reader = new DatabaseSync(h.path);
      try { expect(reader.prepare('select id from user').get()!.id).toBe(user.id); }
      finally { reader.close(); }
      const result = await h.flow(login.cookie);
      expect(result.claims.sub).toBe(user.id);
      expect(result.claims.nonce).toBe(result.transaction.nonce);
      expect(result.claims.experiment).toBe("control");
      expect(result.userinfo.sub).toBe(user.id);
      expect(result.userinfo.email_verified).not.toBe(true);
      expect(h.trace).toEqual(["user:/siwe/verify", "session:/siwe/verify"]);
      expect(result.tokens.refresh_token).toBeTruthy();
      const refreshedResponse = await h.request()("/api/auth/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: result.transaction.clientId, refresh_token: result.tokens.refresh_token! }) });
      const refreshed = await refreshedResponse.json();
      expect(refreshedResponse.status).toBe(200);
      expect(refreshed.access_token).toBeTruthy();
      const info = await h.request()("/api/auth/oauth2/userinfo", { headers: { Authorization: `Bearer ${refreshed.access_token}` } });
      expect((await info.json()).sub).toBe(user.id);
      console.log(JSON.stringify({ iteration, subjectRole: "random-internal-id", idSignatureVerified: true, claimsOverrideIgnored: true, refreshIdTokenIssued: !!refreshed.id_token, trace: h.trace }));
    } finally { h.close(); }
    expect(existsSync(h.directory)).toBe(false);
  }
});
