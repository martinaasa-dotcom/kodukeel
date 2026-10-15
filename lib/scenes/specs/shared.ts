/**
 * WHAT EVERY SCENE SHARES: the units every scene declares, the greetings and
 * goodbyes, and the words the other side reacts with.
 *
 * Moved out of `lib/scenes/catalogue.ts` byte for byte when each scene took a
 * file of its own (`lib/scenes/specs/<scene id>.ts`), so that a scene added in
 * one pull request does not conflict with every other. The catalogue re-exports
 * everything here, so no importer changed.
 */
import type { Feel, SaysPart } from "../types";

/** Greetings, question words, pronouns, time and number. Every scene needs them. */
/*
  The units every scene declares, whatever it is about.

  The test for being here is that a unit teaches the machinery a conversation
  is made of rather than the subject of one, and four were added after
  `eval:scene` measured what leaving them out cost. Each absence was an
  oversight rather than a decision, and each was invisible until the ranked
  list of words the model reached for named it.

  `pohiverbid` teaches `olema`, and no Estonian sentence is built without the
  verb "to be". `sidesonad`, `vastused` and `maaramine` are the words between
  the words, and the two commonest things the gate withheld a line over were
  `ja` and `või`: a scene that cannot say "and" or "or" cannot say much.
  `millal` carries `praegu` and `juba`, which is how anybody says when.

  The last two arrived with the vocabulary pass and are the same argument once
  more. `kohasonad` is the postpositions, which is one of the eight units the
  seventeenth pass added for exactly this reason and the only one that was left
  out here; `alates` and `kaasas` were both in the ranked list. And
  `kus-ja-kuhu` is the adverbs of place, `siin`, `siia`, `mujal` and `asuma`,
  which stands beside `millal`'s adverbs of time for the same reason: every one
  of these scenes asks where something is before it asks anything else.
*/
export const COMMON = [
  "tervitused", "kusisonad", "asesonad", "umbmaarased", "aeg", "arvud", "korraldused", "pohiverbid",
  "esimesed-verbid", "vaikesed-sonad", "veel-verbe", "tahtsad-sonad", "sidesonad", "vastused", "kindlus", "maaramine", "millal", "kohasonad", "kus-ja-kuhu", "tutvumine",
  /*
    Two more once the curveballs were played rather than drawn. `ilm` is the
    weather, which is what small talk is about in every scene; `iga-paev`
    carries `rääkima` and `ütlema`, which is how anybody asks somebody to
    speak slower or says what they heard. Both A1.
  */
  "ilm", "iga-paev",
] as const;

/**
 * What the other side says when they did not catch the learner's turn.
 *
 * A course phrase rather than a sentence written here, which is the rule this
 * file lives under: a lemma is a request against the dictionary, so a
 * misspelled one fails to arrive and `catalogue.test.ts` says so. `tervitused`
 * teaches it and every scene declares that unit through `COMMON`.
 *
 * It is a reaction and never a way out. For a while it was both, and the
 * second job was a lie: it was printed at a learner whose turn had landed
 * perfectly because the ladder had nothing to build the *next* line with.
 * `lib/scenes/reply.ts` says it only where `readTurn` read nothing, and then
 * asks the question again, which is what a person who missed something does.
 */
export const FALLBACK_PHRASE = "Ma ei saa aru";

/**
 * The words the other side reacts with, before they make their next move.
 *
 * A conversation is not a list of questions. Somebody who has just been told
 * where it hurts says "hästi" or "aitäh" before they ask how long, and a
 * screen that skipped straight to the next question read as a form being
 * filled in by a machine, which is what a learner reported it as. Every entry
 * is a lemma from `vastused` or `maaramine`, both in `COMMON`, so the same
 * rule holds here as for a beat's topic: a word the harvest did not bring back
 * fails the catalog test rather than reaching a screen. Capitalizing one and
 * putting a full stop or a question mark after it is presentation and not
 * composition, the way the app already prints `Tere!` as a line; the word is
 * the dictionary's and the mark is the move.
 *
 * `acknowledge` rotates, because the same "Hästi." six times running is the
 * machine showing through again. `waiting` is one word with a question mark,
 * and it is the whole reply to a one-word turn where a sentence was due: a
 * person who has heard "palavik" and is waiting for the rest says "Jah?".
 */
/**
 * What the other side says on hearing news, before their next move.
 *
 * `REACTIONS.acknowledge` is what a clerk says to a fact, and it was said to
 * everything: a symptom got "Hästi.", which is the moment a learner decided
 * the other side was a machine. A beat says what kind of news its answer is
 * (`BeatSpec.feel`) and this is the word for it. The words are the course's,
 * and the course is thin here on purpose rather than by oversight: `oi` and
 * `kahju` are what a native speaker reaches for and no A1 or A2 unit teaches
 * either, and writing one here would be this file writing Estonian. `tõesti`
 * is `vastused` and `tore` is `omadussonad`, which every scene declares; a
 * sympathetic "really?" and a warm "lovely!" are what the course can say, and
 * the composer says the rest.
 */
export const FEELINGS: Readonly<Record<Feel, { readonly word: string; readonly mark: "." | "?" | "!" }>> = {
  sorry: { word: "tõesti", mark: "?" },
  glad: { word: "tore", mark: "!" },
  /*
    A problem told to somebody whose job is to deal with it. A pharmacist
    told "my head hurts", an operator told somebody has fallen and a clerk
    told the money has not come are not moved and are not glad: "Hästi." is
    "good" said to a symptom, and "Tõesti?" from a professional reads as
    doubting it. "Selge." is "understood", which is what they say.
  */
  noted: { word: "selge", mark: "." },
};

