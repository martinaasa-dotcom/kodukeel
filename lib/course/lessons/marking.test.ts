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
    // `olema`, `elama` and `rääkima` were taught as rows of forms, and have persons.
    ["b1-22 R2", () => rework("b1-22", 2), "Elame remonditud korteris."],
    ["b1-22 F2", () => fix("b1-22", 2), "Elan remonditud korteris."],
    ["b1-41 F1", () => fix("b1-41", 1), "Olen selle plaani vastu."],
    ["b1-09 F2", () => fix("b1-09", 2), "Olen huvitatud ajaloost."],
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
  });
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

describe("what opens a relative clause", () => {
  it("is a case of kes or mis, never a word that starts the same way", () => {
    for (const w of ["kes", "mis", "keda", "mida", "kellele", "millest", "milline", "missugust"]) expect(RELATIVE.test(w), w).toBe(true);
    for (const w of ["kesklinnas", "mister", "keegi", "midagi", "millimeeter"]) expect(RELATIVE.test(w), w).toBe(false);
  });
});
