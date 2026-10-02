import { sensesOf } from "@/lib/dict/synonyms";
import type { CaseSubject } from "./caseQuestion";
import { caseReading } from "./caseReading";
import { CASE_SHORT, sayShort } from "./plainAsk";
import type { CaseKey } from "./types";

/**
 * THE ASK WITH THE WORD IN IT: `Say “with the bird”`.
 *
 * A learner looked at `lind`, `millega?`, "How do you say this when something
 * is done with it?" and "kaasaütlev, with whom? with what?" and said the card
 * could be way simpler: the ending means "with", so ask for "with the bird".
 * That is this function. The case half is `caseReading`, the build-a-word
 * walk's own phrase out of the word's first English sense, so the ask and the
 * walkthrough cannot say two different things about one ending; where that
 * refuses (the osastav, a gloss too long to frame, a word the language does not
 * put in that case), the short phrase in `plainAsk.ts` answers instead.
 *
 * The verb half uses the gloss only where the English dictionary form reads
 * right ("I meet", "I would meet", "to meet"), plus the one regular -s rule and
 * the four verbs that break it for the third person. The past is never spelled,
 * since "met", "went" and "was" are the irregulars no rule reaches.
 *
 * Kept apart from `plainAsk.ts` because it reads the dictionary's sense table
 * (`lib/dict/synonyms.ts`), which no module that marks an answer may reach.
 * Screens read it; the marking never does.
 *
 * Pure: no React, no Prisma, and no Estonian.
 */

/** Verb slots with `%` where the English dictionary form goes. */
const VERB_FRAMES: Readonly<Record<string, string>> = {
  IndPrSg1: "I %",
  IndPrSg3: "he/she %s",
  IndPrPl1: "we %",
  IndPrPs_: "don't %",
  IndIpfSg1: "I %, but in the past",
  IndIpfSg3: "he/she %, but in the past",
  KndPrSg1: "I would %",
  ImpPrSg2: "%! (to a friend)",
  ImpPrPl2: "%! (politely)",
  Inf: "to %",
  PtsPrPs: "the one who %s",
};

/** "to be" is the verb every frame gets wrong, so it is written out. */
const BE: Readonly<Record<string, string>> = {
  IndPrSg1: "I am", IndPrSg3: "he/she is", IndPrPl1: "we are", IndPrPs_: "am not",
  KndPrSg1: "I would be", ImpPrSg2: "be! (to a friend)", ImpPrPl2: "be! (politely)", Inf: "to be",
};

const IRREGULAR_S: Readonly<Record<string, string>> = { have: "has", do: "does", go: "goes", be: "is" };

/** The regular English third person, on the first word of a verb phrase. */
function thirdPerson(phrase: string): string {
  const [head = "", ...rest] = phrase.split(" ");
  const inflected = IRREGULAR_S[head]
    ?? (/(?:s|x|z|ch|sh|o)$/.test(head) ? `${head}es`
      : /[^aeiou]y$/.test(head) ? `${head.slice(0, -1)}ies`
      : `${head}s`);
  return [inflected, ...rest].join(" ");
}

/** The first sense of a verb gloss, as its dictionary form, where short enough. */
function verbIn(gloss: string | null | undefined): string | null {
  if (!gloss) return null;
  const first = sensesOf(gloss)[0]?.of;
  if (!first || first.split(/\s+/).length > 3) return null;
  return first;
}

/**
 * A name keeps its capital and takes no article: "in America", not "in the
 * america". `caseReading` reads a gloss lowercased, which is right for a noun
 * and wrong for a place or a person's name.
 */
function properNoun(reading: string, gloss: string): string {
  const first = gloss.split(/[,;(]/)[0]?.trim() ?? "";
  if (!/^\p{Lu}/u.test(first)) return reading;
  const lower = first.toLowerCase();
  return reading.replace(new RegExp(`\\b(?:the|an?) ${lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), first)
    .replace(lower, first);
}

/** The three endings English says differently for a person ("to the man") and a thing ("onto the table"). */
const PERSON_SENSITIVE: ReadonlySet<string> = new Set(["ALLATIVE", "ADESSIVE", "ABLATIVE"]);
const UNKNOWN_SUBJECT: CaseSubject = { lemma: "", semanticTypes: null, nomSg: null };

/**
 * The phrase a card asks the learner to say, or null where the slot is not a
 * form (a question about meaning has nothing to add).
 *
 * Without the word's classification a person and a thing cannot be told apart,
 * so those three endings fall back to the short phrase rather than guess.
 */
export function sayPhrase(
  slot: string, gloss?: string | null, subject?: CaseSubject | null,
): string | null {
  if (slot in CASE_SHORT) {
    const known = subject ?? (PERSON_SENSITIVE.has(slot) ? null : UNKNOWN_SUBJECT);
    const reading = gloss && known ? caseReading(slot as CaseKey, gloss, known) : null;
    return (reading && gloss ? properNoun(reading, gloss) : reading) ?? sayShort(slot);
  }
  const frame = VERB_FRAMES[slot];
  const verb = verbIn(gloss);
  if (!frame || !verb) return sayShort(slot);
  if (verb === "be") return BE[slot] ?? sayShort(slot);
  return frame.includes("%s") ? frame.replace("%s", thirdPerson(verb)) : frame.replace("%", verb);
}

/** The whole instruction, ready to print: `Say “with the bird”`. */
export function sayLine(
  slot: string, gloss?: string | null, subject?: CaseSubject | null,
): string | null {
  const phrase = sayPhrase(slot, gloss, subject);
  return phrase ? `Say “${phrase}”` : null;
}
