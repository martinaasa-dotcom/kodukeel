import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { ask, asRepeat, englishToLemma, cluesFor, inEstonian, letterPattern, NEEDED_LEMMAS, nextQuestions, settledKind, stillFitting, SUGGESTIONS, topicFrom, topicOrder, TOPICS, type Asked } from "./twenty";
import { buildIndex, lookupFrom, repairFrom, shortGloss, withExtra } from "./twentyLookup";
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

describe("what a learner really types", () => {
  const by = (lemma: string) => THINGS.find((t) => t.lemma === lemma)!;
  const answer = (q: string, lemma: string) => {
    const r = ask(q, by(lemma), lookup, { repair: repairFrom(index) });
    return r.kind === "answer" ? r.answer : r.kind;
  };
  it("reads a tree as a place, never as a guess that it is one", () => {
    expect(answer("Kas see kasvab puu otsas?", "õun")).toBe("yes");
    expect(answer("Kas see kasvab puul?", "õun")).toBe("yes");
    expect(answer("Kas see ronib puu otsa?", "kass")).toBe("yes");
    expect(answer("Kas see kasvab puu otsas?", "porgand")).toBe("no");
  });
  it("reads something to eat as edible", () => {
    expect(answer("Kas see on midagi süüa?", "õun")).toBe("yes");
    expect(answer("Kas see on midagi süüa?", "koer")).toBe("no");
  });
  it("reads many colours as colourful, clothing as clothing, and soft on an animal as sometimes", () => {
    expect(answer("Kas see on mitme värvi?", "vikerkaar")).toBe("yes");
    expect(answer("Kas see on riie?", "särk")).toBe("yes");
    expect(answer("Kas see on riie?", "koer")).toBe("no");
    expect(answer("Kas see on pehme?", "koer")).toBe("sometimes");
    expect(answer("Kas see on tark?", "koer")).toBe("sometimes");
  });
});

describe("a question in English is met with the Estonian for it", () => {
  const glosses: Record<string, string> = {};
  for (const r of dictionaryRows()) if (needed.has(r.lemma)) glosses[r.lemma] ??= shortGloss(r.translation);
  it("gives the game's own question back", () => {
    expect(inEstonian("Does it fly?", glosses)?.example).toBe("Kas see lendab?");
    expect(inEstonian("is it an animal", glosses)?.example).toBe("Kas see on loom?");
    expect(inEstonian("Is it a dog?", glosses)?.example).toBe("Kas see on koer?");
  });
  it("leaves Estonian alone, and says kas where it has no example", () => {
    expect(inEstonian("Kas see on loom?", glosses)).toBeNull();
    expect(inEstonian("Kas see on suur?", glosses)).toBeNull();
    expect(inEstonian("Does it live in water?", glosses)).toEqual({ example: null });
  });
  it("names the Estonian for an English word inside an Estonian question", () => {
    expect(englishToLemma("animal", glosses)).toBe("loom");
  });
});

describe("hints and topics", () => {
  it("every hint ladder ends in the letters and never prints the word", () => {
    let checked = 0;
    for (const t of THINGS) {
      const ladder = cluesFor(t);
      expect(ladder.length).toBeGreaterThanOrEqual(2);
      for (const h of ladder) {
        const text = h.en + JSON.stringify(h.vars ?? {});
        expect(text.toLowerCase().includes(`"${t.lemma.toLowerCase()}"`)).toBe(false);
        checked++;
      }
      expect(ladder[ladder.length - 1]!.vars?.pattern).toBe(letterPattern(t.lemma));
    }
    expect(checked).toBeGreaterThan(THINGS.length * 2);
  });
  it("shows only the first and last letters", () => {
    expect(letterPattern("koer")).toBe("k _ _ r");
  });
  it("every kind of thing is in exactly one group, and every group holds some", () => {
    const kinds = new Set(THINGS.map((t) => t.kind));
    for (const kind of kinds) {
      expect(TOPICS.filter((topic) => topic.kinds.includes(kind)).length, kind).toBe(1);
    }
    for (const topic of TOPICS) {
      expect(THINGS.filter((t) => topic.kinds.includes(t.kind)).length, topic.id).toBeGreaterThanOrEqual(10);
    }
    expect(topicFrom("nonsense")).toBeNull();
    expect(topicFrom("food")?.kinds).toEqual(["food", "drink"]);
  });
  it("puts the group the last round used last, and keeps the rest in the order given", () => {
    const order = topicOrder(TOPICS, "food").map((t) => t.id);
    expect(order).toEqual([...TOPICS.map((t) => t.id).filter((id) => id !== "food"), "food"]);
    expect(topicOrder(TOPICS, null).map((t) => t.id)).toEqual(TOPICS.map((t) => t.id));
  });
});

