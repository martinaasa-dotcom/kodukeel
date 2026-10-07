import { describe, expect, it } from "vitest";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { ask, ANSWER_ET, IDEAS, NEEDED_LEMMAS, QUESTION_LIMIT, spent, tokensOf, type Reply } from "./twenty";
import { buildIndex, lookupFrom } from "./twentyLookup";
import { CATEGORIES, COLOURS, PARTS, THING_BY_LEMMA, THINGS } from "./twentyThings";

const rows = dictionaryRows();
const byLemma = new Map<string, typeof rows>();
for (const r of rows) byLemma.set(r.lemma, [...(byLemma.get(r.lemma) ?? []), r]);
const needed = rows.filter((r) => NEEDED_LEMMAS.includes(r.lemma));
const lookup = lookupFrom(buildIndex(needed));
const gloss = (lemma: string) => byLemma.get(lemma)?.[0]?.translation;

const thing = (lemma: string) => {
  const t = THING_BY_LEMMA.get(lemma);
  if (!t) throw new Error(`no ${lemma}`);
  return t;
};
const answerTo = (q: string, secret: string): Reply => ask(q, thing(secret), lookup, gloss);
const said = (q: string, secret: string) => {
  const r = answerTo(q, secret);
  return r.kind === "answer" ? r.answer : `refused:${r.why}`;
};

describe("the vocabulary is the dictionary's", () => {
  it("every headword the game asks for is one the shipped dictionary holds", () => {
    const missing = NEEDED_LEMMAS.filter((l) => !byLemma.has(l));
    expect(missing).toEqual([]);
  });

  it("every thing has a plain English gloss to say at the end", () => {
    const bare = THINGS.filter((t) => !gloss(t.lemma));
    expect(bare).toEqual([]);
    expect(THINGS.length).toBeGreaterThan(50);
  });

  it("a thing names only parts, colours and categories the game can ask about", () => {
    let checked = 0;
    for (const t of THINGS) {
      for (const p of [...t.has, ...t.hasS]) { expect(PARTS).toContain(p); checked++; }
      for (const c of [...t.colour, ...t.colourS]) { expect(COLOURS).toContain(c); checked++; }
      for (const k of [...t.isa, ...t.isaS]) { expect(CATEGORIES).toContain(k); checked++; }
      expect(t.size).toBeGreaterThanOrEqual(1);
      expect(t.size).toBeLessThanOrEqual(10);
    }
    expect(checked).toBeGreaterThan(200);
  });

  it("no fact is both always and sometimes true of one thing", () => {
    let pairs = 0;
    for (const t of THINGS) {
      const clash = (a: readonly string[], b: readonly string[]) => a.filter((x) => b.includes(x));
      for (const [a, b] of [[t.has, t.hasS], [t.can, t.canS], [t.use, t.useS], [t.where, t.whereS], [t.colour, t.colourS], [t.feel, t.feelS], [t.isa, t.isaS]] as const) {
        expect(clash(a, b), t.lemma).toEqual([]);
        pairs++;
      }
    }
    expect(pairs).toBeGreaterThan(300);
  });

  it("the four answers are words the course teaches", () => {
    for (const lemma of ["jah", "ei", "mõnikord", "teadma"]) expect(byLemma.has(lemma)).toBe(true);
    expect(Object.values(ANSWER_ET)).toEqual(["Jah", "Ei", "Mõnikord", "Ei tea"]);
  });
});

