import { describe, expect, it } from "vitest";
import { isExactForm } from "@/lib/dict/forms";
import { DIALECT_WORDS, dialectProblems, standardOf } from "./dialect";
import { formsCheckWords } from "./ledger";
import { LESSONS } from "./index";

/*
  THE DIALECT GLOSSARY (`dialect.ts`): empty until `c1-maa` fills it, so its
  rules are asked both ways on a glossary made here, and of the real one.
*/
describe("the dialect glossary", () => {
  it("holds to its own shape", () => {
    expect(dialectProblems()).toEqual([]);
  });

  it("names only standard words the forms list knows", async () => {
    const unknown: string[] = [];
    for (const [key, standard] of Object.entries(DIALECT_WORDS)) {
      if (!(await isExactForm(standard.toLocaleLowerCase("et")))) unknown.push(`${key} -> ${standard}`);
    }
    expect(unknown).toEqual([]);
  });

  it("refuses a key with a capital, two words, or one that is its own standard", () => {
    expect(dialectProblems({ mõtsa: "metsa" })).toEqual([]);
    expect(dialectProblems({ Mõtsa: "metsa" }).join(" ")).toMatch(/lower-cased/);
    expect(dialectProblems({ "mõtsa ka": "metsa" }).join(" ")).toMatch(/is one word/);
    expect(dialectProblems({ metsa: "metsa" }).join(" ")).toMatch(/its own standard/);
  });

  it("answers a dialect spelling with its standard word, case aside, and an ordinary one with nothing", () => {
    expect(standardOf("Mõtsa", { mõtsa: "metsa" })).toBe("metsa");
    expect(standardOf("metsa", { mõtsa: "metsa" })).toBeNull();
  });
});

/*
  A DIALECT SPELLING IS ASKED AS ITS STANDARD WORD, AND ONLY IN A TEXT OR A
  TALK (`formsCheckWords`): the forms list does not know `mõtsa`, and reads
  `vällä` as a form of another word, so the check reads the glossary for it. A
  conversation line holding it is asked as itself, since a spelling there is
  held to the ledger and the forms list as every line is.
*/
describe("the forms check over a dialect spelling", () => {
  const glossary = { mõtsa: "metsa" };
  const base = LESSONS.find((l) => l.level === "B2" && l.read)!;
  const withText = { ...base, read: { genre: "a song", lines: [{ et: "Lähme mõtsa.", en: "Let's go to the woods." }] } };
  const asked = (lesson: typeof base) => formsCheckWords(lesson, glossary).map((w) => w.low);

  it("asks the standard word of a regional spelling in a text read, never the spelling", () => {
    expect(asked(withText)).toContain("metsa");
    expect(asked(withText)).not.toContain("mõtsa");
  });

  it("asks a regional spelling in a conversation as itself", () => {
    const inLine = { ...base, conversation: [...base.conversation, { who: base.conversation[0]!.who, et: "Lähme mõtsa.", en: "Let's go to the woods." }] };
    expect(asked(inLine)).toContain("mõtsa");
  });
});
