import { requireUserId } from "@/lib/auth/session";
import { FORMS_PER_MINUTE, heardSpellings } from "@/lib/progress/speechForms";
import { bucketForOwner, checkRateLimit, rateLimited } from "@/lib/security/rateLimit";
import { NO_STORE } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

/**
 * WHICH OF THE WORDS JUST HEARD ARE ESTONIAN SPELLINGS AT ALL.
 *
 * The body is `heardSpellings` (lib/progress/speechForms.ts), which
 * `POST /api/v1/speech/forms` calls too. A Route Handler rather than a Server
 * Action because the native apps ask the same question
 * (docs/41-fifth-batch.md, VB-3).
 */
export async function POST(request: Request) {
  const ownerId = await requireUserId();
  const limit = checkRateLimit(`speech-forms:${bucketForOwner(ownerId)}`, FORMS_PER_MINUTE, 60_000);
  if (!limit.ok) return rateLimited(limit, "That was a lot at once. Give it a moment.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That request could not be read." }, { status: 400, headers: NO_STORE });
  }
  const answer = await heardSpellings(body);
  if (!answer.ok) {
    return answer.refusal === "switched_off"
      ? Response.json({ error: "This installation has speaking switched off." }, { status: 503, headers: NO_STORE })
      : Response.json({ error: "That request could not be read." }, { status: 400, headers: NO_STORE });
  }
  return Response.json({ known: answer.known, asked: answer.asked }, { headers: NO_STORE });
}
