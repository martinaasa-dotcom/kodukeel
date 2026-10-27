/**
 * B1, PART ONE: THE WHOLE THING OR SOME OF IT (docs/43-lessons.md §11.4).
 *
 * A2's lesson 18 met the rule on buying and reading. B1 opens on it as the
 * rule for every verb that does something to a thing: the ending on the thing
 * says whether the job got done, and a small word after the verb ({läbi},
 * {ära}) often says it too. English says the same difference in the verb
 * (I was reading, I read it through), which is why an English speaker hears
 * nothing in `raamatu` against `raamatut`.
 *
 * IN PREVIEW. This part is not the course yet: it is in `PREVIEW_LESSONS`,
 * open to a reviewer on the website and to nobody else, and finishing it
 * records nothing, since no evening carries it (`finishLessonFor`). Its
 * Russian and Ukrainian are written when B1 becomes the course.
 *
 * Read by the native speaker where the second model pass flags a line
 * (docs/43-lessons.md B-L7), and held to the same two checks as every lesson
 * (`lessons.test.ts`, `ledger.ts`).
 */

import type { LessonSpec, PartOfLessons } from "./types";

export const B1_OBJEKT_PART: PartOfLessons = {
  id: "b1-objekt",
  level: "B1",
  title: "The whole thing or some of it",
  about: "Saying whether a job got done: the object's ending, and the small words after a verb that finish it.",
};

