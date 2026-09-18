/**
 * WHAT A ROUND OPENED FROM THE MODULE MAY DRAW ON.
 *
 * A step of tonight's module opens the same screen a learner reaches from
 * Practice, and that screen fills itself the way it always did: from the
 * deck, from the dictionary at the learner's band, from whatever the day's
 * puzzle is. Opened from Practice that is the learner's own difficulty to
 * pick. Opened from the module it is the module choosing for them, and on the
 * second evening of A1 it chose a conjugation table of verbs nobody had met
 * and a Sõnad word from the band above, to somebody holding eleven words.
 *
 * So a round the module opens is told what the module has taught, through the
 * one thing a screen can be told how it was reached by, which is its own
 * address (`focus.ts`). This is the pure half: the marker read back into the
 * programme and the day, and the day into the words the ladder has handed
 * over through that evening. The round's page narrows its own query to them.
 *
 * NOTHING IN IT IS TRUSTED AND NOTHING NEEDS TO BE. The marker is typed into
 * an address like everything else off the wire, and the worst a forged one
 * can do is narrow a round to a different slice of the course, which is the
 * learner choosing their own difficulty by a longer route. What a page may
 * *write* on the strength of it is still decided on the server against the
 * learner's own standing (`advanceCourseStep`), and this module reaches no
 * database.
 */

import { programmeById, taughtThrough, grammarThrough, dayById } from "./index";
import { focusFrom } from "./focus";
import { readableSentence } from "./build";
import { BLANK, sentenceTiles } from "@/lib/estonian/cloze";
import { CASES } from "@/lib/estonian/cases";
import type { CourseDay, Programme } from "./types";

export interface ModuleScope {
  programme: Programme;
  day: CourseDay;
  /** Every lemma the ladder has taught through this day, in teaching order. */
  lemmas: readonly string[];
  /** The case pages read through this day, by key. A case is asked only after it is read. */
  cases: readonly string[];
  /** The topic pages read through this day, by id. */
  topics: readonly string[];
}

type SearchParams = Record<string, string | string[] | undefined> | undefined;

/**
 * The module a screen was opened from, and what it has taught, or null for a
 * screen somebody walked to themselves.
 */
export function moduleScopeFrom(searchParams: SearchParams): ModuleScope | null {
  const focus = focusFrom(searchParams);
  if (!focus) return null;
  const programme = programmeById(focus.programmeId);
  const day = programme ? dayById(programme, focus.dayId) : undefined;
  if (!programme || !day) return null;
  const grammar = grammarThrough(programme, day.index);
  return { programme, day, lemmas: taughtThrough(programme, day.index), ...grammar };
}

/**
 * Whether a case may be asked inside the module: its page has been read.
 *
 * A card or a question that names no case is a question about a word and is
 * held to the taught list alone.
 */
export function caseWithin(scope: ModuleScope | null, caseKey: string | null | undefined): boolean {
  if (!scope || !caseKey) return true;
  return scope.cases.includes(caseKey);
}

/**
 * The page a verb slot waits for, by the opening of its morph code.
 *
 * `IndPr` is the present and the negative (`IndPrPs_`, `ei loe`), which the
 * negation page teaches and which the present's own page prints beside the
 * persons; `IndIpf` is the simple past, `KndPr` the conditional, `ImpPr` the
 * imperative. A prefix nobody has listed fails closed, which is the discipline
 * `isFiniteVerbCode` keeps one module over: a slot added to the table later
 * is admitted here deliberately rather than by arriving.
 */
const VERB_SLOT_PAGE: readonly { opens: string; page: string; also?: string }[] = [
  { opens: "IndPrPs", page: "negation", also: "present-tense" },
  { opens: "IndPr", page: "present-tense" },
  { opens: "IndIpf", page: "imperfect" },
  { opens: "KndPr", page: "conditional" },
  { opens: "ImpPr", page: "imperative" },
];

/**
 * Whether a slot may be asked inside the module: a case once its page has
 * been read, a part of a verb once the page teaching it has, and a slot that
 * is neither (production, recognition, a gap) on the taught list alone.
 *
 * The flash round read every slot through `caseWithin`, which answers about
 * cases and read a verb code as a case nobody had opened, so inside the module
 * a verb was asked for its dictionary form and nothing else, at every level.
 * Wrong the safe way, and still a B1 evening on a unit of verbs with no verb
 * asked in any person.
 */
export function slotWithin(scope: ModuleScope | null, slot: string | null | undefined): boolean {
  if (!scope || !slot) return true;
  if (scope.cases.includes(slot)) return true;
  const verb = VERB_SLOT_PAGE.find((v) => slot.startsWith(v.opens));
  if (verb) return scope.topics.includes(verb.page) || (verb.also !== undefined && scope.topics.includes(verb.also));
  if (/^[A-Z][a-z]+[A-Z]/.test(slot)) return false;
  return caseWithin(scope, isCaseKey(slot) ? slot : null);
}

const isCaseKey = (slot: string): boolean => CASES.some((c) => c.key === slot);

/**
 * Whether a card in the learner's deck may be asked inside the module.
 *
 * Three questions, in the order a card raises them: is it about a taught
 * word (the caller has already narrowed the query to those), is it about a
 * taught case, and, for a gap-fill, is the sentence around the gap made of
 * taught spellings. The last needs the course's forms, which are a fact about
 * the dictionary (`lib/dict/facts.ts`), so the caller hands them in.
 */
export function cardWithin(
  scope: ModuleScope | null,
  card: { cardType: string; targetCase: string | null; front: string },
  spellings: ReadonlySet<string> | null,
): boolean {
  if (!scope) return true;
  if (card.cardType === "CASE_FORM" || card.cardType === "GRADATION") {
    if (!caseWithin(scope, card.targetCase ?? (card.cardType === "GRADATION" ? "GENITIVE" : null))) return false;
  }
  if (card.cardType === "CLOZE" || card.cardType === "CASE_FORM" || card.cardType === "CONJUGATION") {
    // A sentence front, with the gap taken out. A bare front (`lemma → ask`)
    // has no sentence to check and passes.
    if (card.front.includes(BLANK)) {
      if (!spellings) return false;
      return sentenceTiles(card.front.replace(BLANK, " ")).every((t) => spellings.has(t.toLowerCase()));
    }
  }
  return true;
}

/** A sentence somebody can be dictated or asked to rebuild inside the module. */
export function sentenceWithin(scope: ModuleScope | null, spellings: ReadonlySet<string> | null) {
  return (sentence: string): boolean => {
    if (!scope) return true;
    if (!spellings) return false;
    return readableSentence(sentence, spellings);
  };
}

/**
 * The taught list as a `where` fragment, or nothing at all outside a module,
 * so a page can spread it into the query it already runs.
 */
export function lemmaFilter(scope: ModuleScope | null): { lemma: { in: string[] } } | Record<never, never> {
  return scope ? { lemma: { in: [...scope.lemmas] } } : {};
}
