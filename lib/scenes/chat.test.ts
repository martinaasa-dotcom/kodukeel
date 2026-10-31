/**
 * TODAY'S CHAT, BUILT FROM A DAY'S WORDS (docs/41-fifth-batch.md, VB-11).
 *
 * The beats of a chat are not in a file, so what a scene file is held to by
 * `catalogue.test.ts` is held here of the builder: it asks only for words the
 * evening taught, it drops a word nobody can say rather than making a beat
 * nobody can finish, it never says the word it is asking for, and it ends.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROGRAMMES, newWordsIn } from "@/lib/course";
import { HARVESTED } from "@/prisma/data/harvested";
import {
  CHAT_MIN_NEW, CHAT_TEMPLATES, CHAT_WORDS, chatScene, chatWords,
  type ChatPlan, type ChatWord,
} from "./specs/chat";
import { answerForms } from "./retrieval";
import { buildLexicon, type DictEntry } from "./lexicon";
import { composeLive } from "./prompt";
import { sceneTemplates, onScreen } from "./onScreen";

const GLOSS = new Map(HARVESTED.map((w) => [w.lemma, w.gloss.split(/[,;]/)[0]!.trim()]));
const HAS = new Set(HARVESTED.map((w) => w.lemma));
const words = (lemmas: readonly string[]): ChatWord[] => lemmas.map((lemma) => ({ lemma, gloss: GLOSS.get(lemma) ?? "" }));

/*
  NO EVENING IS BUILT FROM UNITS ANY MORE, SO NONE OFFERS A CHAT. The chat
  follows such an evening alone (`chatFits` needs `!day.lesson`), and C1 was
  the last level built from units (docs/43-lessons.md §16). The tests that
  walked every evening a chat could follow went with them; the builder itself
  is kept passing until it goes with the unit builder (§15.13, C1-9), on a
  sample: C1 lesson evenings' words, which are real words with real glosses,
  standing in for an evening's.
*/
const SAMPLES = PROGRAMMES.flatMap((programme) =>
  programme.days.filter((day) => day.level === "C1" && newWordsIn(day) >= CHAT_MIN_NEW).map((day) => ({ programme, day })));

function planFor(programmeId: string, day: (typeof SAMPLES)[number]["day"], talked = new Set<string>()): ChatPlan {
  return {
    programmeId, dayId: day.id, unitId: day.unitId,
    words: chatWords(words(day.words), talked, (lemma) => HAS.has(lemma)),
    remembered: null,
  };
}

describe("which of today's words a chat asks for", () => {
  it("drops a word nobody can say, rather than making a beat nobody can finish", () => {
    const picked = chatWords(
      [{ lemma: "a", gloss: "one" }, { lemma: "b", gloss: "two" }, { lemma: "c", gloss: "three" }],
      new Set(),
      (lemma) => lemma !== "b",
    );
    expect(picked.map((w) => w.lemma)).toEqual(["a", "c"]);
  });

  it("drops a word spelled the same in English, since its objective would be its answer", () => {
    const picked = chatWords(
      [{ lemma: "number", gloss: "number" }, { lemma: "august", gloss: "August" }, { lemma: "kohv", gloss: "coffee" }],
      new Set(),
      () => true,
    );
    expect(picked.map((w) => w.lemma)).toEqual(["kohv"]);
  });

  it("drops a word with no English to name it by", () => {
    expect(chatWords([{ lemma: "a", gloss: " " }], new Set(), () => true)).toEqual([]);
  });

  it("asks about words the two of them have not talked about first", () => {
    const picked = chatWords(
      [{ lemma: "a", gloss: "1" }, { lemma: "b", gloss: "2" }, { lemma: "c", gloss: "3" }],
      new Set(["a"]),
      () => true,
    );
    expect(picked.map((w) => w.lemma)).toEqual(["b", "c", "a"]);
  });

  it("asks for four at most, and each once", () => {
    const many = ["a", "b", "c", "b", "d", "e", "f"].map((lemma) => ({ lemma, gloss: `w${lemma}w` }));
    const picked = chatWords(many, new Set(), () => true);
    expect(picked.length).toBe(CHAT_WORDS);
    expect(new Set(picked.map((w) => w.lemma)).size).toBe(CHAT_WORDS);
  });
});

