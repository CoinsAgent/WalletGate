// Independent public-client example: Node HTTP/crypto and jose only.
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface Metadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  id_token_signing_alg_values_supported: string[];
}
export interface Transaction {
  clientId: string;
  redirectURI: string;
  verifier: string;
  state: string;
  nonce: string;
}
export interface Tokens {
  access_token: string;
  token_type: string;
  id_token?: string;
  refresh_token?: string;
}

export class StandardRP {
  private readonly keys;
  private constructor(readonly metadata: Metadata) {
    this.keys = createRemoteJWKSet(new URL(metadata.jwks_uri));
  }

  static async discover(issuer: string) {
    const response = await fetch(new URL("/.well-known/openid-configuration", issuer), { redirect: "error", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Discovery failed: HTTP ${response.status}`);
    const metadata = await response.json() as Metadata;
    if (metadata.issuer !== issuer) throw new Error("Discovery issuer mismatch");
    for (const key of ["authorization_endpoint", "token_endpoint", "userinfo_endpoint", "jwks_uri"] as const) {
      if (new URL(metadata[key]).origin !== new URL(issuer).origin) throw new Error("Unexpected endpoint origin");
    }
    return new StandardRP(metadata);
  }

  start(clientId: string, redirectURI: string) {
    const transaction: Transaction = {
      clientId, redirectURI, verifier: randomBytes(32).toString("base64url"),
      state: randomBytes(24).toString("base64url"), nonce: randomBytes(24).toString("base64url"),
    };
    const url = new URL(this.metadata.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectURI, response_type: "code",
      scope: "openid profile offline_access", state: transaction.state, nonce: transaction.nonce,
      code_challenge: createHash("sha256").update(transaction.verifier).digest("base64url"),
      code_challenge_method: "S256", prompt: "consent",
    }).toString();
    return { transaction, url };
  }

  callback(transaction: Transaction, input: string) {
    const url = new URL(input);
    const expected = new URL(transaction.redirectURI);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname) throw new Error("Callback URI mismatch");
    const params = url.searchParams;
    if (params.getAll("state").length !== 1 || params.get("state") !== transaction.state) throw new Error("Callback state mismatch");
    if (params.getAll("iss").length !== 1 || params.get("iss") !== this.metadata.issuer) throw new Error("Callback issuer mismatch");
    if (params.has("error")) throw new Error(`Authorization denied: ${params.get("error")}`);
    if (params.getAll("code").length !== 1 || !params.get("code")) throw new Error("Missing or duplicate code");
    return params.get("code")!;
  }

  async tokenRequest(body: URLSearchParams): Promise<Tokens> {
    const response = await fetch(this.metadata.token_endpoint, {
      method: "POST", redirect: "error", credentials: "omit", signal: AbortSignal.timeout(30_000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
    const tokens = await response.json();
    if (!response.ok) throw new Error(`Token exchange failed: ${tokens.error ?? response.status}`);
    if (typeof tokens.access_token !== "string" || !/^Bearer$/i.test(tokens.token_type)) throw new Error("Invalid token response");
    return tokens;
  }

  exchange(transaction: Transaction, code: string, verifier = transaction.verifier) {
    return this.tokenRequest(new URLSearchParams({ grant_type: "authorization_code", client_id: transaction.clientId,
      redirect_uri: transaction.redirectURI, code, code_verifier: verifier }));
  }

  refresh(clientId: string, refreshToken: string) {
    return this.tokenRequest(new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken }));
  }

  async verifyIDToken(token: string, clientId: string, nonce: string, refreshed = false) {
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: this.metadata.issuer, audience: clientId,
      algorithms: this.metadata.id_token_signing_alg_values_supported.filter(algorithm => !algorithm.startsWith("HS")),
      requiredClaims: ["iss", "sub", "aud", "exp", "iat"],
    });
    if ((!refreshed || payload.nonce !== undefined) && payload.nonce !== nonce) throw new Error("ID Token nonce mismatch");
    return payload;
  }

  async userInfo(accessToken: string) {
    const response = await fetch(this.metadata.userinfo_endpoint, {
      credentials: "omit", redirect: "error", signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`UserInfo failed: HTTP ${response.status}`);
    const body = await response.json();
    if (typeof body.sub !== "string" || !body.sub) throw new Error("Missing UserInfo subject");
    return body as { sub: string; [key: string]: unknown };
  }
}
