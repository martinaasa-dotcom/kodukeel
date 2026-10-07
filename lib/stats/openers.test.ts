import { describe, expect, it } from "vitest";
import { MIN_ANSWERS, readOpeners, SETTLED_DAYS, WINDOW, type OpenerAnswer } from "./openers";
import { openerSlot } from "@/lib/estonian/openers";

const day = (n: number) => `2026-10-${String(n).padStart(2, "0")}`;

/** `n` answers newest first on one stage-1 opener, spread over `days` days, `wrong` of them missed. */
function answers(n: number, days: number, wrong = 0, id = "like"): OpenerAnswer[] {
  return Array.from({ length: n }, (_, i) => ({
    slot: openerSlot(id), rating: i < wrong ? 1 : 3, day: day(1 + (i % days)),
  }));
}

describe("readOpeners", () => {
  it("opens the first stage and only the first for somebody who has done nothing", () => {
    const r = readOpeners([]);
    expect(r.current).toBe(1);
    expect(r.stages.filter((s) => s.open).map((s) => s.n)).toEqual([1]);
  });

  it("does not settle a stage on too few answers, or on one day", () => {
    expect(readOpeners(answers(MIN_ANSWERS - 1, 5)).stages[0]!.settled).toBe(false);
    expect(readOpeners(answers(WINDOW, SETTLED_DAYS - 1)).stages[0]!.settled).toBe(false);
  });

  it("settles on enough right answers across enough days, and offers the next stage", () => {
    const r = readOpeners(answers(WINDOW, SETTLED_DAYS));
    expect(r.stages[0]!.settled).toBe(true);
    expect(r.stages[1]!.open).toBe(true);
    expect(r.current).toBe(2);
  });

  it("does not settle a stage answered right only part of the time", () => {
    expect(readOpeners(answers(WINDOW, 5, 5)).stages[0]!.settled).toBe(false);
  });

  it("reads only the newest answers of a stage", () => {
    const old = answers(WINDOW, 5, WINDOW).map((a) => ({ ...a, day: "2026-09-01" }));
    const fresh = answers(WINDOW, 5);
    expect(readOpeners([...fresh, ...old]).stages[0]!.settled).toBe(true);
  });

  it("never offers a stage the level does not reach", () => {
    const r = readOpeners(answers(WINDOW, 5), 1);
    expect(r.stages[1]!.open).toBe(false);
    expect(r.current).toBe(1);
  });

  it("ignores a slot that is not an opener", () => {
    expect(readOpeners([{ slot: "PRODUCTION", rating: 3, day: day(1) }]).stages[0]!.answers).toBe(0);
  });

  it("leads with the stage still being worked on, and takes nobody back a stage they reached", () => {
    // Stage 1 and 2 settled, then stage 3 answered once, then a bad run on stage 2.
    const settledTwo = [...answers(WINDOW, 5, 0, "need"), ...answers(WINDOW, 5, 0, "like")];
    const slipped = [...answers(8, 5, 8, "need"), ...settledTwo, { slot: openerSlot("notwant"), rating: 3, day: day(1) }];
    const r = readOpeners(slipped);
    expect(r.stages[1]!.settled).toBe(false);
    expect(r.stages[2]!.open).toBe(true);
    expect(r.current).toBe(2);
  });

  it("does not open a later stage behind one that is closed", () => {
    // Stage 1 settled, stage 3 reached but not settled: stage 4 is not offered.
    const r = readOpeners([...answers(WINDOW, 5), ...answers(3, 5, 0, "notwant")]);
    expect(r.stages[1]!.open).toBe(true);
    expect(r.stages[2]!.open).toBe(true);
    expect(r.stages[3]!.open).toBe(false);
    expect(r.stages[4]!.open).toBe(false);
  });

  it("opens the mixed stage only once the stage before it is settled", () => {
    const upToFive = ["like", "need", "notwant", "wanted", "pl-like"].flatMap((id) => answers(WINDOW, 5, 0, id));
    expect(readOpeners(upToFive).stages[5]!.open).toBe(true);
    expect(readOpeners(upToFive.slice(0, 4 * WINDOW)).stages[5]!.open).toBe(false);
  });
});
