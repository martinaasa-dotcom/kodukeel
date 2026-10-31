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
  { id: "hello", says: "Say hello to the first person you deal with today, and thank them on your way out.", where: "Anywhere", unit: "tervitused", scene: "uus-kolleeg" },
  { id: "sorry", says: "Say sorry in Estonian for something tiny, and tell them you're learning.", where: "Anywhere", unit: "tervitused", scene: "abi-palumine" },
  { id: "coffee", says: "Order your coffee in Estonian today. Don't forget the please.", where: "A café", unit: "sook-ja-jook", scene: "kohvikus" },
  { id: "bread", says: "Ask for bread at the counter and say how much you want. Pointing doesn't count.", where: "A shop or a market", unit: "sook-ja-jook", scene: "poodi-piima" },
  { id: "price", says: "Ask what something costs before you peek at the label.", where: "A shop", unit: "ostmine", scene: "poodi-piima" },
  { id: "time", says: "Ask somebody the time, even if you know it perfectly well.", where: "A bus stop, a corridor", unit: "aeg", scene: "ootamine" },
  { id: "where", says: "Ask somebody where something is, and follow the answer without falling back on English.", where: "Town", unit: "kus-ja-kuhu", scene: "tee-kusimine" },
  { id: "weather", says: "Say one sentence about the weather to whoever's waiting next to you.", where: "A line, an elevator", unit: "ilm", scene: "ootamine" },
  { id: "family", says: "Tell a colleague or a neighbor one thing about your family.", where: "Work, the stairwell", unit: "inimesed", scene: "trepikoda" },
  { id: "day", says: "Tell somebody what you did today. Three sentences is plenty.", where: "Home, a friend", unit: "iga-paev", scene: "nadalavahetus" },
  { id: "number", says: "Give your phone number in Estonian, digit by digit, and ask them to read it back to you.", where: "A form, a friend", unit: "arvud", scene: "raamatukogu" },
  { id: "clothes", says: "In a clothes shop, ask for another size or another color.", where: "A clothes shop", unit: "riided", scene: "riidepood" },
  { id: "call", says: "Make one phone call in Estonian. A short one counts.", where: "The phone", unit: "suhtlemine", scene: "helistamine" },
  { id: "appointment", says: "Book an appointment in Estonian, or just ask about one, and stay in Estonian even if they switch to English.", where: "A health center, a salon", unit: "keha-ja-tervis", scene: "arsti-aeg" },
  { id: "plan", says: "Arrange to meet somebody in Estonian, with a day and a time.", where: "Work, a friend", unit: "plaanid", scene: "kokkulepe" },
  { id: "flat", says: "Tell somebody one thing about your apartment, or ask about theirs.", where: "A neighbor, a colleague", unit: "kodu", scene: "uuri-remont" },
  { id: "help", says: "Ask somebody for a hand with one small thing, in Estonian.", where: "Anywhere", unit: "korraldused", scene: "abi-palumine" },
  { id: "post", says: "Mail a letter or pick up a package, and do the whole thing in Estonian.", where: "The post office", unit: "linn-ja-teenused", scene: "ametiasutus" },
  { id: "ticket", says: "Buy a bus ticket at the window, and say where you're going and when.", where: "A bus station", unit: "reisimine", scene: "bussipilet" },
  { id: "meal", says: "Order a whole meal in Estonian, and ask what's in one of the dishes.", where: "A restaurant", unit: "restoranis", scene: "restoranis-tellimine" },
  { id: "pharmacy", says: "Ask at the pharmacy for something for a headache, and how often to take it.", where: "A pharmacy", unit: "keha-ja-tervis", scene: "apteek" },
  { id: "meaning", says: "Ask somebody what an Estonian word means, then use it yourself before bed.", where: "Class, work, a friend", unit: "kool-ja-keel", scene: "keeletund" },
  { id: "job", says: "Tell somebody what you do for a living, and one thing you're good at.", where: "Work, a party", unit: "too-ja-raha", scene: "toovestlus" },
  { id: "complain", says: "Take something back to a shop, or report something broken, and say what's wrong with it.", where: "A shop, a landlord, a helpdesk", unit: "probleemid", scene: "kaebus" },
  /*
    THE FOUR UNITS A1 GAINED, WHICH ARE THE MOST ERRAND-SHAPED IN THE COURSE.

    Transport, asking for help and saying who you are are the three things
    somebody does in their first month here and cannot do from inside an app,
    so a unit for each of them with no errand beside it is the rehearsal
    without the door out of it. None named a scene while none of the
    fourteen declared these units, since the test refuses a rehearsal that
    could not vouch for the errand's words; the everyday scenes of the third
    batch each declare one, and each of the four names its own now.

    `repeat` is deliberately not `help` one row up, which is asking somebody to
    do something for you. This is the move that keeps a conversation in
    Estonian once it has gone wrong, which is the one the switch to English
    costs, and the switch is the figure Progress says to watch.
  */
  { id: "bus", says: "Before you get on, ask whether this bus or tram goes where you're going.", where: "A stop, a platform", unit: "transport", scene: "bussipeatus" },
  { id: "repeat", says: "When you don't catch something, ask them to say it again instead of switching to English.", where: "Anywhere", unit: "abi", scene: "abi-palumine" },
  { id: "introduce", says: "Introduce yourself to somebody new: your name, where you live and what you do.", where: "Work, a class, a stairwell", unit: "tutvumine", scene: "uus-kolleeg" },
  { id: "count", says: "Say a price or which floor you live on out loud in Estonian, and ask them to say it back.", where: "A shop, an elevator", unit: "suured-arvud", scene: "turul" },
  { id: "would", says: "Ask for something politely with would: could I, would you.", where: "A desk, a shop, work", unit: "tingiv", scene: "raamatukogu" },
  { id: "emergency", says: "Find out what number to call in an emergency, and say your address out loud in Estonian.", where: "Home", unit: "abi", scene: "hadaabi" },
  { id: "bring", says: "Ask at a bank or a counter what you need to bring, in Estonian.", where: "A bank, an office", unit: "linn-ja-teenused", scene: "pangas" },
  { id: "dose", says: "Ask how often to take something, and say it back.", where: "A doctor, a pharmacy", unit: "keha-ja-tervis", scene: "perearst" },
  { id: "nextstep", says: "Ask an office what happens next and when, and stay in Estonian.", where: "An office", unit: "too-ja-raha", scene: "tootukassa" },
  { id: "letter", says: "Read one official letter or notice and tell somebody what it asks of you.", where: "Home, an office", unit: "umbisikuline", scene: "elamisluba" },
  { id: "reference", says: "Make one call to an office and give a reference number in Estonian.", where: "On the phone", unit: "suhtlemine", scene: "peretoetus" },
  { id: "followup", says: "Ask a teacher or a colleague one follow-up question rather than nodding.", where: "A school, work", unit: "haridus", scene: "lastevanemad" },
  { id: "device", says: "Describe a problem with a device in Estonian: one sentence for what it does, and one for what you tried.", where: "Home, a shop", unit: "tehnoloogia", scene: "tehniline-tugi" },
  { id: "disagree", says: "Say you disagree with something, politely, in Estonian.", where: "Work, a class", unit: "arvamus", scene: "koosolek" },
  { id: "recommend", says: "Recommend something to somebody and say why it's better than another.", where: "With a friend", unit: "vordlemine", scene: "soovitus" },
  { id: "askmore", says: "Ask somebody how they are, and ask one more question about the answer.", where: "With a friend, work", unit: "tunded", scene: "sobra-mure" },
  { id: "wouldwork", says: "Ask for something at work using would: I would like, could we.", where: "Work", unit: "tingiv", scene: "palk" },
  { id: "ground", says: "Hold your ground politely when somebody says no.", where: "Anywhere", unit: "eluase", scene: "tagatisraha" },
  { id: "twoyous", says: "Ask the same thing twice today: once of somebody you say sina to, and once of somebody you say teie to.", where: "Anywhere", unit: "register", scene: "kolm-palvet" },
  { id: "heard", says: "Tell somebody one piece of news you read, as something you heard.", where: "Anywhere", unit: "kaudne", scene: "kuulsin" },
  { id: "reason", says: "Give one reason for something you want, in Estonian, to more than one person.", where: "A meeting, a group", unit: "uhiskond", scene: "elanike-koosolek" },
  { id: "figure", says: "Say one number and what it means out loud: it rose, it fell, by how much.", where: "Work, the news", unit: "statistika", scene: "graafik" },
  { id: "opinion", says: "Say what you thought of something you read or watched, and one reason.", where: "With a friend", unit: "kirjandus", scene: "raamatuklubi" },
  { id: "minute", says: "Talk about yourself for one minute in Estonian without stopping.", where: "Anywhere", unit: "haridus", scene: "eksam-b1" },
  { id: "decision", says: "Explain a decision you made and one reason against it.", where: "With a friend", unit: "argumenteerimine", scene: "eksam-b2" },
  /*
    B2'S EIGHT, ONE A PART (docs/reviews/b2-cast.md, "Its errand"), each on a
    unit the part owns. A lesson's own role-play declares no units, so it
    cannot be an errand's rehearsal under the rule above; where a catalog
    conversation the part offers on a lesson's finish declares the unit, it is
    named (the office's letter, the B2 exam), and the others name none rather
    than a conversation about something else. The first part owns no unit, so
    its errand takes the A2 unit of talking to people.
  */
  { id: "keepon", says: "When somebody switches to English to help you, ask to carry on in Estonian, and carry on.", where: "Anywhere", unit: "suhtlemine" },
  { id: "headline", says: "Read one headline and tell somebody what it said, as something you heard.", where: "Anywhere", unit: "kaudne" },
  { id: "door", says: "Say one thing in Estonian to a teacher or another parent at the door.", where: "A school, a kindergarten", unit: "des-vorm" },
  { id: "doctor", says: "Book an appointment with your family doctor in Estonian, on the phone if you can.", where: "On the phone", unit: "tervishoid" },
  { id: "meeting", says: "Say one thing in a meeting held in Estonian: a question, a short update, or that you agree.", where: "Work", unit: "toomaailm" },
  { id: "plainly", says: "Read a letter from an office and say plainly, in Estonian, what it wants from you.", where: "Home, an office", unit: "umbisikuline", scene: "elamisluba" },
  { id: "radio", says: "Listen to ten minutes of Estonian radio, or watch an Estonian show with Estonian subtitles.", where: "Home", unit: "kunst" },
  { id: "politely", says: "Disagree with somebody politely in Estonian, and say why.", where: "Work, a class", unit: "argumenteerimine", scene: "eksam-b2" },
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

