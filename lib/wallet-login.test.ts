import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { testWallet } from "./auth-safety-fixture";
import { authorizationDestination, localLoginDestination, loginWithWallet, walletLoginError } from "./wallet-login";
import type { EthereumProvider } from "../app/(auth)/sign-in/siwe-login";
vi.mock("../app/(auth)/sign-in/actions", () => ({ createOAuthProof: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./auth-client", () => ({ authClient: { siwe: {} } }));
const origin = "http://localhost:3000";
function fixture() {
  const request = vi.fn<EthereumProvider["request"]>(async ({ method }) => {
    if (method === "eth_requestAccounts") return [testWallet.address];
    if (method === "eth_chainId") return "0x1";
    return "0xsignature";
  });
  let n = 0;
  const client = {
    nonce: vi.fn(async () => ({ data: { nonce: `nonce${++n}abcdefgh` } })),
    verify: vi.fn(async (_: { message: string; signature: string }): Promise<{ data?: unknown; error?: { message: string } }> => ({ data: { success: true, user: { id: "user", walletAddress: testWallet.address, chainId: 1 } } })),
  };
  return { provider: { request }, client, request };
}
it("renders Ethereum as the sole main login choice", async () => {
  const { default: Page } = await import("../app/(auth)/sign-in/page");
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client: queryClient }, createElement(Page)));
  for (const title of ["Session information", "Consent", "Authorization code", "Token response", "User info", "Configured OAuth client ID"]) expect(html).toContain(title);
  queryClient.clear();
  expect(html).toContain("Sign in with Ethereum");
  expect(html).not.toMatch(/password|passkey|Sign Up|SSO|type="email"/i);
});
it.each(["https://evil.example", "//evil.example", "/dashboard?next=https://evil.example", "javascript:alert(1)", "/unknown", "/\\evil.example"])("rejects unsafe callback %s", value => {
  expect(localLoginDestination(new URLSearchParams({ callbackUrl: value }))).toBe("/dashboard");
});
it.each(["/dashboard", "/device", "/client-test", "/sign-in"])("preserves approved local callback %s", async path => {
  const { provider, client } = fixture();
  expect(await loginWithWallet(provider, origin, client, new URLSearchParams({ callbackUrl: path }))).toBe(path);
});
it("preserves the exact server authorization continuation query", async () => {
  const { provider, client } = fixture();
  const url = `${origin}/oauth/consent?client_id=rp&state=a%2Bb&sig=provider-signed&exp=123`;
  client.verify.mockResolvedValue({ data: { redirect: true, url } });
  expect(await loginWithWallet(provider, origin, client, new URLSearchParams({ client_id: "rp" }))).toBe(url);
});
it("allows the server's immediate RP callback only for the signed requested redirect URI", () => {
  const params = new URLSearchParams({ redirect_uri: "https://rp.example/callback", sig: "server-verified", exp: "123" });
  expect(authorizationDestination("https://rp.example/callback?code=code&state=state", origin, params)).toContain("code=code");
  expect(() => authorizationDestination("https://evil.example/callback?code=code", origin, params)).toThrow("Unsafe");
  expect(() => authorizationDestination("javascript:alert(1)", origin, params)).toThrow("Unsafe");
});
it("does not discard an authorization request when continuation is missing", async () => {
  const { provider, client } = fixture();
  await expect(loginWithWallet(provider, origin, client, new URLSearchParams({ client_id: "rp" }))).rejects.toThrow("did not continue");
});
it("reports missing wallets and rejected signatures", async () => {
  const { provider, client, request } = fixture();
  await expect(loginWithWallet(undefined, origin, client, new URLSearchParams())).rejects.toThrow("No Ethereum wallet");
  request.mockRejectedValueOnce({ code: 4001 });
  try { await loginWithWallet(provider, origin, client, new URLSearchParams()); } catch (error) { expect(walletLoginError(error)).toContain("declined"); }
  expect(client.verify).not.toHaveBeenCalled();
});
it("retries verification failure with a fresh nonce and signature", async () => {
  const { provider, client } = fixture();
  client.verify.mockResolvedValueOnce({ error: { message: "Verification failed" } });
  await expect(loginWithWallet(provider, origin, client, new URLSearchParams())).rejects.toThrow("Verification failed");
  expect(await loginWithWallet(provider, origin, client, new URLSearchParams())).toBe("/dashboard");
  expect(client.nonce).toHaveBeenCalledTimes(2);
  const messages = client.verify.mock.calls.map(([body]) => body.message);
  expect(messages[0]).not.toBe(messages[1]);
});
describe.each(["../app/client-test/oauth-flow", "../app/(auth)/sign-in/oauth-flow"])("registration denial in %s", module => {
  it.each([401, 403])("reports authorization required for HTTP %s", async status => {
    const { registerTestClient } = await import(module);
    await expect(registerTestClient(async () => Response.json({ error: "unauthorized" }, { status }))).rejects.toThrow("requires wallet-owner authorization");
  });
});

it("passes the signed message to the login page inspector", async () => {
  const { provider, client } = fixture();
  const inspect = vi.fn();
  await loginWithWallet(provider, origin, client, new URLSearchParams(), inspect);
  expect(inspect).toHaveBeenCalledWith(client.verify.mock.calls[0][0].message);
  expect(inspect.mock.calls[0][0]).toContain("URI: http://localhost:3000/sign-in");
});
