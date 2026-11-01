import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: { alias: { "@": new URL(".", import.meta.url).pathname } },
	test: {
		include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
		exclude: ["lib/**/*.mysql.test.ts"],
		environment: "node",
		// Leave memory for the isolated Next.js process used by OIDC acceptance.
		maxWorkers: 2,
		testTimeout: 10_000,
	},
});
