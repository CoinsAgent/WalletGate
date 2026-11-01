import type { EthereumProvider } from "../app/(auth)/sign-in/siwe-login";

type Client = Pick<Awaited<ReturnType<typeof import("@metamask/connect-evm").createEVMClient>>, "connect" | "disconnect" | "getProvider">;
export type RemoteFactory = (origin: string, networks: Record<`0x${string}`, string>) => Promise<Client>;
const loadClient: RemoteFactory = async (origin, networks) => {
  const { createEVMClient } = await import("@metamask/connect-evm");
  return createEVMClient({
    dapp: { name: "WalletGate", url: new URL(origin).origin },
    api: { supportedNetworks: networks }, analytics: { enabled: false },
    skipAutoAnnounce: true,
    // Connect Multichain 1.2.0 forces its install/QR modal when this is false
    // and no extension exists. Mobile browsers need true for the deeplink path.
    ui: { preferExtension: true, showInstallModal: false },
    mobile: { useDeeplink: true },
  });
};

/** Public RPC configuration, never a secret API key. No default network policy
 * is invented here. Connect EVM itself always includes mainnet permission. */
export function remoteNetworks(value: string | undefined): Record<`0x${string}`, string> {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw 0;
    const entries = Object.entries(parsed);
    if (!entries.length) throw 0;
    for (const [chain, endpoint] of entries) {
      if (!/^0x[1-9a-f][\da-f]*$/i.test(chain) || !Number.isSafeInteger(Number.parseInt(chain, 16)) || typeof endpoint !== "string") throw 0;
      const url = new URL(endpoint);
      if (url.protocol !== "https:" || url.username || url.password || url.hash) throw 0;
    }
    return parsed as Record<`0x${string}`, string>;
  } catch {
    throw new Error("MetaMask app connection is not configured. Ask the operator to configure public wallet RPC endpoints, or use a browser wallet.");
  }
}

/** Lazy EIP-1193 adapter. Construction/selection do not load the SDK or request
 * permission. Connector persistence is never treated as WalletGate login. */
export function metamaskRemote(origin: string, configuration: string | undefined,
  factory: RemoteFactory = loadClient, timeoutMs = 90_000) {
  let epoch = 0;
  let client: Client | undefined;
  let stopEvents = () => {};
  let rejectPending: ((reason: Error) => void) | undefined;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const emit = (event: string, ...args: unknown[]) => listeners.get(event)?.forEach(fn => fn(...args));
  const cancel = () => {
    epoch++; stopEvents(); stopEvents = () => {};
    rejectPending?.(new Error("MetaMask attempt cancelled. Connect again."));
    rejectPending = undefined;
    const previous = client; client = undefined;
    // Transport cleanup only; this never revokes a WalletGate session.
    if (previous) void previous.disconnect().catch(() => {});
  };
  const provider: EthereumProvider = {
    on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event)!.add(fn); },
    removeListener(event, fn) { listeners.get(event)?.delete(fn); },
    async request(request) {
      if (request.method !== "eth_requestAccounts") {
        if (!client) throw new Error("Connect the MetaMask app again.");
        return client.getProvider().request(request);
      }
      if (rejectPending) throw new Error("A MetaMask request is already pending.");
      const networks = remoteNetworks(configuration);
      const generation = ++epoch;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let rejectThis: ((reason: Error) => void) | undefined;
      try {
        return await Promise.race([
          (async () => {
            const loaded = await factory(origin, networks);
            if (generation !== epoch) { if (!client) void loaded.disconnect().catch(() => {}); throw new Error("MetaMask attempt expired."); }
            client = loaded;
            const result = await loaded.connect({ chainIds: Object.keys(networks) as `0x${string}`[] });
            if (generation !== epoch) throw new Error("MetaMask attempt expired.");
            // Initial SDK account/network notifications establish the connection;
            // subsequent notifications invalidate the reviewed attempt.
            const source = loaded.getProvider();
            const bindings = ["accountsChanged", "chainChanged", "disconnect"].map(event => {
              const fn = (...args: unknown[]) => { if (generation === epoch) emit(event, ...args); };
              source.on(event as "disconnect", fn); return { event, fn };
            });
            stopEvents = () => bindings.forEach(({ event, fn }) => source.removeListener(event as "disconnect", fn));
            return result.accounts;
          })(),
          new Promise<never>((_, reject) => {
            rejectPending = reject;
            rejectThis = reject;
            timer = setTimeout(() => reject(new Error("MetaMask did not respond. Return to this browser, check the app and network, then connect again.")), timeoutMs);
          }),
        ]);
      } catch (error) { if (generation === epoch) cancel(); throw error; }
      finally { clearTimeout(timer); if (rejectPending === rejectThis) rejectPending = undefined; }
    },
  };
  return { id: "metamask-remote", name: "MetaMask app", provider, cancel,
    dispose() { cancel(); listeners.clear(); } };
}
