import { APIError, createAuthMiddleware } from "better-auth/api";

/** New authentication entry points only. Existing-session lifecycle is a separate policy. */
export const enforceWalletLogin = createAuthMiddleware(async (ctx) => {
  const path = ctx.path;
  if (
    ["/sign-in/", "/sign-up/", "/callback/", "/passkey/", "/sso/", "/two-factor/", "/electron/"].some(prefix => path.startsWith(prefix)) ||
    ["/admin/impersonate-user", "/device/token", "/verify-email"].includes(path)
  ) {
    throw new APIError("FORBIDDEN", {
      code: "SIWE_REQUIRED",
      message: "Sign in with your Ethereum wallet using SIWE.",
    });
  }
});
