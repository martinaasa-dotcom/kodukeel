import { bucketForRequest, rateLimited } from "@/lib/security/rateLimit";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";
import { NO_STORE } from "@/lib/security/headers";
import { reportError } from "@/lib/observability/report";
import { readCapped } from "@/lib/security/body";
import { demoSeed, demoTurn, demoTurns } from "@/lib/progress/demoScene";

/**
 * The café scene, played from the landing page by somebody with no account.
 *
 * Public, because the reader is deciding whether to make an account and a
 * demonstration behind one is a demonstration nobody sees. Nothing here can
 * cost money or touch anybody's data: no model is asked, nothing is written,
 * and the only input is a seed and the turns the browser has taken, clipped
 * and counted in `lib/progress/demoScene.ts`. What it does cost is database
 * reads, so it is capped twice, per visitor and for the whole deployment,
 * where every instance counts together (`checkSharedRateLimit`).
 */
export const dynamic = "force-dynamic";

/** Sixteen short turns and a seed is a few kilobytes; nothing honest sends more. */
const MAX_BODY_BYTES = 16_000;
/** A scene is about six turns; a visitor playing it twice in a minute is twelve. */
const PER_VISITOR = 40;
/** And a ceiling on the whole page's traffic, so a crowd cannot turn it into load. */
const EVERYONE = 1200;

export async function POST(request: Request) {
  const mine = await checkSharedRateLimit(`demo-scene:${bucketForRequest(request)}`, PER_VISITOR, 60_000);
  if (!mine.ok) return rateLimited(mine, "That was a lot of turns in a minute. Give it a moment and carry on.");
  const all = await checkSharedRateLimit("demo-scene:all", EVERYONE, 60_000);
  if (!all.ok) return rateLimited(all, "The café is busy right now. Try again in a minute.");

  // Read through a ceiling, since anybody can reach this, and JSON `null` is a body too.
  const raw = await readCapped(request, MAX_BODY_BYTES);
  let parsed: unknown = null;
  try { parsed = raw === null ? null : JSON.parse(raw); } catch { parsed = null; }
  const body = parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const seed = demoSeed(body?.["seed"]);
  const turns = demoTurns(body?.["turns"] ?? []);
  if (!seed || !turns) {
    return Response.json({ error: "That conversation could not be read." }, { status: 400, headers: NO_STORE });
  }

  try {
    const reply = await demoTurn(seed, turns);
    if (!reply) return Response.json({ error: "The café is closed today." }, { status: 404, headers: NO_STORE });
    return Response.json(reply, { headers: NO_STORE });
  } catch (error) {
    reportError(error, { at: "api/demo-scene" });
    return Response.json({ error: "Something went wrong at the counter. Try again." }, { status: 500, headers: NO_STORE });
  }
}
