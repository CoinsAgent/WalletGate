import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["experiments/c01/*.test.ts"], environment: "node", testTimeout: 20000, fileParallelism: false } });
