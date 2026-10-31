import { oauthProviderClient } from "@better-auth/oauth-provider/client";

/** SIWE 1.7.11 has strict request bodies. Keep nonce requests free of OAuth query fields. Verification accepts the
 * signed query through our composed SIWE endpoint. */
export function walletOAuthProviderClient() {
  const plugin = oauthProviderClient();
  const fetchPlugin = plugin.fetchPlugins[0];
  return {
    ...plugin,
    fetchPlugins: [{
      ...fetchPlugin,
      hooks: {
        ...fetchPlugin.hooks,
        onRequest: (async (ctx) => {
          if (new URL(ctx.url).pathname.match(/\/siwe\/(nonce|get-nonce)$/)) return;
          return fetchPlugin.hooks.onRequest(ctx);
        }) satisfies typeof fetchPlugin.hooks.onRequest,
      },
    }],
  };
}