export const B1_OBJEKT_LESSONS: readonly LessonSpec[] = [
  {
    id: "b1-01-done",
    n: 1,
    level: "B1",
    part: "b1-objekt",
    kind: "lesson",
    title: "Done, or still on it",
    goal: "Say whether you finished a job or are still on it, and ask somebody else.",
    cast: { Anna: "kylli", Tom: "kalev" },
    conversation: [
      { who: "Anna", et: "Mida sa täna tegid?", en: "What did you do today?" },
      { who: "Tom", et: "Hommikul parandasin autot.", en: "In the morning I was working on the car." },
      { who: "Anna", et: "Kas sa parandasid auto ära?", en: "Did you get the car fixed?" },
      { who: "Tom", et: "Ei, veel mitte. Homme parandan edasi.", en: "No, not yet. I'll carry on tomorrow." },
      { who: "Tom", et: "Aga ma lugesin raamatu läbi!", en: "But I read the book to the end!" },
      { who: "Anna", et: "Kõik? Tubli!", en: "All of it? Well done!" },
      { who: "Tom", et: "Jah, kõik. Mida sina tegid?", en: "Yes, all of it. What did you do?" },
      { who: "Anna", et: "Ma koristasin kööki, aga ma ei koristanud seda lõpuni.", en: "I was cleaning the kitchen, but I didn't get it finished." },
      { who: "Tom", et: "Ma aitan homme. Siis lõpetame selle koos.", en: "I'll help tomorrow. Then we'll finish it together." },
    ],
    teaches: [
      // A1 taught it whole, as a chunk; here it is named as a form of {raamat}, still being read.
      { kind: "form", et: "raamatut", of: "raamat", en: "the book, while you're reading it" },
      { kind: "form", et: "autot", of: "auto", en: "the car, while you're working on it" },
      { kind: "form", et: "parandasin", of: "parandama", en: "I fixed, I worked on", past: true },
      { kind: "word", et: "läbi", en: "through, to the end (after a verb)" },
      { kind: "word", et: "edasi", en: "on, further" },
      { kind: "form", et: "koristasin", of: "koristama", en: "I cleaned, I was cleaning", past: true },
      { kind: "form", et: "kööki", of: "köök", en: "the kitchen, while you're working on it" },
      { kind: "form", et: "koristanud", of: "koristama", en: "cleaned, after {ei}" },
      { kind: "word", et: "lõpuni", en: "to the end, all the way" },
    ],
    patterns: ["object"],
    how: {
      point: "Did the job get done? Then the thing takes the [omastav] (2nd form), and a small word after the verb often says so: {Ma lugesin raamatu läbi}. Still on it, or not done? Then the [osastav] (3rd form): {Ma parandasin autot}.",
      table: {
        head: ["Estonian", "In English", "Why"],
        rows: [
          [{ et: "Ma parandasin autot." }, { en: "I was working on the car." }, { en: "still on it" }],
          [{ et: "Ma parandasin auto ära." }, { en: "I got the car fixed." }, { en: "done" }],
          [{ et: "Ma lugesin raamatu läbi." }, { en: "I read the book to the end." }, { en: "done" }],
          [{ et: "Ma ei koristanud kööki." }, { en: "I didn't clean the kitchen." }, { en: "after {ei}" }],
        ],
      },
      notes: [
        "A2 showed this with buying and reading. From B1 on it's the rule for every verb that does something to a thing.",
        "English puts the difference in the verb: I was reading, I read it through. Estonian puts it on the thing, in its ending.",
        "{Läbi} and {ära} after the verb mean the job is finished. {Lõpuni} says the same thing in a word of its own.",
      ],
      watchOut: "Before a verb, {ära} means don't, as you met it in A1. After the verb, it means the job is done.",
      examples: [1, 2, 4],
    },
    answers: [
      { ask: { et: "Mida sa täna tegid?", en: "What did you do today?" }, cue: "Say you were cleaning the kitchen.", model: { et: "Ma koristasin kööki.", en: "I was cleaning the kitchen." } },
      { cue: "Say you read the book to the end.", model: { et: "Ma lugesin raamatu läbi.", en: "I read the book to the end." } },
      { cue: "Say you got the car fixed.", model: { et: "Ma parandasin auto ära.", en: "I got the car fixed." } },
      { cue: "Say you didn't clean the kitchen.", model: { et: "Ma ei koristanud kööki.", en: "I didn't clean the kitchen." } },
    ],
    reworks: [
      {
        from: { et: "Ma lugesin raamatut.", en: "I was reading the book." },
        ask: "Say you read it to the end. Use {läbi}.",
        to: { et: "Ma lugesin raamatu läbi.", en: "I read the book to the end." },
        pattern: "object",
      },
      {
        from: { et: "Ma parandasin autot.", en: "I was working on the car." },
        ask: "Say you got it fixed. Use {ära}.",
        to: { et: "Ma parandasin auto ära.", en: "I got the car fixed." },
        pattern: "object",
      },
      {
        from: { et: "Ma koristasin köögi ära.", en: "I got the kitchen cleaned." },
        ask: "Say you didn't. Start with {Ma ei}.",
        to: { et: "Ma ei koristanud kööki.", en: "I didn't clean the kitchen." },
        also: ["Ma ei koristanud kööki ära."],
        pattern: "object",
      },
      {
        from: { et: "Ma ostsin raamatu.", en: "I bought a book." },
        ask: "Say you didn't buy it.",
        to: { et: "Ma ei ostnud raamatut.", en: "I didn't buy a book." },
        pattern: "object",
      },
    ],
    fixes: [
      { line: { et: "Aga ma lugesin raamatu läbi!", en: "But I read the book to the end!" }, right: "raamatu", wrong: "raamatut", pair: ["GENITIVE", "PARTITIVE"], why: "Read to the end, so the whole book: {raamatu}." },
      { line: { et: "Hommikul parandasin autot.", en: "In the morning I was working on the car." }, right: "autot", wrong: "auto", pair: ["GENITIVE", "PARTITIVE"], why: "Still on it, not finished: {autot}." },
      { line: { et: "Ma ei koristanud kööki.", en: "I didn't clean the kitchen." }, right: "kööki", wrong: "köögi", pair: ["GENITIVE", "PARTITIVE"], why: "After {ei}, always the [osastav] (3rd form): {kööki}." },
    ],
  },
];
