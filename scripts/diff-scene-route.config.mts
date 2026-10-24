import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * The scene route's before-and-after record (`scripts/diff-scene-route.ts`).
 *
 * Its own config rather than the integration suite's, because it is not a test
 * that passes or fails: it writes down everything the route says and asks for,
 * and the launcher diffs two of those records. It runs against the local
 * database the integration suite uses, behind the same guard.
 */
export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "..") } },
  test: {
    root: resolve(import.meta.dirname, ".."),
    environment: "node",
    include: ["scripts/diff-scene-route.harness.ts"],
    globalSetup: ["scripts/itest-guard.ts"],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 1_800_000,
  },
});
