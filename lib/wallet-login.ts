import { signInWithWallet, type EthereumProvider, type SIWEClient, type WalletAttempt } from "../app/(auth)/sign-in/siwe-login";

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

export async function loginWithWallet(provider: EthereumProvider | undefined, origin: string, client: SIWEClient, params: URLSearchParams, onMessage?: (message: string) => void, attempt?: WalletAttempt) {
  if (!provider?.request) throw new Error("No Ethereum wallet found. Open this page with an Ethereum wallet available.");
  const result = await signInWithWallet(provider, origin, client, onMessage, attempt);
  if ("redirect" in result) return authorizationDestination(result.url, origin, params);
  // A signed authorization query must be continued by the provider, never
  // silently discarded in favor of the dashboard.
  if (params.has("client_id")) throw new Error("Authorization did not continue. Restart sign-in from the application.");
  return localLoginDestination(params);
}

export function walletLoginError(cause: unknown) {
  const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
  if (code === 4001) return "Wallet request declined. Try signing in again.";
  if (code === 4100) return "Wallet permission is required. Connect again to allow access.";
  if (code === 4200 || code === -32601) return "This wallet does not support the requested operation. Choose another wallet.";
  if (code === 4900 || code === 4901) return "Wallet disconnected. Open your wallet and connect again.";
  return cause instanceof Error ? cause.message : "Wallet sign-in failed. Try again.";
}
