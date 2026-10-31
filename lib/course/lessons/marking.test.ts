import { describe, expect, it } from "vitest";
import { LESSONS } from "./index";
import { ledgersBefore, lessonRank, teach, type Ledger } from "./ledger";
import {
  NOTES, everyTypedQuestion, fixItem, markOwnAnswer, markPhrase, markRework, markTyped, personsFor, personsInEnglish,
  reasonPlace, reworkItem, withOrders, type PracticeItem,
} from "./practice";
import { RELATIVE, sameSentence } from "./sameSentence";
import type { OrderContext } from "@/lib/estonian/wordOrder";

/*
  THE MARKER ON THE LESSONS' OWN DATA. `practice.test.ts` holds the rules on
  sentences written for the table, with a verb table of its own; this holds
  them on the real reworks and fixes, read against the real ledger by the
  real `personsFor`, which is where an audit found a dropped pronoun refused
  on `Olen huvitatud ajaloost` and on `Täidan blanketi ära` while every row
  of the table passed.
*/

const BEFORE = ledgersBefore(LESSONS);

function lesson(prefix: string) {
  const found = LESSONS.find((l) => l.id.startsWith(prefix));
  if (!found) throw new Error(`no lesson ${prefix}`);
  return found;
}

/** Everything taught by the end of a lesson, which is what its practice reads. */
function after(prefix: string): Ledger {
  const l = lesson(prefix);
  return teach(BEFORE.get(l.id)!, l.teaches, lessonRank(l), l.patterns);
}

const rework = (prefix: string, n: number) => reworkItem(lesson(prefix).reworks![n - 1]!, after(prefix));
const fix = (prefix: string, n: number) => fixItem(lesson(prefix).fixes![n - 1]!, after(prefix));

type Item = Extract<PracticeItem, { kind: "rework" | "fix" }>;

