/**
 * What a scene practises, in the words a learner would use for it.
 *
 * Read off the beats' own requirements rather than typed beside the title,
 * so the line on the tile cannot drift from what the marker asks for: a
 * scene that asks for `pood` in three cases says so, and one that asks for
 * the time off the card says that.
 *
 * THE TAGS ARE WHAT TELLS ONE SCENE FROM ANOTHER, SO A TAG EVERY SCENE CARRIES
 * IS A TAG THAT SAYS NOTHING. The first version tagged the register, and
 * all but one scene were then held in the formal you, so every tile read
 * "the polite you" beside "a word off your card" and "asking a question",
 * which is three chips describing the module rather than the scene. So:
 *
 *   - each beat is named by what the learner does on it (`BEAT_TAGS`),
 *     "booking a time" or "asking to try it on", rather than by the kind of
 *     value it asks for;
 *   - a case is how a task is done rather than the task, so it is named only
 *     where a beat has no tag, which `practises.test.ts` makes never;
 *   - the register is named only where it is the exception, the scenes
 *     played with a friend or a colleague (about a quarter of them since the
 *     third batch, which still leaves it the rarer of the two); and
 *   - the tile orders its chips by how few scenes share them (`distinctive`),
 *     so what a scene has that the others do not is what a learner reads.
 *
 * Pure: no React, no Next, no Prisma. No Estonian: every label is English,
 * and a case's name is read off `CASES`.
 */
import { CASES } from "@/lib/estonian/cases";
import { CASE_NOTES } from "@/lib/estonian/grammar";
import { leafNeeds, type SceneSpec } from "./types";

/**
 * What the learner does on each beat, keyed `scene:beat`, in English and as a
 * phrase that finishes "You will practise ...". Every beat but the hello and
 * the goodbye has one, and `practises.test.ts` fails on a beat without: a beat
 * that falls back to the kind of value it asks for ("a word off your card",
 * "asking a question") is the label every scene shares and this table exists
 * to replace.
 *
 * A BEAT THAT ASKS FOR A CASE STILL NEEDS ONE. The rule used to let a case
 * stand in for a tag, so the milk mission, whose every beat asks for an
 * ending, had none, and its tile was the one tile on the board reading
 * "sisseütlev (into)" where every other said what you would be doing. A
 * case is how the task is done, not the task, so it is named only on a beat
 * with no tag, which the test makes a beat that does not exist.
 */
