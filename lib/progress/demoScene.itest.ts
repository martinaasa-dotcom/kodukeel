import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  DEMO_MAX_TURNS, DEMO_STEPS, REFUSED, demoSeed, demoTurn as played, demoTurns, type DemoReply, type DemoTurn,
} from "./demoScene";

/** A turn that is on offer, which every call here but the refusals is. */
async function demoTurn(seed: string, turns: DemoTurn[]): Promise<DemoReply | null> {
  const reply = await played(seed, turns);
  expect(reply).not.toBe(REFUSED);
  return reply === REFUSED ? null : reply;
}

/**
 * THE LANDING PAGE'S CAFÉ, EVERY PATH, AGAINST THE SEEDED DICTIONARY.
 *
 * It is the one conversation a stranger judges the app by, so "most picks
 * work" is not the bar: every pick on every step, on several seeds, is played
 * to the end and each one has to finish with the app's own reader counting
 * all five beats met, a line from the other side after every pick, and no
 * repair line anywhere. It writes nothing, which is asserted too, since the
 * route it sits behind is open to anybody.
 */
afterAll(async () => {
  await prisma.$disconnect();
});

const SEEDS = ["itest-cafe-1", "itest-cafe-2", "itest-cafe-3", "abcd"];
/** What the other side says when something went wrong, which a perfect path never hears. */
const REPAIR = /Vabandust|Ma ei saa aru|Ei tea|Mida\?|Kuidas\?/;

async function walk(seed: string, path: readonly string[]): Promise<{ replies: DemoReply[]; transcript: string[] }> {
  const turns: DemoTurn[] = [];
  const replies: DemoReply[] = [];
  const transcript: string[] = [];
  let reply = await demoTurn(seed, []);
  for (let n = 0; ; n++) {
    expect(reply, `${seed} ${path.join(">")}: no reply at step ${n}`).not.toBeNull();
    replies.push(reply!);
    for (const line of reply!.lines) transcript.push(`${line.aside ? "  ~ " : "  < "}${line.text}`);
    if (reply!.over) break;
    const option = reply!.options.find((o) => o.id === path[n]);
    expect(option, `${seed}: ${path[n]} not offered at ${reply!.step}`).toBeTruthy();
    transcript.push(`  > ${option!.et}`);
    turns.push({ step: reply!.step!, option: option!.id });
    reply = await demoTurn(seed, turns);
  }
  return { replies, transcript };
}

describe("the landing page's café", () => {
  it("offers at least two picks on every step, all of them the dictionary's", async () => {
    const turns: DemoTurn[] = [];
    let reply = await demoTurn(SEEDS[0]!, []);
    expect(reply, "the café scene or its dictionary is missing").not.toBeNull();
    for (const step of DEMO_STEPS) {
      expect(reply!.step).toBe(step);
      expect(reply!.options.length, `${step} offers ${reply!.options.length}`).toBeGreaterThanOrEqual(2);
      expect(reply!.goal).toBeTruthy();
      turns.push({ step, option: reply!.options[0]!.id });
      reply = await demoTurn(SEEDS[0]!, turns);
    }
    expect(reply!.over).toBe(true);
  });

  it("ends every path on every seed with all five beats met and nothing to repair", async () => {
    // Depth first over the tree of picks, so each prefix is asked once.
    let walked = 0;
    const go = async (seed: string, turns: DemoTurn[], transcript: string[]): Promise<void> => {
      const reply = await demoTurn(seed, turns);
      const path = turns.map((t) => t.option).join(">");
      expect(reply, `${seed} ${path}: no reply`).not.toBeNull();
      const said = [...transcript, ...reply!.lines.map((l) => `${l.aside ? "  ~ " : "  < "}${l.text}`)];
      // The other side answers every pick but the last goodbye.
      if (!reply!.over) {
        expect(reply!.lines.some((l) => !l.aside), `${seed} ${path}\n${said.join("\n")}`).toBe(true);
        expect(reply!.options.length).toBeGreaterThanOrEqual(2);
        for (const option of reply!.options) {
          await go(seed, [...turns, { step: reply!.step!, option: option.id }], [...said, `  > ${option.et}`]);
        }
        return;
      }
      const text = said.join("\n");
      expect(reply!.met, `${seed} ${path}\n${text}`).toBe(reply!.beats);
      expect(reply!.outcome, text).toMatch(/you paid, and you made the bus/);
      expect(text, text).not.toMatch(REPAIR);
      // "Yes, that is everything" is only ever said to "is that everything?".
      expect(text, text).not.toMatch(/veel midagi/);
      // The price is said, and it is the one on the board for what was ordered.
      const price = reply!.menu.find((d) => d.lemma === reply!.ordered)?.price;
      expect(text, text).toContain(`maksab ${price} eurot`);
      walked++;
    };
    for (const seed of SEEDS) await go(seed, [], []);
    expect(walked).toBeGreaterThanOrEqual(64 * SEEDS.length);
    // One whole conversation printed, so a person can read what a visitor reads.
    const { transcript } = await walk(SEEDS[1]!, ["morning", "tee", "small", "bill", "cash", "thanks"]);
    console.log(transcript.join("\n"));
  }, 180_000);

  it("refuses a pick that is not on offer or out of order", async () => {
    expect(await played("itest-cafe-1", [{ step: "greet", option: "Tere kõigile" }])).toBe(REFUSED);
    expect(await played("itest-cafe-1", [{ step: "order", option: "kohv" }])).toBe(REFUSED);
    expect(await played("itest-cafe-1", [{ step: "greet", option: "hello" }, { step: "greet", option: "hello" }])).toBe(REFUSED);
  });

  it("writes nothing, since anybody can play it", async () => {
    const before = await Promise.all([prisma.sceneRun.count(), prisma.review.count(), prisma.usageEvent.count()]);
    await walk("itest-cafe-3", ["hello", "kohv", "large", "all", "card", "thanks"]);
    const after = await Promise.all([prisma.sceneRun.count(), prisma.review.count(), prisma.usageEvent.count()]);
    expect(after).toEqual(before);
  });

  it("reads only a short seed and a bounded list of picks off the wire", () => {
    expect(demoSeed("abc-123")).toBe("abc-123");
    expect(demoSeed("../../etc")).toBeNull();
    expect(demoSeed(42)).toBeNull();
    expect(demoTurns(null)).toBeNull();
    expect(demoTurns(Array.from({ length: DEMO_MAX_TURNS + 1 }, () => ({ step: "greet", option: "hello" })))).toBeNull();
    expect(demoTurns([{ step: "greet", option: 5 }])).toBeNull();
    expect(demoTurns([{ step: "greet", option: "õ".repeat(100) }])).toBeNull();
  });
});