describe("a dropped pronoun, on the lessons' own sentences", () => {
  const cases: readonly (readonly [string, () => Item, string])[] = [
    // The particle `ära` after the verb is not the command `ära`.
    ["b1-43 R2", () => rework("b1-43", 2), "Täidan blanketi ära."],
    ["b1-43 R3", () => rework("b1-43", 3), "Saatsin blanketi eile ära."],
    ["b1-03 F2", () => fix("b1-03", 2), "Pesin õunad juba ära."],
    // A verb taught with its first person has persons too.
    ["b1-09 F2", () => fix("b1-09", 2), "Huvitun muusikast."],
    // `olema`, `elama` and `rääkima` were taught as rows of forms, and have persons.
    ["b1-22 R2", () => rework("b1-22", 2), "Elame remonditud korteris."],
    ["b1-22 F2", () => fix("b1-22", 2), "Elan remonditud korteris."],
    ["b1-41 F1", () => fix("b1-41", 1), "Olen selle plaani vastu."],
    ["b1-19 R3", () => rework("b1-19", 3), "Oleksin pidanud juba ammu puhkusele minema."],
    ["b1-31 R3", () => rework("b1-31", 3), "Olin pileti koju ära unustanud."],
    ["b1-31 F1", () => fix("b1-31", 1), "Olin telefoni koju unustanud."],
    ["b1-15 R1", () => rework("b1-15", 1), "Oleks varem alustanud."],
    // A full stop ends a clause, so one pronoun is dropped from one clause.
    ["b1-24 F1", () => fix("b1-24", 1), "Ma tean. Kontrollin seda iga päev!"],
    ["b1-24 F1, the other", () => fix("b1-24", 1), "Tean. Mina kontrollin seda iga päev!"],
    ["b1-04 F1", () => fix("b1-04", 1), "Jaan, kus sa oled? Ootan sind juba pool tundi."],
    // A possessive `teie` is not a second subject.
    ["b1-27-complaint", () => fixItem(lesson("b1-27").fixes!.find((f) => f.line.et === "Ma ootan teie vastust.")!, after("b1-27")), "Ootan teie vastust."],
  ];
  for (const [name, item, typed] of cases) {
    it(`${name}: ${typed} is right`, () => {
      expect(markRework(typed, item()).verdict).toBe("right");
    });
  }

  it("a reason first with the pronoun left out of its clause is right (b1-15 R3)", () => {
    expect(markRework("Kui ma oleksin teadnud, siis oleksin tulnud.", rework("b1-15", 3)).verdict).not.toBe("wrong");
  });

  it("a pronoun put in or left out away from its verb, in the verb's own clause, is right (b1-46 F3, b1-38)", () => {
    expect(markRework("Ma siis kirjutan: ujumise õppimine.", fix("b1-46", 3))).toMatchObject({ verdict: "right", note: NOTES.pronoun });
    const usu = reworkItem(lesson("b1-38").reworks!.find((r) => r.to.et.startsWith("Ma ei usu"))!, after("b1-38"));
    expect(markRework("Ma ei usu, et seda nägid.", usu)).toMatchObject({ verdict: "right", note: NOTES.pronoun });
    // A pronoun in the wrong person is not dropped or added on the strength of a verb in another clause.
    expect(markRework("Ma ei usu, et ma seda nägid.", usu).verdict).toBe("wrong");
  });

  it("a full stop is not a pass for a second subject", () => {
    expect(markRework("Seda tean. Mina kontrollin ma iga päev!", fix("b1-24", 1)).verdict).toBe("wrong");
  });

  it("a command opening on ära keeps its pronoun rule", () => {
    expect(sameSentence("Ära mine sinna!", "Sa ära mine sinna!", { mine: ["Sg2"] })).toBeNull();
  });

  it("every pronoun-led sentence a rework or a fix accepts is still right with the pronoun left out", () => {
    const drop = /^(ma|mina|me|meie|sa|sina|te|teie)\s+/iu;
    const wrong: string[] = [];
    let tried = 0;
    for (const l of LESSONS) {
      const taught = teach(BEFORE.get(l.id)!, l.teaches, lessonRank(l), l.patterns);
      const items: Item[] = [...(l.reworks ?? []).map((r) => reworkItem(r, taught)), ...(l.fixes ?? []).map((f) => fixItem(f, taught))];
      for (const item of items) {
        for (const a of item.accept) {
          if (!drop.test(a) || /\b(ei|ega|pole|polnud|poleks)\b/iu.test(a) || /^\p{L}+\s+(ära|ärge)\b/iu.test(a)) continue;
          tried += 1;
          const typed = a.replace(drop, "");
          const capital = typed.charAt(0).toLocaleUpperCase("et") + typed.slice(1);
          if (markRework(capital, item).verdict !== "right") wrong.push(`${l.id}: ${a}`);
        }
      }
    }
    expect(tried).toBeGreaterThan(100);
    expect(wrong).toEqual([]);
  });
});

describe("personsFor reads the real ledger", () => {
  it("knows a verb taught as a pair, and one taught as a row of forms", () => {
    const p = personsFor(after("b1-31"), ["Olin oled olete ootan elame räägin oleksin oleks"]);
    expect(p["ootan"]).toContain("Sg1");
    expect(p["olin"]).toContain("Sg1");
    expect(p["oled"]).toContain("Sg2");
    expect(p["olete"]).toContain("Pl2");
    expect(p["elame"]).toContain("Pl1");
    expect(p["räägin"]).toContain("Sg1");
    expect(p["oleksin"]).toContain("Sg1");
    expect(p["oleks"]).toEqual(expect.arrayContaining(["Sg1", "Pl1"]));
  });

  it("reads a person off a form's English, and none off the form after ei", () => {
    expect(personsInEnglish("I am")).toEqual(["Sg1"]);
    expect(personsInEnglish("you live, polite or more than one")).toEqual(["Pl2"]);
    expect(personsInEnglish("you are, to one person you know")).toEqual(["Sg2"]);
    expect(personsInEnglish("you were, they were")).toEqual(["Sg2", "Pl3"]);
    expect(personsInEnglish("live, after {ei}")).toEqual([]);
    expect(personsInEnglish("would be")).toEqual([]);
  });
});

