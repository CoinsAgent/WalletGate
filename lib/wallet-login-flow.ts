import { connectWallet, type SIWEClient, type WalletConnection } from "../app/(auth)/sign-in/siwe-login";
import type { WalletChoice } from "./wallet-discovery";
import { loginWithWallet, walletLoginError } from "./wallet-login";

export interface WalletFlowState {
  stage: "choose" | "connecting" | "review" | "signing" | "verifying" | "continuing" | "error";
  wallet?: WalletChoice;
  connection?: WalletConnection;
  message?: string;
  error?: string;
}

/** Generations isolate pending wallet/network responses. Invalidation after
 * server submission cannot revoke a session already created by verification. */
export class WalletLoginFlow {
  state: WalletFlowState = { stage: "choose" };
  private generation = 0;
  private disposed = false;
  private unlisten = () => {};
  constructor(private origin: string, private client: SIWEClient, private params: URLSearchParams,
    private changed: (state: WalletFlowState) => void) {}
  private update(state: WalletFlowState) { this.state = state; this.changed(state); }
  select(wallet: WalletChoice) {
    if (this.disposed) return;
    this.generation++;
    this.unlisten();
    this.state.wallet?.cancel?.();
    this.update({ stage: "choose", wallet });
    const invalidated = () => {
      if (this.state.wallet?.provider === wallet.provider) this.reset("Wallet account, network or connection changed. Connect again and review your wallet.");
    };
    const events = wallet.provider.on && wallet.provider.removeListener ? ["accountsChanged", "chainChanged", "disconnect"] : [];
    events.forEach(event => wallet.provider.on?.(event, invalidated));
    this.unlisten = () => events.forEach(event => wallet.provider.removeListener?.(event, invalidated));
  }
  reset(error?: string) {
    if (this.disposed) return;
    this.generation++;
    this.state.wallet?.cancel?.();
    this.update({ stage: error ? "error" : "choose", wallet: this.state.wallet, error });
  }
  clear() {
    if (this.disposed) return;
    this.generation++; this.unlisten();
    this.state.wallet?.cancel?.();
    this.update({ stage: "choose", error: "Wallet provider changed. Choose your wallet again." });
  }
  dispose() { this.generation++; this.disposed = true; this.unlisten(); this.state.wallet?.cancel?.(); }
  async connect() {
    const wallet = this.state.wallet;
    if (!wallet || this.disposed || !["choose", "error"].includes(this.state.stage)) return;
    const generation = ++this.generation;
    this.update({ stage: "connecting", wallet });
    try {
      const connection = await connectWallet(wallet.provider);
      if (!this.disposed && generation === this.generation) this.update({ stage: "review", wallet, connection });
    } catch (cause) {
      if (!this.disposed && generation === this.generation) this.reset(walletLoginError(cause));
    }
  }
  async sign(continueTo: (destination: string) => void) {
    const { wallet, connection } = this.state;
    if (this.disposed || this.state.stage !== "review" || !wallet || !connection) return;
    const generation = this.generation;
    const check = () => { if (this.disposed || generation !== this.generation) throw new Error("Wallet attempt expired. Connect again."); };
    // Lock synchronously; a second click cannot start another nonce/signature.
    this.update({ stage: "signing", wallet, connection });
    try {
      const destination = await loginWithWallet(wallet.provider, this.origin, this.client, this.params,
        message => { check(); this.update({ ...this.state, message }); },
        { connection, check, onStage: stage => { check(); this.update({ ...this.state, stage }); } });
      check();
      this.update({ ...this.state, stage: "continuing" });
      check();
      continueTo(destination);
    } catch (cause) {
      if (!this.disposed && generation === this.generation) this.reset(walletLoginError(cause));
    }
  }
}
