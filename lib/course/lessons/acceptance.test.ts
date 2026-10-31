import { describe, expect, it } from "vitest";
import { LESSONS } from "./index";
import { ledgersBefore, lessonRank, teach, type Ledger } from "./ledger";
import { NOTES, everyTypedQuestion, fixItem, markOwnAnswer, markPhrase, markRework, markTyped, notSlipsFor, reworkItem, type PracticeItem } from "./practice";
import { combinedSentences, sameSentence, spokenPhrase } from "./sameSentence";
import { markGap, usesIn } from "./frame";
import { PARALLEL_FORMS } from "./parallelForms";

/*
  THE ROUND 3 ENGINE AUDIT, ON THE LESSONS' OWN SENTENCES. Each block is a
  finding, and each guard it put in has a line here that fails when that guard
  alone is taken out: that is how the guard is known to be doing the work
  rather than standing beside one that is.
*/

const BEFORE = ledgersBefore(LESSONS);

function lesson(prefix: string) {
  const found = LESSONS.find((l) => l.id.startsWith(prefix));
  if (!found) throw new Error(`no lesson ${prefix}`);
  return found;
}

function after(prefix: string): Ledger {
  const l = lesson(prefix);
  return teach(BEFORE.get(l.id)!, l.teaches, lessonRank(l), l.patterns);
}

type Changed = Extract<PracticeItem, { kind: "rework" | "fix" }>;
const fix = (prefix: string, n: number): Changed => fixItem(lesson(prefix).fixes![n - 1]!, after(prefix));

/** The rework or fix of any lesson whose accepted sentences hold `sentence`. */
function accepting(sentence: string): Changed {
  for (const l of LESSONS) {
    const t = teach(BEFORE.get(l.id)!, l.teaches, lessonRank(l), l.patterns);
    const items: Changed[] = [...(l.reworks ?? []).map((r) => reworkItem(r, t)), ...(l.fixes ?? []).map((f) => fixItem(f, t))];
    const hit = items.find((it) => it.accept.includes(sentence));
    if (hit) return hit;
  }
  throw new Error(`no item accepts ${sentence}`);
}

const verdictOf = (typed: string, item: Changed) => markRework(typed, item).verdict;

describe("a demonstrative before the words a row replaced (F1, L1)", () => {
  it("is never put in front of a verb, from a row that reorders (b1-06 R2)", () => {
    const item = accepting("Palun parandage dušš ära.");
    expect(verdictOf("Palun see parandage dušš ära.", item)).not.toBe("right");
    expect(verdictOf("See parandage dušš palun ära.", item)).not.toBe("right");
    // In front of the noun it stands for, from a row that only replaces it, it is right.
    expect(markRework("Palun parandage see dušš ära.", item)).toMatchObject({ verdict: "right", note: NOTES.right });
  });

  it("is never put in front of another demonstrative (L1)", () => {
    expect(verdictOf("Mari mõtles sellest sellele.", accepting("Mari mõtles sellele."))).not.toBe("right");
  });

  it("is never put in front of a possessive", () => {
    const item = accepting("Ta parandas mu auto ära.");
    expect(verdictOf("Ta parandas selle minu auto ära.", item)).not.toBe("right");
    expect(verdictOf("Ta parandas selle mu auto ära.", item)).not.toBe("right");
  });
});

