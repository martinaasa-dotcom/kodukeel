import { isPhrase } from "@/lib/dict/pos";

/**
 * What a cell says when there is no value to put in it.
 *
 * This was an em dash, typed into a dozen call sites. That is the convention
 * every dictionary and every annual report uses for nil, and it is also a
 * character a reader may not see: it is the loudest tell that a sentence was
 * generated, so the app now strips it out of Anu's prose and forbids it in
 * hand-written copy. A nil marker that is the one banned character is a
 * marker nobody can reason about.
 *
 * A BARE HYPHEN WAS THE OBVIOUS SWAP AND IS WRONG. These sit in a table of
 * forms, in a column of them, beside percentages: a lone `-` in a grid of
 * Estonian forms reads as a form that is one character long, and beside
 * `62%` it reads as a minus sign whose digits failed to load. `n/a` cannot
 * be misread as either, and it is what a person would actually write in a
 * table by hand.
 *
 * ONE CONSTANT, so it is one edit if that call ever changes, and so a test
 * can assert on the constant rather than on a string somebody retyped.
 */
export const NO_VALUE = "n/a";

/**
 * A word whose English is the very same string, and what to say instead.
 *
 * Thirty entries in the shipped dictionary are spelled identically in both
 * languages, twelve of them taught by the course: `film`, `number`, `park`,
 * `sport`, `stress`, `argument`, `minister`, `risk`. Every screen that prints
 * a word above its meaning printed those twice, which reads as the app having
 * rendered something wrong rather than as a fact about the word. The first
 * meeting is the worst of them, since it is a screen whose whole job is to
 * teach the word and it appeared to be stuttering.
 *
 * EXACT, NOT CASE-INSENSITIVE, and that is the whole of the care needed here.
 * `august` is `August`, `november` is `November`, and the capital letter is
 * the lesson: Estonian writes its months in lower case and English does not.
 * Folding case would delete the one thing those five cards teach.
 *
 * The sentence says "spelled" rather than "the same word" because it is not
 * said the same: `sport` and `stress` are Estonian words with Estonian
 * quantity and an Estonian vowel in them, and the audio beside it is the point.
 */
export function sameSpelling(estonian: string, english: string): boolean {
  const a = estonian.trim();
  const b = english.trim();
  return a.length > 0 && a === b;
}

/**
 * Whether a question showing the one would hand over the other.
 *
 * The other answer to the same question, and deliberately not the same
 * function. `sameSpelling` decides what a screen SAYS beside a word, where
 * the capital is the lesson. A question about meaning is not a screen that
 * teaches spelling: the level check put `august` up with "August" among four
 * options, and nobody reading one picks anything but the other. So a
 * measurement folds case, and a caption does not.
 */
export function givesItselfAway(estonian: string, english: string): boolean {
  const a = estonian.trim().toLocaleLowerCase("et");
  const b = english.trim().toLocaleLowerCase("et");
  return a.length > 0 && a === b;
}

export const SAME_SPELLING = "Spelled the same in English.";

/**
 * How several answers are held in one string, everywhere in this app.
 *
 * `lib/srs/cards.ts` joins a card's accepted answers with it, every screen
 * that prints a pair prints it this way, and `lib/srs/cardSpelling.ts` reads
 * it back to put an already-built card right. One constant, because two
 * copies of a separator are two readings of where an answer ends.
 *
 * IT IS NARROWER THAN THE MARKER'S SPLIT, and that is a decision rather than
 * an oversight. `acceptedForms` in `lib/estonian/answer.ts` splits on a
 * slash, a comma, a semicolon or the word `or`, with the surrounding spaces
 * optional, so `favorite/favourite` reaches the marker as two answers and
 * both are let through. That is right for deciding what to accept, which can
 * afford to over-reach, and wrong for deciding what to print, which cannot:
 * `favorite/favourite` is one answer spelled two ways, and lowering the half
 * after the slash would edit a word rather than open a sentence. The comma is
 * left alone for the same reason, since a sense past the first is not a new
 * sentence: `vist` is `probably, I think` and `bemar` is `BMW, Beamer`.
 */
