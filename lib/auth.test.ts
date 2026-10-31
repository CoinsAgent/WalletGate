import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { productionFixture } from "./auth-safety-fixture";
vi.mock("./email/send.ts", () => ({ sendDemoEmail: vi.fn() }));
let f: Awaited<ReturnType<typeof productionFixture>>;
beforeAll(async () => { f = await productionFixture(); });
afterAll(async () => { await f?.close(); });
it("production password authentication is disabled", () => {
  expect(f.auth.options.emailAndPassword.enabled).toBe(false);
});
it.each(["facebook", "github", "google", "discord", "microsoft", "twitch", "twitter", "paypal", "vercel"])("denies independent social login through %s", async provider => {
  const result = await f.post("/api/auth/sign-in/social", { provider, callbackURL: "/dashboard" });
  expect(result.status).toBe(403);
  expect(f.count("session")).toBe(0);
});
it("valid SIWE needs no hosted identity service", async () => {
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected external request"));
  try {
    expect((await f.login()).response.status).toBe(200);
    expect(network).not.toHaveBeenCalled();
  } finally { network.mockRestore(); }
});