describe("two accepted changes at once, narrowed (F2, F3)", () => {
  it("never puts a word in directly in front of a word another row replaced (b1-45 R3)", () => {
    const item = accepting("Lõpuks sai Tom rahakoti tagasi.");
    for (const typed of ["Tom sai lõpuks oma selle tagasi.", "Tom sai lõpuks oma selle rahakoti tagasi.", "Ta sai oma selle lõpuks tagasi."]) {
      expect(verdictOf(typed, item), typed).not.toBe("right");
    }
    expect(markRework("Lõpuks sai Tom selle rahakoti tagasi.", item)).toMatchObject({ verdict: "right", note: NOTES.right });
  });

  it("never mixes two reordering rows (b1-39 R2)", () => {
    expect(verdictOf("Telefon see ei tööta, kuigi on uus.", accepting("Kuigi telefon on uus, ei tööta see."))).not.toBe("right");
  });

  it("lets a word put in or taken out follow a replaced word directly", () => {
    expect(markRework("Ma ei parandanud seda ära.", accepting("Ma ei parandanud akent."))).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markRework("Ära too seda!", accepting("Ära too diivanit siia!"))).toMatchObject({ verdict: "right", note: NOTES.right });
  });

  // The shapes, on rows written for the table, since the lessons hold no row that shows each guard alone.
  it("never combines a row that puts in or takes out a subject pronoun", () => {
    // Without the pronoun, `tuleks` is every person and nothing says whose.
    expect(combinedSentences("Ma homme tuleksin.", ["Homme tuleksin.", "Ma homme tuleks."], {})).not.toContain("homme tuleks .");
  });

  it("never combines a row that changes more than one word", () => {
    expect(combinedSentences("Ta tuli eile koju.", ["Ta tuli täna hommikul koju.", "Ta tuli eile koju tagasi."], {}))
      .not.toContain("tema tuli täna hommikul koju tagasi .");
  });

  it("never combines a row that changes punctuation", () => {
    expect(combinedSentences("Ta tuli koju ja jäi magama.", ["Ta tuli koju, ja jäi magama.", "Ta tuli koju ja jäi kohe magama."], {}))
      .not.toContain("tema tuli koju , ja jäi kohe magama .");
  });

  it("never puts a word in directly in front of a word another row replaced, on rows of one change each", () => {
    // `oma` is the noun's possessive, and with the noun gone it is left standing alone.
    expect(combinedSentences("Ma leidsin rahakoti.", ["Ma leidsin oma rahakoti.", "Ma leidsin selle."], {})).not.toContain("mina leidsin oma selle .");
  });

  it("never says one word twice, where two rows put it in at two places", () => {
    expect(combinedSentences("Too kast siia!", ["Too palun kast siia!", "Too kast palun siia!"], {})).not.toContain("too palun kast palun siia !");
  });

  it("never puts a demonstrative in front of a verb", () => {
    expect(combinedSentences("Ma ostsin auto.", ["Ma seda auto."], { ostsin: ["Sg1"] })).not.toContain("mina seda ostsin auto .");
  });

  it("wants a word between two rows' changes, not only a comma", () => {
    expect(combinedSentences("Ma tulen, kui saan.", ["Ma tulen homme, kui saan.", "Ma tulen, kuna saan."], {}))
      .not.toContain("mina tulen homme , kuna saan .");
  });

  it("never combines a row of more than one change", () => {
    expect(combinedSentences("Ta ostis leiba ja piima.", ["Täna ta ostis leiba ja piima ka.", "Ta ostis saia ja piima."], {}))
      .not.toContain("täna tema ostis saia ja piima ka .");
  });
});

describe("a pronoun put in is never said twice across punctuation (F4)", () => {
  it("is not right with a stop or a comma after the pronoun", () => {
    const item = accepting("Ma lugesin raamatu läbi.");
    for (const typed of ["Ma. Ma lugesin raamatu läbi.", "Ma, ma lugesin raamatu läbi.", "Lugesin ma, raamatu läbi.", "Lugesin ma. raamatu läbi."]) {
      expect(verdictOf(typed, item), typed).not.toBe("right");
    }
    // Leaving a comma out is never stricter: the pronoun dropped from a sentence with one, typed without it.
    expect(markRework("Ma tean. Kontrollin seda iga päev!", fix("b1-24", 1)).verdict).toBe("right");
  });

  it("is not right after the last stop (b1-20)", () => {
    const item = accepting("Esmaspäevast neljapäevani töötaksin ma.");
    expect(verdictOf("Esmaspäevast neljapäevani töötaksin ma. Ma", item)).not.toBe("right");
  });

  it("nor when the rest is reordered", () => {
    expect(sameSentence("Raamatu lugesin läbi.", "Lugesin ma, raamatu läbi.", { lugesin: ["Sg1"] })).toBeNull();
    expect(sameSentence("Raamatu lugesin läbi.", "Lugesin ma raamatu läbi.", { lugesin: ["Sg1"] })).not.toBeNull();
  });

  it("is refused twice in one clause by the subject rule, reading only that clause (L3)", () => {
    const persons = { oled: ["Sg2"], ootan: ["Sg1"] } as const;
    expect(sameSentence("Kus sa oled? Ma ootan.", "Kus sa oled? Ma ma ootan.", persons)).toBeNull();
    expect(sameSentence("Kus sa oled? Ma ootan.", "Kus sa oled? Ootan.", persons)).toMatchObject({ how: "pronoun" });
  });
});

