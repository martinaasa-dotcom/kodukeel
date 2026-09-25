import { describe, expect, it } from "vitest";
import { computeStreak, computeStreakWithShields } from "./streak";
import { dayKey as localDayKey } from "@/lib/time/day";

describe("computeStreak", () => {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  };

  it("is zero with no reviews", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("counts today plus consecutive prior days", () => {
    expect(computeStreak([day(0), day(-1), day(-2)])).toBe(3);
  });

  it("still counts yesterday's streak as alive before today's first review", () => {
    expect(computeStreak([day(-1), day(-2)])).toBe(2);
  });

  it("stops at the first gap", () => {
    expect(computeStreak([day(0), day(-1), day(-3)])).toBe(2);
  });
});

describe("computeStreakWithShields", () => {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  };
  const dayKey = (offset: number) => localDayKey(day(offset));

  it("matches computeStreak with zero shields available", () => {
    const dates = [day(0), day(-1), day(-2)];
    expect(computeStreakWithShields(dates, 0).streak).toBe(computeStreak(dates));
  });

  it("bridges a single missed day when a shield is available", () => {
    // Reviewed today, yesterday and three days ago — missed only two days ago.
    const dates = [day(0), day(-1), day(-3)];
    const r = computeStreakWithShields(dates, 1);
    expect(r.streak).toBe(4);
    expect(r.newlyShieldedDates).toEqual([dayKey(-2)]);
    expect(r.shieldsRemaining).toBe(0);
  });

  it("can bridge two consecutive missed days if two shields are in stock", () => {
    // Reviewed today and three days ago: missed the two days between, and two
    // shields cover both, so the run is unbroken.
    const dates = [day(0), day(-3)];
    const r = computeStreakWithShields(dates, 2);
    expect(r.streak).toBe(4);
    expect(r.newlyShieldedDates).toEqual([dayKey(-1), dayKey(-2)]);
    expect(r.shieldsRemaining).toBe(0);
  });

  /*
    A SHIELD IS SPENT ONLY WHERE IT KEEPS THE STREAK ALIVE.

    This case used to be asserted the other way: three missed days and two
    shields, the two spent on the nearest two, the walk breaking on the third
    anyway, and a streak of 3 reported made of today and two days nobody
    studied on. The learner lost the run and the shields both, and the shield
    letter then told them a shield had covered a day, which it had not in any
    sense that mattered. A gap the shields in stock cannot bridge whole is left
    alone, and the shields stay banked for a gap they can.
  */
  it("spends nothing on a gap the shields in stock cannot bridge whole", () => {
    // Reviewed today and four days ago: three missed days, two shields.
    const dates = [day(0), day(-4)];
    const r = computeStreakWithShields(dates, 2);
    expect(r.streak).toBe(1);
    expect(r.newlyShieldedDates).toEqual([]);
    expect(r.shieldsRemaining).toBe(2);
  });

  it("keeps a shield rather than spend it on one day of a three-day gap", () => {
    const dates = [day(-1), day(-5)];
    const r = computeStreakWithShields(dates, 1);
    // Today is not yet studied, which is not a miss: the run from yesterday is 1.
    expect(r.streak).toBe(1);
    expect(r.newlyShieldedDates).toEqual([]);
    expect(r.shieldsRemaining).toBe(1);
  });

  it("bridges a nearer gap and then keeps what cannot bridge a further one", () => {
    // Missed day -2 (bridgeable) and days -4..-6 (not, with one shield left).
    const dates = [day(0), day(-1), day(-3), day(-7)];
    const r = computeStreakWithShields(dates, 2);
    expect(r.streak).toBe(4);
    expect(r.newlyShieldedDates).toEqual([dayKey(-2)]);
    expect(r.shieldsRemaining).toBe(1);
  });

  it("does not count today, not yet studied, as a missed day", () => {
    // Studied yesterday and three days ago; one shield covers day -2 and today
    // costs nothing.
    const dates = [day(-1), day(-3)];
    const r = computeStreakWithShields(dates, 1);
    expect(r.streak).toBe(3);
    expect(r.newlyShieldedDates).toEqual([dayKey(-2)]);
    expect(r.shieldsRemaining).toBe(0);
  });

  it("never spends a shield when there is nothing to bridge", () => {
    const dates = [day(0), day(-1), day(-2)];
    const r = computeStreakWithShields(dates, 3);
    expect(r.streak).toBe(3);
    expect(r.newlyShieldedDates).toEqual([]);
    expect(r.shieldsRemaining).toBe(3);
  });

  it("treats a previously-shielded day as covered without spending another shield", () => {
    const dates = [day(0), day(-2)];
    const r = computeStreakWithShields(dates, 2, [dayKey(-1)]);
    expect(r.streak).toBe(3);
    expect(r.newlyShieldedDates).toEqual([]);
    expect(r.shieldsRemaining).toBe(2);
  });

  it("stops immediately with no shields and a gap", () => {
    const dates = [day(0)];
    const r = computeStreakWithShields(dates, 0);
    expect(r.streak).toBe(1);
    expect(r.newlyShieldedDates).toEqual([]);
  });

  it("never bridges past the earliest known review or shielded day", () => {
    // Only one real review, ever. A shield must not manufacture pre-history.
    const dates = [day(0)];
    const r = computeStreakWithShields(dates, 10);
    expect(r.streak).toBe(1);
    expect(r.newlyShieldedDates).toEqual([]);
    expect(r.shieldsRemaining).toBe(10);
  });
});