describe("a typed word or phrase reads ma and mina, pole and ei ole, as one", () => {
  it("is right with the long pronoun, no note (D1)", () => {
    expect(markPhrase("Mida sina teed?", ["Mida sa teed?"])).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markPhrase("Mina ei saa aru.", ["Ma ei saa aru."])).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markOwnAnswer("Mina pean kaks kuud ette teatama.", "Ma pean kaks kuud ette teatama.", null)).toMatchObject({ verdict: "right", note: NOTES.right });
  });

  it("is right with ei olnud for polnud (b1-31)", () => {
    expect(markPhrase("ei olnud", ["polnud"]).verdict).toBe("right");
  });

  it("holds a number to the number asked for", () => {
    expect(markPhrase("Mul on 20 sõnumit.", ["Mul on kakskümmend sõnumit.", "Mul on 20 sõnumit."]).verdict).toBe("right");
    expect(markPhrase("Mul on 5 sõnumit.", ["Mul on kakskümmend sõnumit.", "Mul on 20 sõnumit."]).verdict).toBe("wrong");
    expect(markPhrase("Mul on sõnumit.", ["Mul on kakskümmend sõnumit.", "Mul on 20 sõnumit."]).verdict).toBe("wrong");
    expect(markPhrase("See ehitati aastal.", ["See ehitati 1930. aastal."]).verdict).toBe("wrong");
    expect(markPhrase("See ehitati 1990. aastal.", ["See ehitati 1930. aastal."]).verdict).toBe("wrong");
  });

  it("holds a number in a changed sentence too", () => {
    const item = { ...rework("b1-15", 1), accept: ["Ma ootasin 20 minutit."] };
    expect(markRework("Ma ootasin 5 minutit.", item).verdict).toBe("wrong");
  });
});

describe("a typed answer one letter from another taught form", () => {
  it("is another form, not a slip (b1-01, raamatu for raamatut)", () => {
    const item = everyTypedQuestion(lesson("b1-01"), BEFORE.get(lesson("b1-01").id)!)
      .find((q): q is Extract<PracticeItem, { kind: "type" }> => q.kind === "type" && q.accept.includes("raamatut"));
    if (!item) throw new Error("b1-01 asks no raamatut");
    expect(item.notSlips).toContain("raamatu");
    expect(markTyped(item, "raamatu")).toMatchObject({ verdict: "wrong", note: NOTES.otherForm });
    expect(markTyped(item, "raamatud").note).not.toBe(NOTES.otherForm);
  });

  it("forgives a letter out where no taught spelling is that letter away", () => {
    expect(markPhrase("kohtumisle", ["kohtumisele"]).verdict).toBe("nearly");
    expect(markPhrase("kohtumisel", ["kohtumisele"], ["kohtumisel"])).toMatchObject({ verdict: "wrong", note: NOTES.otherForm });
  });
});

describe("a typed verb takes its pronoun", () => {
  it("in front of every spelling of it, and after an English of more than one word", () => {
    const wrong: string[] = [];
    for (const l of LESSONS) {
      for (const q of everyTypedQuestion(l, BEFORE.get(l.id)!)) {
        if (q.kind !== "type" || !/^I\s/u.test(q.en) || q.answer.includes(" ") || !/n$/u.test(q.answer)) continue;
        for (const a of q.accept.filter((x) => !x.includes(" "))) {
          if (BEFORE.get(l.id)!.spellings.has("ma") && markPhrase(`ma ${a}`, q.accept, q.notSlips).verdict !== "right") wrong.push(`${l.id}: ma ${a} for "${q.en}"`);
        }
      }
    }
    expect(wrong).toEqual([]);
  }, 120_000);
});

describe("start with what the line asks", () => {
  it("takes the long pronoun for the start it names (b1-01 R3, b1-45 R4)", () => {
    expect(markRework("Mina ei koristanud kööki.", rework("b1-01", 3))).toMatchObject({ verdict: "right", note: NOTES.right });
    expect(markRework("Mina ei leidnud rahakotti bussist.", rework("b1-45", 4))).toMatchObject({ verdict: "right", note: NOTES.right });
  });
});

