import { describe, expect, it } from "vitest";
import { MAX_DROP_SHARE, planHarvestWrite, readAnswer, rowKey } from "./harvestGuard";

const row = (lemma: string, pos = "NOUN") => ({ lemma, pos, gloss: lemma });
const previous = [row("tuba"), row("maja"), row("kool"), row("pood")];

describe("readAnswer", () => {
  it("tells a refusal from a miss: a 403 is refused, an empty body is answered", async () => {
    const refused = await readAnswer(async () => ({ ok: false, status: 403, json: async () => ({}) }));
    expect(refused).toEqual({ kind: "refused", status: 403 });
    const miss = await readAnswer(async () => ({ ok: true, status: 200, json: async () => ({ words: [] }) }));
    expect(miss).toEqual({ kind: "answered", value: { words: [] } });
  });

  it("reads a bad minute as failed, which is worth a retry, and a rejected key as refused, which is not", async () => {
    expect((await readAnswer(async () => ({ ok: false, status: 503, json: async () => ({}) }))).kind).toBe("failed");
    expect((await readAnswer(async () => ({ ok: false, status: 429, json: async () => ({}) }))).kind).toBe("failed");
    expect((await readAnswer(async () => { throw new Error("timeout"); })).kind).toBe("failed");
    expect((await readAnswer(async () => ({ ok: false, status: 401, json: async () => ({}) }))).kind).toBe("refused");
  });
});

describe("planHarvestWrite", () => {
  const everyKey = new Set([...previous.map(rowKey), rowKey(row("tuba")), rowKey(row("maja"))]);

  it("drops a row the course no longer requests, even on an --only run that did not ask about it", () => {
    // `täis` moved from ADJECTIVE to ADVERB: the old row must not survive beside the new one.
    const moved = { ...row("tuba"), pos: "ADVERB" };
    const wanted = new Set([...previous.filter((r) => r.lemma !== "tuba").map(rowKey), rowKey(moved)]);
    const plan = planHarvestWrite({
      previous, wanted, asked: new Set([rowKey(moved)]), harvested: [moved],
      unanswered: new Set(), refused: new Map(), force: false,
    });
    expect(plan.write).toBe(true);
    if (plan.write) {
      expect(plan.rows.filter((r) => r.lemma === "tuba").map((r) => r.pos)).toEqual(["ADVERB"]);
      expect(plan.rows).toHaveLength(previous.length);
    }
  });

  it("writes nothing when the key was refused, whatever else came back", () => {
    // The run that emptied the file: every request 403, every word "not in Ekilex".
    const plan = planHarvestWrite({ wanted: everyKey,
      previous, asked: new Set(previous.map(rowKey)), harvested: [],
      unanswered: new Set(previous.map(rowKey)), refused: new Map([[403, 4]]), force: false,
    });
    expect(plan.write).toBe(false);
    if (!plan.write) expect(plan.why).toMatch(/refused 4 requests \(HTTP 403 x4\)/);
    // Even with --force: a refusal is never a miss.
    expect(planHarvestWrite({ wanted: everyKey,
      previous, asked: new Set(previous.map(rowKey)), harvested: [row("tuba")],
      unanswered: new Set(), refused: new Map([[403, 1]]), force: true,
    }).write).toBe(false);
  });

  it("writes nothing when the source answered for nobody", () => {
    const plan = planHarvestWrite({ wanted: everyKey,
      previous, asked: new Set([rowKey(row("tuba"))]), harvested: [],
      unanswered: new Set([rowKey(row("tuba"))]), refused: new Map(), force: false,
    });
    expect(plan.write).toBe(false);
  });

  it("keeps the words --only did not ask about, and stands the fresh row in for the ones it did", () => {
    const fresh = { ...row("tuba"), gloss: "room" };
    const plan = planHarvestWrite({ wanted: everyKey,
      previous, asked: new Set([rowKey(fresh)]), harvested: [fresh],
      unanswered: new Set(), refused: new Map(), force: false,
    });
    expect(plan.write).toBe(true);
    if (plan.write) {
      expect(plan.rows).toHaveLength(4);
      expect(plan.rows.find((r) => r.lemma === "tuba")?.gloss).toBe("room");
      expect(plan.kept).toBe(3);
    }
  });

  it("keeps the row of a word Ekilex did not answer for, and drops the one it answered nothing for", () => {
    const plan = planHarvestWrite({ wanted: everyKey,
      previous, asked: new Set([rowKey(row("tuba")), rowKey(row("maja"))]), harvested: [row("tuba")],
      unanswered: new Set([rowKey(row("maja"))]), refused: new Map(), force: false,
    });
    expect(plan.write).toBe(true);
    if (plan.write) expect(plan.rows.map((r) => r.lemma).sort()).toEqual(["kool", "maja", "pood", "tuba"]);
    // `maja` asked, answered, and dropped by Ekilex: it leaves.
    const dropped = planHarvestWrite({ wanted: everyKey,
      previous, asked: new Set([rowKey(row("maja"))]), harvested: [],
      unanswered: new Set(), refused: new Map(), force: false,
    });
    // One of four is under the half, so it writes, without maja.
    expect(dropped.write).toBe(true);
    if (dropped.write) expect(dropped.rows.map((r) => r.lemma)).toEqual(["tuba", "kool", "pood"]);
  });

  it("refuses a harvest that drops more than half the file, unless forced", () => {
    const asked = new Set(previous.map(rowKey));
    const plan = planHarvestWrite({ wanted: everyKey, previous, asked, harvested: [row("tuba")], unanswered: new Set(), refused: new Map(), force: false });
    expect(plan.write).toBe(false);
    if (!plan.write) expect(plan.why).toMatch(/drop 3 of the 4/);
    const forced = planHarvestWrite({ wanted: everyKey, previous, asked, harvested: [row("tuba")], unanswered: new Set(), refused: new Map(), force: true });
    expect(forced.write).toBe(true);
    expect(MAX_DROP_SHARE).toBeLessThanOrEqual(0.5);
  });

  it("writes a first harvest into an empty file", () => {
    const plan = planHarvestWrite({ wanted: everyKey, previous: [], asked: new Set([rowKey(row("tuba"))]), harvested: [row("tuba")], unanswered: new Set(), refused: new Map(), force: false });
    expect(plan.write).toBe(true);
  });
});
