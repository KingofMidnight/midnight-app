import { defineConfig } from "vitest/config";

// Live tests: run the real API against the Supabase project in backend/.env, using
// throwaway users that are deleted afterwards. All migrations must be applied.
// `npm run test:live` — never run against a production project with real users' data
// you aren't comfortable touching (it creates/deletes test stories, reports, uploads).
export default defineConfig({
  test: {
    environment: "node",
    env: { NODE_ENV: "test" },
    include: ["tests/live/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