describe("a reason the line puts in its place", () => {
  it("reads which end the ask fixes", () => {
    expect(reasonPlace("Join them with {kuna}, the reason second.")).toBe("second");
    expect(reasonPlace("Make it one sentence: the reason first with {kuna}, and the place joined with {kus}.")).toBe("first");
    expect(reasonPlace("Join them with {kuna}. You can put the reason first.")).toBeNull();
  });

  /** The orders the dictionary vouches for, as `withOrders` fills them where the lesson is read. */
  const VERBS = new Set(["olen", "on"]);
  const CTX: OrderContext = { finiteVerb: (w) => VERBS.has(w.toLowerCase()), participle: () => false, plainWord: () => true };
  const placed = (ask?: string) => {
    const [item] = withOrders([{ ...rework("b1-41", 3), ...(ask ? { ask } : {}) }], CTX);
    return item as Item;
  };

  it("is nearly at the other end, saying so, even with the dictionary vouching for that order (b1-41 R3)", () => {
    const item = placed();
    expect(markRework("Ma olen plaani vastu, kuna park on ainus roheline koht.", item).verdict).toBe("right");
    expect(markRework("Kuna park on ainus roheline koht, olen ma plaani vastu.", item)).toMatchObject({ verdict: "nearly", note: NOTES.reasonPlace });
    expect(markRework("Kuna park on ainus roheline koht, olen ma plaani vastu.", rework("b1-41", 3))).toMatchObject({ verdict: "nearly", note: NOTES.reasonPlace });
  });

  it("is right at the other end where the ask leaves it open (D3)", () => {
    const item = placed("Join them with {kuna}. You can put the reason first.");
    expect(markRework("Kuna park on ainus roheline koht, olen ma plaani vastu.", item)).toMatchObject({ verdict: "right", note: NOTES.otherOrder });
  });
});

describe("a fix whose word is right and one other word a letter out", () => {
  it("says the slip is put right (b1-20 F1)", () => {
    const item = fix("b1-20", 1);
    expect(markRework("Ma pakuksin, et töötan esmaspäevast neljapäevani kümme tundi päevas.", item).verdict).toBe("right");
    expect(markRework("Ma pakuksin, et töötan esmaspävast neljapäevani kümme tundi päevas.", item)).toMatchObject({ verdict: "nearly", note: NOTES.fixHalf });
    expect(markRework("Ma pakuksin, et töötan esmaspävast neljapäevast kümme tundi päevas.", item).verdict).toBe("wrong");
  });
});

describe("an answer about yourself", () => {
  it("takes a name of more than one word where no name is on file", () => {
    expect(markOwnAnswer("Minu nimi on Mary Ann.", "Minu nimi on Tom.", null).verdict).not.toBe("wrong");
    expect(markOwnAnswer("Minu nimi on Amanda Lucas.", "Minu nimi on Tom.", null).verdict).not.toBe("wrong");
    expect(markOwnAnswer("Minu nimi on.", "Minu nimi on Tom.", null).verdict).toBe("wrong");
  });
});

/** The rework or fix, anywhere in the course, that accepts `sentence`, read against its own lesson's ledger. */
function itemAccepting(sentence: string): Item {
  for (const l of LESSONS) {
    const r = l.reworks?.find((x) => x.to.et === sentence || (x.also ?? []).includes(sentence));
    if (r) return reworkItem(r, after(l.id));
    const f = l.fixes?.find((x) => x.line.et === sentence);
    if (f) return fixItem(f, after(l.id));
  }
  throw new Error(`no row accepts ${sentence}`);
}

const PUT_IN: Readonly<Record<string, string>> = { ma: "Sg1", mina: "Sg1", sa: "Sg2", sina: "Sg2", me: "Pl1", meie: "Pl1", te: "Pl2", teie: "Pl2" };

