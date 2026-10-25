import { requireUserId } from "@/lib/auth/session";
import { askAnu, QUESTIONS_PER_MINUTE, questionLimitKey } from "@/lib/progress/askAnu";
import { bucketForOwner, checkRateLimit, rateLimited } from "@/lib/security/rateLimit";
import { NO_STORE } from "@/lib/security/headers";
import { readJsonCapped } from "@/lib/security/body";

/*
  A question, the turns before it and what is on the screen behind Anu's panel,
  each clipped by `askAnu` and `lib/tutor/screen.ts`. A quarter of a megabyte
  is well past the sum of those clips and far short of what a caller could
  otherwise make the server hold before reading any of it.
*/
const TUTOR_BODY_BYTES = 256 * 1024;

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * A QUESTION TO ANU, FROM THE WEB.
 *
 * The body is `askAnu` (lib/progress/askAnu.ts), which `POST /api/v1/tutor`
 * calls too: the chain, the ledger, the learner's own context, the cleaning
 * pass, the check on her Estonian and the day's history are all there. What
 * stays here is the web's door: the cookie session, the per-minute limiter on
 * the key a phone's question is counted under, and the answer streamed with
 * the model that wrote it named in its headers.
 */
export async function POST(request: Request) {
  const ownerId = await requireUserId();

  const limit = checkRateLimit(questionLimitKey(bucketForOwner(ownerId)), QUESTIONS_PER_MINUTE, 60_000);
  if (!limit.ok) {
    return rateLimited(limit, "Anu's still catching up on your last few questions. Give her a moment.");
  }

  let body: unknown;
  try {
    body = await readJsonCapped(request, TUTOR_BODY_BYTES);
  } catch {
    return Response.json({ error: "Something went wrong sending that. Reload the page and try again." }, { headers: NO_STORE, status: 400 });
  }

  const answer = await askAnu(ownerId, body);
  if (!answer.ok) {
    return Response.json(
      { error: answer.message, ...(answer.reason ? { reason: answer.reason } : {}) },
      {
        status: answer.status,
        headers: {
          ...NO_STORE,
          ...(answer.retryAfterSec ? { "retry-after": String(answer.retryAfterSec) } : {}),
        },
      },
    );
  }

  return new Response(answer.stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...NO_STORE,
      // Which model answered is a fact about the answer, so it travels with it:
      // the run that answered, never the head of the chain.
      "x-model-provider": answer.provider,
      "x-model-id": answer.model,
    },
  });
}
