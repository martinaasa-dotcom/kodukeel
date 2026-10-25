/*
  THE CARD A PHONE IS HANDED IS THE CARD THE WEB IS HANDED.

  `GET /api/v1/review` publishes `ReviewCardSchema`, and the web's review
  session is typed by `ReviewCard`. Both are built by `withChoices`, so the
  only way they come apart is somebody adding a field to one and not the
  other, which is exactly what a native client cannot see happening (D4 in
  docs/44-sixth-batch.md). This holds the two to each other in both
  directions, at compile time: `tsc --noEmit` fails on a field either side
  grows alone. The test body is there so the file is a test vitest runs.
*/
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import type { ReviewCard } from "@/lib/review/card";
import type { ReviewCardSchema, ReviewResponse } from "@/lib/api/contract";
import type { DailyReview } from "@/lib/progress/dailyQueue";
import type { ReplayItem } from "@/lib/srs/replay";
import type { PendingGrade } from "@/lib/offline/outbox";
import type { GradeItem } from "@/lib/api/contract";

/** True only where each type is assignable to the other. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type ContractCard = z.infer<typeof ReviewCardSchema>;

const cardsAgree: Same<ContractCard, ReviewCard> = true;
const sittingAgrees: Same<z.infer<typeof ReviewResponse>["cards"], DailyReview["cards"]> = true;
const modesAgree: Same<z.infer<typeof ReviewResponse>["mode"], DailyReview["mode"]> = true;
// A grade the route accepts is one the outbox's replay takes, field for field.
const gradesAgree: Same<z.infer<typeof GradeItem>, ReplayItem> = true;
const outboxAgrees: Same<z.infer<typeof GradeItem>, PendingGrade> = true;

describe("the v1 review contract", () => {
  it("names the web's review card exactly, and the outbox's grade exactly", () => {
    expect([cardsAgree, sittingAgrees, modesAgree, gradesAgree, outboxAgrees]).toEqual([true, true, true, true, true]);
  });
});
