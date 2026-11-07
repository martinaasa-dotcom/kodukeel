/**
 * A LESSON POINTS AT A CONVERSATION OUT THERE, ON ITS FINISH SCREEN.
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
 * B2 did the same when it became lessons (docs/43-lessons.md §14): the
 * fourteen conversations its old unit evenings opened, and the three A2
 * errands that sat on free evenings of those units, are each offered by the
 * B2 lesson nearest them. The doctor's appointment, the family doctor and the
 * emergency call are on the body-and-care part; the unemployment fund, the
 * residence permit, family benefit, a deposit and taking something back on
 * paper and the state; a raise and a chart on the working week and on figures
 * in the news; the residents' meeting on granting a point; the B2 exam on the
 * B2 exam. The weekend, a friend's bad news, the café where somebody switches
 * to English and the corner shop that is said to be closing are among friends
 * and neighbors, and the bus ticket is on the song festival, where the bus was
 * full. The job interview stays on its B1 lesson, which offered it first.
 *
 * And C1 did the same when it became lessons (docs/43-lessons.md §16), which
 * left no unit evening to open one: the rumor at work offers passing on what
 * you heard, the bank on the phone offers calling a shop before you go, the
 * feedback said three ways offers the same favor asked three ways, the book
 * club offers the book club, and almost the same word offers the language
 * course's first evening. The landlord about the repair stays on its B1
 * lesson, which offered it first.
 *
 * And A1 and A2 do the same, which they did not at first: when they became
 * lessons the catalog conversations of their old units were pushed up to free
 * evenings of B1 and B2 (docs/43-lessons.md §9), and some stayed there after
 * B1 and B2 became lessons too, so the shop for milk, the brief's own first
 * mission, was offered to somebody at B2. Five of them ask for no word the
 * A1 or A2 lessons have not taught by the lesson that rehearses them, and are
 * offered there now: the shop for milk on where to and where from, which is
 * the same phone call; the library card on the library; how was your weekend
 * on the day in the forest; calling a shop before you go on leaving a
 * message; and making plans on agreeing a time. The rest of the A-level
 * errands (the café, the pharmacy, the ticket, the restaurant, the way) still
 * ask for a word the lessons teach later, and stay where those words are.
 * `course.test.ts` holds every offer to the words taught by then.
 *
 * Keyed on the lesson id and held both ways by `lessonSituations.test.ts`:
 * every key is a lesson and every value a catalog conversation, and every
 * conversation in the catalog is offered by one lesson.
 *
 * And the board agrees with the finish screen (`situationsOfferedThrough`): a
 * conversation a lesson has offered is one the course has brought in, so the
 * situations board stops calling it "later" from the evening that lesson is
 * finished. Its words come from units the lessons teach by goal rather than
 * unit by unit, so the unit rule alone would call it early for the whole level.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { LESSONS } from "./lessons";

export const LESSON_SITUATIONS: Readonly<Record<string, string>> = {
  "a1-31-where-to": "poodi-piima",
  "a2-07-library": "raamatukogu",
  "a2-52-forest": "nadalavahetus",
  "a2-53-message": "helistamine",
  "a2-54-arrange": "kokkulepe",
  "b1-03-some-or-all": "turul",
  "b1-04-waiting": "ootamine",
  "b1-05-do-it": "abi-palumine",
  "b1-08-help": "uus-kolleeg",
  "b1-10-about": "trepikoda",
  "b1-13-reply": "bussipeatus",
  "b1-16-as": "toovestlus",
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
  "b2-02-reactions": "sobra-mure",
  "b2-05-keep-estonian": "kohvikus",
  "b2-19-kulmetus": "perearst",
  "b2-20-registratuur": "arsti-aeg",
  "b2-22-emo": "hadaabi",
  "b2-27-feedback": "palk",
  "b2-31-tax-board": "elamisluba",
  "b2-32-new-job": "tootukassa",
  "b2-34-insurance": "tagatisraha",
  "b2-35-complaint": "kaebus",
  "b2-36-the-call": "peretoetus",
  "b2-38-song-festival": "bussipilet",
  "b2-43-figures": "graafik",
  "b2-44-granted": "elanike-koosolek",
  "b2-48-end": "eksam-b2",
  "c1-09-rumor": "kuulsin",
  "c1-27-feedback": "kolm-palvet",
  "c1-43-book": "raamatuklubi",
  "c1-45-almost": "keeletund",
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