export const PARTS = " / ";

/**
 * The one English word that is capital wherever it stands.
 *
 * A short certain list, in the shape `DA_ONLY_VERBS` and the a/an rule in
 * `lib/estonian/caseReading.ts` take, and safe for their reason: this one is
 * never the other way, and English spelling does not change under us.
 *
 * Holding a phrase to its part of speech is not enough on its own, because a
 * phrase can open on it: `Ma ei saa aru` was taught as `i don't understand`
 * and `Ma õpin eesti keelt` as `i am learning Estonian`, on two of the first
 * twenty cards anybody meets. The lookahead is what keeps it to the pronoun,
 * so `Ice cream` is still lowered and `I'm` and `I` are not.
 *
 * It is asked of the Estonian side too, which costs nothing and is worth
 * saying: no Estonian word is spelled `I`, so the guard cannot fire there.
 */
const ALWAYS_CAPITAL = /^I(?=$|[\s'’])/;

/**
 * A phrase's own capital letter and exclamation mark, dropped for word
 * learning.
 *
 * `Tere hommikust!` is filed with its capital `T` and its mark because that
 * is how a greeting is written down, and the dictionary entry keeps printing
 * it exactly as stored: this app edits neither the lemma nor the Estonian it
 * holds. A flashcard is a different screen. Every other word on one opens
 * lower case (`õpetaja`, not `Õpetaja`), the mark carries no answer of its
 * own since `checkAnswer` already strips punctuation before comparing, and
 * printed on the front, the back and the reveal it reads as the app
 * shouting the greeting rather than teaching it.
 *
 * Trailing `!` only, and only where the text actually ends on one, so a
 * question a phrase genuinely asks (`Kuidas läheb?`) keeps its mark.
 *
 * ONLY A PHRASE, WHICH IS WHAT THE ARGUMENT ABOVE WAS ALWAYS ABOUT. It said
 * lowering was safe "because no phrase in it opens on a proper noun", and
 * then it was applied to the lemma and the gloss of every word the app
 * teaches. A word's capital is the language's rather than the app shouting,
 * so dropping it is this app correcting English and Estonian it did not
 * write: measured over the shipped dictionary, 166 entries and 30 of the
 * course's own 1,514 words were taught with a capital that is theirs removed.
 * `aprill` was taught as `april`, `esmaspäev` as `monday`, `jaanipäev` as
 * `midsummer Day`, `mina` as `i`, and `Eesti` came out as `eesti`, which is a
 * different word: the language rather than the country, which is the very
 * fault `lib/estonian/answer.ts` has a comment about, fixed in the marker and
 * never in the builder standing beside it. `pos` is required rather than
 * optional for the reason `NounStems.illSgShort` is: a caller that has not
 * thought about this quietly mis-teaches a word, and it looks exactly like a
 * word whose gloss was written in lower case.
 *
 * AND A STRING HOLDING SEVERAL ANSWERS IS SEVERAL PHRASES. This read the
 * first character of the whole string and the mark at the very end of it, so
 * a gloss that is three phrases came out with one of them lowered and the
 * other two shouting: `palun` is glossed `Please / You're welcome / Here you
 * are` and a learner met it on the ladder as `please / You're welcome / Here
 * you are`, which reads as a rendering fault rather than as three ways of
 * saying it. `Sorry! / Excuse me!` was worse, since the mark it dropped was
 * the one at the end and the one it kept was in the middle. Each part is a
 * phrase and each is cleaned as one. `prisma/repair.ts` had worked this out
 * for a card's back and kept the splitting to itself, which is two answers to
 * one question with the copy in the busier file being the one that had not
 * learned; it reads this now.
 *
 * NEVER THE COMMA. A comma separates the senses of one gloss, and a sense past
 * the first is not a new sentence: `vist` is `probably, I think` and `bemar`
 * is `BMW, Beamer`. There is nothing there to lower even on a phrase.
 */
export function plainPhrase(text: string, pos: string | null | undefined): string {
  if (!isPhrase(pos)) return text;
  return text.split(PARTS).map(onePhrase).join(PARTS);
}

function onePhrase(text: string): string {
  const trimmed = text.replace(/!+\s*$/, "").trimEnd();
  if (trimmed.length === 0 || ALWAYS_CAPITAL.test(trimmed)) return trimmed;
  return trimmed[0]!.toLocaleLowerCase("et") + trimmed.slice(1);
}

/**
 * What a word's English says when nothing has supplied one yet.
 *
 * An instruction rather than a marker, because the person reading it is the
 * person who can fix it. It lives here rather than beside the lookup that
 * writes it, since a scanned page now writes it too, and two spellings of the
 * same gap is how `isPlaceholder` starts missing one of them.
 */
export const NEEDS_TRANSLATION = `${NO_VALUE} · add a translation`;

/**
 * A count and the thing it counts, agreeing with each other.
 *
 * `{n} cards` is written out at about thirty call sites and almost every one
 * of them says "1 cards" when the number is one. Most are unreachable at one
 * and a handful are not, which is why this was worth finding rather than
 * assuming: a learner on their first evening with a single card due reads
 * "All 1 cards are scheduled for later", the last screen of first run offers
 * "roughly 1 weeks to work through" on the fastest setting, and the one that
 * matters most is outside the app entirely, since the report an employer
 * reads says "1 people have too little history to place yet".
 *
 * A learner forgives a rough edge in a game. They do not forgive one in the
 * sentence a machine is using to describe them to somebody else, and this app
 * is otherwise careful enough with its English that the one ungrammatical
 * line is the one a reader notices.
 *
 * English only, which is what keeps this small: the plural of an Estonian noun
 * is a case form and comes from the dictionary (ADR-005), never from a rule
 * written here. Everything this is given is an English noun the app itself
 * wrote. The irregular ones are passed in rather than guessed at, because a
 * rule that turns "person" into "persons" is worse than no rule.
 */
export function counted(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The noun alone, for a sentence that puts the number somewhere else. */
export function nounFor(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

/**
 * A list read the way a person reads one aloud, with "and" before the last
 * item rather than another comma.
 *
 * `practises(scene).join(", ")` had two callers and both had the same fault:
 * a plain comma join turned two items into something that reads as one, "a
 * word off your card, the polite you", which looks like the second half is
 * describing the first, as though the card itself were the polite you. "and"
 * before the last item is what a sentence needs to say two separate things
 * are both required.
 */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * A small count said as a word, the way the prose around it counts.
 *
 * Five files kept a table of their own, reaching three, seven, ten and
 * fourteen, so the shield letter wrote "4 shields" where the evening letter
 * wrote "four", and a count past the end of one table fell back to a digit
 * that its neighbour would have spelled. Through twenty, then digits, which is
 * as far as any caller has needed and far enough that nothing it counts is
 * read out as a string of words.
 */
const SPELLED = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
] as const;

export function spelledCount(n: number): string {
  return (Number.isInteger(n) && n >= 0 ? SPELLED[n] : undefined) ?? String(n);
}

/**
 * The same count opening a sentence, which is where half of them stood: "two
 * left in the bank." and "three days of the last seven." went out lowercase,
 * the second as a letter's heading and one of them as a subject line.
 */
export function SpelledCount(n: number): string {
  const word = spelledCount(n);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * The same reading, for a list of alternatives rather than a list of
 * requirements: an errand's `where` is a set of places any one of which
 * would do, and joined on `joinWithAnd` it reads as a place you would have
 * to visit all of. "Work, a party" is two options; "Work and a party" is an
 * itinerary.
 */
export function joinWithOr(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

/**
 * What the three sentence-building screens say about a word order.
 *
 * One table because there are three of them, and they had drifted before this
 * existed: the lesson said "Not the order Estonian uses here", the round said
 * "Not the order Estonian uses. It goes:" and the examination said "That is
 * not the order the writer chose." The last one was the honest wording of a
 * marking that was wrong: the order the writer chose is one Estonian sentence
 * rather than the only one, and a learner who rebuilt `Muidugi tuleb ette
 * näpukaid` as `Muidugi tuleb näpukaid ette` was told their own Estonian was
 * a mistake.
 *
 * `ORDER_VARIANT` is the sentence that fault is worth: it is right, it is
 * marked right, and the recorded order is shown under it as a fact about the
 * recording rather than as a correction. `lib/estonian/wordOrder.ts` decides
 * which is which.
 *
 * **None of the three says what Estonian allows, because none of them knows.**
 * The first wording of this kept the old claim and read "Not an order Estonian
 * uses here", which is the very sentence that was reported, and the rule
 * behind it checks exactly one thing: whether a verb particle moved. Its own
 * header lists what it refuses and knows to be ordinary Estonian, `Ta pani ära
 * raamatu` among them, so on those answers the app was telling a learner their
 * Estonian is wrong while the module doing the marking said in writing that it
 * is not. What the app does know is which order the writer used, so that is
 * what all three notes talk about now, and being right stays a matter for the
 * mark rather than for the sentence.
 *
 * **And each one is a whole sentence rather than a lead-in.** They ended in a
 * colon, which reads as it should on the two screens that print the recording
 * directly underneath and as a dangling colon on the examination's result,
 * where the answer is printed in the row *above* the note. A note that only
 * parses in one layout is a note the next screen renders wrong.
 */
export const ORDER_EXACT = "That is the sentence.";
export const ORDER_WRONG = "That is not the order the writer used.";

/**
 * What is said about an order Estonian allows that the writer did not choose.
 *
 * It names the word, because that is what the person who reported this asked
 * for: a disclaimer that technically it goes with `ette` earlier rather than
 * at the end, and that both are said. A learner who is told only that "the
 * writer put it this way" has to diff two sentences to find out what the
 * difference was, on a screen they are about to move on from.
 *
 * **Which way it went is a parameter rather than a word**, and that is a
 * correction. `earlier` was written into the sentence while the particle was
 * the only thing that moved, because a particle is accepted at the end of its
 * clause and so always sits further forward in the recording. A time adverb
 * goes both ways: somebody who rebuilds `Ma loen raamatut täna` as `Täna ma
 * loen raamatut` has moved the word forward, and telling them the writer put
 * it earlier is the one claim on that screen a learner can check and find
 * wrong.
 *
 * Null falls back to the sentence without the word, which is what a caller
 * with no reading of the order has.
 */
export function orderVariantNote(moved: string | null, writerPut: "earlier" | "later" | null): string {
  if (!moved || !writerPut) return "That works. The writer put it another way.";
  return `That works. The writer put ${moved} ${writerPut}.`;
}

/**
 * The longest a line of small type may be before it stops being a caption.
 *
 * 110 characters is about a line and a half on a phone. Anything longer is a
 * real explanation with two honest homes: `components/Explain.tsx`, which is a
 * disclosure and takes no room until somebody asks, or body type, which
 * usually means saying it shorter. What it does not cap is prose in the body
 * of a screen, a grammar explanation or a policy page; a screen whose subject
 * is an explanation is allowed to explain, at a size somebody can read.
 *
 * Out here rather than inside the sweep that applies it, because it is applied
 * twice now. `readerCopy.test.ts` holds every literal `text-xs` element in the
 * tree to it, and the invariant suite holds the email panel's descriptions to
 * it as well: that panel interpolates its small print out of a table, which is
 * the residual the sweep names and cannot read, and four of its lines shipped
 * at up to 155 characters with the sweep green. Two copies of 110 is how the
 * second one quietly becomes 140.
 */
export const CAPTION_MAX = 110;

/**
 * WHAT A PRESS SAYS WHEN THE SERVER NEVER ANSWERED IT.
 *
 * A Server Action does not return a refusal when the network is gone, the
 * deployment is restarting or the tab has been asleep: it throws. Uncaught
 * inside a transition that rejection renders the error page in place of the
 * screen, which was measured on Settings with the plug pulled. So every call
 * catches it, puts back whatever it changed on the screen, and where there is
 * room for a sentence says this one. One wording, because forty screens each
 * explaining a dropped connection their own way is forty chances to blame the
 * learner for it.
 */
export const NOT_REACHED = "That did not reach the server. Try it again in a moment.";
