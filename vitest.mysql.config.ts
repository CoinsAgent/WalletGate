import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

const local = existsSync(".env.test") ? parseEnv(readFileSync(".env.test", "utf8")) : {};

export default defineConfig({
  resolve: { alias: { "@": new URL(".", import.meta.url).pathname } },
  test: {
    include: ["lib/**/*.mysql.test.ts"],
    environment: "node",
    env: { TEST_MYSQL_DATABASE_URL: process.env.TEST_MYSQL_DATABASE_URL ?? local.TEST_MYSQL_DATABASE_URL ?? "" },
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
