import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { NodeSqliteDialect } from "@better-auth/kysely-adapter/node-sqlite-dialect";
import { oauthProvider } from "@better-auth/oauth-provider";
import { jwt, admin, multiSession, bearer } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { createAuthMiddleware, getAuthoritativeSessionFromCtx, APIError } from "better-auth/api";
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { createDemoSIWEPlugin } from "../../lib/siwe";
import { startAuthorization, submitConsent, exchangeCode, fetchUserInfo, registerTestClient } from "../../app/(auth)/sign-in/oauth-flow";
import { createLocalJWKSet, jwtVerify } from "jose";
import { getCurrentAuthEndpointContext } from "@better-auth/core/context";
import { siwe } from "better-auth/plugins";
import { verifyMessage } from "viem";
import { parseSiweMessage } from "viem/siwe";

export const origin = "http://localhost:3000";
// Public deterministic test keys only. Never funded or used outside this suite.
export const wallets = [1, 2].map(n => privateKeyToAccount(`0x${n.toString(16).padStart(64, "0")}` as `0x${string}`));
export async function setup(candidate = false, config: { provenance?: boolean; enforce?: boolean; cookieCache?: boolean; strict?: boolean } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "ph001-sqlite-"));
  const path = join(directory, "experiment.sqlite");
  const db = new DatabaseSync(path);
  const trace: string[] = [];
  const verified = new WeakMap<object, string>();
  const assertSession = async (ctx: any, sessionId: unknown, userId: unknown) => {
    const session = sessionId ? await ctx.context.adapter.findOne({ model: "session", where: [{ field: "id", value: sessionId }] }) : null;
    if (!session || session.userId !== userId || session.siweAddress !== userId || !session.siweAt || session.expiresAt <= new Date()) {
      throw new APIError("FORBIDDEN", { message: "Experimental SIWE provenance required" });
    }
  };
  const candidateSIWE = siwe({ domain: "localhost:3000", anonymous: true,
    getNonce: async () => crypto.randomUUID().replaceAll("-", ""),
    verifyMessage: async ({ address, message, signature }) => {
      try {
        const parsed = parseSiweMessage(message);
        if (!parsed.uri || new URL(parsed.uri).origin !== origin) return false;
        if (config.strict !== false) {
          // Bounded fixture profile: chain 1 or 10 EOA; exact generated grammar;
          // five-minute issued-at window. These are experiment assumptions only.
          const now = Date.now();
          if (!parsed.address || parsed.address.toLowerCase() !== address.toLowerCase() || parsed.domain !== "localhost:3000" || parsed.version !== "1" || ![1, 10].includes(parsed.chainId!) || !parsed.nonce || !parsed.issuedAt || !Number.isFinite(parsed.issuedAt.getTime()) || parsed.issuedAt.getTime() > now || now - parsed.issuedAt.getTime() > 300000) return false;
          if (parsed.expirationTime && (!Number.isFinite(parsed.expirationTime.getTime()) || now >= parsed.expirationTime.getTime())) return false;
          if (parsed.notBefore && (!Number.isFinite(parsed.notBefore.getTime()) || now < parsed.notBefore.getTime())) return false;
          const regenerated = createSiweMessage(parsed as Parameters<typeof createSiweMessage>[0]);
          if (regenerated.toLowerCase() !== message.toLowerCase()) return false;
        }
        const valid = await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` });
        if (valid) { verified.set(getCurrentAuthEndpointContext(), address.toLowerCase()); trace.push("verified"); }
        return valid;
      } catch { return false; }
    },
    // Hostile display label control: never use ENS as authoritative identity.
    ensLookup: async () => ({ name: wallets[1].address, avatar: "" }),
  });
  const options = {
    baseURL: origin, secret: "ph001-disposable-secret-32-characters-minimum", telemetry: { enabled: false },
    database: { dialect: new NodeSqliteDialect({ database: db }), type: "sqlite" as const, transaction: true },
    rateLimit: { enabled: false },
    ...(config.provenance ? {
      emailAndPassword: { enabled: true },
      session: { cookieCache: { enabled: !!config.cookieCache }, additionalFields: {
        siweAddress: { type: "string" as const, required: false, input: false },
        siweAt: { type: "date" as const, required: false, input: false },
      } },
      hooks: { before: createAuthMiddleware(async (ctx) => {
        if (!config.enforce) return;
        if (["/oauth2/authorize", "/oauth2/consent", "/oauth2/continue", "/multi-session/set-active", "/multi-session/list-device-sessions"].includes(ctx.path)) {
          const value = await getAuthoritativeSessionFromCtx(ctx);
          await assertSession(ctx, value?.session.id, value?.user.id);
          // Experimental strict selection rule: validate the target, and reject
          // a mixed device list wholesale rather than expose untrusted entries.
          // Never infer the target's provenance from the current session.
          const prefix = `${ctx.context.authCookies.sessionToken.name}_multi-`;
          const names = ctx.path === "/multi-session/set-active"
            ? [`${prefix}${String((ctx.body as { sessionToken?: unknown })?.sessionToken).toLowerCase()}`]
            : ctx.path === "/multi-session/list-device-sessions"
              ? (ctx.headers?.get("cookie") ?? "").split(";").map(c => c.trim().split("=")[0]).filter(n => n.startsWith(prefix))
              : [];
          for (const name of names) {
            const token = await ctx.getSignedCookie(name, ctx.context.secret);
            const target = typeof token === "string" ? await ctx.context.internalAdapter.findSession(token) : null;
            await assertSession(ctx, target?.session.id, target?.user.id);
          }
        }
      }) },
    } : {}),
    plugins: [...(config.provenance ? [admin(), multiSession(), bearer(), passkey()] : []), candidate ? candidateSIWE : createDemoSIWEPlugin(origin), jwt({ jwt: { issuer: origin } }), oauthProvider({
      loginPage: "/sign-in", consentPage: "/oauth/consent", allowDynamicClientRegistration: true,
      // Deliberate control fixture reproducing current app; never production approval.
      allowUnauthenticatedClientRegistration: true,
      scopes: ["openid", "profile", "email", "offline_access", "machine:read"],
      customIdTokenClaims: () => ({ sub: "forged-claim-sub", experiment: "control" }),
      customUserInfoClaims: () => ({ sub: "forged-userinfo-sub" }),
      extensions: config.enforce ? [{ claims: {
        idToken: async ({ ctx, sessionId, user }: any) => { await assertSession(ctx, sessionId, user?.id); return {}; },
        accessToken: async ({ ctx, sessionId, user, grantType }: any) => { if (user && grantType) await assertSession(ctx, sessionId, user.id); return {}; },
        userInfo: async ({ ctx, jwt: token, user }: any) => { await assertSession(ctx, token.sid, user.id); return {}; },
      } }] : [],
    })],
    databaseHooks: {
      user: { create: { before: async (user: any, ctx: any) => {
        trace.push(`user:${ctx?.path}`);
        const address = ctx && verified.get(ctx);
        return { data: candidate && address ? { ...user, id: address } : user };
      } } },
      session: { create: { before: async (session: any, ctx: any) => {
        trace.push(`session:${ctx?.path}`);
        const address = ctx && verified.get(ctx);
        return { data: config.provenance ? { ...session, siweAddress: address === session.userId ? address : null, siweAt: address === session.userId ? new Date() : null } : session };
      } } },
    },
  };
  await (await getMigrations(options)).runMigrations();
  const auth = betterAuth(options);
  await auth.$context;
  const request = (cookie = "") => async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("Origin", origin);
    if (init?.credentials !== "omit") headers.set("Cookie", cookie);
    return auth.handler(new Request(new URL(url, origin), { ...init, headers }));
  };
  const post = (url: string, body: any, cookie = "") => request(cookie)(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const login = async (wallet = wallets[0], extras: Record<string, unknown> = {}, lower = false, chainId = 1) => {
    const nonce = await (await post("/api/auth/siwe/nonce", {})).json();
    let message = createSiweMessage({ address: wallet.address, chainId, domain: "localhost:3000", uri: origin, version: "1", nonce: nonce.nonce });
    if (lower) message = message.replace(wallet.address, wallet.address.toLowerCase());
    const response = await post("/api/auth/siwe/verify", { message, signature: await wallet.signMessage({ message }), ...extras });
    const body = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(body));
    const cookie = response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
    return { body, cookie, message };
  };
  const authorize = async (cookie: string) => {
    const fetcher = request(cookie);
    const transaction = { clientId: await registerTestClient(fetcher), verifier: "a".repeat(64), challenge: createHash("sha256").update("a".repeat(64)).digest("base64url"), state: "ph001-state", nonce: "ph001-nonce", issuer: (await auth.api.getOpenIdConfig()).issuer, origin };
    const step = await startAuthorization(transaction, fetcher);
    if (step.type !== "consent") throw new Error(`Expected consent, got ${step.type}`);
    return { transaction, step, fetcher };
  };
  const consent = async (pending: Awaited<ReturnType<typeof authorize>>) => {
    const { transaction, step, fetcher } = pending;
    const callback = await submitConsent(transaction, step.query, true, fetcher);
    if (callback.type !== "code") throw new Error("Expected code");
    return { transaction, callback, fetcher };
  };
  const flow = async (cookie: string) => {
    const { transaction, callback, fetcher } = await consent(await authorize(cookie));
    const tokens = await exchangeCode(transaction, callback.code, fetcher);
    const claims = await verifyID(tokens.id_token!, transaction.clientId);
    return { tokens, claims, transaction, userinfo: await fetchUserInfo(tokens.access_token, fetcher) };
  };
  const verifyID = async (token: string, clientId: string) => {
    const jwks = await (await request()("/api/auth/jwks")).json();
    return (await jwtVerify(token, createLocalJWKSet(jwks), { issuer: origin, audience: clientId })).payload;
  };
  const refresh = async (result: Awaited<ReturnType<typeof flow>>) => {
    const response = await request()("/api/auth/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: result.transaction.clientId, refresh_token: result.tokens.refresh_token! }) });
    return { status: response.status, body: await response.json() };
  };
  return { auth, db, path, directory, trace, request, post, login, authorize, consent, flow, refresh, verifyID, close: () => { db.close(); rmSync(directory, { recursive: true, force: true }); } };
}
