import { createAuthEndpoint } from "better-auth/api";
import * as z from "zod";
import { siwe } from "better-auth/plugins";
import { getAddress, isHex, verifyMessage } from "viem";
import { parseSiweMessage } from "viem/siwe";

/** Configure wallet sign-in for the demo's public origin without RPC requests. */
export function createDemoSIWEPlugin(publicURL: string) {
	const origin = new URL(publicURL).origin;
	const plugin = siwe({
		domain: new URL(origin).host,
		anonymous: true,
		async getNonce() {
			return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
				byte.toString(16).padStart(2, "0"),
			).join("");
		},
		async verifyMessage({ address, message, signature }) {
			try {
				const { uri } = parseSiweMessage(message);
				if (
					!uri ||
					new URL(uri).origin !== origin ||
					!isHex(signature, { strict: true })
				) {
					return false;
				}
				return await verifyMessage({
					address: getAddress(address),
					message,
					signature,
				});
			} catch {
				return false;
			}
		},
	});
	const verify = plugin.endpoints.verifySiweMessage;
	return {
		...plugin,
		endpoints: {
			...plugin.endpoints,
			// Supported endpoint composition: retain the upstream strict SIWE
			// schema and verification, accepting only the provider's extra field.
			// OAuth's before/after hooks verify its signature and continue login.
			verifySiweMessage: createAuthEndpoint(verify.path, {
				...verify.options,
				body: verify.options.body.safeExtend({ oauth_query: z.string().optional() }),
			}, async ctx => {
				const { oauth_query: _query, ...body } = ctx.body;
				const result = await verify({ ...ctx, body, asResponse: false, returnHeaders: true });
				for (const [key, value] of result.headers.entries()) {
					if (key.toLowerCase() !== "set-cookie") ctx.setHeader(key, value);
				}
				for (const cookie of result.headers.getSetCookie()) ctx.responseHeaders.append("set-cookie", cookie);
				return ctx.json(result.response);
			}),
		},
	};
}
