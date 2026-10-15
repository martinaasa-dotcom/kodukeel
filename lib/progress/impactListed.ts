import { gatherImpact } from "@/lib/progress/impact";
import { impactListable, type Impact } from "@/lib/research/impact";
import { singleFlight } from "@/lib/cache/singleFlight";

/**
 * THE FIGURES /impact PRINTS, AND WHETHER IT LISTS ITSELF.
 *
 * The page is public and the read behind it is the deployment-wide aggregate
 * over the review log, so it is held for an hour per instance and made one at
 * a time: a page anybody can reload may not be a query anybody can repeat.
 * The figures are banded and rounded and quote the time they were read, so an
 * hour-old reading is the same claim made honestly.
 *
 * Whether the page is listed (the sitemap, `llms.txt`, the public footer and
 * its own `robots`) is `impactListable` over the same held figures, so the page
 * cannot be listed while its headline is withheld or hidden while it is not
 * (docs/38-third-batch.md, D3).
 *
 * A failed read is "nothing to show" and "not listed", and is asked again after
 * five minutes rather than an hour, so a database having a bad minute costs a
 * line in a footer and never a page. Every caller is rendered per request
 * (the public pages, the sitemap and `llms.txt` are all force-dynamic), so no
 * build bakes the build machine's database into a file.
 */
const HOLD_MS = 60 * 60 * 1000;
const RETRY_MS = 5 * 60 * 1000;
let held: { at: number; impact: Impact | null } | null = null;

export async function heldImpact(now: Date = new Date()): Promise<Impact | null> {
  if (held && now.getTime() - held.at < (held.impact ? HOLD_MS : RETRY_MS)) return held.impact;
  const impact = await singleFlight("impact", async () => {
    try {
      return await gatherImpact(now);
    } catch {
      return null;
    }
  });
  held = { at: now.getTime(), impact };
  return impact;
}

export async function impactIsListed(now: Date = new Date()): Promise<boolean> {
  const impact = await heldImpact(now);
  return impact !== null && impactListable(impact);
}
