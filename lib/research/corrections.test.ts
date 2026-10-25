import { describe, expect, it } from "vitest";

import { CORRECTION_HEADER, NOT_RECORDED, correctionRows, handEditRow, reportRow } from "./corrections";

const at = new Date("2026-10-20T12:00:00Z");

describe("the corrections sent back to EKI", () => {
  it("says from what to what for a corrected principal part, with the reviewer's note and the day", () => {
    expect(reportRow({
      ekilexWordId: 123, lemma: "tuba",
      patch: { kind: "SET_FORM", formType: "GEN_SG", value: "toa" },
      replaced: "tuba", decision: "Ekilex agrees", reviewedAt: at,
    })).toEqual(["123", "tuba", "accepted report", "GEN_SG", "tuba", "toa", "Ekilex agrees", "2026-10-20"]);
  });

  it("says when what was replaced was not recorded rather than leaving a blank", () => {
    const row = reportRow({
      ekilexWordId: 1, lemma: "kohv", patch: { kind: "SET_TRANSLATION", translation: "coffee" },
      replaced: null, decision: null, reviewedAt: at,
    });
    expect(row?.[4]).toBe(NOT_RECORDED);
  });

  it("leaves out a new word, which is no correction to an entry Ekilex supplied", () => {
    expect(reportRow({
      ekilexWordId: 1, lemma: "x", patch: { kind: "CREATE_WORD" }, replaced: null, decision: null, reviewedAt: at,
    })).toBeNull();
  });

  it("carries nothing about who reported or reviewed it, whatever the input held", () => {
    const report = {
      ekilexWordId: 9, lemma: "maja", patch: { kind: "SET_TRANSLATION", translation: "house" },
      replaced: "home", decision: null, reviewedAt: at,
      ownerId: "owner-secret", reviewedBy: "reviewer-secret", note: "my teacher said",
    };
    const rows = correctionRows([report], [{ ekilexWordId: 9, lemma: "maja", translation: "house", parts: { NOM_SG: "maja" }, editedAt: at }]);
    expect(rows).toHaveLength(2);
    const flat = JSON.stringify(rows);
    expect(flat).not.toContain("owner-secret");
    expect(flat).not.toContain("reviewer-secret");
    expect(flat).not.toContain("my teacher said");
    for (const row of rows) expect(row).toHaveLength(CORRECTION_HEADER.length);
  });

  it("writes a hand edit's current gloss and parts, and says the earlier ones are not kept", () => {
    expect(handEditRow({ ekilexWordId: 5, lemma: "uus", translation: "new", parts: { PART_SG: "uut", GEN_SG: "uue" }, editedAt: at }))
      .toEqual(["5", "uus", "hand edit", "gloss and principal parts", NOT_RECORDED, "new | GEN_SG=uue; PART_SG=uut", "", "2026-10-20"]);
  });
});
