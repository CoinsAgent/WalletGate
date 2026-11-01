import { getAddress, stringToHex } from "viem";
import { createSiweMessage } from "viem/siwe";
import * as z from "zod";

export interface EthereumProvider {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
	request: (args: {
		method: string;
		params?: readonly unknown[];
	}) => Promise<unknown>;
}

export interface SIWEClient {
	nonce: () => Promise<{
		data?: { nonce: string } | null;
		error?: { message?: string } | null;
	}>;
	verify: (body: { message: string; signature: string }) => Promise<{
		data?: unknown;
		error?: { message?: string } | null;
	}>;
}

export interface WalletConnection { address: `0x${string}`; chainId: number }
export interface WalletAttempt {
  connection: WalletConnection;
  check: () => void;
  onStage?: (stage: "signing" | "verifying") => void;
}

export async function connectWallet(provider: EthereumProvider): Promise<WalletConnection> {
  const accounts = z.array(z.string()).min(1).parse(await provider.request({ method: "eth_requestAccounts" }));
  const address = getAddress(accounts[0]);
  const chain = z.string().regex(/^0x[\da-f]+$/i).parse(await provider.request({ method: "eth_chainId" }));
  const chainId = Number.parseInt(chain, 16);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("The wallet returned an invalid chain ID.");
  return { address, chainId };
}

async function confirmConnection(provider: EthereumProvider, attempt: WalletAttempt) {
  attempt.check();
  const accounts = z.array(z.string()).min(1).parse(await provider.request({ method: "eth_accounts" }));
  attempt.check();
  const chain = await provider.request({ method: "eth_chainId" });
  attempt.check();
  if (getAddress(accounts[0]) !== attempt.connection.address || typeof chain !== "string" || !/^0x[\da-f]+$/i.test(chain) || Number.parseInt(chain, 16) !== attempt.connection.chainId) {
    throw new Error("Wallet account or network changed. Connect again and review your wallet.");
  }
}

/** The guided flow supplies a reviewed connection and a stale-attempt guard.
 * Legacy callers can still connect and sign in one operation. */
export async function signInWithWallet(
	provider: EthereumProvider,
	origin: string,
	client: SIWEClient,
	onMessage?: (message: string) => void,
  attempt?: WalletAttempt,
) {
  const { address, chainId } = attempt?.connection ?? await connectWallet(provider);
  if (attempt) await confirmConnection(provider, attempt);
	const nonce = await client.nonce();
	if (nonce.error || !nonce.data?.nonce) {
		throw new Error(
			nonce.error?.message || "Could not request a sign-in nonce.",
		);
	}
  attempt?.check();
	const message = createSiweMessage({
		address,
		chainId,
		domain: new URL(origin).host,
		uri: new URL("/sign-in", origin).href,
		version: "1",
		nonce: nonce.data.nonce,
		statement: "Sign in to WalletGate.",
		issuedAt: new Date(),
		expirationTime: new Date(Date.now() + 5 * 60 * 1000),
	});
	onMessage?.(message);
  attempt?.check();
  attempt?.onStage?.("signing");
	const signature = z
		.string()
		.min(1)
		.parse(
			await provider.request({
				method: "personal_sign",
				params: [stringToHex(message), address],
			}),
		);
  if (attempt) await confirmConnection(provider, attempt);
  attempt?.check();
  attempt?.onStage?.("verifying");
  const verification = await client.verify({ message, signature });
  attempt?.check();
	if (verification.error) {
		throw new Error(verification.error?.message || "Wallet sign-in failed.");
	}
	const redirect = z.object({ redirect: z.literal(true), url: z.string().min(1) }).safeParse(verification.data);
	if (redirect.success) return redirect.data;
	return z
		.object({
			success: z.literal(true),
			user: z.object({
				id: z.string().min(1),
				walletAddress: z.string().regex(/^0x[\da-f]{40}$/i),
				chainId: z.number().int().positive(),
			}),
		})
		.parse(verification.data).user;
}
