import { describe, expect, it } from "vitest";
import { rng, seedFrom } from "@/lib/random/seeded";
import { DEAL_SIZE, WINDOW, afterServing, dealSayings, servedFrom, servedValue } from "./sayingsDeal";
import { SAYINGS } from "@/lib/estonian/sayings";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);

/** Plays `sittings` sittings in a row the way the page and the action do. */
function walk(catalogue: readonly string[], sittings: number, seed: string) {
  const random = rng(seedFrom(seed));
  let served: string[] = [];
  const deals: string[][] = [];
  for (let i = 0; i < sittings; i++) {
    const deal = dealSayings(catalogue, served, random);
    deals.push(deal);
    served = afterServing(catalogue, served, deal);
  }
  return deals;
}

describe("dealSayings", () => {
  it("deals five, in teaching order, from the front of the unseen list", () => {
    const catalogue = ids(40);
    const deal = dealSayings(catalogue, [], rng(seedFrom("a")));
    expect(deal).toHaveLength(DEAL_SIZE);
    const at = deal.map((id) => catalogue.indexOf(id));
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(Math.max(...at)).toBeLessThan(WINDOW);
  });

  it("never deals a saying already served before every saying has been served", () => {
    for (const size of [23, 25, 41, 150]) {
      const catalogue = ids(size);
      const passes = Math.ceil(size / DEAL_SIZE);
      const deals = walk(catalogue, passes, `pass-${size}`);
      const firstPass = deals.flat();
      // Every saying in the first pass, and nothing twice until the last sitting tops up.
      expect(new Set(firstPass).size).toBe(size);
      const beforeLast = deals.slice(0, -1).flat();
      expect(new Set(beforeLast).size).toBe(beforeLast.length);
    }
  });

  it("never deals two sittings in a row that share a saying, across the turn of a pass", () => {
    for (const size of [23, 26, 41]) {
      const deals = walk(ids(size), 40, `turn-${size}`);
      let compared = 0;
      for (let i = 1; i < deals.length; i++) {
        const before = new Set(deals[i - 1]);
        expect(deals[i]!.filter((id) => before.has(id))).toEqual([]);
        compared++;
      }
      expect(compared).toBe(39);
    }
  });

  it("does not deal the same five together on a second pass, nor the first pass's sittings again", () => {
    const catalogue = ids(60);
    const per = 60 / DEAL_SIZE;
    const deals = walk(catalogue, per * 3, "again");
    const key = (d: string[]) => d.join(",");
    const firstPass = new Set(deals.slice(0, per).map(key));
    const later = deals.slice(per).map(key);
    const repeats = later.filter((k) => firstPass.has(k));
    expect(later.length).toBe(per * 2);
    expect(repeats).toEqual([]);
  });

  it("is not the old fixed slices: the first sitting differs between two learners", () => {
    const catalogue = ids(60);
    const firsts = new Set(Array.from({ length: 20 }, (_, i) => dealSayings(catalogue, [], rng(seedFrom(`l${i}`))).join()));
    expect(firsts.size).toBeGreaterThan(10);
  });

  it("ignores served ids the catalog no longer holds", () => {
    const catalogue = ids(12);
    const deal = dealSayings(catalogue, ["gone", "s0", "s1"], rng(seedFrom("x")));
    expect(deal).not.toContain("s0");
    expect(deal).not.toContain("s1");
    expect(deal).not.toContain("gone");
  });

  it("deals the whole catalog when it is no bigger than a sitting", () => {
    expect(dealSayings(ids(4), ["s0"], rng(seedFrom("y")))).toEqual(ids(4));
  });

  it("runs over the real list without a repeat until the list has gone round", () => {
    const catalogue = SAYINGS.map((s) => s.id);
    const passes = Math.floor(catalogue.length / DEAL_SIZE);
    const dealt = walk(catalogue, passes, "real").flat();
    expect(dealt.length).toBe(passes * DEAL_SIZE);
    expect(new Set(dealt).size).toBe(dealt.length);
  });
});

describe("afterServing", () => {
  it("adds what was shown, most recent last", () => {
    expect(afterServing(ids(20), ["s1", "s2"], ["s5", "s1"])).toEqual(["s2", "s5", "s1"]);
  });

  it("starts a new pass with the sitting that finished the last one", () => {
    const catalogue = ids(7);
    expect(afterServing(catalogue, ["s0", "s1", "s2", "s3", "s4"], ["s1", "s2", "s3", "s5", "s6"]))
      .toEqual(["s1", "s2", "s3", "s5", "s6"]);
  });

  it("stores nothing the catalog does not hold", () => {
    expect(afterServing(ids(10), ["s0"], ["../../etc", "zz", "s3"])).toEqual(["s0", "s3"]);
    expect(afterServing(ids(10), ["s0", "nope"], ["nope"])).toEqual(["s0"]);
  });
});

describe("servedFrom", () => {
  it("reads back what servedValue wrote and drops junk and repeats", () => {
    expect(servedFrom(servedValue(["a-b", "c1"]))).toEqual(["a-b", "c1"]);
    expect(servedFrom("a  a B! c")).toEqual(["a", "c"]);
    expect(servedFrom(null)).toEqual([]);
  });

  it("can hold every saying id", () => {
    const all = SAYINGS.map((s) => s.id);
    expect(servedFrom(servedValue(all))).toEqual(all);
  });
});