export const REACTIONS = {
  acknowledge: ["hästi", "aitäh", "jah"],
  /*
    "Got it", to a turn that was understood and answered something else: real
    Estonian, off the point. `Vabandust?` said there told a learner they had
    not been understood when they had, and "Hästi." says "good" to whatever it
    was, a symptom included. `selge` is `tahtsad-sonad`, which every scene
    declares.
  */
  heard: ["selge"],
  waiting: ["jah"],
  /*
    EVERY FAILURE USED TO LOOK LIKE A SUCCESS, which is the single reason a
    learner reported a whole conversation as broken. A turn that landed got a
    word and then the next question; a turn that missed got nothing and then a
    question, and where the ladder had a fresh line for the same beat it got a
    *differently worded* question. So `kool` answered "where are you going?"
    with silence and "Kuhu te sõidate?", and there was no way on the screen to
    tell that apart from having been understood and asked something new.

    A person says so. This is what they say: the one word in the course for
    "that was not what I asked", said before the question is put again, and
    said only on a turn that was real Estonian off the point, since a turn
    nobody could read already has the repair phrase and a turn that half
    landed already gets its own word back.
  */
  missed: ["Vabandust!"],
  /*
    And running out of patience is not agreement. It drew from `acknowledge`,
    so giving up on getting an answer could come out as `Aitäh.` or `Jah.`:
    the other side thanking somebody for an answer they never gave, which is
    the machine showing through at the exact moment the learner most needed
    to know they had not been understood. One word, and never the two that
    read as taking something.
  */
  letGo: ["hästi"],
} as const;

/**
 * What the other side says about a question the scene did not anticipate,
 * before going on with their own move (`lib/scenes/aside.ts`).
 *
 * A person caught off guard still answers: "how are you" gets "fine,
 * thanks", and a question they have no answer to gets "don't know", said
 * the way a stranger on a street corner says it. Both are parts, in the
 * shape a beat's `says` takes, so every word is a lemma one of the common
 * units teaches and the one verb form is read off the derived table rather
 * than typed. `ei tea` is `ei` and the negative of `teadma`, which is the
 * stored first person with its ending taken off.
 */
/**
 * How a learner says they are not following, so the other side can help
 * rather than ask the same thing again.
 *
 * The single most important thing to recognise in this module, because it is
 * the moment somebody decides whether they are stupid or simply learning.
 * A learner who writes "I do not understand" and is answered with the same
 * question a third time has been told by a machine that the problem is them.
 * A person offers the word.
 *
 * Lemmas and a course phrase, so nothing here is Estonian this file wrote,
 * and all of them are taught by units every scene declares: the phrase by
 * `tervitused`, `saama` by `pohiverbid`, `teadma` by `iga-paev`. The verbs
 * are read *negated*, which is `ei` beside the form `derivedVerbForms` gives
 * after it, so `ei tea` and `ei saa aru` are caught and `ma tean` is not.
 */
export const LOST = {
  /** Matched whole: every word of it in the turn. A phrase is not a bag of words. */
  phrases: ["Ma ei saa aru"],
  /** The negator beside a form of one of these. */
  verbs: ["teadma", "saama"],
} as const;

/**
 * HOW A LEARNER ASKS FOR ENGLISH, WHICH IS A PHRASE THE COURSE TEACHES AND
 * THIS MODULE USED TO PUNISH.
 *
 * `Kas sa räägid inglise keelt?` is in `tervitused`, which every scene
 * declares, and it is the move anybody makes in their first month in a shop.
 * Read as an ordinary turn it meets no requirement, so the other side said
 * "sorry?" and asked the same question again: the app teaching a phrase in one
 * screen and ignoring it in another.
 *
 * Matched on `inglise` alone, and that is deliberate rather than lazy. The
 * phrase inflects for person and politeness (`sa räägid`, `te räägite`), so
 * matching it whole catches one learner in two; the word for "English" appears
 * in nothing else a scene teaches, which makes it the one token that says what
 * the turn is about whatever else is around it.
 */
export const ASK_ENGLISH = "inglise";

export const ASIDES = {
  /** `Hästi, aitäh.` */
  howAreYou: [{ lemma: "hästi" }, { lemma: "aitäh" }],
  /** `Ei tea.` */
  unknown: [{ lemma: "ei" }, { lemma: "teadma", verb: "IndPrPs_" }],
} as const satisfies Record<string, readonly SaysPart[]>;

/**
 * The closing phrases, which are the same wherever you are leaving.
 *
 * `Aitäh!` is not in it. It is thanks, not a farewell, and `topic` is what
 * decides which recorded sentence retrieval may hand the OTHER SIDE as their
 * own closing line: a passerby who has just given directions for free does
 * not then thank the learner for asking, so a usage filed under `aitäh` was
 * being read as their goodbye and came out backwards. `CLOSING_WORDS` is the
 * wider set of things the *learner* may say to end a scene, thanks included,
 * since a learner thanking somebody and walking off is an ordinary way to
 * close a conversation.
 */
export const FAREWELLS = ["Head aega!", "Nägemist!"] as const;

/** What the learner may say to end a scene: a farewell, or a plain thanks. */
export const CLOSING_WORDS = [...FAREWELLS, "Aitäh!"] as const;

export const HELLOS = ["Tere!", "Tere hommikust!"] as const;
