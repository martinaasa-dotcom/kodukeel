import { describe, expect, it } from "vitest";
import { BLANK } from "@/lib/estonian/cloze";
import { headwordsOf, keptOf, MOST_KEPT, MOST_READ, ownCardFor, ownCue, piecesOf, sentencesOf } from "./own";
import { LESSONS, ledgerThrough } from "./index";

describe("your own sentences as cards", () => {
  const lesson = LESSONS.find((l) => l.id === "a2-55-end") ?? LESSONS[LESSONS.length - 1]!;
  const taught = ledgerThrough(LESSONS, lesson.id)!;
  const heads = headwordsOf(LESSONS.slice(0, LESSONS.indexOf(lesson) + 1), taught);
  // The writing evening the defects were found on, with its own ledger.
  const email = LESSONS.find((l) => l.id === "b1-20-email")!;
  const emailTaught = ledgerThrough(LESSONS, email.id)!;
  const emailHeads = headwordsOf(LESSONS.slice(0, LESSONS.indexOf(email) + 1), emailTaught);
  const cardsOf = (sentence: string) => [ownCardFor(sentence, email, emailTaught, emailHeads)].filter((c) => c !== null);

  it("splits a draft into sentences of three words or more", () => {
    expect(sentencesOf("Tere. Ma elan Tallinnas ja töötan seal. Kas sa tuled ka?")).toEqual([
      "Ma elan Tallinnas ja töötan seal.",
      "Kas sa tuled ka?",
    ]);
    // And says how much it left out: the short piece is a piece, not a sentence.
    expect(piecesOf("Tere. Ma elan Tallinnas ja töötan seal. Kas sa tuled ka?")).toHaveLength(3);
  });

  it("does not cut a sentence at the stop of an ordinal", () => {
    expect(piecesOf("Tallinn, 12. märts. Ma kolisin siia 2025. aastal.")).toEqual(["Tallinn, 12. märts.", "Ma kolisin siia 2025. aastal."]);
    // A number ending a sentence still ends it.
    expect(piecesOf("Ma elan majas number 5. Siin on vaikne.")).toEqual(["Ma elan majas number 5.", "Siin on vaikne."]);
  });

  it("takes out one taught word of four letters or more", () => {
    const card = ownCardFor("Suvel ma kavatsen Saaremaale minna.", lesson, taught, heads)!;
    expect(card).not.toBeNull();
    expect(card.front).toContain(BLANK);
    expect(card.front.replace(BLANK, card.answer)).toBe("Suvel ma kavatsen Saaremaale minna.");
    expect(card.answer.length).toBeGreaterThanOrEqual(4);
    expect(taught.spellings.has(card.answer.toLocaleLowerCase("et"))).toBe(true);
  });

  it("earns nothing from a sentence with no taught word in it", () => {
    expect(ownCardFor("Blorp zing quux.", lesson, taught, heads)).toBeNull();
  });

  it("never files a spelling two lessons taught as two words under either of them", () => {
    // `tuli` is the fire in A1 and "he came" in A2.
    expect(heads.get("tuli")).toBeNull();
    const card = ownCardFor("Ta tuli tuba sisse.", lesson, taught, heads);
    expect(card?.answer).not.toBe("tuli");
    expect(card?.lemma).not.toBe("tuli");
    expect(cardsOf("Ta tuli tuba sisse.").every((c) => c.answer !== "tuli")).toBe(true);
  });

  it("files a form under its own word, and agrees with every lesson that taught it", () => {
    expect(heads.get("kooki")).toBe("kook");
    expect(heads.get("tulin")).toBe("tulema");
  });

  it("never cues a gap with its own answer", () => {
    // The ladder of a gap card: the headword and the meaning, then the meaning alone.
    expect(ownCue("kook", "kook", "cake")).toBe("cake");
    expect(ownCue("Minu", "minu", "my")).toBe("my");
    expect(ownCue("kooki", "kook", "cake")).toBe("kook, cake");
    // A word spelled alike in English has its answer in the meaning too, so nothing is said.
    expect(ownCue("film", "film", "film")).toBeNull();
    for (const sentence of ["Me sõime kook eile.", "Minu ema elab Tartus.", "Ma ostsin kooki ja kohvi."]) {
      for (const card of cardsOf(sentence)) {
        const cue = ownCue(card.answer, card.lemma, null);
        expect(cue === null || !cue.toLocaleLowerCase("et").split(/\W+/u).includes(card.answer.toLocaleLowerCase("et"))).toBe(true);
      }
    }
  });

  it("takes out a word the writing task asked to use first, then one tonight taught, then any other", () => {
    const uses = email.write!.uses.map((u) => u.et);
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) {
      // `Tallinnas` comes first and was taught long before, so only the order of preference can put the use ahead of it.
      expect(cardsOf(`Tallinnas ma elan ja ${use} on hea.`)[0]?.answer).toBe(use);
    }
    const tonight = email.teaches.flatMap((t) => (t.kind === "word" || t.kind === "form" ? [t.et] : []))
      .find((et) => et.length >= 4 && !uses.includes(et) && !et.includes(" ") && emailHeads.get(et.toLocaleLowerCase("et")));
    expect(tonight).toBeDefined();
    expect(cardsOf(`Tallinnas ma elan ja ${tonight} on hea.`)[0]?.answer).toBe(tonight);
  });

  it("prefers a form of a word to the word itself, so the cue can name it", () => {
    const card = ownCardFor("Ma tõin kooki ja kook oli hea.", lesson, taught, heads);
    expect(card).not.toBeNull();
    expect(card!.answer.toLocaleLowerCase("et")).not.toBe(card!.lemma.toLocaleLowerCase("et"));
  });

  it("keeps only a sentence the dictionary read clean, once, and no more than a draft keeps", () => {
    const read = [
      { sentence: "Me sõime kook eile.", findings: [{ kind: "agreement" }] },
      { sentence: "Me sõime kooki eile.", findings: [] },
    ];
    // Ticked or not, a sentence with a finding is never kept.
    expect(keptOf(["Me sõime kook eile.", "Me sõime kooki eile.", "Me sõime kooki eile."], read)).toEqual(["Me sõime kooki eile."]);
    // A sentence nobody read is not kept either.
    expect(keptOf(["Ma elan Tartus."], read)).toEqual([]);
    const many = Array.from({ length: 12 }, (_, i) => ({ sentence: `Lause number ${i}.`, findings: [] }));
    expect(keptOf(many.map((r) => r.sentence), many)).toHaveLength(MOST_KEPT);
  });

  it("reads the whole of the longest text any writing task asks for", () => {
    const longest = Math.max(...LESSONS.flatMap((l) => (l.write ? [l.write.least] : [])), 100);
    // A B1 sentence runs to five words or more.
    expect(MOST_READ * 5).toBeGreaterThanOrEqual(longest);
  });
});
