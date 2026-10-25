import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { bucketForOwner, bucketForRequest, rateLimited } from "@/lib/security/rateLimit";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";
import { clipLimitKey, HEARD_PER_MINUTE, SPEECH_PER_MINUTE, speakClip, type ClipSource } from "@/lib/progress/speakClip";
import { NO_STORE } from "@/lib/security/headers";
import { readJsonCapped, JSON_BODY_BYTES } from "@/lib/security/body";

/**
 * Server-side proxy and cache for Estonian speech.
 *
 * The body is `speakClip` (lib/progress/speakClip.ts), which `POST /api/v1/tts`
 * calls too: the shared store, the in-flight joining and the ledger are there,
 * so one clip asked by a browser and a phone at once is one request to
 * TartuNLP. What stays here is the web's door: the cookie session, and the
 * limiter on the same key a phone's request is counted under.
 */
export async function POST(request: Request) {
  const transient = new URL(request.url).searchParams.get("transient") === "1";
  const ownerId = await requireUserId().catch(() => null);
  if (transient && !ownerId) {
    return Response.json(
      { error: "We couldn't check who was asking. Try again in a moment." },
      { status: 503, headers: { ...NO_STORE, "retry-after": "30" } },
    );
  }
  const limit = transient && ownerId
    ? await checkSharedRateLimit(clipLimitKey(bucketForOwner(ownerId), true), HEARD_PER_MINUTE, 60_000)
    : await checkSharedRateLimit(clipLimitKey(bucketForRequest(request, ownerId), false), SPEECH_PER_MINUTE, 60_000);
  if (!limit.ok) {
    return rateLimited(limit, transient
      ? "That's a lot of reading back at once. Give it a moment."
      : "That's a lot of audio at once. Give it a moment.");
  }

  let body: unknown;
  try {
    body = await readJsonCapped(request, JSON_BODY_BYTES);
  } catch {
    return NextResponse.json({ error: "Something went wrong sending that. Reload the page and try again." }, { headers: NO_STORE, status: 400 });
  }

  const spoken = await speakClip({ ownerId, body, transient });
  if (!spoken.ok) {
    return Response.json(
      { error: spoken.message, ...(spoken.reason ? { reason: spoken.reason } : {}) },
      {
        status: spoken.status,
        headers: {
          ...NO_STORE,
          ...(spoken.retryAfterSec ? { "retry-after": String(spoken.retryAfterSec) } : {}),
        },
      },
    );
  }
  return wav(spoken.audio, spoken.source);
}

/**
 * One clip, and an honest word about who is allowed to keep it.
 *
 * This used to send `public, max-age=31536000, immutable`, which reads as the
 * strongest caching statement HTTP has and did nothing whatsoever. There is no
 * `GET` here; a browser does not put a response to a `POST` in its HTTP cache,
 * and neither does a CDN. So the header described an intention on a transport
 * that cannot carry it, and the next person to read this file would have
 * believed repeat plays were free at the network layer when nothing at that
 * layer was involved.
 *
 * The caching is real, and it is in three other places, none of which reads
 * this header:
 *
 *   the page      `Speak` and `PairsSession` hold the blob for a clip they
 *                 have already fetched, so a replay inside one screen never
 *                 leaves the browser at all
 *   the worker    `audioWithCache` in public/sw.js builds a `GET`-shaped key
 *                 out of the request body and keeps the clip in the Cache API,
 *                 which is what makes review work with the network down. The
 *                 Cache API stores what it is told to store and ignores
 *                 `Cache-Control` entirely
 *   the server    `lib/audio/store.ts`, content-addressed and shared across
 *                 instances and learners, which is the one that keeps us a
 *                 polite consumer of a free academic service
 *
 * `no-store` rather than nothing, because it is the true statement: no HTTP
 * cache should hold this, and none would have anyway. The audio is not secret
 * and this is not protecting it — it is refusing to claim something that does
 * not happen. Turning this route into a `GET` would make the old header mean
 * something, and would put the sentence being spoken into every access log and
 * CDN log between here and the learner, which is a worse trade than one
 * accurate header.
 */
function wav(body: Buffer, cache: ClipSource) {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "content-type": "audio/wav",
      ...NO_STORE,
      // Which of the three caches answered, for the offline smoke test and for
      // anybody wondering whether the disk store is doing its job.
      "x-tts-cache": cache,
    },
  });
}
