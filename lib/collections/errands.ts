/**
 * ONE THING TO SAY TO A REAL PERSON, AND WHETHER ANYTHING WAS SAID AT ALL.
 *
 * Every other panel on Today is about the app: what is due, what is next,
 * what keeps going wrong. This one is about leaving it. An errand is a small
 * real-world task in English, tied to a unit of the course.
 *
 * THE CARD ASKS ABOUT YESTERDAY, AND THE ERRAND IS WHAT IT OFFERS WHEN THE
 * ANSWER IS NO. It used to set the errand in the morning and put the three
 * answers under it, which asked for a report on something that had not
 * happened yet: three buttons at eight in the morning are three ways to make
 * a card go away rather than an account of anything. And it could only ever
 * see conversations this app had set, so a learner who spent an hour with
 * their Estonian mother-in-law and ignored the errand was recorded as having
 * done nothing, in the one number this app claims to be measured by.
 *
 * So the question is always about a day that is over, the answer is always
 * about the learner's own life rather than about our homework, and the errand
 * is a small one for today offered to somebody who says there was nothing
 * yesterday. That report is the number no learning app keeps, because their
 * business is keeping you inside: conversations held outside, and how often
 * the other person gave up on your Estonian.
 *
 * NO ESTONIAN HERE. An errand names a unit id, the way `topical.ts` does, and
 * never a word: the words the errand needs are the unit's, already in the
 * dictionary, and the card links to them. A hand-written phrase in this file
 * would be this project writing Estonian and the first misspelling shipping in
 * silence (ADR-005).
 *
 * An errand is offered only where the learner has started its unit, because
 * "order a coffee" to somebody who has not met `kohv` is a dare rather than a
 * task. The two that need only greetings are always available.
 *
 * THE WALK IS OVER THE WHOLE LIST AND THE FILTER COMES AFTER IT. This said the
 * same errand "does not come round for weeks", which is true of somebody who
 * has started every unit and false of everybody else: the pool is the units a
 * learner has begun, four of them on a starter deck, and `dayIndex` over a pool
 * of four repeats every four days. The interval is the pool size, which is a
 * fact about how far in the learner is rather than a promise this file can
 * make, and it is why the card appears on a minority of days.
 *
 * AND THE MODULUS IS THE POOL, WHICH MEANS STARTING A UNIT CHANGES TODAY'S. It
 * renumbers the walk, so a learner who begins a unit at lunchtime can be shown
 * a different errand from the one the card offered that morning. Walking the
 * fixed list instead and stepping forward to the first available errand was
 * tried and is worse where it matters: measured over twenty days on a starter
 * deck it lands on `hello` eleven times in twelve, because stepping forward
 * gives the errand with the most unavailable entries in front of it the largest
 * catchment. An even walk over a pool needs the pool's size, so the two cannot
 * both be had. Variety wins, because the learner with four errands is the one
 * who would pay for the other choice, and because the card is only offered on a
 * day the answer was no.
 *
 * Pure.
 */
import { dayIndex } from "@/lib/random/dayHash";
import { joinWithOr } from "@/lib/copy/values";
import { SCENES, sceneById } from "@/lib/scenes/catalogue";
import { SYLLABUS } from "./syllabus";

export interface Errand {
  readonly id: string;
  /** English. The thing to do. */
  readonly says: string;
  /** English. Where it happens. */
  readonly where: string;
  /** The unit whose words it takes. */
  readonly unit: string;
  /**
   * The scene that rehearses it, where one does. An id from
   * `lib/scenes/catalogue.ts`, and the scene has to declare the errand's unit,
   * which `errands.test.ts` asserts: a rehearsal that could not vouch for
   * the words the errand needs would be a rehearsal of something else.
   *
   * THIS IS THE JOIN THE PURPOSE RESTS ON. Situations is where the encounter
   * is played on somebody who wants something from you, and the errand is
   * where it is played on somebody real. For a while the two were built side
   * by side and never pointed at each other: the debrief ended in "have it
   * again", and the card offering the errand linked to a unit's word list.
   * `docs/22-real-life.md` says the app is to be left, and a rehearsal that
   * does not end in the door is a rehearsal that keeps you inside.
   */
  readonly scene?: string;
}

