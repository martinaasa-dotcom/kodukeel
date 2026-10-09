import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { ask, NEEDED_LEMMAS, nextQuestions, settledKind, stillFitting, SUGGESTIONS, type Asked } from "./twenty";
import { buildIndex, lookupFrom, repairFrom, withExtra } from "./twentyLookup";
import { THINGS } from "./twentyThings";

/**
 * THE MEASURE THE GAME IS HELD TO: a well-formed question is answered.
 *
 * `fixtures/twenty-questions.txt` is two hundred questions a learner asks, none
 * of them the ones the engine's own suggestions are, asked of every thing the
 * game can be thinking of. "Ei tea" or a refusal on one of them is the game
 * failing a learner who did nothing wrong, and it is held under one percent.
 * The floor is on how many were asked, so a bank that stops loading cannot pass.
 */
const needed = new Set(NEEDED_LEMMAS);
const extra = JSON.parse(fs.readFileSync(path.join(process.cwd(), "prisma", "data", "twenty-forms.json"), "utf8")) as Record<string, string>;
const index = withExtra(buildIndex(dictionaryRows().filter((r) => needed.has(r.lemma))), extra);
const lookup = lookupFrom(index);
const repair = repairFrom(index);
const bank = fs.readFileSync(path.join(__dirname, "fixtures", "twenty-questions.txt"), "utf8").split("\n").filter(Boolean);
// The bank is read rather than typed, so a file that stops loading is a test that asks nothing.
const asksEnough = () => expect(bank.length).toBeGreaterThan(150);

describe("the game answers what a learner asks", () => {
  it("answers all but under one percent of well-formed questions", () => {
    asksEnough();
    let asked = 0, failed = 0;
    const worst = new Map<string, number>();
    for (const q of bank) for (const t of THINGS) {
      asked++;
      const r = ask(q, t, lookup, { repair });
      if (r.kind !== "answer" || r.answer === "unknown") {
        failed++;
        worst.set(q, (worst.get(q) ?? 0) + 1);
      }
    }
    expect(asked).toBeGreaterThan(60_000);
    const rate = failed / asked;
    expect(rate, [...worst].sort((a, b) => b[1] - a[1]).slice(0, 8).join("\n")).toBeLessThan(0.01);
  });

  it("every suggestion says what the game would answer if it were typed", () => {
    let checked = 0;
    for (const s of SUGGESTIONS) for (const t of THINGS) {
      const r = ask(s.et, t, lookup, {});
      expect(r.kind === "answer" ? r.answer : r.why, `${s.et} ${t.lemma}`).toBe(s.test(t));
      checked++;
    }
    expect(checked).toBeGreaterThan(20_000);
  });

  it("following the suggestions narrows any thing down inside twenty questions", () => {
    let rounds = 0;
    for (const secret of THINGS) {
      const asked: Asked[] = [];
      const askedEt = new Set<string>();
      let n = 0;
      for (;;) {
        const fit = stillFitting(THINGS, asked);
        expect(fit.map((t) => t.lemma), secret.lemma).toContain(secret.lemma);
        const [s] = nextQuestions(fit, askedEt, 1);
        if (!s || fit.length <= 1) break;
        const r = ask(s.et, secret, lookup, {});
        askedEt.add(s.et);
        if (r.kind === "answer" && r.check) asked.push({ answer: r.answer, check: r.check });
        n++;
      }
      expect(n, secret.lemma).toBeLessThanOrEqual(20);
      rounds++;
    }
    expect(rounds).toBe(THINGS.length);
  });

  it("names the kind once everything still fitting is one kind", () => {
    const animals = THINGS.filter((t) => t.kind === "animal");
    expect(settledKind(animals)).toBe("animal");
    expect(settledKind(THINGS)).toBeNull();
  });
});

describe("a slip of the hand, and a real word", () => {
  it("puts a slip right", () => {
    expect(repair("suuur")).toBe("suur");
    expect(repair("poder")).toBe("põder");
    const r = ask("Kas see on suuur?", THINGS.find((t) => t.lemma === "elevant")!, lookup, { repair });
    expect(r.kind === "answer" && r.answer).toBe("yes");
    expect(r.tips.some((t) => t.id === "spell:suuur")).toBe(true);
  });

  it("never turns a real word it does not know into another one", () => {
    const koer = THINGS.find((t) => t.lemma === "koer")!;
    const asIs = ask("Kas see on hallo?", koer, lookup, { repair, real: new Set(["hallo"]) });
    expect(asIs.tips.some((t) => t.id === "spell:hallo")).toBe(false);
    const repaired = ask("Kas see on hallo?", koer, lookup, { repair });
    expect(repaired.tips.some((t) => t.id === "spell:hallo")).toBe(true);
  });

  it("reads an impersonal and a plural case off the forms list", () => {
    const leib = THINGS.find((t) => t.lemma === "leib")!;
    const r = ask("Kas seda süüakse?", leib, lookup, {});
    expect(r.kind === "answer" && r.answer).toBe("yes");
  });
});

describe("where a thing is and where it lives", () => {
  const by = (lemma: string) => THINGS.find((t) => t.lemma === lemma)!;
  const answer = (q: string, lemma: string) => {
    const r = ask(q, by(lemma), lookup, {});
    return r.kind === "answer" ? r.answer : r.kind;
  };
  it("a loaf of bread is in Estonia and does not live there", () => {
    expect(answer("Kas see on Eestis?", "leib")).toBe("yes");
    expect(answer("Kas see elab Eestis?", "leib")).toBe("no");
    expect(answer("Kas see elab Eestis?", "koer")).toBe("yes");
  });
  it("Africa is not a fact about bread or a book", () => {
    expect(answer("Kas see on Aafrikas?", "leib")).toBe("sometimes");
    expect(answer("Kas see on Aafrikas?", "raamat")).toBe("sometimes");
    expect(answer("Kas see elab Aafrikas?", "lõvi")).toBe("yes");
  });
});
