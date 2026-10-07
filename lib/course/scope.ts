/**
 * WHAT A ROUND OPENED FROM THE MODULE MAY DRAW ON.
 *
 * A step of today's module opens the same screen a learner reaches from
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

import { programmeById, taughtThrough, grammarThrough, dayById, formsThrough } from "./index";
import { focusFrom } from "./focus";
import { readableSentence } from "./build";
import { BLANK, sentenceTiles } from "@/lib/estonian/cloze";
import { CASES } from "@/lib/estonian/cases";
import { conjugationSlotFromFront } from "@/lib/srs/slots";
import { isAppsChoice } from "@/lib/srs/sources";
import { caseFromFront } from "@/lib/copy/caseHint";
import { FORMS_STEP, READ_STEP, type CourseDay, type Programme } from "./types";

export interface ModuleScope {
  programme: Programme;
  day: CourseDay;
  /** Every lemma the ladder has taught through this day, in teaching order. */
  lemmas: readonly string[];
  /** The case pages read through this day, by key. A case is asked only after it is read. */
  cases: readonly string[];
  /** The topic pages read through this day, by id. */
  topics: readonly string[];
  /** The verbs whose past forms an evening has shown through this day (`DaySpec.forms`). */
  formsShown: readonly string[];
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
  return scopeFor(programme, day);
}

/**
 * The same scope for a caller that already holds the day.
 *
 * The course reading needs it: whether the closing step is finished turns on
 * how much the closing round still has to ask, and that is a question about
 * this scope rather than about any address. One constructor, so the round a
 * learner opens and the count the module keeps of it cannot disagree about
 * what the evening has taught.
 */
export function scopeFor(programme: Programme, day: CourseDay): ModuleScope {
  const grammar = grammarThrough(programme, day.index);
  return {
    programme, day, lemmas: taughtThrough(programme, day.index), ...grammar,
    formsShown: formsThrough(programme, day.index),
  };
}

/**
 * WHAT THE EVENINGS HAVE TAUGHT SO FAR, FOR A SCREEN THE MODULE DID NOT OPEN.
 *
 * `scopeFor` answers for a step of the evening, and a step may assume the
 * steps in front of it were walked: the closing review comes after the
 * reading, so it may ask today's case. A round somebody walks to from
 * Practice, or the daily review queue, assumes nothing. Read with the whole
 * evening credited, a learner who had met today's words and gone straight
 * to Practice was handed a "Case Sprint" in a case whose page was still
 * unread two steps further down the same evening, and a word still on the
 * ladder: a question about something they had not been taught, which is the
 * one thing this scope exists to stop.
 *
 * So the evening in progress counts only for what it has actually done. The
 * evenings before it count whole, since walking past a day is what finishing
 * it means (`dayReached`). Today's words count where the learner has met
 * them (`met`, read off the cards by the caller), today's page once the
 * reading is ticked and today's past forms once the forms step is. And the
 * learner's own words (`own`, every word this app did not choose) are in the
 * list too, ahead of the course's so a round leads with the module's recent
 * words: Review has always asked them (`reviewable`), and Practice drilling a
 * word somebody went and looked up is the same promise.
 *
 * `day` comes back trimmed the same way, because three readers take tonight
 * off it rather than off the lists (`recentLemmas`, `tonightsCase`,
 * `formsTonight`) and a case tonight has not read would otherwise lead a round.
 */