export const ERRANDS: readonly Errand[] = [
  { id: "hello", says: "Say hello to the first person you deal with today, and thank them when you leave.", where: "Anywhere", unit: "tervitused" },
  { id: "sorry", says: "Apologize in Estonian for something small, and say you are learning.", where: "Anywhere", unit: "tervitused" },
  { id: "coffee", says: "Order a coffee in Estonian, and say please.", where: "A café", unit: "sook-ja-jook", scene: "kohvikus" },
  { id: "bread", says: "Ask for bread at the counter, and say how much you want.", where: "A shop or a market", unit: "sook-ja-jook", scene: "poodi-piima" },
  { id: "price", says: "Ask what something costs before you look at the label.", where: "A shop", unit: "ostmine", scene: "poodi-piima" },
  { id: "time", says: "Ask somebody what time it is, even if you know.", where: "A bus stop, a corridor", unit: "aeg" },
  { id: "where", says: "Ask where something is, and follow the answer without asking again in English.", where: "Town", unit: "kus-ja-kuhu", scene: "tee-kusimine" },
  { id: "weather", says: "Say one sentence about the weather to somebody waiting beside you.", where: "A queue, a lift", unit: "ilm" },
  { id: "family", says: "Tell a colleague or a neighbor one thing about your family.", where: "Work, the stairwell", unit: "inimesed", scene: "trepikoda" },
  { id: "day", says: "Tell somebody what you did today, in three sentences.", where: "Home, a friend", unit: "iga-paev" },
  { id: "number", says: "Give your phone number in Estonian, digit by digit, and have it read back.", where: "A form, a friend", unit: "arvud" },
  { id: "clothes", says: "Ask for a size or a color in a shop.", where: "A clothes shop", unit: "riided" },
  { id: "call", says: "Make one phone call in Estonian, even a short one.", where: "The phone", unit: "suhtlemine", scene: "helistamine" },
  { id: "appointment", says: "Book or ask about an appointment in Estonian, and hold the line if they switch.", where: "A health center, a salon", unit: "keha-ja-tervis", scene: "arsti-aeg" },
  { id: "plan", says: "Arrange to meet somebody, with a day and a time.", where: "Work, a friend", unit: "plaanid" },
  { id: "flat", says: "Tell somebody one thing about your flat, or ask about theirs.", where: "A neighbor, a colleague", unit: "kodu", scene: "uuri-remont" },
  { id: "help", says: "Ask somebody for help with one small thing, in Estonian.", where: "Anywhere", unit: "korraldused" },
  { id: "post", says: "Post a letter or collect a parcel, and do the whole thing in Estonian.", where: "The post office", unit: "linn-ja-teenused", scene: "ametiasutus" },
  { id: "ticket", says: "Buy a bus ticket at the window, and say where you are going and when.", where: "A bus station", unit: "reisimine", scene: "bussipilet" },
  { id: "meal", says: "Order a whole meal, and ask what is in one of the dishes.", where: "A restaurant", unit: "restoranis", scene: "restoranis-tellimine" },
  { id: "pharmacy", says: "Ask at a pharmacy for something for a headache, and ask how often to take it.", where: "A pharmacy", unit: "keha-ja-tervis", scene: "apteek" },
  { id: "meaning", says: "Ask somebody what an Estonian word means, and use it once before the day is out.", where: "Class, work, a friend", unit: "kool-ja-keel", scene: "keeletund" },
  { id: "job", says: "Tell somebody what you do for a living and one thing you are good at.", where: "Work, a party", unit: "too-ja-raha", scene: "toovestlus" },
  { id: "complain", says: "Take something back to a shop, or report a fault, and say what is wrong with it.", where: "A shop, a landlord, a helpdesk", unit: "probleemid", scene: "kaebus" },
  /*
    THE FOUR UNITS A1 GAINED, WHICH ARE THE MOST ERRAND-SHAPED IN THE COURSE.

    Transport, asking for help and saying who you are are the three things
    somebody does in their first month here and cannot do from inside an app,
    so a unit for each of them with no errand beside it is the rehearsal
    without the door out of it. None names a scene, because none of the
    fourteen declares these units and the test refuses a rehearsal that could
    not vouch for the errand's words.

    `repeat` is deliberately not `help` one row up, which is asking somebody to
    do something for you. This is the move that keeps a conversation in
    Estonian once it has gone wrong, which is the one the switch to English
    costs, and the switch is the figure Progress says to watch.
  */
  { id: "bus", says: "Ask whether this bus or tram goes where you are going, before you get on.", where: "A stop, a platform", unit: "transport" },
  { id: "repeat", says: "Say you did not understand and ask for it again, instead of switching to English.", where: "Anywhere", unit: "abi" },
  { id: "introduce", says: "Introduce yourself to somebody new: your name, where you live and what you do.", where: "Work, a class, a stairwell", unit: "tutvumine" },
  { id: "count", says: "Say a price or a floor out loud in Estonian, and have it repeated back to you.", where: "A shop, a lift", unit: "suured-arvud" },
];

/**
 * What the learner said happened. The four words on the card.
 *
 * The stored values are unchanged and that is deliberate rather than lazy:
 * the question moved from "how did the errand go" to "did you speak any
 * Estonian yesterday", and every row written under the first question reads
 * correctly under the second. `BAILED` was "I went and did not manage it" and
 * is now "there was none yesterday", which is the same fact about the day.
 *
 * `STUCK` IS THE ANSWER THE FIRST THREE COULD NOT GIVE. Getting partway and
 * running out of words is the commonest thing that happens to anybody holding
 * a conversation in a language they are learning, and it is the moment
 * `lib/email/letters/errand.ts` argues at length that no other app will tell
 * somebody is not a failure. With three answers the learner who froze had to
 * claim they were understood, claim the other person switched, or answer "not
 * yesterday", which deletes the conversation from the one count this app says
 * it is measured by. It is a conversation, because they spoke.
 *
 * THE ORDER IS THE ONE THE ANSWERS ARE OFFERED IN, because `HOW_IT_WENT`
 * reads it rather than keeping a second list. It runs from the conversation
 * that needed nothing to the one the other person ended, which is how far the
 * learner got rather than a ranking of them: `STUCK` sits in the middle
 * because that is where it happened, and putting it last would read as the
 * worst of the three when it is the one this app exists to say counts.
 */
