/**
 * HOW MANY REQUESTS A SCRIPT MAY HAVE IN FLIGHT TO EKILEX, AND HOW TO ASK FOR MORE.
 *
 * `docs/05-integrations.md` section 1.4 promised two, and the harvest ran six
 * workers by default and the translation and semantic harvests five. Every
 * script that asks Ekilex now goes through the gate in `lib/ekilex/client.ts`,
 * which holds two in flight whatever the script's own worker count is, and
 * this is the one way past it: `--jobs=N` above two is clamped back to two
 * with a line saying so, unless `--past-the-limit` is passed as well, in which
 * case the gate is raised and a warning is printed. The Institute runs Ekilex
 * as a free academic service, so going past the promise is a thing somebody
 * says out loud rather than a default anybody inherits.
 */
import { EKILEX_IN_FLIGHT, ekilexGate } from "../../lib/ekilex/client";

export function ekilexJobs(args: readonly string[] = process.argv): number {
  const asked = Number(args.find((a) => a.startsWith("--jobs="))?.slice("--jobs=".length) ?? EKILEX_IN_FLIGHT);
  const wanted = Number.isFinite(asked) && asked >= 1 ? Math.floor(asked) : EKILEX_IN_FLIGHT;
  if (wanted <= EKILEX_IN_FLIGHT) {
    ekilexGate().setLimit(wanted);
    return wanted;
  }
  if (!args.includes("--past-the-limit")) {
    console.warn(
      `  --jobs=${wanted} asked for more than the ${EKILEX_IN_FLIGHT} requests in flight this app promised Ekilex, ` +
      `so it runs with ${EKILEX_IN_FLIGHT}. Add --past-the-limit to go past it.`,
    );
    ekilexGate().setLimit(EKILEX_IN_FLIGHT);
    return EKILEX_IN_FLIGHT;
  }
  console.warn(
    `  WARNING: ${wanted} requests in flight to Ekilex, past the ${EKILEX_IN_FLIGHT} promised in ` +
    "docs/05-integrations.md section 1.4. Ekilex is a free service the Institute runs; keep this run short.",
  );
  ekilexGate().setLimit(wanted);
  return wanted;
}
