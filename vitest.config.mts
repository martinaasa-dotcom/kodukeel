import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/*
  THE UNIT SUITE RUNS IN A ZONE NOBODY LIVES IN, ON PURPOSE.

  A unit test states its machine rather than inheriting one, and the zone is
  part of the machine. CI runs in UTC, so a test that built its dates with
  `Date.UTC` and read them back through a formatter that honours the reader's
  zone passed there and failed on every laptop east or west of Greenwich,
  Tallinn included, which is where the people running this suite live. Three
  of the clock tests were exactly that, green in CI and red on `npm test` in
  Estonia. Pinned to UTC the suite would have hidden them for ever; pinned
  here, a quarter-hour offset with its own summer time and thirteen hours from
  UTC, an assumption about the zone fails in CI and on every machine alike.
  An invariant holds this line (scripts/test-invariants.ts).
*/
process.env.TZ = "Pacific/Chatham";

export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, ".") } },
  test: { environment: "node", include: ["lib/**/*.test.ts", "prisma/**/*.test.ts"] },
});
