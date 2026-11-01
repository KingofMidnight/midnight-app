import { defineConfig } from "vitest/config";

// Unit tests: no network, no database. `npm test`
export default defineConfig({
  test: {
    environment: "node",
    env: { NODE_ENV: "test" },
    include: ["tests/unit/**/*.test.ts"],
  },
});
