import { apiJson } from "@/lib/api/respond";
import type { ReviewResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { dailyReview } from "@/lib/progress/dailyQueue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * TODAY'S REVIEW SITTING, AS THE WEB'S REVIEW SESSION RECEIVES IT (N-4, ADR-029).
 *
 * The body is `dailyReview`, which the review page reads too (D2), so a phone
 * and a browser opening review at the same moment are asked the same cards in
 * the same order, held to the same course. Only the daily path: the drills on
 * the review page (a case, a unit, a photographed page) and the module's
 * closing round are the web's, because a phone's day is a lesson, a check or
 * the web (D15). The cards are what `ReviewCardSchema` names, field for field
 * with the web's `ReviewCard`.
 */
export async function GET(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const now = new Date();
  const sitting = await dailyReview(who.ownerId, null, now);
  const body: ReviewResponse = {
    builtAt: now.toISOString(),
    cards: sitting.cards,
    totalCards: sitting.totalCards,
    mode: sitting.mode,
    nextDue: sitting.nextDue ? { at: sitting.nextDue.at.toISOString(), line: sitting.nextDue.line } : null,
    waitingOnCourse: sitting.waitingOnCourse,
  };
  return apiJson(body);
}
