import { requireUserId } from "@/lib/auth/session";
import { isExactForm } from "@/lib/dict/forms";
import { bucketForOwner, checkRateLimit, rateLimited } from "@/lib/security/rateLimit";
import { NO_STORE } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

/** One turn rarely holds more than a dozen words; this bounds a hostile request, not an honest one. */
const MAX_WORDS = 60;
const MAX_WORD = 40;

/**
 * WHICH OF THE WORDS JUST HEARD ARE ESTONIAN SPELLINGS AT ALL.
 *
 * Half of the unsure rule (docs/39-speech.md section 3.6): a word the forms
 * list does not hold is drawn dotted, and only such a word may be repaired
 * (`lib/speech/reconcile.ts`). The forms list is 15 MB of shards on the server
 * (`lib/dict/forms.ts`), so the page asks here once a turn is finished, with
 * the words and nothing else. Offline the question is not asked and only the
 * two decodings decide what is unsure, which errs toward marking less.
 *
 * Words only: no audio reaches this or any route (ADR-028), and nothing sent
 * here is kept. A Route Handler rather than a Server Action because the native
 * apps will ask the same question (docs/41-fifth-batch.md, VB-3).
 */
export async function POST(request: Request) {
  const ownerId = await requireUserId();
  // A turn asks once. Sixty a minute is a turn a second, which nobody speaking reaches.
  const limit = checkRateLimit(`speech-forms:${bucketForOwner(ownerId)}`, 60, 60_000);
  if (!limit.ok) return rateLimited(limit, "That was a lot at once. Give it a moment.");

  let words: string[];
  try {
    const body = (await request.json()) as { words?: unknown };
    if (!Array.isArray(body.words)) throw new Error("no words");
    words = body.words
      .filter((word): word is string => typeof word === "string")
      .map((word) => word.normalize("NFC").trim().toLocaleLowerCase("et"))
      .filter((word) => word.length > 0 && word.length <= MAX_WORD)
      .slice(0, MAX_WORDS);
  } catch {
    return Response.json({ error: "That request could not be read." }, { status: 400, headers: NO_STORE });
  }

  const distinct = [...new Set(words)];
  const answers = await Promise.all(distinct.map(async (word) => [word, await isExactForm(word)] as const));
  return Response.json(
    { known: answers.filter(([, known]) => known).map(([word]) => word), asked: distinct },
    { headers: NO_STORE },
  );
}