describe("a chat built from an evening's words", () => {
  it("opens with what the two of them talked about last time, by its meaning", () => {
    const { programme, day } = SAMPLES[5]!;
    const plan = { ...planFor(programme.id, day), remembered: "the weather" };
    const scene = chatScene(plan, []);
    expect(scene.beats[1]!.they).toContain("\"the weather\" last time");
    expect(scene.beats[2]?.they ?? "").not.toContain("last time");
  });

  it("is walked out of, ends short through nobody's fault, and has an ending for all of it", () => {
    const { programme, day } = SAMPLES[3]!;
    const scene = chatScene(planFor(programme.id, day), []);
    const required = scene.beats.filter((b) => b.required).map((b) => b.id);
    const ids = scene.outcomes.map((o) => o.id);
    expect(ids).toContain("left");
    expect(scene.outcomes.find((o) => required.every((id) => o.when.includes(id)))).toBeDefined();
    const sizes = scene.outcomes.map((o) => o.when.length);
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });

  it("says some words got an outing whichever of them was used, not only the first", () => {
    const { programme, day } = SAMPLES[3]!;
    const scene = chatScene(planFor(programme.id, day), []);
    const words = scene.beats.filter((b) => b.id.startsWith("word-")).map((b) => b.id);
    expect(words.length).toBeGreaterThan(1);
    const some = scene.outcomes.find((o) => o.id.startsWith("some"))!.says;
    for (const word of words) {
      const done = new Set(["greet", word]);
      const fits = scene.outcomes.find((o) => o.when.every((id) => done.has(id)));
      expect(fits?.says, `only ${word} used`).toBe(some);
    }
  });
});

describe("the other side never says the word for them", () => {
  it("counts every form of the word a beat elicits as giving it away", () => {
    const rows: DictEntry[] = [{
      lemma: "kohv", pos: "NOUN", cefr: "A1", usages: [],
      parts: { NOM_SG: "kohv", GEN_SG: "kohvi", PART_SG: "kohvi" },
    }];
    const lexicon = buildLexicon(rows);
    const forms = answerForms({
      id: "word-1", goal: "", they: "", move: "ask", topic: [], elicits: "kohv",
      needs: [{ kind: "lemma", oneOf: ["kohv"] }], required: true, patience: 2, shape: "word",
    }, lexicon);
    expect(forms.has("kohv")).toBe(true);
    expect(forms.has("kohvi")).toBe(true);
  });

  it("and a beat that elicits nothing gives nothing away by naming its lemma", () => {
    const lexicon = buildLexicon([{ lemma: "kohv", pos: "NOUN", cefr: "A1", usages: [], parts: { NOM_SG: "kohv" } }]);
    const forms = answerForms({
      id: "x", goal: "", they: "", move: "ask", topic: ["kohv"],
      needs: [{ kind: "lemma", oneOf: ["kohv"] }], required: true, patience: 2, shape: "word",
    }, lexicon);
    expect(forms.size).toBe(0);
  });

  it("tells the composer the word, and to leave it to them", () => {
    const live = composeLive({ move: "ask", they: "x", reading: "", examples: [], asked: [], avoid: [], elicit: "kohv" });
    expect(live).toContain("\"kohv\"");
    expect(live).toMatch(/never say that word yourself/);
    expect(composeLive({ move: "ask", they: "x", reading: "", examples: [], asked: [], avoid: [] })).not.toMatch(/should get to use/);
  });
});

describe("what a chat says on screen", () => {
  it("is filled from templates the reader's language can match", () => {
    const { programme, day } = SAMPLES[0]!;
    const scene = chatScene(planFor(programme.id, day), []);
    const templates = sceneTemplates(scene);
    for (const one of Object.values(CHAT_TEMPLATES)) expect(templates).toContain(one);
    // English comes back as it went in.
    expect(onScreen("en", scene.beats[1]!.goal, templates)).toBe(scene.beats[1]!.goal);
  });

  it("writes no Estonian of its own", () => {
    const source = readFileSync("lib/scenes/specs/chat.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/[õäöüšžÕÄÖÜŠŽ]/);
  });
});
