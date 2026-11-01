import type { EthereumProvider } from "../app/(auth)/sign-in/siwe-login";

export interface WalletChoice {
  id: string;
  name: string;
  provider: EthereumProvider;
  cancel?: () => void;
}
export interface WalletWindow extends EventTarget { ethereum?: EthereumProvider }

/** EIP-6963 metadata is untrusted presentation, never vendor authentication.
 * Icons are deliberately omitted. Discovery never requests wallet permission. */
export function discoverWallets(target: WalletWindow, changed: (wallets: WalletChoice[]) => void) {
  const choices: WalletChoice[] = [];
  const announcements = new Map<string, EthereumProvider>();
  let sequence = 0;
  let active = true;
  const publish = () => changed([...choices]);
  const validProvider = (value: unknown): value is EthereumProvider =>
    !!value && typeof value === "object" && "request" in value && typeof value.request === "function";
  const announce = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (!detail || typeof detail !== "object" || !("info" in detail) || !("provider" in detail)) return;
    const { info, provider } = detail;
    if (!validProvider(provider) || !info || typeof info !== "object") return;
    const metadata = info as Record<string, unknown>;
    if (typeof metadata.uuid !== "string" || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(metadata.uuid)
      || typeof metadata.name !== "string" || !metadata.name.trim() || metadata.name.length > 128
      || typeof metadata.rdns !== "string" || typeof metadata.icon !== "string" || !metadata.icon.startsWith("data:image/")) return;
    const previous = announcements.get(metadata.uuid);
    if (previous && previous !== provider) return;
    announcements.set(metadata.uuid, provider);
    const existing = choices.find(c => c.provider === provider);
    if (existing) {
      if (existing.name === "Browser wallet (legacy)") { existing.name = metadata.name; publish(); }
      return;
    }
    // A colliding UUID cannot replace a provider the user already selected.
    choices.push({ id: metadata.uuid, name: metadata.name, provider });
    publish();
  };
  const refresh = () => {
    if (!active) return;
    const legacy = choices.findIndex(c => c.id.startsWith("legacy-"));
    if (legacy >= 0 && choices[legacy].provider !== target.ethereum
      && ![...announcements.values()].includes(choices[legacy].provider)) choices.splice(legacy, 1);
    target.dispatchEvent(new Event("eip6963:requestProvider"));
    if (validProvider(target.ethereum) && !choices.some(c => c.provider === target.ethereum)) {
      choices.push({ id: `legacy-${++sequence}`, name: "Browser wallet (legacy)", provider: target.ethereum });
    }
    publish();
  };
  target.addEventListener("eip6963:announceProvider", announce);
  refresh();
  return { refresh, stop() { active = false; target.removeEventListener("eip6963:announceProvider", announce); } };
}
