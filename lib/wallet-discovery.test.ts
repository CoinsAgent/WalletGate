import { expect, it, vi } from "vitest";
import { discoverWallets, type WalletWindow } from "./wallet-discovery";
const provider = () => ({ request: vi.fn() });
function setup() {
  const target = new EventTarget() as WalletWindow;
  const changed = vi.fn();
  const emit = (p: unknown, n = 0, extra = {}) => target.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: {
    provider: p, info: { uuid: `00000000-0000-4000-8000-00000000000${n}`, name: `Wallet ${n}`, rdns: "test.wallet", icon: "data:image/svg+xml,<svg/>", ...extra },
  } }));
  return { target, changed, emit };
}
it("discovers multiple late providers, ignores duplicates/collisions and cleans up without any RPC", () => {
  const { target, changed, emit } = setup();
  const a = provider(), b = provider();
  const discovery = discoverWallets(target, changed);
  emit(a); emit(b, 1); emit(a); emit(provider(), 1);
  expect(changed.mock.lastCall![0].map((w: any) => w.name)).toEqual(["Wallet 0", "Wallet 1"]);
  expect(a.request).not.toHaveBeenCalled(); expect(b.request).not.toHaveBeenCalled();
  discovery.stop(); const calls = changed.mock.calls.length;
  emit(provider(), 2); discovery.refresh(); expect(changed).toHaveBeenCalledTimes(calls);
});
it("requests announcements after listening, reuses fallback identity and handles replaced fallback", () => {
  const { target, changed, emit } = setup(); const p = provider(); target.ethereum = p;
  const discovery = discoverWallets(target, changed);
  const id = changed.mock.lastCall![0][0].id;
  emit(p); expect(changed.mock.lastCall![0]).toMatchObject([{ id, name: "Wallet 0" }]);
  target.ethereum = provider(); discovery.refresh();
  expect(changed.mock.lastCall![0].some((w: any) => w.provider === target.ethereum)).toBe(true);
  expect(changed.mock.lastCall![0].find((w: any) => w.provider === p).id).toBe(id);
  emit(provider(), 0);
  expect(changed.mock.lastCall![0]).toHaveLength(2);
  discovery.stop();
});
it("removes replaced unannounced legacy providers on refresh", () => {
  const { target, changed } = setup(); target.ethereum = provider();
  const d = discoverWallets(target, changed); const old = changed.mock.lastCall![0][0].id;
  target.ethereum = provider(); d.refresh();
  expect(changed.mock.lastCall![0]).toHaveLength(1);
  expect(changed.mock.lastCall![0][0].id).not.toBe(old); d.stop();
});
it("handles synchronous announcements and legacy-only providers", () => {
  const { target, changed, emit } = setup(); const p = provider(); target.ethereum = p;
  target.addEventListener("eip6963:requestProvider", () => emit(p));
  const discovery = discoverWallets(target, changed);
  expect(changed.mock.lastCall![0]).toHaveLength(1); expect(changed.mock.lastCall![0][0].name).toBe("Wallet 0");
  discovery.stop();
});
it.each([{ uuid: "bad" }, { name: "" }, { name: "x".repeat(129) }, { icon: "javascript:alert(1)" }, { rdns: null }])("ignores malformed announcement %j", extra => {
  const { target, changed, emit } = setup(); const d = discoverWallets(target, changed);
  emit(provider(), 0, extra); emit({});
  target.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: null }));
  expect(changed.mock.lastCall![0]).toEqual([]); d.stop();
});