describe("reading the learner's question", () => {
  it("tokenises Estonian letters whole", () => {
    expect(tokensOf("Kas see on suurem kui leib?")).toEqual(["kas", "see", "on", "suurem", "kui", "leib"]);
    expect(tokensOf("Kas õun on jõgi?")).toEqual(["kas", "õun", "on", "jõgi"]);
  });

  it("every idea offered to the learner is understood and answered", () => {
    let asked = 0;
    for (const group of IDEAS) {
      for (const idea of group.ideas) {
        const r = answerTo(idea.et, "koer");
        expect(r.kind, idea.et).toBe("answer");
        if (r.kind === "answer") expect(r.tips, idea.et).toEqual([]);
        asked++;
      }
    }
    expect(asked).toBe(16);
  });

  it("answers the classic questions about a duck", () => {
    expect(said("Kas see on loom?", "part")).toBe("yes");
    expect(said("Kas see on lind?", "part")).toBe("yes");
    expect(said("Kas see on taim?", "part")).toBe("no");
    expect(said("Kas see lendab?", "part")).toBe("yes");
    expect(said("Kas see ujub?", "part")).toBe("yes");
    expect(said("Kas seda saab süüa?", "part")).toBe("no");
    expect(said("Kas sellel on tiivad?", "part")).toBe("yes");
    expect(said("Kas sellel on rattad?", "part")).toBe("no");
    expect(said("Kas see on suur?", "part")).toBe("no");
    expect(said("Kas see on väike?", "part")).toBe("sometimes");
    expect(said("Kas see on suurem kui leib?", "part")).toBe("yes");
    expect(said("Kas see on väiksem kui leib?", "part")).toBe("no");
    expect(said("Kas see on punane?", "part")).toBe("no");
    expect(said("Kas see on kollane?", "part")).toBe("sometimes");
  });

  it("answers about a bus", () => {
    expect(said("Kas see on sõiduk?", "buss")).toBe("yes");
    expect(said("Kas sellega saab sõita?", "buss")).toBe("yes");
    expect(said("Kas see on elus?", "buss")).toBe("no");
    expect(said("Kas see liigub?", "buss")).toBe("yes");
    expect(said("Kas see on suur?", "buss")).toBe("yes");
    expect(said("Kas sellel on rattad?", "buss")).toBe("yes");
    expect(said("Kas see on kodus?", "buss")).toBe("no");
  });

  it("tells eating something from something eating", () => {
    expect(said("Kas seda saab süüa?", "leib")).toBe("yes");
    expect(said("Kas see sööb?", "leib")).toBe("no");
    expect(said("Kas see sööb?", "koer")).toBe("yes");
    expect(said("Kas seda saab juua?", "piim")).toBe("yes");
  });

  it("a guess wins only on the thing itself", () => {
    const win = answerTo("Kas see on part?", "part");
    expect(win.kind === "answer" && win.won && win.guess).toBe(true);
    const miss = answerTo("Kas see on koer?", "part");
    expect(miss.kind === "answer" && !miss.won && miss.guess && miss.answer === "no").toBe(true);
    const kind = answerTo("Kas see on lind?", "part");
    expect(kind.kind === "answer" && !kind.won && kind.answer === "yes").toBe(true);
  });

  it("a negative question flips yes and no and leaves sometimes alone", () => {
    expect(said("Kas see ei lenda?", "part")).toBe("no");
    expect(said("Kas see ei lenda?", "koer")).toBe("yes");
  });

  it("two things the same size are about the same", () => {
    expect(said("Kas see on suurem kui leib?", "raamat")).toBe("sometimes");
  });

  it("turns away what is not a yes or no question, without spending one", () => {
    expect(said("Mis see on?", "part")).toBe("refused:wh");
    expect(said("Kui suur see on?", "part")).toBe("refused:wh");
    expect(said("Kas see on suur või väike?", "part")).toBe("refused:or");
    expect(said("Kas see on suur ja punane?", "part")).toBe("refused:many");
    expect(said("", "part")).toBe("refused:empty");
    expect(said("Kas see on suurem?", "part")).toBe("refused:compare");
    expect(said("Kas banaan?", "part")).not.toBe("refused:empty");
    expect(said("Tere hommikust", "part")).toBe("refused:unknown");
  });

  it("says it does not know a thing it has no size for", () => {
    expect(said("Kas see on suurem kui lind?", "part")).toBe("unknown");
  });
});

describe("what the learner is told about the sentence", () => {
  const tipsFor = (q: string, secret = "part") => {
    const r = answerTo(q, secret);
    return r.tips.map((t) => t.id);
  };

  it("a clean question carries no tip", () => {
    expect(tipsFor("Kas see on suur?")).toEqual([]);
    expect(tipsFor("Kas sellel on tiivad?")).toEqual([]);
  });

  it("starting without kas is named, with the question put right in the learner's own words", () => {
    const r = answerTo("see on suur?", "part");
    expect(r.tips[0]).toMatchObject({ id: "kas", example: "Kas see on suur?" });
  });

  it("a missing question mark is named", () => {
    expect(tipsFor("Kas see on suur")).toEqual(["mark"]);
  });

  it("a missing on is named", () => {
    const r = answerTo("Kas see suur?", "part");
    expect(r.tips).toEqual([expect.objectContaining({ id: "on", example: "Kas see on suur?" })]);
    expect(r.kind).toBe("answer");
  });

  it("a part asked for without sellel on is named", () => {
    const r = answerTo("Kas see on tiivad?", "part");
    expect(r.tips.map((t) => t.id)).toContain("sellel");
  });

  it("the thing after kui keeps its plain form", () => {
    const r = answerTo("Kas see on suurem kui leiba?", "part");
    expect(r.tips).toEqual([expect.objectContaining({ id: "kui-form", example: "Kas see on suurem kui leib?" })]);
  });

  it("a thing named in an ending after on is named in its plain form", () => {
    const r = answerTo("Kas see on koera?", "part");
    expect(r.tips.map((t) => t.id)).toContain("base");
  });

  it("the describing word before see is named", () => {
    expect(tipsFor("Kas suur see on?")).toContain("order");
  });
});

describe("a round", () => {
  it("counts the questions that were answered and the hints, and not the ones turned away", () => {
    const answered = answerTo("Kas see on suur?", "part");
    const refused = answerTo("Mis see on?", "part");
    expect(spent([
      { reply: answered }, { reply: refused }, { reply: { kind: "hint" } }, { reply: answered },
    ])).toBe(3);
    expect(QUESTION_LIMIT).toBe(20);
  });
});