describe("a pronoun put in, on the lessons' own sentences", () => {
  it("is right beside a verb of its person, or at the start of its clause", () => {
    expect(markRework("Ma lugesin raamatu läbi.", itemAccepting("Lugesin raamatu läbi.")).verdict).toBe("right");
    expect(markRework("Lugesin ma raamatu läbi.", itemAccepting("Lugesin raamatu läbi."))).toMatchObject({ verdict: "right", note: NOTES.pronoun });
    expect(markRework("Ma siis kirjutan: ujumise õppimine.", fix("b1-46", 3)).verdict).toBe("right");
  });

  it("is never right in the middle of a clause, away from its verb (round 2, H1)", () => {
    const sock = fix("b1-02", 3);
    expect(markRework("Vaatasin juba. Leidsin ainult ühe vana ma soki.", sock).verdict).toBe("wrong");
    expect(markRework("Vaatasin juba. Leidsin ainult ühe mina vana soki.", sock).verdict).toBe("wrong");
    expect(markRework("Lugesin raamatu ma läbi.", itemAccepting("Lugesin raamatu läbi.")).verdict).not.toBe("right");
    expect(markRework("Kuna kampsun ei ole prügi, võid selle sa sõbrale anda.", itemAccepting("Kuna kampsun ei ole prügi, võid selle sõbrale anda.")).verdict).not.toBe("right");
  });

  it("is never right twice, whatever stands before the full stop (H2)", () => {
    expect(markRework("Jaan, kus sa oled? Ma ma ootan sind juba pool tundi.", fix("b1-04", 1)).verdict).toBe("wrong");
  });

  // A have-clause's verb is every person or the third (`oleks`, `on`), so the same rule keeps a pronoun out of it; no guard of its own is kept (round 3, M3).
  it("is never licensed by a form of several persons, which keeps it out of a have-clause too (H3)", () => {
    const car = itemAccepting("Kui mul oleks auto, saaksin ma metsa sõita.");
    expect(markRework("Kui sa mul oleks auto, saaksin ma metsa sõita.", car).verdict).toBe("wrong");
    expect(markRework("Kui mul me oleks auto, saaksin ma metsa sõita.", car).verdict).toBe("wrong");
    expect(markRework("Ei, ma ei ostnud mune. Need sa olid otsas.", fix("b1-03", 3)).verdict).toBe("wrong");
  });

  it("is never licensed by palun or a command (auditor A, H1)", () => {
    for (const [typed, row] of [
      ["Ma tule palun hommikul.", "Tule palun hommikul."],
      ["Mina pange palun kaart kinni!", null],
      ["Ma helista mulle palun tagasi.", "Helista mulle palun tagasi."],
      ["Ma tooge palun pastakas homme tagasi.", "Tooge palun pastakas homme tagasi."],
      ["Ma palun väljastage mulle parkimisluba.", "Palun väljastage mulle parkimisluba."],
    ] as const) {
      const item = row ? itemAccepting(row) : rework("b1-45", 2);
      expect(markRework(typed, item).verdict, typed).not.toBe("right");
    }
    expect(markRework("Ma saatke palun meister homme.", rework("b1-27", 2)).verdict).not.toBe("right");
  });

  it("every pronoun the marker lets in by its rule, across the course, sits beside a verb of its person or at a clause start", () => {
    const JOIN = new Set(["kuigi", "kuna", "sest", "et", "kui", "kuni", "aga", "ja", "ning", "või", "ega", "vaid", "nagu", "kuidas", "miks", "kas", "kus", "kuhu", "kust", "millal", "siis"]);
    const clean = (w: string | undefined) => (w ?? "").toLocaleLowerCase("et").replace(/[^\p{L}\p{N}]/gu, "");
    const away: string[] = [];
    let letIn = 0;
    for (const l of LESSONS) {
      const taught = teach(BEFORE.get(l.id)!, l.teaches, lessonRank(l), l.patterns);
      const items: Item[] = [...(l.reworks ?? []).map((r) => reworkItem(r, taught)), ...(l.fixes ?? []).map((f) => fixItem(f, taught))];
      for (const item of items) {
        const seen = new Set<string>();
        for (const a of item.accept) {
          const toks = a.split(" ");
          for (let i = 0; i <= toks.length; i++) {
            for (const [p, person] of Object.entries(PUT_IN)) {
              const typed = [...toks.slice(0, i), p, ...toks.slice(i)].join(" ");
              if (seen.has(typed)) continue;
              seen.add(typed);
              const m = markRework(typed, item);
              if (m.verdict !== "right" || m.note === NOTES.right) continue;
              letIn += 1;
              const before = toks[i - 1];
              const beside = [before, toks[i]].some((w) => (item.persons[clean(w)] ?? []).includes(person as never));
              const start = i === 0 || /[,.!?:;]$/u.test(before ?? "") || JOIN.has(clean(before));
              if (!beside && !start) away.push(`${l.id}: ${typed}`);
            }
          }
        }
      }
    }
    expect(letIn).toBeGreaterThan(100);
    expect(away).toEqual([]);
  }, 120_000);
});

