import { describe, expect, it } from "vitest";

import { boundedRestoredReview, reviewMoment } from "./grade";

const CREATED = new Date("2026-08-01T09:00:00Z");
const NOW = new Date("2026-09-02T09:00:00Z");

describe("reviewMoment", () => {
  it("keeps a moment inside the card's own lifetime", () => {
    const at = new Date("2026-08-20T18:30:00Z");
    expect(reviewMoment(at, CREATED, NOW).toISOString()).toBe(at.toISOString());
  });

  it("will not record a review before the card it is about existed", () => {
    const at = new Date("2026-07-01T09:00:00Z");
    expect(reviewMoment(at, CREATED, NOW).toISOString()).toBe(CREATED.toISOString());
  });

  it("will not book a review into the future", () => {
    const at = new Date("2027-01-01T09:00:00Z");
    expect(reviewMoment(at, CREATED, NOW).toISOString()).toBe(NOW.toISOString());
  });

  it("treats a clock nobody can read as now, because the review still happened", () => {
    expect(reviewMoment(new Date("nonsense"), CREATED, NOW).toISOString()).toBe(NOW.toISOString());
  });

  it("is monotonic, so flooring a batch cannot reorder it", () => {
    const earlier = reviewMoment(new Date("2026-07-01T09:00:00Z"), CREATED, NOW);
    const later = reviewMoment(new Date("2026-07-15T09:00:00Z"), CREATED, NOW);
    expect(earlier.getTime()).toBeLessThanOrEqual(later.getTime());
  });
});

describe("boundedRestoredReview", () => {
  const NOW = new Date("2026-09-11T20:00:00Z");
  const row = (over: Record<string, unknown> = {}) => ({
    id: "r1", rating: 3, durationMs: 4_000, slot: "INESSIVE", reachedSlot: null,
    reviewedAt: new Date("2026-09-01T09:00:00Z"), ...over,
  });

  it("keeps an ordinary row as it was recorded", () => {
    const out = boundedRestoredReview(row(), NOW)!;
    expect(out.rating).toBe(3);
    expect((out.reviewedAt as Date).toISOString()).toBe("2026-09-01T09:00:00.000Z");
    expect(out.slot).toBe("INESSIVE");
  });

  it("will not restore a review into the future", () => {
    const out = boundedRestoredReview(row({ reviewedAt: new Date("2027-01-01T00:00:00Z") }), NOW)!;
    expect((out.reviewedAt as Date).toISOString()).toBe(NOW.toISOString());
  });

  it("will not restore a review dated by an unreadable value", () => {
    const out = boundedRestoredReview(row({ reviewedAt: "not a date" }), NOW)!;
    expect((out.reviewedAt as Date).toISOString()).toBe(NOW.toISOString());
  });

  it("drops a rating the scheduler could never have written", () => {
    expect(boundedRestoredReview(row({ rating: 9 }), NOW)).toBeNull();
    expect(boundedRestoredReview(row({ rating: 0 }), NOW)).toBeNull();
    expect(boundedRestoredReview(row({ rating: "3" as unknown as number }), NOW)).not.toBeNull();
  });

  it("caps the duration at the same ten minutes the grading path does", () => {
    expect(boundedRestoredReview(row({ durationMs: 86_400_000 }), NOW)!.durationMs).toBe(600_000);
    expect(boundedRestoredReview(row({ durationMs: -5 }), NOW)!.durationMs).toBe(0);
    expect(boundedRestoredReview(row({ durationMs: "x" }), NOW)!.durationMs).toBe(0);
  });

  it("refuses a slot the closed list does not recognize", () => {
    expect(boundedRestoredReview(row({ slot: "MASTERED_EVERYTHING" }), NOW)!.slot).toBeNull();
  });

  it("refuses a reached slot that is not a form on both sides", () => {
    expect(boundedRestoredReview(row({ reachedSlot: "PRODUCTION" }), NOW)!.reachedSlot).toBeNull();
    expect(boundedRestoredReview(row({ slot: "PRODUCTION", reachedSlot: "ELATIVE" }), NOW)!.reachedSlot).toBeNull();
    expect(boundedRestoredReview(row({ reachedSlot: "ELATIVE" }), NOW)!.reachedSlot).toBe("ELATIVE");
  });
});
