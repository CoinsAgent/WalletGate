import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: fileURLToPath(new URL("../../../", import.meta.url)),
	test: {
		include: ["app/**/sign-in/*.test.ts"],
		testTimeout: 10_000,
	},
});
