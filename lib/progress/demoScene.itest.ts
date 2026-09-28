import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { DEMO_MAX_TURNS, demoSeed, demoTurn, demoTurns, type DemoTurn } from "./demoScene";

/**
 * THE LANDING PAGE'S CAFÉ, PLAYED TO THE END AGAINST THE SEEDED DICTIONARY.
 *
 * It is the app's own scene machinery, keyless, so what this can see that a
 * unit test cannot is the whole ladder answering: the opening line, a turn
 * understood with the wrong ending and said back the right way, and an
 * outcome at the end. It writes nothing, which is asserted too, since the
 * route it sits behind is open to anybody.
 */
afterAll(async () => {
  await prisma.$disconnect();
});

describe("the landing page's café", () => {
  it("opens with a line in Estonian, a goal and words to press", async () => {
    const reply = await demoTurn("itest-cafe-1", []);
    expect(reply, "the café scene or its dictionary is missing").not.toBeNull();
    expect(reply!.lines.some((l) => !l.aside && /\p{L}/u.test(l.text))).toBe(true);
    expect(reply!.goal).toBeTruthy();
    expect(reply!.hints.length).toBeGreaterThan(0);
    expect(reply!.over).toBe(false);
  });

  it("understands a wrong ending, carries on, and ends with an outcome", async () => {
    const seed = "itest-cafe-2";
    const turns: DemoTurn[] = [];
    let reply = await demoTurn(seed, turns);
    const says = ["tere", "kohv", "suur", "jah", "aitäh, head aega"];
    let recast = false;
    for (const said of says) {
      if (!reply || reply.over || !reply.beatId) break;
      turns.push({ beatId: reply.beatId, said, heard: reply.heard });
      reply = await demoTurn(seed, turns);
      if (reply?.lines.some((l) => l.provenance === "recast")) recast = true;
    }
    expect(recast, "kohv where kohvi was due was not said back the right way").toBe(true);
    expect(reply?.over).toBe(true);
    expect(reply?.outcome).toBeTruthy();
    expect(reply?.met).toBe(reply?.beats);
  });

  it("writes nothing, since anybody can play it", async () => {
    const before = await Promise.all([prisma.sceneRun.count(), prisma.review.count(), prisma.usageEvent.count()]);
    await demoTurn("itest-cafe-3", []);
    const after = await Promise.all([prisma.sceneRun.count(), prisma.review.count(), prisma.usageEvent.count()]);
    expect(after).toEqual(before);
  });

  it("reads only a short seed and a bounded list of turns off the wire", () => {
    expect(demoSeed("abc-123")).toBe("abc-123");
    expect(demoSeed("../../etc")).toBeNull();
    expect(demoSeed(42)).toBeNull();
    expect(demoTurns(null)).toBeNull();
    expect(demoTurns(Array.from({ length: DEMO_MAX_TURNS + 1 }, () => ({ beatId: "x", said: "y", heard: "z" })))).toBeNull();
    expect(demoTurns([{ beatId: "greet", said: 5, heard: "" }])).toBeNull();
    const long = demoTurns([{ beatId: "greet", said: "õ".repeat(1000), heard: "" }]);
    expect([...(long?.[0]?.said ?? "")].length).toBeLessThanOrEqual(300);
  });
});
