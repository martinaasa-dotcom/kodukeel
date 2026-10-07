/*
  A LETTER IN RUSSIAN OR UKRAINIAN SAYS ALL OF ITSELF IN THAT LANGUAGE.

  `render.test.ts` holds every letter to its shape in English, byte for byte.
  This holds the other two to being in their own language all the way down:
  every subject, preheader, block and footer line, with nothing in English left
  but what is somebody's name, an address, or a value off the dictionary and
  the course (an Estonian word, a level code). A line nobody translated falls
  back to English rather than to a blank (`lib/copy/locale.ts`), which is the
  right failure on a screen and the one this test exists to catch in a letter.
*/
import { describe, expect, it } from "vitest";

import { renderHtml, renderText, type Chrome } from "./render";
import type { Letter } from "./letter";
import { tonightLetter } from "./letters/tonight";
import { welcomeLetter } from "./letters/welcome";
import { comebackLetter } from "./letters/comeback";
import { weeklyLetter } from "./letters/weekly";
import { errandLetter } from "./letters/errand";
import { milestoneLetter } from "./letters/milestone";
import { shieldLetter } from "./letters/shield";
import { deadlineLetter } from "./letters/deadline";
import { classroomLetter } from "./letters/classroom";
import { worddayLetter } from "./letters/wordday";
import { OPTIONAL_KINDS } from "./letter";
import { MACHINE_SHORT } from "@/lib/copy/locale";

const ORIGIN = "https://kodukeel.ee";

const chrome = (label: string): Chrome => ({
  origin: ORIGIN,
  unsubscribeUrl: `${ORIGIN}/api/email/unsubscribe?u=x&k=tonight&t=y`,
  unsubscribeLabel: label,
  operator: "Upthink OU",
});

/** What may stay in Latin script: names, the app, codes and the dictionary's own words. */
const ALLOWED = [
  "Kodukeel", "Upthink", "OU", "Mari", "Kodus", "Tervitused", "Esimesed", "sõnad",
  "pannkook", "pancake", "lumi", "snow", "kohv", "coffee", "osastav", "seesütlev", "sammud",
  "Ema", "küpsetab", "pannkooke", "Pannkoogid", "on", "head",
  "A1", "A2", "B1", "M", "T", "W", "F", "S", "o", "a", "u",
];

/** Every letter, with the values `lib/progress/mailout.ts` hands over already in the reader's language. */
function every(locale: "ru" | "uk"): Letter[] {
  const cy = locale === "ru"
    ? { sub: "Дома", canDo: "Сказать, где вы живёте.", step: "Повторить слова", says: "Закажите сегодня кофе по-эстонски.", places: "В кафе", scene: "В кафе", evidence: "Данных пока мало.", gap: "Слушание на 40%.", label: "жить на этом языке", phrase: "9 недель", distance: "В вашем темпе это около года.", arrival: "Вы можете объясниться в магазине.", occasion: "Масленица.", match: "Сыграть в подбор пар", week: ["П", "В", "С", "Ч", "П", "С", "В"] }
    : { sub: "Удома", canDo: "Сказати, де ви живете.", step: "Повторити слова", says: "Замовте сьогодні каву естонською.", places: "У кафе", scene: "У кафе", evidence: "Даних поки мало.", gap: "Слухання на 40%.", label: "жити цією мовою", phrase: "9 тижнів", distance: "У вашому темпі це близько року.", arrival: "Ви можете порозумітися в магазині.", occasion: "Масниця.", match: "Зіграти в добір пар", week: ["П", "В", "С", "Ч", "П", "С", "Н"] };
  const week = (studied: (i: number) => boolean) => cy.week.map((label, i) => ({ label, studied: studied(i) }));
  const steps = (done: number) => [0, 1, 2, 3].map((i) => ({ title: cy.step, minutes: 3, done: i < done }));
  const day = (done: number, newWords: number) => ({
    title: "Kodus", subtitle: cy.sub, part: { n: 2, of: 3 }, canDo: cy.canDo, newWords, steps: steps(done),
  });

  return [
    tonightLetter({ locale, name: "Mari", origin: ORIGIN, day: day(1, 5), theirWords: null, streak: 6, word: { lemma: "pannkook", translation: "pancake", occasion: cy.occasion } }),
    tonightLetter({ locale, name: null, origin: ORIGIN, day: day(0, 5), theirWords: null, streak: 0, word: null }),
    tonightLetter({ locale, name: "Mari", origin: ORIGIN, day: day(0, 0), theirWords: null, streak: 2, word: null }),
    tonightLetter({ locale, name: null, origin: ORIGIN, day: day(3, 1), theirWords: null, streak: 0, word: null }),
    welcomeLetter({ locale, origin: ORIGIN, reminderAt: "18:00", cardsWaiting: 404, opensOn: { title: "Tervitused", subtitle: cy.sub } }),
    welcomeLetter({ locale, origin: ORIGIN, reminderAt: null, cardsWaiting: 21, opensOn: null }),
    comebackLetter({ locale, origin: ORIGIN, wordsKept: 212, shieldUsed: true, streak: 7, smallStep: { title: cy.match, href: `${ORIGIN}/review/match`, minutes: 2 }, word: { lemma: "lumi", translation: "snow", occasion: null } }),
    errandLetter({ locale, origin: ORIGIN, errand: { says: cy.says, places: cy.places, unitId: "sook-ja-jook", unitTitle: "Esimesed sõnad", scene: { id: "kohvikus", title: cy.scene } }, word: { lemma: "kohv", translation: "coffee" } }),
    errandLetter({ locale, origin: ORIGIN, errand: { says: cy.says, places: cy.places, unitId: "sook-ja-jook", unitTitle: "Esimesed sõnad", scene: null }, word: null }),
    milestoneLetter({ locale, origin: ORIGIN, level: { key: "A1", title: "Esimesed sammud", arrival: cy.arrival, words: 493 }, pct: 41, target: "B1", next: { level: "A2", wordsAway: 118 } }),
    milestoneLetter({ locale, origin: ORIGIN, level: { key: "B1", title: "Esimesed sammud", arrival: cy.arrival, words: 21 }, pct: 100, target: "B1", next: null }),
    shieldLetter({ locale, origin: ORIGIN, streak: 12, remaining: 2, nextAt: 30, week: week((i) => i !== 5) }),
    shieldLetter({ locale, origin: ORIGIN, streak: 12, remaining: 0, nextAt: 30, week: week((i) => i !== 5) }),
    shieldLetter({ locale, origin: ORIGIN, streak: 120, remaining: 0, nextAt: null, week: week((i) => i !== 5) }),
    weeklyLetter({ locale, origin: ORIGIN, week: week((i) => i < 5), reviews: 91, held: 212, conversations: 2, ladder: { target: "B1", pct: 41, assumed: 318, next: { level: "A2", wordsAway: 120 } }, part: { title: "Esimesed sõnad", eveningsLeft: 3 } }),
    weeklyLetter({ locale, origin: ORIGIN, week: week(() => false), reviews: 0, held: 0, conversations: 1, ladder: { target: "B1", pct: 0, assumed: 0, next: null }, part: { title: "Esimesed sõnad", eveningsLeft: 1 } }),
    deadlineLetter({ locale, origin: ORIGIN, band: "B1", label: cy.label, phrase: cy.phrase, distance: cy.distance, confidence: 41, evidence: cy.evidence, gap: cy.gap, onTrack: false }),
    deadlineLetter({ locale, origin: ORIGIN, band: "B1", label: cy.label, phrase: cy.phrase, distance: cy.distance, confidence: 80, evidence: cy.evidence, gap: null, onTrack: true }),
    classroomLetter({ locale, origin: ORIGIN, groupName: "Mari", members: 25, active: 18, reviews: 412, week: week((i) => i < 5), detail: { kind: "CLASS", weakestCases: [{ grammCase: "osastav", accuracy: 54, total: 88 }, { grammCase: "seesütlev", accuracy: 61, total: 40 }, { grammCase: "osastav", accuracy: 70, total: 20 }] } }),
    classroomLetter({ locale, origin: ORIGIN, groupName: "Mari", members: 9, active: 9, reviews: 1, week: week(() => true), detail: { kind: "CLASS", weakestCases: [] } }),
    classroomLetter({ locale, origin: ORIGIN, groupName: "Mari", members: 9, active: 7, reviews: 140, week: week((i) => i !== 6), detail: { kind: "WORKPLACE", level: "B1", onTrack: 4, close: 3, needTime: 1, tooEarly: 1, evidence: cy.evidence } }),
    worddayLetter({ locale, origin: ORIGIN, word: { lemma: "pannkook", translation: "pancake", occasion: null, example: { et: "Ema küpsetab pannkooke.", en: null } } }),
  ];
}