describe("a typed verb names its pronoun by its own English (auditor A, M1)", () => {
  /** The typed question for this answer in this lesson. */
  const typedFor = (prefix: string, answer: string) => {
    const q = everyTypedQuestion(lesson(prefix), BEFORE.get(lesson(prefix).id)!)
      .find((x): x is Extract<PracticeItem, { kind: "type" }> => x.kind === "type" && x.answer === answer);
    if (!q) throw new Error(`${prefix} asks no ${answer}`);
    return q;
  };

  it("takes the third person's pronoun after he thought, she thought", () => {
    for (const [prefix, answer] of [["b1-10", "mõtles"], ["b1-14", "parandas"], ["b1-27", "vastas"], ["b1-45", "kaotas"], ["b1-45", "arvas"]] as const) {
      const q = typedFor(prefix, answer);
      expect(markTyped(q, `ta ${answer}`), `${prefix} ta ${answer}`).toMatchObject({ verdict: "right" });
    }
  });

  it("takes the right you, and never the other", () => {
    expect(markTyped(typedFor("b1-15", "oleksite"), "te oleksite").verdict).toBe("right");
    expect(markTyped(typedFor("b1-47", "jätate"), "te jätate").verdict).toBe("right");
    expect(markTyped(typedFor("b1-09", "oleksid"), "sa oleksid").verdict).toBe("right");
    expect(markTyped(typedFor("b1-15", "oleksite"), "sa oleksite").verdict).not.toBe("right");
  });
});

describe("a short negative with more around it is half right (round 2, H4)", () => {
  it("for pole, poleks and polnud", () => {
    expect(markPhrase("ma pole", ["pole"])).toMatchObject({ verdict: "nearly", note: NOTES.halfRight });
    expect(markPhrase("ma poleks", ["poleks"])).toMatchObject({ verdict: "nearly", note: NOTES.halfRight });
    expect(markPhrase("ta polnud", ["polnud"])).toMatchObject({ verdict: "nearly", note: NOTES.halfRight });
  });
});

describe("only the marks differ, so it is the marks note (round 2, M1)", () => {
  /** The typed questions of these lessons whose answer is `answer`. */
  const asking = (answer: string, ...prefixes: string[]) => prefixes.map(lesson).flatMap((l) => everyTypedQuestion(l, BEFORE.get(l.id)!))
    .filter((q): q is Extract<PracticeItem, { kind: "type" }> => q.kind === "type" && q.answer === answer);

  it("even where the folded spelling is another taught word", () => {
    for (const [answer, typed, prefixes] of [
      ["köök", "kook", ["a1-30"]], ["Üks hetk.", "Uks hetk.", ["a1-48", "a1-49"]], ["tööl", "tool", ["a1-31", "a1-35"]], ["töö", "too", ["b1-10", "b1-14"]],
    ] as const) {
      const qs = asking(answer, ...prefixes);
      expect(qs.length, answer).toBeGreaterThan(0);
      for (const q of qs) expect(markTyped(q, typed), `${typed} for ${answer}`).toMatchObject({ verdict: "nearly", note: NOTES.marks });
    }
  });

  it("and markRework says the same of a sentence (L3)", () => {
    expect(markRework("Ma ei koristanud kooki.", rework("b1-01", 3))).toMatchObject({ verdict: "nearly", note: NOTES.marks });
  });

  it("a taught spelling of another word a letter away is another word, and of the same word another form", () => {
    const eighth = asking("kaheksas", "a2-05", "a2-07");
    expect(eighth.length).toBeGreaterThan(0);
    for (const q of eighth) expect(markTyped(q, "kaheksa")).toMatchObject({ verdict: "wrong", note: NOTES.otherWord });
    expect(markPhrase("kaheksa", ["kaheksas"], [], ["kaheksa"])).toMatchObject({ verdict: "wrong", note: NOTES.otherWord });
    expect(markPhrase("kaheksa", ["kaheksas"], ["kaheksa"], [])).toMatchObject({ verdict: "wrong", note: NOTES.otherForm });
  });
});

