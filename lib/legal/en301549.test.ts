import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CRITERIA, clauseOf, REASON_TEXT } from "./en301549";

/** The A and AA success criteria of WCAG 2.2, with 4.1.1 removed as 2.2 removed it. */
const WCAG22_A_AA = [
  "1.1.1", "1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5", "1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.5",
  "1.4.1", "1.4.2", "1.4.3", "1.4.4", "1.4.5", "1.4.10", "1.4.11", "1.4.12", "1.4.13",
  "2.1.1", "2.1.2", "2.1.4", "2.2.1", "2.2.2", "2.3.1", "2.4.1", "2.4.2", "2.4.3", "2.4.4", "2.4.5",
  "2.4.6", "2.4.7", "2.4.11", "2.5.1", "2.5.2", "2.5.3", "2.5.4", "2.5.7", "2.5.8",
  "3.1.1", "3.1.2", "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.6", "3.3.1", "3.3.2", "3.3.3", "3.3.4",
  "3.3.7", "3.3.8", "4.1.2", "4.1.3",
];

describe("the EN 301 549 table", () => {
  it("has every WCAG 2.2 A and AA criterion exactly once", () => {
    expect(WCAG22_A_AA).toHaveLength(55);
    expect(CRITERIA.map((c) => c.id)).toEqual(WCAG22_A_AA);
  });

  it("marks a criterion supported only where a check that exists asserts it", () => {
    const supported = CRITERIA.filter((c) => c.status === "supports");
    expect(supported.length).toBeGreaterThan(0);
    for (const c of supported) {
      expect(c.checkedBy, c.id).toBeTruthy();
      expect(existsSync(c.checkedBy!), `${c.id} names ${c.checkedBy}`).toBe(true);
      expect(c.reason, c.id).toBeUndefined();
    }
  });

  it("says why for every criterion that is not supported", () => {
    for (const c of CRITERIA.filter((c) => c.status !== "supports")) {
      expect(c.reason, c.id).toBeDefined();
      expect(REASON_TEXT[c.reason!]).toBeTruthy();
    }
  });

  it("gives every criterion WCAG 2.1 had its clause, and none to the six new in 2.2", () => {
    const fresh = CRITERIA.filter((c) => c.newIn22).map((c) => c.id);
    expect(fresh).toEqual(["2.4.11", "2.5.7", "2.5.8", "3.2.6", "3.3.7", "3.3.8"]);
    for (const c of CRITERIA) expect(clauseOf(c)).toBe(c.newIn22 ? null : `9.${c.id}`);
  });

  it("agrees with the statement on the gaps it names", () => {
    const byId = new Map(CRITERIA.map((c) => [c.id, c]));
    expect(byId.get("2.2.1")).toMatchObject({ status: "partial", reason: "exam-clock" });
    expect(byId.get("1.2.1")).toMatchObject({ status: "partial", reason: "hearing" });
    expect(byId.get("2.1.4")).toMatchObject({ status: "supports" });
    expect(byId.get("1.4.2")).toMatchObject({ status: "supports" });
    expect(byId.get("2.2.2")).toMatchObject({ status: "partial", reason: "moving" });
  });
});
