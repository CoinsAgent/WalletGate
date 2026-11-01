// IdP-side test infrastructure. The independent RP imports none of this code.
import { cpSync, mkdtempSync, rmSync, symlinkSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { getMigrations } from "better-auth/db/migration";
import { createSiweMessage } from "viem/siwe";
import { privateKeyToAccount } from "viem/accounts";
interface FixtureRuntime {
  stubEnv(key: string, value: string): void;
  unstubAllEnvs(): void;
  resetModules(): void;
}
function nativeRuntime(): FixtureRuntime {
  const saved = new Map<string, string | undefined>();
  return {
    stubEnv(key, value) { saved.set(key, process.env[key]); process.env[key] = value; },
    unstubAllEnvs() { for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } },
    resetModules() {},
  };
}

export async function nextHTTPFixture(runtime: FixtureRuntime = nativeRuntime(), remoteSDKFixture = false, remoteRPCURLs?: string) {
  const root = process.cwd();
  const reservation = createServer();
  await new Promise<void>((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  const directory = mkdtempSync(join(tmpdir(), "walletgate-oidc-http-"));
  const issuer = `http://127.0.0.1:${port}`;
  const databasePath = join(directory, "auth.sqlite");
  let child: ChildProcess | undefined;
  let auth: typeof import("./auth").auth | undefined;
  let serverLog = "";
  let closed = false;
  const clients = ["independent-rp-a", "independent-rp-b"];
  const redirectURI = "http://127.0.0.1:8765/independent-callback";

  async function close() {
    if (closed) return;
    closed = true;
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const timeout = setTimeout(() => child?.kill("SIGKILL"), 5000);
      await exited;
      clearTimeout(timeout);
    }
    if (auth) {
      const driver = auth.options.database.dialect.createDriver();
      await driver.init(); await driver.destroy();
    }
    rmSync(directory, { recursive: true, force: true });
    runtime.unstubAllEnvs();
    console.log(JSON.stringify({ fixture: "oidc-http", serverStopped: true, disposableDirectoryRemoved: !existsSync(directory) }));
  }

  try {
    // Explicit allowlist: never copy .env, development databases, .git or .next.
    for (const path of ["app", "lib", "components", "hooks", "data", "public", "next.config.ts", "tsconfig.json", "package.json", "postcss.config.mjs"]) {
      if (existsSync(join(root, path))) cpSync(join(root, path), join(directory, path), { recursive: true });
    }
    if (remoteSDKFixture) {
      cpSync(join(root, "tests/fixtures/metamask-sdk.ts"), join(directory, "metamask-sdk-fixture.ts"));
      const configPath = join(directory, "next.config.ts");
      const config = readFileSync(configPath, "utf8");
      writeFileSync(configPath, config.replace("export default nextConfig;", `
nextConfig.webpack = config => {
  config.resolve.alias["@metamask/connect-evm"] = ${JSON.stringify(join(directory, "metamask-sdk-fixture.ts"))};
  return config;
};
export default nextConfig;`));
    }
    symlinkSync(resolve(root, "node_modules"), join(directory, "node_modules"), "dir");
    const env = {
      DEMO_SQLITE_PATH: databasePath, BETTER_AUTH_URL: issuer,
      BETTER_AUTH_SECRET: "ph004-disposable-http-test-secret-at-least-32-characters",
      USE_MYSQL: "false", MYSQL_DATABASE_URL: "", TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "",
      ...(remoteRPCURLs ? { NEXT_PUBLIC_METAMASK_RPC_URLS: remoteRPCURLs } : remoteSDKFixture ? { NEXT_PUBLIC_METAMASK_RPC_URLS: '{"0x1":"https://rpc.example.test"}' } : {}),
      SCIM_DEMO_ENABLED: "false", RESEND_API_KEY: "", STRIPE_SECRET_KEY: "",
    };
    for (const [key, value] of Object.entries(env)) runtime.stubEnv(key, value);
    runtime.resetModules();
    ({ auth } = await import("./auth"));
    await (await getMigrations(auth.options)).runMigrations();
    const context = await auth.$context;
    for (const clientId of clients) await context.adapter.create({ model: "oauthClient", data: {
      clientId, name: clientId, redirectUris: [redirectURI], tokenEndpointAuthMethod: "none",
      grantTypes: ["authorization_code", "refresh_token"], responseTypes: ["code"],
      scopes: ["openid", "profile", "offline_access"], applicationType: "native", requirePKCE: true,
      disabled: false, createdAt: new Date(), updatedAt: new Date(),
    } });
    // Child receives only runtime necessities and explicit disposable settings.
    child = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: directory,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1", ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout!.on("data", data => { serverLog += data.toString(); });
    child.stderr!.on("data", data => { serverLog += data.toString(); });
    const deadline = Date.now() + 120_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Next.js exited during startup: ${serverLog.slice(-5000)}`);
      try {
        const response = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(15_000) });
        if (response.ok) { ready = true; break; }
      } catch { /* Wait for the disposable server to bind and compile. */ }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error(`Next.js startup timed out: ${serverLog.slice(-5000)}`);
    console.log(JSON.stringify({ fixture: "oidc-http", serverReady: true, issuer, childPid: child.pid }));

    // Browser/IdP driver: fresh SIWE each time; does not select a reuse policy.
    async function authorize(url: URL, accept = true) {
      let cookie = "";
      const request = async (input: string | URL, init: RequestInit = {}) => {
        const headers = new Headers(init.headers);
        headers.set("Accept", "application/json"); headers.set("Origin", issuer);
        if (cookie) headers.set("Cookie", cookie);
        const response = await fetch(new URL(input, issuer), { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(30_000) });
        const received = response.headers.getSetCookie().map(c => c.split(";")[0]);
        if (received.length) cookie = received.join("; ");
        if (!response.ok) throw new Error(`IdP ${new URL(input, issuer).pathname}: HTTP ${response.status} ${await response.text()}`);
        return response.json();
      };
      const post = (path: string, body: unknown) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      let step = await request(url);
      for (let n = 0; n < 8; n++) {
        if (typeof step.url !== "string") throw new Error("Missing IdP continuation");
        const destination = new URL(step.url, issuer);
        if (destination.origin !== issuer) return destination.href;
        const query = destination.search.slice(1);
        if (destination.pathname === "/sign-in") {
          if (!destination.searchParams.has("sig")) throw new Error("Missing signed login continuation");
          const wallet = privateKeyToAccount(`0x${"1".padStart(64, "0")}`);
          const { nonce } = await post("/api/auth/siwe/nonce", {});
          const message = createSiweMessage({ address: wallet.address, chainId: 1, domain: new URL(issuer).host, uri: issuer, version: "1", nonce, issuedAt: new Date() });
          step = await post("/api/auth/siwe/verify", { message, signature: await wallet.signMessage({ message }), oauth_query: query });
        } else if (destination.pathname === "/oauth/select-account") {
          step = await post("/api/auth/oauth2/continue", { selected: true, oauth_query: query });
        } else if (destination.pathname === "/oauth/consent") {
          step = await post("/api/auth/oauth2/consent", { accept, oauth_query: query });
        } else throw new Error(`Unexpected IdP step: ${destination.pathname}`);
      }
      throw new Error("IdP continuation loop");
    }
    return { issuer, clients, redirectURI, authorize, close, serverLog: () => serverLog,
      count: (model: string) => context.adapter.count({ model }),
      isolation: { copiedEnvironmentFiles: false, disposableSQLite: true, actualNextHTTP: true },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
