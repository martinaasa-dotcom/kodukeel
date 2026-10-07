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
 * fourteen of fifteen scenes are held in the formal you, so every tile read
 * "the polite you" beside "a word off your card" and "asking a question",
 * which is three chips describing the module rather than the scene. So:
 *
 *   - each beat is named by what the learner does on it (`BEAT_TAGS`),
 *     "booking a time" or "asking to try it on", rather than by the kind of
 *     value it asks for;
 *   - a case is how a task is done rather than the task, so it is named only
 *     where a beat has no tag, which `practises.test.ts` makes never;
 *   - the register is named only where it is the exception, which is the one
 *     scene played with a friend; and
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
  "apteek:pay": "paying at the counter",

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