export const BEAT_TAGS: Readonly<Record<string, string>> = {
  "poodi-piima:going": "saying where you're off to",
  "poodi-piima:inside": "saying where you are now",
  "poodi-piima:item": "saying what you came for",
  "poodi-piima:back": "saying you're heading home",

  "arsti-aeg:reason": "saying what's wrong",
  "arsti-aeg:where": "saying where it hurts",
  "arsti-aeg:since": "saying when it started",
  "arsti-aeg:offer": "booking a time",
  "arsti-aeg:confirm": "reading a time back",

  "uuri-remont:problem": "saying what's broken",
  "uuri-remont:where": "saying which room and floor",
  "uuri-remont:since": "saying when it started",
  "uuri-remont:refuse": "asking when someone can come",
  "uuri-remont:agree": "agreeing a day and time",

  "ametiasutus:purpose": "saying why you came",
  "ametiasutus:document": "saying if you've got the paper",
  "ametiasutus:wait": "asking how long the wait is",
  "ametiasutus:fill": "filling in a form",
  "ametiasutus:confirm": "asking when it'll be ready",

  "kohvikus:order": "ordering a drink",
  "kohvikus:size": "large or small",
  "kohvikus:bill": "asking to pay",
  "kohvikus:pay": "card or cash",

  "tee-kusimine:where": "asking the way",
  "tee-kusimine:way": "checking directions",
  "tee-kusimine:far": "asking if it's far",

  "bussipilet:want": "asking for a ticket",
  "bussipilet:to": "saying where you're going",
  "bussipilet:when": "saying when you want to leave",
  "bussipilet:pay": "card or cash",

  "restoranis-tellimine:how-many": "a table for how many",
  "restoranis-tellimine:order": "ordering food",
  "restoranis-tellimine:contents": "asking what's in a dish",
  "restoranis-tellimine:drink": "ordering a drink",
  "restoranis-tellimine:bill": "asking for the bill",
  "restoranis-tellimine:pay": "card or cash",

  "helistamine:why": "saying why you're calling",
  "helistamine:have": "asking if they have it",
  "helistamine:hours": "asking when they open",
  "helistamine:confirm": "reading a time back",

  "trepikoda:new": "saying you've just moved in",
  "trepikoda:floor": "saying your floor",
  "trepikoda:from": "where you're from",
  "trepikoda:with": "who you live with",
  "trepikoda:weather": "chatting about the weather",

  "apteek:what": "saying what hurts",
  "apteek:since": "saying when it started",
  "apteek:medicine": "asking what to take",
  "apteek:how": "asking how often",
  "apteek:pay": "saying you'll take it",
  "apteek:card": "card or cash",

  "keeletund:name": "saying your name",
  "keeletund:from": "where you're from",
  "keeletund:why": "why you're learning",
  "keeletund:word": "asking what a word means",
  "keeletund:howlong": "how long you've been learning",

  "toovestlus:before": "where you worked before",
  "toovestlus:skill": "what you're good at",
  "toovestlus:why": "why you want the job",
  "toovestlus:pay": "asking about the pay",
  "toovestlus:wage": "agreeing the pay",
  "toovestlus:start": "when you can start",

  "kaebus:problem": "saying what's wrong with it",
  "kaebus:when": "when you bought it",
  "kaebus:receipt": "whether you have the receipt",
  "kaebus:want": "asking for a refund or a repair",
  "kaebus:insist": "standing your ground politely",

  "riidepood:want": "asking for a piece of clothing",
  "riidepood:size": "your size",
  "riidepood:colour": "the color you want",
  "riidepood:proov": "asking to try it on",
  "riidepood:sobib": "saying whether it fits",
  "riidepood:hind": "asking the price",

  "uus-kolleeg:name": "saying your name",
  "uus-kolleeg:from": "where you're from",
  "uus-kolleeg:job": "saying what you'll do",
  "uus-kolleeg:back": "asking a colleague about themselves",
  "abi-palumine:ask": "asking for a hand",
  "abi-palumine:how": "saying you didn't catch it",
  "abi-palumine:again": "following an instruction",
  "abi-palumine:thanks": "thanking and saying sorry",
  "ootamine:weather": "chatting about the weather",
  "ootamine:time": "asking the time",
  "ootamine:when": "asking when the bus comes",
  "kokkulepe:idea": "saying yes to a plan",
  "kokkulepe:day": "saying a day doesn't suit you",
  "kokkulepe:free": "offering your own day",
  "kokkulepe:time": "settling a time",
  "turul:some": "asking for some, by weight",
  "turul:pieces": "asking for a few, by the piece",
  "turul:many": "saying how many",
  "turul:price": "asking what it comes to",
  "bussipeatus:this": "checking it's the right bus",
  "bussipeatus:yes": "thanking for an answer",
  "bussipeatus:stops": "asking where to get off",
  "raamatukogu:want": "asking politely for a card",
  "raamatukogu:month": "saying the month you were born",
  "raamatukogu:phone": "reading out a phone number",
  "raamatukogu:check": "saying a number again, slowly",
  "nadalavahetus:how": "saying how your weekend was",
  "nadalavahetus:did": "saying where you went",
  "nadalavahetus:back": "asking about their weekend",
  "hadaabi:what": "saying what happened",
  "hadaabi:part": "saying what they've hurt",
  "hadaabi:where": "giving an address",
  "hadaabi:house": "giving the house number",
  "hadaabi:hurt": "saying whether they can stand",
  "hadaabi:wait": "following instructions on the phone",
  "pangas:want": "asking to open an account",
  "pangas:for": "saying what an account is for",
  "pangas:brought": "saying what you've brought",
  "pangas:card": "saying yes to a card",
  "pangas:sign": "signing a form",
  "perearst:hurts": "saying what hurts",
  "perearst:since": "saying when it started",
  "perearst:bad": "saying how bad it is",
  "perearst:take": "saying back how often to take it",
  "perearst:again": "booking a follow-up",
  "tootukassa:why": "saying why you've come",
  "tootukassa:job": "saying what you did before",
  "tootukassa:ended": "saying when a job ended",
  "tootukassa:looking": "saying what work you want",
  "tootukassa:next": "asking when to come back",
  "tootukassa:again": "booking the next visit",
  "elamisluba:want": "saying what you've come to renew",
  "elamisluba:booking": "giving a reference",
  "elamisluba:brought": "saying what you've brought",
  "elamisluba:next": "asking when it will be ready",
  "elamisluba:collect": "saying back a day",
  "peretoetus:why": "saying money hasn't come",
  "peretoetus:ref": "reading out a number",
  "peretoetus:last": "saying when it last came",
  "peretoetus:check": "asking how to send something",
  "lastevanemad:who": "saying whose parent you are",
  "lastevanemad:how": "asking a follow-up question",
  "lastevanemad:home": "saying how somebody seems",
  "lastevanemad:practise": "agreeing what to practise",
  "tehniline-tugi:problem": "saying what isn't working",
  "tehniline-tugi:device": "saying which device",
  "tehniline-tugi:screen": "saying what you see",
  "tehniline-tugi:tried": "saying what you've tried",
  "tehniline-tugi:fix": "following steps on the phone",
  "koosolek:idea": "disagreeing politely",
  "koosolek:why": "giving a reason",
  "koosolek:propose": "suggesting another day",
  "koosolek:agree": "agreeing in the end",
  "soovitus:seen": "saying what you saw",
  "soovitus:like": "saying what it was like",
  "soovitus:compare": "saying which is better",
  "soovitus:recommend": "recommending something",
  "sobra-mure:how": "asking what happened",
  "sobra-mure:sorry": "saying you're sorry",
  "sobra-mure:help": "offering help",
  "sobra-mure:meet": "agreeing to meet again",
  "palk:topic": "raising a subject",
  "palk:did": "saying what you did",
  "palk:amount": "naming a figure",
  "palk:offer": "negotiating a figure",
  "tagatisraha:why": "saying why you're calling",
  "tagatisraha:moved": "saying when you moved out",
  "tagatisraha:clean": "standing up for yourself",
  "tagatisraha:offer": "refusing an offer",
  "kolm-palvet:friend": "asking a friend a favour",
  "kolm-palvet:manager": "asking your manager",
  "kolm-palvet:official": "asking an official",
  "kuulsin:news": "passing on news",
  "kuulsin:when": "saying when it happens",
  "kuulsin:source": "saying where you heard it",
  "kuulsin:sure": "saying you're not sure",
  "elanike-koosolek:idea": "making a proposal",
  "elanike-koosolek:why": "giving a reason to a room",
  "elanike-koosolek:cost": "answering an objection",
  "elanike-koosolek:vote": "agreeing to a vote",
  "graafik:what": "saying what a chart shows",
  "graafik:much": "saying by how much",
  "graafik:why": "explaining a change",
  "raamatuklubi:thought": "saying what you thought",
  "raamatuklubi:hero": "talking about a character",
  "raamatuklubi:change": "saying what you'd change",
  "raamatuklubi:agree": "agreeing or not",
  "eksam-b1:home": "saying where you live",
  "eksam-b1:work": "saying what you do",
  "eksam-b1:plan": "suggesting where to go",
  "eksam-b1:why": "giving a reason",
  "eksam-b1:agree": "agreeing on a plan",
  "eksam-b1:call": "asking on the phone",
  "eksam-b1:when": "agreeing a day and time",
  "eksam-b2:work": "saying what you do",
  "eksam-b2:like": "saying why you do it",
  "eksam-b2:side": "taking a side",
  "eksam-b2:reason": "giving a reason",
  "eksam-b2:counter": "answering an objection",
  "eksam-b2:decide": "agreeing a conclusion",
};

