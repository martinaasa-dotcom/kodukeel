import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, ".") } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "prisma/**/*.test.ts"],
    /*
      Several tests are sweeps rather than examples: every combination the
      plan screen can be clicked into, every evening of the course ladder.
      They take one to two seconds alone and, under the full suite on a
      four-core machine, crossed the default five and failed as timeouts in
      two separate runs on 2026-09-24, on code nobody had touched. A timeout
      that fires on load rather than on a hang is a flake, and a flake is a
      check people learn to re-run. Twenty seconds still catches a hang.
    */
    testTimeout: 20_000,
  },
});