describe("a number's stops (L2, F5)", () => {
  it("a digit before an ordinal's stop is not a count", () => {
    expect(sameSentence("Ma tulen 2. mail.", "Ma tulen kaks mail.", {})).toBeNull();
    expect(sameSentence("Ma tulen 2 korda.", "Ma tulen kaks korda.", {})).toMatchObject({ how: "same" });
  });

  it("an ordinal's stop ends no clause", () => {
    expect(sameSentence("Ma kolisin 2015. aastal Tallinna.", "2015. aastal kolisin ma Tallinna.", {})).toMatchObject({ how: "order" });
  });

  it("a time or a date is one word", () => {
    expect(spokenPhrase("Koosolek on kell 14.30.")).toBe("koosolek on kell 14.30");
    expect(spokenPhrase("Ma kolisin 12.03.2025 siia.")).toBe("mina kolisin 12.03.2025 siia");
  });
});

describe("Say it reads digits the way a rework does (L4)", () => {
  it("is right with a count in digits", () => {
    expect(markPhrase("Ma pean 2 kuud ette teatama.", ["Ma pean kaks kuud ette teatama."])).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markOwnAnswer("Ma pean 2 kuud ette teatama.", "Ma pean kaks kuud ette teatama.", null)).toMatchObject({ verdict: "right" });
    expect(markPhrase("Ma pean 3 kuud ette teatama.", ["Ma pean kaks kuud ette teatama."]).verdict).toBe("wrong");
  });
});

describe("the writing frame reads pole and Mina the marker's way (H1, M1)", () => {
  it("marks a gap right", () => {
    expect(markGap("keegi pole tulnud", "keegi ei ole tulnud")).toBe("right");
    expect(markGap("Mina ootan teie vastust", "Ma ootan teie vastust")).toBe("right");
    expect(markGap("keegi ei ole tulnd", "keegi ei ole tulnud")).toBe("wrong");
  });

  it("ticks the use in a draft", () => {
    const uses = [{ et: "keegi ei ole tulnud", en: "" }, { et: "Ma ootan teie vastust", en: "" }];
    expect(usesIn("Keegi pole tulnud. Mina ootan teie vastust.", uses)).toEqual([true, true]);
    // Across a full stop the words are not one use.
    expect(usesIn("Keegi ei. Ole tulnud.", uses)).toEqual([false, false]);
  });
});

describe("a fix takes the other ways of putting it right (H2)", () => {
  it("is right with a synonym the lesson taught", () => {
    expect(markRework("Kaks tükki! Aga ma pean ikka juhi käest luba küsima.", fix("b1-19", 2))).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markRework("Miks sa minu käest abi ei küsinud?", fix("b1-08", 2))).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markRework("Kaks tükki! Aga ma pean ikka juhile luba küsima.", fix("b1-19", 2)).note).toBe(NOTES.slipStill);
  });
});

describe("a pronoun of the wrong person before a typed verb (M2)", () => {
  const typed = (prefix: string, answer: string) => {
    const l = lesson(prefix);
    const q = everyTypedQuestion(l, BEFORE.get(l.id)!).find((x) => x.kind === "type" && x.answer === answer);
    if (!q || q.kind !== "type") throw new Error(`no question for ${answer}`);
    return q;
  };

  it("says the pronoun is the fault, never half right", () => {
    expect(markTyped(typed("b1-48", "väljastan"), "sa väljastan")).toMatchObject({ verdict: "wrong", note: NOTES.otherPerson });
    expect(markTyped(typed("b1-48", "väljastan"), "ma väljastan")).toMatchObject({ verdict: "right" });
    // A form of every person still says half right, since no pronoun is the wrong one.
    expect(markPhrase("ma pole", ["pole"])).toMatchObject({ verdict: "nearly", note: NOTES.halfRight });
  });
});

