import { expect, it } from "vitest";
import { createSiweMessage } from "viem/siwe";
import { setup, origin, wallets } from "./harness";

const mutate = {
  wrongDomain: (m: string) => m.replace("localhost:3000 wants", "evil.example wants"),
  wrongURI: (m: string) => m.replace(`URI: ${origin}`, "URI: https://evil.example"),
  missingNonce: (m: string) => m.replace(/^Nonce: .*\n/m, ""),
  invalidNonce: (m: string) => m.replace(/Nonce: .*/, "Nonce: !!!"),
  missingURI: (m: string) => m.replace(/^URI: .*\n/m, ""),
  missingVersion: (m: string) => m.replace(/^Version: .*\n/m, ""),
  wrongVersion: (m: string) => m.replace("Version: 1", "Version: 2"),
  missingIssuedAt: (m: string) => m.replace(/\nIssued At: .*/, ""),
  invalidIssuedAt: (m: string) => m.replace(/Issued At: .*/, "Issued At: not-a-date"),
  invalidExpiry: (m: string) => `${m}\nExpiration Time: not-a-date`,
  invalidNotBefore: (m: string) => `${m}\nNot Before: not-a-date`,
  expired: (m: string) => `${m}\nExpiration Time: 2020-01-01T00:00:00.000Z`,
  notYetValid: (m: string) => `${m}\nNot Before: 2099-01-01T00:00:00.000Z`,
  futureIssuedAt: (m: string) => m.replace(/Issued At: .*/, "Issued At: 2099-01-01T00:00:00.000Z"),
  invalidChain: (m: string) => m.replace("Chain ID: 1", "Chain ID: nope"),
  duplicateField: (m: string) => `${m}\nVersion: 1`,
  trailingJunk: (m: string) => `${m}\nunsigned-grammar-junk`,
  missingAddress: (m: string) => m.replace(wallets[0].address, ""),
};

it.each(Object.entries(mutate))("strict supported callback rejects %s without creating identity or provenance", async (_label, transform) => {
  const h = await setup(true, { provenance: true, enforce: true });
  try {
    const nonce = await (await h.post("/api/auth/siwe/nonce", {})).json();
    const message = transform(createSiweMessage({ address: wallets[0].address, chainId: 1, domain: "localhost:3000", uri: origin, version: "1", nonce: nonce.nonce }));
    const response = await h.post("/api/auth/siwe/verify", { message, signature: await wallets[0].signMessage({ message }) });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(h.db.prepare('select count(*) n from user').get()!.n).toBe(0);
    expect(h.db.prepare('select count(*) n from session').get()!.n).toBe(0);
  } finally { h.close(); }
});

it("burns nonce on invalid signatures and consumes concurrent replay at most once", async () => {
  const h = await setup(true, { provenance: true, enforce: true });
  try {
    const build = async () => {
      const nonce = await (await h.post("/api/auth/siwe/nonce", {})).json();
      return createSiweMessage({ address: wallets[0].address, chainId: 1, domain: "localhost:3000", uri: origin, version: "1", nonce: nonce.nonce });
    };
    const message = await build();
    expect((await h.post("/api/auth/siwe/verify", { message, signature: await wallets[1].signMessage({ message }) })).status).toBe(401);
    expect((await h.post("/api/auth/siwe/verify", { message, signature: await wallets[0].signMessage({ message }) })).status).toBe(401);
    const fresh = await build();
    const body = { message: fresh, signature: await wallets[0].signMessage({ message: fresh }) };
    const statuses = (await Promise.all([h.post("/api/auth/siwe/verify", body), h.post("/api/auth/siwe/verify", body)])).map(r => r.status).sort();
    expect(statuses).toEqual([200, 401]);
    expect((await h.post("/api/auth/siwe/verify", body)).status).toBe(401);
    expect(h.db.prepare('select count(*) n from session').get()!.n).toBe(1);
    console.log(JSON.stringify({ invalidAttemptBurnsNonce: true, concurrentReplayStatuses: statuses }));
  } finally { h.close(); }
});

it("reproduces weak application validator acceptance as a control, then proves strict callback rejects it", async () => {
  for (const candidate of [false, true]) {
    const h = await setup(candidate);
    try {
      const nonce = await (await h.post("/api/auth/siwe/nonce", {})).json();
      const message = createSiweMessage({ address: wallets[0].address, chainId: 1, domain: "localhost:3000", uri: origin, version: "1", nonce: nonce.nonce }).replace("Version: 1", "Version: 2");
      const response = await h.post("/api/auth/siwe/verify", { message, signature: await wallets[0].signMessage({ message }) });
      expect(response.status).toBe(candidate ? 401 : 200);
      console.log(JSON.stringify({ candidate, wrongVersionStatus: response.status }));
    } finally { h.close(); }
  }
});