export const OUTCOMES = ["UNDERSTOOD", "STUCK", "SWITCHED", "BAILED"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export function outcomeFrom(value: unknown): Outcome | null {
  return OUTCOMES.find((o) => o === value) ?? null;
}

/**
 * Each answer in the learner's own words.
 *
 * The three that are a conversation answer "how did it go", which is asked
 * after the card has said that speaking at all was the thing; `BAILED`
 * answers the question before that one, which is whether anything was said.
 */
export const OUTCOME_LABEL: Readonly<Record<Outcome, string>> = {
  UNDERSTOOD: "They understood me",
  SWITCHED: "They switched to English",
  STUCK: "I got stuck partway",
  BAILED: "Not yesterday",
};

/** The other half of the first question, which `BAILED` is the no to. */
export const SPOKE_LABEL = "Yes, I did";

/**
 * WHICH OF THE FOUR IS A CONVERSATION, DECIDED ONCE.
 *
 * Progress prints a count of conversations and a run of days with one in
 * them, and both counted every row, including the days somebody said there
 * had been nothing. That was already loose when the third answer meant "I
 * tried and could not"; with the question asked the way it is asked now it
 * would be a plain untruth, since answering "not yesterday" every day for a
 * fortnight would build a fortnight's run of real conversations. Every reader
 * asks this and they may not disagree about it.
 */
export type Conversation = Exclude<Outcome, "BAILED">;

export function isConversation(outcome: Outcome): outcome is Conversation {
  return outcome !== "BAILED";
}

/**
 * The answers to "how did it go", in the order they are offered.
 *
 * Read off `isConversation` rather than typed, so a fifth answer that is a
 * conversation reaches the card by existing rather than by somebody
 * remembering two files.
 */
export const HOW_IT_WENT: readonly Conversation[] = OUTCOMES.filter(isConversation);

/** The errand for a day, over the units the learner has started. */
export function errandForDay(dayKey: string, startedUnits: ReadonlySet<string>): Errand {
  const pool = ERRANDS.filter((e) => e.unit === "tervitused" || startedUnits.has(e.unit));
  return pool[dayIndex(dayKey, "errand", pool.length)] ?? ERRANDS[0]!;
}

export function errandById(id: string): Errand | undefined {
  return ERRANDS.find((e) => e.id === id);
}

/**
 * What both screens that hand a learner an errand call it: Today, when
 * yesterday held nothing, and the scene debrief, when a rehearsal just
 * proved the words are there. One constant rather than two typed headings,
 * because "the same errand under two names" is exactly the drift this file
 * is for.
 */
export const SAY_IT_TODAY = "Say it today";

/**
 * `where`, read the way a person would say it rather than the way it is
 * stored. It is authored as a comma-separated list of alternatives ("Work, a
 * party"), and both screens that print it were doing so verbatim, straight
 * into a sentence: "Work, a party. Nobody there has read the card" reads as
 * two disconnected fragments rather than as "Work or a party. Nobody there
 * has read the card". `joinWithOr` is the right reading, because these are
 * places any one of which would do, not a list of places to visit.
 */
export function errandPlaces(errand: Errand): string {
  return joinWithOr(errand.where.split(",").map((place) => place.trim()).filter(Boolean));
}

/**
 * The scene an errand rehearses, or nothing.
 *
 * Resolved here rather than by the screen so a stale id fails the test in
 * this file rather than rendering a link to a page that is not there.
 */
export function sceneForErrand(errand: Errand) {
  return errand.scene === undefined ? undefined : sceneById(errand.scene);
}

/**
 * The errand a scene was rehearsing, for the debrief.
 *
 * The first one that names the scene, which is a choice only where two do
 * (`bread` and `price` both go to the shop), and the first is the plainer
 * ask. A scene with none returns nothing rather than the day's errand, since
 * "now go and do it" has to be about the thing just rehearsed.
 */
export function errandForScene(sceneId: string): Errand | undefined {
  if (!SCENES.some((s) => s.id === sceneId)) return undefined;
  return ERRANDS.find((e) => e.scene === sceneId);
}

/** The units a deck has started: any of the unit's words with a card. */
export function startedUnits(startedLemmas: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  for (const unit of SYLLABUS) {
    if (unit.lemmas.some((l) => startedLemmas.has(l))) out.add(unit.id);
  }
  return out;
}