describe("a taught spelling the ledger cannot place is named as neither (F6)", () => {
  it("calls kirjutate another spelling beside kirjutage, never another word", () => {
    const l = lesson("a2-06");
    const q = everyTypedQuestion(l, BEFORE.get(l.id)!).find((x) => x.kind === "type" && x.answer === "Palun kirjutage siia alla.");
    if (!q || q.kind !== "type") throw new Error("no question for Palun kirjutage siia alla.");
    expect(markTyped(q, "Palun kirjutate siia alla.")).toMatchObject({ verdict: "wrong", note: NOTES.otherSpelling });
    // Two words the ledger places are still two words.
    expect(notSlipsFor(["kaheksas"], after("a2-05")).words).toContain("kaheksa");
  });
});

describe("a plural partitive's second spelling (content C3-H1)", () => {
  it("is right wherever the stored one is", () => {
    for (const [typed, row] of [
      ["Ma ei ostnud munasid.", "Ma ei ostnud mune."],
      ["Ta sõi õunasid.", "Ta sõi õunu."],
      ["Ma kardan koerasid.", "Ma kardan koeri."],
      ["Kontole tuleb palk pärast maksusid.", "Kontole tuleb palk pärast makse."],
    ] as const) {
      expect(markRework(typed, accepting(row)), typed).toMatchObject({ verdict: "right", note: NOTES.right });
    }
    expect(markOwnAnswer("Ma ei ostnud munasid.", "Ma ei ostnud mune.", null).verdict).toBe("right");
    // Without its marks it is the marks note, as the stored spelling is.
    expect(markRework("Ta sõi ounasid.", accepting("Ta sõi õunu.")).note).toBe(NOTES.marks);
  });

  it("never reads a refused one as the same word", () => {
    expect(PARALLEL_FORMS.teesid).toBeUndefined();
    expect(spokenPhrase("Ma ühendan teesid edasi.")).not.toBe(spokenPhrase("Ma ühendan teid edasi."));
  });
});

describe("a reply word in front of an answer (coordinator)", () => {
  it("is read off where it agrees with the answer", () => {
    expect(markRework("Ei, ma ei ostnud mune.", accepting("Ma ei ostnud mune."))).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markRework("Jah, ma täitsin selle ära.", accepting("Ma täitsin selle ära."))).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markRework("Nii. Ma täitsin selle ära.", accepting("Ma täitsin selle ära."))).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markRework("Hea küll, ma lugesin raamatu läbi.", accepting("Ma lugesin raamatu läbi."))).toMatchObject({ verdict: "right" });
    // The rest is marked on its own, so a wrong rest is still wrong.
    expect(verdictOf("Ei, ma ei ostnud muna.", accepting("Ma ei ostnud mune."))).toBe("wrong");
  });

  it("never a yes before a no, nor a no before a yes", () => {
    expect(verdictOf("Jah, ma ei ostnud mune.", accepting("Ma ei ostnud mune."))).not.toBe("right");
    expect(verdictOf("Ei, ma lugesin raamatu läbi.", accepting("Ma lugesin raamatu läbi."))).not.toBe("right");
    // A command not to is a no as well; the `ära` of `täitsin ära`, above, is not.
    expect(verdictOf("Jah, ära too seda siia!", accepting("Ära too seda siia!"))).not.toBe("right");
  });

  it("is left where an accepted line opens on it", () => {
    // Read off, `Täitsin blanketi ära` would be held to a line that opens on `Nii`; left on, the pronoun is what is left out.
    expect(markRework("Nii. Täitsin blanketi ära.", accepting("Nii. Ma täitsin blanketi ära."))).toMatchObject({ verdict: "right", note: NOTES.pronoun });
  });
});