describe("a joining word between two answers (auditor A, L1)", () => {
  it("is let through only between two pronoun-and-verb answers", () => {
    expect(markPhrase("sa olid ja nad olid", ["olid", "sa olid nad olid"]).verdict).toBe("right");
    expect(markPhrase("vabal ja ajal", ["vabal ajal"]).verdict).not.toBe("right");
    expect(markPhrase("pole ja hullu", ["pole hullu"]).verdict).not.toBe("right");
  });
});

describe("a count in digits (round 2, L2)", () => {
  it("is its word from two to ten, and only that word", () => {
    const met = itemAccepting("Me tutvusime tööl kaks kuud tagasi.");
    expect(markRework("Me tutvusime tööl 2 kuud tagasi.", met).verdict).toBe("right");
    expect(markRework("Me tutvusime tööl 3 kuud tagasi.", met).verdict).toBe("wrong");
  });
});

describe("two accepted changes made at once", () => {
  it("is right where each change is a row's (the content audit's cases)", () => {
    for (const [typed, row] of [
      ["Ma olin selle koju ära unustanud.", "Ma olin pileti koju unustanud."],
      ["Ära too seda!", "Ära too diivanit siia!"],
      ["Palun too see!", "Too kast!"],
      ["Ma ei parandanud seda ära.", "Ma ei parandanud akent."],
      ["Ma ei koristanud seda ära.", "Ma ei koristanud kööki."],
      ["Ma oleks pidanud seda vaatama.", "Ma oleksin pidanud kalendrit vaatama."],
    ] as const) {
      expect(markRework(typed, itemAccepting(row)), typed).toMatchObject({ verdict: "right", note: NOTES.right });
    }
  });

  it("is wrong where one change is in no row", () => {
    expect(markRework("Ma olin selle koju ära kaotanud.", itemAccepting("Ma olin pileti koju unustanud.")).verdict).toBe("wrong");
    expect(markRework("Ära too seda sinna!", itemAccepting("Ära too diivanit siia!")).verdict).not.toBe("right");
    expect(markRework("Palun too see sinna!", itemAccepting("Too kast!")).verdict).not.toBe("right");
  });

  it("never says one word twice, where two rows put it in at different places", () => {
    const sorry = itemAccepting("Kahjuks ei saa ma tulla.");
    expect(markRework("Ma kahjuks ei saa ma tulla.", sorry).verdict).not.toBe("right");
    const sweater = itemAccepting("Kuna kampsun ei ole prügi, võid selle sõbrale anda.");
    expect(markRework("Kuna kampsun ei ole prügi, sa võid sa selle sõbrale anda.", sweater).verdict).not.toBe("right");
  });
});

describe("a demonstrative before the noun a row lets it stand for", () => {
  it("is right in the row's own case", () => {
    for (const [typed, row] of [
      ["Ma lugesin selle raamatu läbi.", "Ma lugesin raamatu läbi."],
      ["Ma parandasin selle auto ära.", "Ma parandasin auto ära."],
      ["Ma ei ostnud seda raamatut.", "Ma ei ostnud raamatut."],
      ["Ma ei leidnud seda võtit.", "Ma ei leidnud võtit."],
      ["Ma sõin need õunad ära.", "Ma sõin õunad ära."],
    ] as const) {
      expect(markRework(typed, itemAccepting(row)), typed).toMatchObject({ verdict: "right", note: NOTES.right });
    }
    // With the pronoun left out as a row leaves it out.
    expect(markRework("Lugesin selle raamatu läbi.", itemAccepting("Ma lugesin raamatu läbi.")).verdict).toBe("right");
  });

  it("is wrong in another case", () => {
    expect(markRework("Ma lugesin seda raamatu läbi.", itemAccepting("Ma lugesin raamatu läbi.")).verdict).toBe("wrong");
    expect(markRework("Ma ei ostnud selle raamatut.", itemAccepting("Ma ei ostnud raamatut.")).verdict).toBe("wrong");
  });
});

describe("what opens a relative clause", () => {
  it("is a case of kes or mis, never a word that starts the same way", () => {
    for (const w of ["kes", "mis", "keda", "mida", "kellele", "millest", "milline", "missugust"]) expect(RELATIVE.test(w), w).toBe(true);
    for (const w of ["kesklinnas", "mister", "keegi", "midagi", "millimeeter"]) expect(RELATIVE.test(w), w).toBe(false);
  });
});
