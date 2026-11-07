import { describe, expect, it } from "vitest";
import { LESSONS } from "./index";
import { FASTER_CHECKS, fasterCheckProblems, readCheck, wholeWordsOf } from "./fasterChecks";
import { standsIn } from "./ledger";

describe("a check of today's pattern", () => {
  it("is lit by a whole spelling, case aside, exactly as a retell point is", () => {
    const check = { en: "", any: ["ei leidnud"] };
    expect(readCheck(check, "Võtmeid ma Ei leidnud.").met).toBe(true);
    expect(readCheck(check, "ma ei leidnudki").met).toBe(false);
    expect(readCheck(check, "ei, leidnud").met).toBe(true);
    // The one comparison: a plain spelling reads as standsIn reads it.
    for (const said of ["Ma ei leidnud võtit", "leidnud ei", ""]) {
      expect(readCheck(check, said).met).toBe(standsIn(said, "ei leidnud"));
    }
  });

  it("takes a star for an ending or a beginning, on a word two letters longer at least", () => {
    expect(readCheck({ en: "", any: ["*ga"] }, "ma räägin naabriga").met).toBe(true);
    // `aga` is not a -ga word.
    expect(readCheck({ en: "", any: ["*ga"] }, "aga ma räägin").met).toBe(false);
    expect(readCheck({ en: "", any: ["aita* mind"] }, "Ta aitab mind").met).toBe(true);
    expect(readCheck({ en: "", any: ["aita* mind"] }, "Ta aitab sind").met).toBe(false);
  });

  it("takes a gap of up to four words between two parts", () => {
    const had = { en: "", any: ["olid ... *nud"] };
    expect(readCheck(had, "olid lapsed juba ära laulnud").met).toBe(true);
    expect(readCheck(had, "olid laulnud").met).toBe(true);
    expect(readCheck(had, "olid üks kaks kolm neli viis laulnud").met).toBe(false);
  });

  it("counts the places it is met when it asks for several", () => {
    const three = { en: "", any: ["ei *nud"], atLeast: 3 };
    expect(readCheck(three, "Ma ei ostnud leiba ja ei leidnud võtit.")).toMatchObject({ met: false, found: 2 });
    expect(readCheck(three, "Kööki ma ei koristanud, leiba ei ostnud ja võtmeid ei leidnud!")).toMatchObject({ met: true, found: 3 });
    // Two spellings meeting one place are one place.
    expect(readCheck({ en: "", any: ["ei *", "ei *nud"], atLeast: 2 }, "ei ostnud").found).toBe(1);
  });

  it("names a miss only with the transcript's own words, and only on a miss", () => {
    const check = { en: "", any: ["leiba"], near: ["leib", "võtmed"] };
    expect(readCheck(check, "Ma ei ostnud Leib ja võtmed").heard).toEqual(["Leib", "võtmed"]);
    expect(readCheck(check, "Ma ei ostnud leiba, leib").heard).toEqual([]);
    expect(readCheck(check, "Ma ei ostnud piima").heard).toEqual([]);
  });

  it("holds to the ledger only the whole words of a spelling", () => {
    expect(wholeWordsOf("ei *nud")).toBe("ei");
    expect(wholeWordsOf("olid ... *nud")).toBe("olid");
    expect(wholeWordsOf("*ga")).toBe("");
    expect(wholeWordsOf("Minu meelest")).toBe("minu meelest");
  });
});

describe("every again-faster's checks", () => {
  const racing = LESSONS.filter((l) => l.faster);

  it("are on every lesson that races, B1 to C1", () => {
    expect(racing.length).toBeGreaterThanOrEqual(77);
    for (const lesson of racing) {
      expect(lesson.faster!.checks.length, lesson.id).toBeGreaterThanOrEqual(FASTER_CHECKS.least);
      expect(lesson.faster!.checks.length, lesson.id).toBeLessThanOrEqual(FASTER_CHECKS.most);
    }
  });

  it("are met by the lesson's own model answer, and name only Estonian the lesson shows", () => {
    const problems = racing.flatMap((lesson) => fasterCheckProblems(lesson).map((p) => `${lesson.id}: ${p}`));
    expect(problems).toEqual([]);
  });

  it("can fail: an answer that says nothing meets none of them", () => {
    let walked = 0;
    for (const lesson of racing) {
      for (const check of lesson.faster!.checks) {
        walked += 1;
        expect(readCheck(check, "").met, `${lesson.id}: ${check.en}`).toBe(false);
      }
    }
    expect(walked).toBeGreaterThanOrEqual(2 * racing.length);
  });
});
