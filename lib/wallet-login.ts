import { signInWithWallet, type EthereumProvider, type SIWEClient } from "../app/(auth)/sign-in/siwe-login";

const destinations = new Set(["/dashboard", "/device", "/client-test", "/sign-in"]);
export function localLoginDestination(params: URLSearchParams) {
  const value = params.get("callbackUrl");
  return value && destinations.has(value) ? value : "/dashboard";
}

/** Validate the provider's continuation against the original requested RP. The
 * server verifies the signed OAuth query before producing this response. */
export function authorizationDestination(url: string, origin: string, params: URLSearchParams) {
  const target = new URL(url, origin);
  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) throw new Error("Unsafe authorization destination.");
  if (target.origin === origin && ["/oauth/consent", "/oauth/select-account", "/oauth/select-organization", "/api/auth/oauth2/authorize"].includes(target.pathname)) return target.href;
  const redirectURI = params.get("redirect_uri");
  if (redirectURI && params.has("sig") && params.has("exp")) {
    const rp = new URL(redirectURI);
    if (target.origin === rp.origin && target.pathname === rp.pathname && (target.searchParams.has("code") || target.searchParams.has("error"))) return target.href;
  }
  throw new Error("Unsafe authorization destination.");
}

export async function loginWithWallet(provider: EthereumProvider | undefined, origin: string, client: SIWEClient, params: URLSearchParams, onMessage?: (message: string) => void) {
  if (!provider?.request) throw new Error("No Ethereum wallet found. Open this page with an Ethereum wallet available.");
  const result = await signInWithWallet(provider, origin, client, onMessage);
  if ("redirect" in result) return authorizationDestination(result.url, origin, params);
  // A signed authorization query must be continued by the provider, never
  // silently discarded in favor of the dashboard.
  if (params.has("client_id")) throw new Error("Authorization did not continue. Restart sign-in from the application.");
  return localLoginDestination(params);
}

export function walletLoginError(cause: unknown) {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === 4001
    ? "Wallet request declined. Try signing in again."
    : cause instanceof Error ? cause.message : "Wallet sign-in failed. Try again.";
}
