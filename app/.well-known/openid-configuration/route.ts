import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth";

// Keep metadata, request context and cache headers owned by the provider.
export const GET = oauthProviderOpenIdConfigMetadata(auth, {
  headers: process.env.NODE_ENV === "development"
    ? { "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Origin": "*" }
    : undefined,
});
