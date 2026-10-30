import { cache } from "react";
import { countWaiting, type ReviewWaiting } from "./waitingCount";
import { isAdmin } from "@/lib/auth/admin";
import { supabaseConfigured } from "@/lib/auth/mode";

/**
 * WHAT IS WAITING FOR A REVIEWER, SAID WHEREVER A REVIEWER IS STANDING.
 *
 * The review queue was a page you had to remember to open, two presses deep
 * under a link everybody gets, and nothing anywhere said a report had arrived.
 * A queue nobody is told about is a queue that grows until somebody happens to
 * look, and every report in it is a learner who pressed a button and is waiting
 * to hear. So the rail, the phone sheet and Today each say how much is waiting,
 * to a reviewer and to nobody else, and each is one press from the queue.
 *
 * Two figures, because they are two kinds of work. A word to add is the one
 * thing only a reviewer can do for a learner, since a typed word stays theirs
 * alone until somebody passes it (`lib/dict/shared.ts`), so it is counted on
 * its own; everything else is one figure beside it. Both count **groups**
 * rather than rows, because the queue's unit is one decision
 * (`lib/suggestions/queue.ts`), and four people asking for one word is one
 * thing to do.
 *
 * Asked by the shell on every page, so it costs one indexed count for a
 * reviewer and nothing for anybody else, and the figure is held for half a
 * minute on the instance: a count a few seconds old is right for a badge, and
 * a reviewer's own decision clears it at once through `forgetReviewWaiting`.
 */
export { forgetReviewWaiting, type ReviewWaiting } from "./waitingCount";

/**
 * The figures for this request's viewer, or null where they are not a reviewer.
 *
 * Null as well on a copy with no sign-in when nothing is waiting: there the one
 * learner reviews their own reports, and a row saying none are open is a row
 * about nothing on every page. Deduplicated per request, so the shell and Today
 * asking in one render is one count.
 */
export const reviewWaiting = cache(async (): Promise<ReviewWaiting | null> => {
  if (!(await isAdmin())) return null;
  const value = await countWaiting();
  if (!supabaseConfigured() && value.words + value.other === 0) return null;
  return value;
});