/** A move nobody would put on a tile: every scene opens and closes. */
const FRAME_MOVES: ReadonlySet<string> = new Set(["greet", "close"]);

export function practises(scene: SceneSpec): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (label: string) => { if (!seen.has(label)) { seen.add(label); out.push(label); } };
  for (const beat of scene.beats) {
    if (FRAME_MOVES.has(beat.move)) continue;
    const tag = BEAT_TAGS[`${scene.id}:${beat.id}`];
    if (tag) { add(tag); continue; }
    // Only a beat with no task named falls back to its case, the way a class
    // names it with what it means. The test keeps this branch unreached.
    for (const { need } of leafNeeds(beat.needs)) {
      if (need.kind !== "case") continue;
      const spec = CASES.find((c) => c.key === need.grammCase);
      const note = CASE_NOTES.find((n) => n.key === need.grammCase);
      if (spec) add(note ? `${spec.et} (${note.plain})` : spec.et);
    }
  }
  // The exception, never the rule: nearly every scene is held in the formal
  // you, so naming it on each one says nothing.
  if (scene.register === "sina") add("talking to a friend");
  return out;
}

/**
 * The same tags, rarest first across `all`, for a tile with room for a few.
 * A tag every scene carries is dropped outright; the order is stable, so two
 * tags equally rare keep the order the beats met them in.
 */
export function distinctive(scene: SceneSpec, all: readonly SceneSpec[], limit = 3): string[] {
  const count = new Map<string, number>();
  for (const one of all) for (const tag of practises(one)) count.set(tag, (count.get(tag) ?? 0) + 1);
  const mine = practises(scene);
  return mine
    .map((tag, i) => ({ tag, i, n: count.get(tag) ?? 1 }))
    .filter(({ n }) => n < all.length)
    .sort((a, b) => a.n - b.n || a.i - b.i)
    .slice(0, limit)
    .map(({ tag }) => tag);
}