describe("asking the same thing twice", () => {
  it("is told again and costs nothing, while a new question still counts", () => {
    const secret = THINGS.find((t) => t.lemma === "koer")!;
    const first = ask("Kas see on suur?", secret, lookup, {});
    const again = asRepeat(ask("Kas see on suur", secret, lookup, {}), [first]);
    expect(again.kind === "answer" && again.repeated && !again.counts).toBe(true);
    const other = asRepeat(ask("Kas see lendab?", secret, lookup, {}), [first]);
    expect(other.kind === "answer" && other.counts && !other.repeated).toBe(true);
  });
});

describe("describing words read off the facts", () => {
  const word = (q: string, lemma: string) => {
    const r = ask(q, THINGS.find((t) => t.lemma === lemma)!, lookup, { repair });
    return r.kind === "answer" ? r.answer : r.why;
  };
  it("answers juicy, crisp, ripe, striped and the rest for every thing", () => {
    const words = ["mahlane", "krõbe", "küps", "triibuline", "täpiline", "läikiv", "okkaline", "kuri", "rasvane", "vürtsikas", "libe", "sile", "kare", "ohutu", "kunstlik", "lõhnav", "kole", "mugav"];
    let asked = 0;
    for (const w of words) for (const t of THINGS) {
      expect(word(`Kas see on ${w}?`, t.lemma), `${w} ${t.lemma}`).not.toBe("unknown");
      asked++;
    }
    expect(asked).toBe(words.length * THINGS.length);
  });
  it("says what a person would", () => {
    expect(word("Kas see on mahlane?", "õun")).toBe("yes");
    expect(word("Kas see on mahlane?", "koer")).toBe("no");
    expect(word("Kas see on mahlased?", "apelsin")).toBe("yes");
    expect(word("Kas see on triibuline?", "tiiger")).toBe("yes");
    expect(word("Kas see on okkaline?", "siil")).toBe("yes");
    expect(word("Kas see on hiiglaslik?", "elevant")).toBe("yes");
    expect(word("Kas see on pisike?", "elevant")).toBe("no");
    expect(word("Kas see ei ole mahlane?", "kivi")).toBe("yes");
  });
});

describe("what the game learned from an Ei tea", () => {
  const sticky = { lemma: "kleepuv", spellings: ["kleepuv", "kleepuvad"], en: "Is it sticky?", ru: "Он липкий?", uk: "Він липкий?", answers: { mesi: "yes" as const, moos: "yes" as const, kivi: "no" as const } };
  const thing = (l: string) => THINGS.find((t) => t.lemma === l)!;
  it("reports a word it could not read, and answers it once learned", () => {
    const before = ask("Kas see on kleepuv?", thing("mesi"), lookup, { repair });
    const words = before.kind === "answer" ? before.unknownWords : before.unknownWords;
    expect(words).toContain("kleepuv");
    const after = ask("Kas see on kleepuv?", thing("mesi"), lookup, { repair, learned: [sticky] });
    expect(after.kind === "answer" && after.answer).toBe("yes");
    expect(after.kind === "answer" && after.counts).toBe(true);
    const plural = ask("Kas need on kleepuvad?", thing("kivi"), lookup, { repair, learned: [sticky] });
    expect(plural.kind === "answer" && plural.answer).toBe("no");
    // A thing the model did not sort is an honest Ei tea, and free.
    const unsorted = ask("Kas see on kleepuv?", thing("koer"), lookup, { repair, learned: [sticky] });
    expect(unsorted.kind === "answer" && unsorted.answer).toBe("unknown");
    expect(unsorted.kind === "answer" && unsorted.counts).toBe(false);
    // Negation and a second condition still work around it.
    const both = ask("Kas see on magus ja kleepuv?", thing("mesi"), lookup, { repair, learned: [sticky] });
    expect(both.kind === "answer" && both.answer).toBe("yes");
  });
});
