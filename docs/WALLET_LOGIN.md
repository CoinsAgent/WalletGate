# Wallet login

Start sign-in from your application so its authorization request stays attached
to the journey. Choose an available Ethereum wallet, connect it, then review
the address, chain ID and sign-in domain before selecting **Sign in with
Ethereum**. Signing a message costs no gas. The application consent screen
lets you authorize access or cancel and return to the application.

WalletGate discovers injected providers through EIP-6963 and supports the
legacy browser provider. Wallet names come from extensions and do not certify
their vendor. Discovery itself requests neither accounts nor signatures.

If no wallet appears, enable your desktop wallet extension and select
**Refresh wallets**. On mobile, open the original application sign-in link in
your wallet app's browser. Remote pairing, QR connections and universal links
are outside this flow. Use a wallet whose injected provider supports account
access, chain queries and message signing.

Declined requests, disconnected wallets and verification failures allow another
connection attempt. Each signing retry requests a fresh nonce. Account, network
or provider changes invalidate the unfinished attempt and require connection
and review again. **Cancel attempt** discards pending UI results; it cannot
revoke a session if verification has already reached the server.

## Local acceptance

`pnpm exec playwright test --config playwright.wallet.config.ts` runs desktop
and mobile viewport journeys against a disposable Next.js server and SQLite
database. The test-only injected wallets sign through the harness; the actual
production SIWE and consent routes handle authentication. An independent HTTP
RP exchanges the code and checks signed ID Tokens and bearer UserInfo.

The runner is pinned to Playwright 1.58.2. Set `WALLET_TEST_CHROMIUM` to an
available Chromium executable when the configured local cache path differs.
Local loopback listeners and writable temporary directories are required.
Screenshots and failure traces go under the configured PH-005 evidence folder;
use `--output <new-path>` to preserve earlier runs.

Simulated wallets and viewport emulation do not certify real extensions,
wallet-app handoff or device compatibility. Seeded test clients do not establish
owner-authorized registration. Address subjects, session lifecycle, wallet
linking and owner policies remain governed by the Product Contract's open
decisions. WG-012 remains partially covered.

## MetaMask app transport (PH-005 amended delivery)

In an external mobile browser, choose **MetaMask app**, then **Connect wallet**.
Approve in MetaMask and return to the original browser tab. Review the address
and domain here, then explicitly sign the fresh SIWE message. Connector session
restoration alone never establishes a WalletGate session. Keep this tab open;
reloading must restart the login journey rather than copying a signature or
WalletGate session into a URL.

The lazy client-only adapter pins `@metamask/connect-evm` 2.1.1 (multichain
1.2.0); it does not use the deprecated `@metamask/sdk`. Production SDK source:
`@metamask/connect-evm/dist/browser/es/connect-evm.mjs`, and
`@metamask/connect-multichain/dist/browser/es/connect-multichain.mjs` in the
locked packages. The factory disables analytics and automatic discovery
announcements, prefers the mobile transport, and advertises only the configured
origin as dapp URL. It never passes the OAuth authorization query as metadata.
The SDK manages relay handshake/deeplinks. WalletGate does not accept a custom
return URL, signature or session from a navigation query.

Operators must supply `NEXT_PUBLIC_METAMASK_RPC_URLS` as a JSON object mapping
hex chain IDs to public HTTPS RPC endpoints. There is deliberately no default
endpoint or new chain-support policy. This configuration is included in the
browser bundle: **do not put private credentials here**. A syntactic example
(nonfunctional reserved domain) is `{"0x1":"https://rpc.example.test"}`.
Configure real endpoints appropriate to your deployment, quotas and existing
chain policy. Connect EVM 2.1.1 requires a nonempty map; its `connect` method
always includes Ethereum mainnet in requested wallet permissions as a bootstrap
fallback. This transport behavior does not certify server smart-contract-wallet
support or approve Contract section 5 chain/identity policies. Missing or invalid
configuration produces a recovery message and does not initialize the SDK.
See the [official API reference](https://docs.metamask.io/metamask-connect/evm/reference/methods/)
and [supported platforms](https://docs.metamask.io/metamask-connect/supported-platforms/).

If the app is absent, launch is blocked or a relay does not respond, keep the
browser tab open, cancel, check/install/open MetaMask, and connect again. The
connection timeout is 90 seconds; browser timer throttling may delay the visible
timeout while backgrounded. Returning to the foreground never submits a
signature or authenticates automatically. Cancellation invalidates the UI attempt
and disconnects the connector transport; it cannot revoke a WalletGate session
from an already-submitted verification request. Account/network/disconnect
events after connection invalidate the reviewed attempt. A stale response cannot
verify or navigate a later attempt.

### Physical-device checklist

Status: **DEFERRED — PH-005-D01; not executed.** The user confirms no physical
Android Chrome/MetaMask device is available and authorizes closing PH-005 on its
automated acceptance. The cases below remain required follow-up when a device
is available. Browser fixtures and Chromium SDK launch checks do not establish
installed-app approval or original-tab return on a real phone. See the
[deferral record](plans/progress/PH-005.md#deferred-physical-device-acceptance)
for scope, follow-up and closure criteria. WG-012 remains PARTIAL.

Record Android version, device model, Chrome version, MetaMask version, IdP
origin/TLS, configured network IDs/RPC service and test timestamp when executing:

- External Chrome, no injected provider: select MetaMask app; connection opens
  installed MetaMask; return to the original Chrome tab with OAuth query intact.
- Review address/domain; sign fresh SIWE; return to Chrome; consent and RP callback
  succeed with state, PKCE, signed ID Token and UserInfo checks.
- Reject connection and signing; retry with fresh nonce. Cancel while app is open;
  a late response must not advance the cancelled attempt.
- App missing, blocked launch, offline/relay loss, timeout, account/network change,
  background/foreground, tab reload and browser back each recover safely.
- Inspect network/deeplink metadata: no full authorization query, WalletGate
  session cookie, or resulting SIWE signature in navigation URLs.

This checklist is deferred acceptance, not device certification. Seeded RP clients
remain test fixtures, not proof of wallet-owner-authorized registration.

### Real SDK app-launch regression

For Connect EVM 2.1.1 / Connect Multichain 1.2.0, keep
`ui.preferExtension: true` with `showInstallModal: false`. Despite its name,
setting `preferExtension: false` forces the SDK install/QR modal when there is
no injected extension, bypassing the mobile deeplink branch. The existing
injected-wallet chooser still selects its own provider separately.

Run the real installed SDK against the preview with:

```bash
WALLET_REAL_SDK_URL=https://walletgate.beeswarm.dev node node_modules/@playwright/test/cli.js test --config playwright.metamask.config.ts
```

The suite observes Chrome's external `metamask://connect/mwp` navigation/launch
diagnostic and rejects missing-user-activation errors. It does not replace SDK
methods or provide a wallet/signature; it requires access to the SDK's actual
relay service. It also checks that no SIWE verification was submitted and the
fresh browser context remains signed out. Tracing is disabled so pairing URLs
are not retained in trace files. Without the explicit preview origin, it uses
the disposable Next/SQLite fixture with the actual SDK and public RPC map;
running a second Next compiler alongside the preview may require more memory.

Both projects use Chromium: Android Chrome and an iPhone user-agent/device
profile. This checks SDK platform routing, not Safari/WebKit compatibility or
opening an installed native app. Physical Android/Chrome/MetaMask acceptance
remains required for actual app opening, wallet approval and original-tab return.