export function scopeSoFar(
  programme: Programme,
  day: CourseDay,
  done: ReadonlySet<string>,
  met: readonly string[],
  own: readonly string[] = [],
): ModuleScope {
  const before = day.index - 1;
  const read = done.has(READ_STEP);
  const shown = done.has(FORMS_STEP);
  const metSet = new Set(met);
  const tonight = day.words.filter((w) => metSet.has(w));
  const course = [...new Set([...taughtThrough(programme, before), ...tonight, ...met])];
  const courseSet = new Set(course);
  const lemmas = [...new Set(own.filter((w) => !courseSet.has(w))), ...course];
  const { grammar: _grammar, grammarCase: _case, forms: _forms, ...rest } = day;
  const trimmed: CourseDay = {
    ...rest,
    words: tonight,
    ...(read && day.grammar ? { grammar: day.grammar } : {}),
    ...(read && day.grammarCase ? { grammarCase: day.grammarCase } : {}),
    ...(shown && day.forms ? { forms: day.forms } : {}),
  };
  return {
    programme,
    day: trimmed,
    lemmas,
    ...grammarThrough(programme, read ? day.index : before),
    formsShown: formsThrough(programme, shown ? day.index : before),
  };
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
 * The case today's reading was about, or nothing.
 *
 * An evening that reads the elative and then plays a round spread evenly over
 * every case read since A2 began has read the page and practised something
 * else: the elative is one case in eight on the board, and the learner who
 * has just been told what `-st` means is asked it about once. So the case
 * rounds lead with this one inside the module, and the cases read before it
 * are still asked behind it, since a round about one case alone is a list of
 * one ending typed six times.
 */
export function tonightsCase(scope: ModuleScope | null): string | null {
  return scope?.day.grammarCase ?? null;
}

/** How much of a case round leads with today's case, where it can. */
export const TONIGHT_SHARE = 0.5;

/**
 * A round's order with today's items woven through the front of it: one of
 * today's, one of the rest, and so on until either runs out, so about half
 * the head of the round is today's case and the other half keeps the cases
 * before it alive. Order within each half is the caller's, so a round that
 * shuffled or ranked its pool keeps that.
 */
export function tonightFirst<T>(items: readonly T[], isTonight: (item: T) => boolean): T[] {
  const tonight = items.filter(isTonight);
  if (tonight.length === 0) return [...items];
  const rest = items.filter((item) => !isTonight(item));
  const out: T[] = [];
  for (let i = 0; i < Math.max(tonight.length, rest.length); i++) {
    if (i < tonight.length) out.push(tonight[i]!);
    if (i < rest.length) out.push(rest[i]!);
  }
  return out;
}

/**
 * How many of the most recently taught words a round inside the module leads
 * with: today's and roughly the last week of evenings at any level.
 */
export const RECENT_WORDS = 40;

/**
 * THE WORDS THE MODULE TAUGHT MOST RECENTLY, TODAY'S FIRST.
 *
 * A round the module deals is about tonight. Filled the way a round opened
 * from Practice is, due cards first and then whatever lapsed, a B1 evening's
 * Match put today's three new words on a board with `aitäh`, `palun` and
 * `tere hommikust`, because a learner standing at B1 holds a deck of A1
 * greetings that are always somewhere near due. So the round leads with these
 * and fills from the rest only once they run out.
 */
export function recentLemmas(scope: ModuleScope, n = RECENT_WORDS): string[] {
  /*
    Today's words named first rather than read off the end of `lemmas`,
    which keeps a word where it was first taught: `tuttav` is on an A1 evening
    and again on a B1 one, so read off the list alone the B1 evening's own
    word sat nine hundred places back.
  */
  return [...new Set([...scope.day.words, ...[...scope.lemmas].reverse()])].slice(0, n);
}

/**
 * Rows in the order their words were taught, most recent first, so a round
 * leads with tonight and works back. Rows whose word the list does not hold
 * keep their own order behind them.
 */
export function byRecency<T>(
  scope: ModuleScope, rows: readonly T[], lemmaOf: (row: T) => string | null | undefined,
): T[] {
  const rank = new Map(recentLemmas(scope, Number.MAX_SAFE_INTEGER).map((lemma, i) => [lemma, i]));
  const at = (row: T) => rank.get(lemmaOf(row) ?? "") ?? Number.MAX_SAFE_INTEGER;
  return rows.map((row, i) => ({ row, i })).sort((a, b) => at(a.row) - at(b.row) || a.i - b.i).map((x) => x.row);
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
 * THE PARTS OF A VERB NO RULE REACHES, WHICH ARE SHOWN VERB BY VERB FIRST.
 *
 * A verb form is asked inside the module only where the learner has been
 * shown it, and for the present, the negative, the conditional and the
 * singular imperative that is the page teaching the rule: an ending on the
 * stored first person, the same for every verb (`lib/estonian/conjugate.ts`).
 * The simple past and the polite imperative are not like that. `lugesin`,
 * `tahtsin` and `võtsin` each have to be learned for their own verb, and
 * `andke` and `minge` are in no rule at all, so reading the past-tense page
 * teaches none of them. `juhtuma → lihtminevik, ma` once reached a learner who
 * had never seen `juhtusin`, with nothing to work it out from.
 *
 * So these are asked for a verb only once an evening has shown that verb's
 * past (`DaySpec.forms`, the forms step), which is `scope.formsShown`, and
 * only once the page for the part is read too. A caller that cannot say which
 * verb a slot belongs to gets a no. Outside the module nothing changes.
 */
const LEARNED_PER_VERB: readonly string[] = ["IndIpf", "ImpPrPl"];

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
export function slotWithin(
  scope: ModuleScope | null, slot: string | null | undefined, lemma?: string | null,
): boolean {
  if (!scope || !slot) return true;
  if (scope.cases.includes(slot)) return true;
  if (LEARNED_PER_VERB.some((code) => slot.startsWith(code)) && !(lemma && scope.formsShown.includes(lemma))) {
    return false;
  }
  const verb = VERB_SLOT_PAGE.find((v) => slot.startsWith(v.opens));
  if (verb) {
    // The conditional is asked from B1, and the module's own table asks this
    // rather than keeping a copy: A2's request unit reads the page to soften a
    // request and is not asking anybody to conjugate it.
    if (verb.page === "conditional" && ["A1", "A2"].includes(scope.programme.level)) return false;
    return scope.topics.includes(verb.page) || (verb.also !== undefined && scope.topics.includes(verb.also));
  }
  if (/^[A-Z][a-z]+[A-Z]/.test(slot)) return false;
  return caseWithin(scope, isCaseKey(slot) ? slot : null);
}

/**
 * What today's forms step shows: the evening's own verbs, and whether the
 * polite imperative goes beside their past, which it does once the imperative
 * page has been read. One answer here, so the page and the gate above cannot
 * disagree about what the step put on the screen.
 */
export function formsTonight(scope: ModuleScope): { verbs: readonly string[]; polite: boolean } {
  return { verbs: scope.day.forms ?? [], polite: scope.topics.includes("imperative") };
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
  card: {
    cardType: string; targetCase: string | null; front: string; slot?: string | null;
    /** The word the card is about, which a verb's past is held to (`slotWithin`). */
    lexeme?: { lemma: string } | null;
  },
  spellings: ReadonlySet<string> | null,
): boolean {
  if (!scope) return true;
  if (card.cardType === "CASE_FORM" || card.cardType === "GRADATION") {
    // A case card always asks a case. One built before `targetCase` was
    // written names its case only on the front (`tool → allative`), and read
    // as no case at all it passed every gate: so the front is read, and a
    // case card nothing can place is refused rather than waved through.
    const caseKey = card.targetCase
      ?? (card.cardType === "GRADATION" ? "GENITIVE" : caseFromFront(card.front));
    if (!caseKey || !caseWithin(scope, caseKey)) return false;
  }
  // A verb card is about a part of the verb, and the past on the first
  // evening of A2 is three evenings before the page that teaches it.
  //
  // A card built before `Card.slot` existed carries no slot and names its part
  // on the front (`lugema → lihtminevik · ma`), which is the builder's own
  // label against a closed table. Read as no slot at all it passed whatever it
  // asked, so an old deck's past and conditional cards reached the first
  // evening of A2.
  if (
    card.cardType === "CONJUGATION"
    && !slotWithin(scope, card.slot ?? conjugationSlotFromFront(card.front), card.lexeme?.lemma)
  ) return false;
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

/**
 * WHETHER REVIEW MAY ASK THIS CARD AT ALL, FOR A LEARNER FOLLOWING THE MODULE.
 *
 * Review repeats what somebody has learned and never teaches anything new.
 * That was true of the new cards on the daily path and false of the due ones:
 * "what is due is due whatever taught it" let a deck built before the module
 * existed ask a beginner on the second evening of A1 for `tool` in the
 * alaleütlev, a case no evening had shown, under a Latin name nobody uses. It
 * was reported from exactly there, and the operator's call is written down
 * here so it is not re-litigated: a card is asked on Review only where the
 * module has taught what the card asks.
 *
 * Two questions. The word: a word this app chose (`APP_CHOSE`) is asked once
 * the module has taught it, and a word the learner went and got themselves is
 * theirs and needs no evening. The form: every card, whoever chose its word,
 * asks only a case whose page has been read, a part of a verb the module has
 * shown, and a sentence made of taught spellings, which is `cardWithin`. A
 * card held back keeps its schedule untouched and is asked the evening the
 * module reaches it; nothing is deleted.
 *
 * Null scope is a learner not following the module, and everything passes.
 */
export function reviewable(
  scope: ModuleScope | null,
  card: Parameters<typeof cardWithin>[1] & { source: string },
  spellings: ReadonlySet<string> | null,
): boolean {
  if (!scope) return true;
  if (isAppsChoice(card.source) && !(card.lexeme && taughtSet(scope).has(card.lexeme.lemma))) return false;
  return cardWithin(scope, card, spellings);
}

const TAUGHT = new WeakMap<readonly string[], ReadonlySet<string>>();
function taughtSet(scope: ModuleScope): ReadonlySet<string> {
  let set = TAUGHT.get(scope.lemmas);
  if (!set) {
    set = new Set(scope.lemmas);
    TAUGHT.set(scope.lemmas, set);
  }
  return set;
}