/** Every Latin-script word left in a piece of text, once names, codes and addresses are taken out. */
function englishIn(text: string): string[] {
  const words = text.replace(/https?:\/\/\S+/g, " ").match(/[A-Za-zõäöüšžÕÄÖÜŠŽ][A-Za-z0-9'õäöüšžÕÄÖÜŠŽ]*/g) ?? [];
  return words.filter((w) => !ALLOWED.includes(w));
}

describe("a letter in the learner's own language", () => {
  for (const locale of ["ru", "uk"] as const) {
    const letters = every(locale);
    const label = "Stop emails like this one";

    it(`${locale}: drives every kind there is`, () => {
      const drawn = new Set(letters.map((l) => l.kind));
      for (const kind of OPTIONAL_KINDS) expect(drawn.has(kind), `no ${locale} fixture renders ${kind}`).toBe(true);
    });

    for (const letter of letters) {
      describe(`${locale} ${letter.kind}`, () => {
        const html = renderHtml(letter, chrome(label));
        const text = renderText(letter, chrome(label));

        it("leaves no English in the subject, the preheader or the body", () => {
          const left = [letter.subject, letter.preheader, text].flatMap(englishIn);
          expect(left, `${letter.subject}\n${text}`).toEqual([]);
        });

        it("translates the subject, which is the one line everybody reads", () => {
          if (letter.kind !== "wordday") expect(letter.subject).toMatch(/[Ѐ-ӿ]/);
        });

        it("names its language on the document and says the words are a machine's", () => {
          expect(html).toContain(`<html lang="${locale}"`);
          expect(html).toContain(MACHINE_SHORT[locale]);
          expect(text).toContain(MACHINE_SHORT[locale]);
          expect(html).not.toContain(label);
        });

        it("writes no dash and no straight quotation mark into the copy", () => {
          expect(text).not.toMatch(/[–—]/);
          expect(letter.subject + letter.preheader).not.toMatch(/["“”]/);
        });
      });
    }
  }

  it("never addresses a Ukrainian reader by name, which would need the vocative", () => {
    const [first, , third] = every("uk");
    for (const letter of [first!, third!]) {
      expect(renderText(letter, chrome("Stop emails like this one"))).not.toContain("Mari");
    }
    expect(renderText(every("ru")[0]!, chrome("Stop emails like this one"))).toContain("Mari");
  });

  it("leaves an English letter's footer without the machine notice", () => {
    const [letter] = every("ru");
    const english = { ...letter!, locale: "en" as const };
    expect(renderHtml(english, chrome("Stop emails like this one"))).not.toContain(MACHINE_SHORT.ru);
  });
});
