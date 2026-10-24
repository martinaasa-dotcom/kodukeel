import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isClientReviewId } from "@/lib/offline/outbox";
import { isRepeatedReview, writeGrade } from "@/lib/srs/grade";
import type { RatingValue } from "@/lib/srs/scheduler";
import { snapshotOf } from "@/lib/srs/undo";

/*
  ONE GRADE ON THE SERVER, FOR EVERY DOOR THAT HAS ALREADY RESOLVED ITS OWNER.

  These two lived in `app/actions.ts` beside `gradeCard`, which is the action
  the review screen calls, and every mode marked on the server reached them
  from there. A finished conversation grades through `gradeOnce`, and since
  `POST /api/v1/scenes/{runId}/finish` finishes one too (ADR-029), the two
  came out of the actions file unchanged, so the web's actions and the route
  grade through one writer rather than two.
*/

/**
 * `gradeCard` for a caller that has already resolved the owner, which is every
 * mode graded on the server. `reviewId` is for the games that report a round
 * once and may report it again (`stableReviewId`): it is never taken from the
 * caller of a public action, only derived here from what the grade is about.
 * A second write of it throws on the primary key; `gradeOnce` is the caller
 * that reads that as the same answer arriving twice.
 */
export async function gradeFor(
  ownerId: string, cardId: string, rating: RatingValue, durationMs: number,
  options: { reviewedAt?: string; practisedSlot?: string; reachedSlot?: string; reviewId?: string; spoken?: boolean } = {},
) {
  const { reviewedAt, practisedSlot, reachedSlot, reviewId, spoken } = options;

  if (reviewId !== undefined && !isClientReviewId(reviewId)) {
    return { ok: false as const, error: "That answer didn't come through properly, so it wasn't saved." };
  }

  /*
    `Review` IS APPEND-ONLY, SO A BAD ROW IS PERMANENT.

    `rating` is typed here and is a number off a POST body at runtime. Nothing
    checked it, so a 7 or a NaN would have been written into the one table this
    app cannot repair, read back by every chart and fed to the scheduler. The
    four values are the four the scheduler defines.
  */
  if (rating !== 1 && rating !== 2 && rating !== 3 && rating !== 4) {
    return { ok: false as const, error: "That isn't one of the ratings." };
  }

  const card = await prisma.card.findFirst({ where: { id: cardId, ownerId } });
  if (!card) return { ok: false as const, error: "We couldn't find that card. It may have been removed." };

  /*
    A grade carries the time it was actually answered, because the offline
    outbox replays in order with the timestamp it was given (ADR-015), and a
    device's clock is whatever its owner set it to. `writeGrade` bounds it at
    both ends and is the one place either door writes a grade: this one had the
    floor at the card's own creation and the replay path, which is the door
    those timestamps actually come through, did not.
  */
  const next = await writeGrade(ownerId, {
    card,
    rating,
    durationMs,
    reviewedAt: reviewedAt ? new Date(reviewedAt) : new Date(),
    practisedSlot,
    reachedSlot,
    reviewId,
    spoken,
  });

  revalidatePath("/");
  /*
    The state the server just wrote, so the session can hand it back to undo.

    `cards` is snapshotted on mount and its scheduling is never refreshed,
    which is right for the queue and was wrong for undo: an "Again" puts a card
    back into the same session, so a card can be graded twice, and both grades
    recorded the same mount-time state as the one to restore. Undoing the
    second rewound past the first as well, dropping a lapse the learner really
    had and sending a card they had just failed away on its old interval.
  */
  return { ok: true as const, due: next.due, scheduling: snapshotOf(next) };
}

/**
 * `gradeFor` with an id derived from what the grade is about, where a repeat is
 * the same answer reported twice and is done rather than failed. `repeat` says
 * so, so a caller counting new grades does not count it again.
 */
export async function gradeOnce(
  ownerId: string, cardId: string, rating: RatingValue, reviewId: string,
  slots: { practisedSlot?: string; reachedSlot?: string; spoken?: boolean } = {},
) {
  /*
    Asked first rather than only caught, so the answer does not depend on how
    `writeGrade` treats an id it has already written: a repeat that is read
    here never reaches it, and the catch below is the two reports racing.
  */
  const seen = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (seen) return { ok: true as const, repeat: true };
  try {
    const result = await gradeFor(ownerId, cardId, rating, 0, { ...slots, reviewId });
    return { ...result, repeat: false };
  } catch (error) {
    if (isRepeatedReview(error)) return { ok: true as const, repeat: true };
    throw error;
  }
}
