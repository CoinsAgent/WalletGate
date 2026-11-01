"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionQuery } from "@/data/user/session-query";
import { useSignOutMutation } from "@/data/user/sign-out-mutation";
import { authClient, walletAuthClient } from "@/lib/auth-client";
import { discoverWallets, type WalletChoice } from "@/lib/wallet-discovery";
import { WalletLoginFlow, type WalletFlowState } from "@/lib/wallet-login-flow";
import { metamaskRemote } from "@/lib/metamask-remote";
import { OAuthPlayground } from "../oauth-playground";

export default function SignIn({ origin }: { origin: string }) {
  const params = useSearchParams();
  const query = params.toString();
  const isRP = params.has("client_id");
  const { data: session, isPending, error: sessionError, refetch } = useSessionQuery();
  const signOut = useSignOutMutation();
  const [wallets, setWallets] = useState<WalletChoice[]>([]);
  const [remote, setRemote] = useState<WalletChoice>();
  const [returned, setReturned] = useState(false);
  const [state, setState] = useState<WalletFlowState>({ stage: "choose" });
  const flow = useRef<WalletLoginFlow | null>(null);
  const discovery = useRef<ReturnType<typeof discoverWallets> | null>(null);
  const [originError, setOriginError] = useState<string>();
  useEffect(() => {
    const controller = new WalletLoginFlow(origin, walletAuthClient.siwe, new URLSearchParams(query), setState);
    flow.current = controller;
    const connector = metamaskRemote(origin, process.env.NEXT_PUBLIC_METAMASK_RPC_URLS);
    setRemote(connector);
    setState(controller.state);
    setOriginError(window.location.origin === origin ? undefined : `Open ${origin} to sign in on the configured domain.`);
    return () => { controller.dispose(); connector.dispose(); flow.current = null; };
  }, [origin, query]);
  useEffect(() => {
    const foreground = () => { if (document.visibilityState === "visible") setReturned(true); };
    document.addEventListener("visibilitychange", foreground);
    return () => document.removeEventListener("visibilitychange", foreground);
  }, []);
  useEffect(() => {
    const listener = discoverWallets(window, choices => {
      setWallets(choices);
      const selected = flow.current?.state.wallet;
      if (selected && selected.id !== "metamask-remote" && !choices.some(c => c.provider === selected.provider)) flow.current?.clear();
    });
    discovery.current = listener;
    return () => { listener.stop(); discovery.current = null; };
  }, []);
  const { data: accounts, error: accountsError, isFetching: loadingAccounts } = useQuery({
    queryKey: ["wallet-login", "accounts", session?.user.id], enabled: !!session && !isRP,
    async queryFn() {
      const result = await authClient.listAccounts();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
  const walletAccounts = accounts?.filter(a => a.providerId === "siwe") ?? [];
  const hasLinkedWallet = !!session && walletAccounts.length > 0 && !accountsError;
  const busy = ["connecting", "signing", "verifying", "continuing"].includes(state.stage);
  const status = { choose: "Choose a wallet to begin.", connecting: "Connecting wallet…", review: "Review your wallet before signing.", signing: "Confirm the sign-in message in your wallet…", verifying: "Verifying your signature…", continuing: "Continuing…", error: "Connect again or choose another wallet." }[state.stage];

  return <div className="container mx-auto space-y-8 px-4 py-10">
    <h1 className="text-center text-2xl font-bold">WalletGate — Sign in with Ethereum</h1>
    <div className={isRP ? "mx-auto max-w-lg" : "grid grid-cols-1 gap-8 md:grid-cols-2"}>
      <Card className="min-w-0">
        <CardHeader><CardTitle>Sign in with Ethereum</CardTitle>
          <CardDescription>Choose your wallet, connect, then sign a message. No gas fee.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="break-all text-sm">Sign-in domain: {new URL(origin).host}</p>
          <fieldset className="space-y-2">
            <legend className="mb-2 font-medium">1. Choose your wallet</legend>
            {[...wallets, ...(remote ? [remote] : [])].map(wallet => <Button key={wallet.id} type="button" variant="outline"
              className="w-full h-auto min-h-11 whitespace-normal break-all aria-pressed:border-primary aria-pressed:bg-muted" aria-label={wallet.name} aria-pressed={state.wallet?.id === wallet.id}
              onClick={() => { setReturned(false); flow.current?.select(wallet); }}>{wallet.name}{state.wallet?.id === wallet.id && <span aria-hidden="true"> ✓</span>}</Button>)}
          </fieldset>
          {!wallets.length && <p>No Ethereum wallet found in this browser. On mobile, choose MetaMask app to connect and return to this browser tab. You can also open this page in your wallet app’s browser. On desktop, enable a wallet extension, then refresh wallets.</p>}
          {state.wallet?.id === "metamask-remote" && <p role="note">Keep this tab open. Approve connection in MetaMask, then return here to review your address and sign in. {returned ? "Back in this browser? Wait for the response, or cancel and connect again if the app did not open." : "If MetaMask is missing or the app launch is blocked, cancel and install or open MetaMask before retrying."} A wallet connection alone does not sign you in.</p>}
          <Button variant="ghost" className="min-h-11" onClick={() => discovery.current?.refresh()}>Refresh wallets</Button>
          <p className="text-xs text-muted-foreground">Wallet names are supplied by extensions. Choose a wallet you trust.</p>
          {state.connection && <div className="space-y-2 rounded-md bg-muted p-3" aria-label="Wallet review">
            <h2 className="font-medium">3. Review and sign</h2>
            <p className="break-all">Address: {state.connection.address}</p>
            <p>Chain ID: {state.connection.chainId}</p>
            <p className="break-all">Domain: {new URL(origin).host}</p>
            <p>A signature proves control of this address for this sign-in.</p>
          </div>}
          <p role="status" aria-live="polite">{status}</p>
          {(state.error || originError) && <p role="alert" className="text-destructive">{originError || state.error}</p>}
          {state.message && <details className="text-sm"><summary className="cursor-pointer">SIWE message</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{state.message}</pre></details>}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {state.stage === "review" ? <Button className="w-full min-h-11" disabled={!!originError} onClick={() => void flow.current?.sign(destination => {
            if (isRP || params.has("callbackUrl")) window.location.assign(destination);
            else { void refetch(); flow.current?.reset(); }
          })}>Sign in with Ethereum</Button> : <Button className="w-full min-h-11" disabled={!state.wallet || busy || !!originError || signOut.isPending}
            onClick={() => void flow.current?.connect()}>2. Connect wallet</Button>}
          {(busy || state.stage === "review") && <Button variant="outline" className="w-full min-h-11" onClick={() => flow.current?.reset()}>Cancel attempt</Button>}
        </CardFooter>
      </Card>
      {!isRP && <Card className="min-w-0">
        <CardHeader><CardTitle>Session information</CardTitle><CardDescription>
          {isPending || (session && loadingAccounts) ? "Loading session…" : hasLinkedWallet ? "This account has a linked wallet. Session origin is not certified here." : session ? "Sign in with Ethereum to continue with a wallet account." : "You are not logged in."}
        </CardDescription></CardHeader>
        <CardContent>
          {(sessionError || accountsError) && <p role="alert">{sessionError?.message || accountsError?.message}</p>}
          {walletAccounts.map(a => <p key={a.id} className="break-all">Linked wallet: {a.accountId}</p>)}
          {session ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-xs">{JSON.stringify(session, null, 2)}</pre> : <p>Sign in with your wallet to view your session.</p>}
        </CardContent>
        {session && <CardFooter><Button disabled={signOut.isPending || busy} onClick={() => signOut.mutate(undefined)}>Sign out</Button></CardFooter>}
      </Card>}
    </div>
    {!isRP && <OAuthPlayground key={session?.session.id ?? "signed-out"} user={hasLinkedWallet ? session?.user : undefined} />}
  </div>;
}
