/**
 * A B1 LESSON POINTS AT A CONVERSATION OUT THERE, ON ITS FINISH SCREEN.
 *
 * The catalog's conversations (`lib/scenes/catalogue.ts`) rehearse the errands
 * B1 is for: opening a bank account, the landlord about something broken, a
 * job interview, tech support. They used to open on the evenings of B1's old
 * units, and when B1 became lessons those evenings went, because a lesson is
 * one evening with one step. So each is offered on the finish of one lesson.
 * Where a lesson is about the same errand it is that lesson: payday ends by
 * offering the bank, the leak the landlord, the speaking exam the B1 exam
 * conversation. B1 has no lesson about a bus stop, a restaurant, a clothes shop
 * or a pharmacy, so those four are spread through the level on lessons that are
 * about something else (an invitation, the news, the trash, a lost wallet), and
 * they are there for the words the level has taught by then rather than for the
 * errand. The lesson's own role-play is still the lesson's conversation
 * (`lessonScenes.ts`); this is the same situation one step further out, with
 * somebody who talks the way people do there.
 *
 * Keyed on the lesson id and held both ways by `lessonSituations.test.ts`:
 * every key is a lesson and every value a catalog conversation, and every
 * conversation that no evening of B2 and on opens is offered by one lesson.
 *
 * And the board agrees with the finish screen (`situationsOfferedThrough`): a
 * conversation a lesson has offered is one the course has brought in, so the
 * situations board stops calling it "later" from the evening that lesson is
 * finished. Its words come from units B1's lessons teach by goal rather than
 * unit by unit, so the unit rule alone would call it early for the whole level.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { LESSONS } from "./lessons";

export const LESSON_SITUATIONS: Readonly<Record<string, string>> = {
  "b1-03-some-or-all": "turul",
  "b1-04-waiting": "ootamine",
  "b1-05-do-it": "abi-palumine",
  "b1-08-help": "uus-kolleeg",
  "b1-10-about": "trepikoda",
  "b1-12-depends": "kokkulepe",
  "b1-13-reply": "bussipeatus",
  "b1-16-as": "toovestlus",
  "b1-17-could-i": "raamatukogu",
  "b1-18-payday": "pangas",
  "b1-25-broken": "uuri-remont",
  "b1-30-was-built": "tee-kusimine",
  "b1-32-news": "restoranis-tellimine",
  "b1-33-decided": "koosolek",
  "b1-36-although": "lastevanemad",
  "b1-38-differently": "soovitus",
  "b1-39-online": "tehniline-tugi",
  "b1-40-rubbish": "riidepood",
  "b1-44-office": "ametiasutus",
  "b1-45-lost": "apteek",
  "b1-49-end": "eksam-b1",
};

/** The catalog conversation a lesson's finish screen offers, by id, or null. */
export function situationFor(lessonId: string): string | null {
  return LESSON_SITUATIONS[lessonId] ?? null;
}

/**
 * The catalog conversations the lessons have offered by the end of one, in the
 * course's own order. `lessonId` is the furthest finished lesson, which is the
 * furthest day carrying a tick, since a lesson evening is one step and it is
 * ticked when the lesson ends; null is a learner past every lesson, who has
 * been offered all of them. An id the course does not hold offers nothing,
 * rather than reading as past the end.
 */
export function situationsOfferedThrough(lessonId: string | null): ReadonlySet<string> {
  const out = new Set<string>();
  if (lessonId !== null && !LESSONS.some((l) => l.id === lessonId)) return out;
  for (const lesson of LESSONS) {
    const scene = LESSON_SITUATIONS[lesson.id];
    if (scene) out.add(scene);
    if (lesson.id === lessonId) break;
  }
  return out;
}

/** The conversations offered by the lessons before this one, which is what a part's first evening has had. */
export function situationsOfferedBefore(lessonId: string): ReadonlySet<string> {
  const out = new Set<string>();
  for (const lesson of LESSONS) {
    if (lesson.id === lessonId) return out;
    const scene = LESSON_SITUATIONS[lesson.id];
    if (scene) out.add(scene);
  }
  return new Set();
}
