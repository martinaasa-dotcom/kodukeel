import { apiError } from "@/lib/api/errors";
import { apiJson } from "@/lib/api/respond";
import type { WordResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { openEntry } from "@/lib/progress/dictionaryEntry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ONE DICTIONARY ENTRY, AS THE WEB'S ENTRY SCREEN READS IT (N-6, ADR-029).
 *
 * The body is `openEntry`, which the dictionary page calls too (D2): the entry
 * upgraded to the forms Ekilex records where a key is set, this learner's deck
 * and star, the sentences in the order a beginner reads them with the English
 * the dictionary holds, and an answer from the stored copy counted for /impact
 * (D17). Dictionary only: a word a model suggested is not found here and a
 * sentence a model supplied is left out, and no model is asked for anything.
 * A sentence somebody refused never arrives, on this door or the web's.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const { id } = await params;
  const { entry } = await openEntry(who.ownerId, id.slice(0, 64), { countAnswer: true, dictionaryOnly: true });
  if (!entry) return apiError("not_found", { message: "That word isn't in the dictionary." });
  const body: WordResponse = entry;
  return apiJson(body);
}
