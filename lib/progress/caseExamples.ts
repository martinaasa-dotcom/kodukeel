import { prisma } from "@/lib/db";
import { caseFits } from "@/lib/estonian/caseQuestion";
import { parseExamples, sentenceContaining } from "@/lib/dict/examples";
import { sentenceReach } from "@/lib/dict/facts";
import { plainerFirst, type PlainReach } from "@/lib/dict/plainness";
import { caseAnswer, stemsFrom } from "@/lib/estonian/derive";
import { caseFromMorphCode, numberFromMorphCode } from "@/lib/estonian/morph";
import { caseIndex, readCase } from "@/lib/estonian/whichCase";
import type { CaseKey } from "@/lib/estonian/types";

/**
 * Real words in one case, for the grammar reference.
 *
 * The reference itself (`lib/estonian/grammar.ts`) is English prose and holds no
 * Estonian at all. Everything Estonian on that page comes from here, and every
 * value has a provenance the page prints next to it:
 *
 * - `EKILEX` — the form as the Institute of the Estonian Language records it.
 * - `STORED` — a principal part from the seeded dictionary. Also authoritative.
 * - `DERIVED` — the regular ending on a stored genitive stem, which is the same
 *   arithmetic the dictionary entry shows and the same one the learner is being
 *   taught to do in their head.
 *
 * Nothing else is offered. A word with no genitive stem produces no example
 * rather than a guess (ADR-005).
 */
export interface CaseExample {
  lexemeId: string;
  lemma: string;
  translation: string;
  genitive: string | null;
  /** The word in this case, singular. One word: `sentenceContaining` matches it. */
  form: string;
  /**
   * The other form that is also right, for the screen to print beside it.
   *
   * Kept out of `form` on purpose. That one is matched against attested
   * sentences, and `tuppa / toasse` is not a word anybody wrote.
   */
  alsoRight: string | null;
  origin: "EKILEX" | "STORED" | "DERIVED";
  /** True when this word is in the learner's own deck. */
  inDeck: boolean;
  /** An attested sentence that actually contains one of the forms above. */
  sentence: { et: string; en: string | null } | null;
  /**
   * Which form that sentence contains, so the line under it names the word a
   * reader can actually see in it rather than the one the table led with.
   */
  sentenceForm: string | null;
  /**
   * The form in that sentence is spelled like no other case of this word.
   *
   * Estonian spells plenty of cases alike, and the short illative is the worst
   * of them: `Soome` is its own genitive and its own illative, so a sentence
   * carrying it illustrates the case only to somebody who already knows which
   * case it is in. That is fine on `/grammar/[caseKey]`, where six words are
   * listed and the reader is looking at the table; it is not fine on a screen
   * whose one job is showing what an ending *means*, which is what
   * `/grammar/build-a-word` asks for and what this field lets it prefer.
   *
   * `readCase` is the strict rule and is the same one that refuses to label a
   * gap-fill card: exactly one case is spelled that way, or nothing is claimed.
   */
  unmistakable: boolean;
}

const PRINCIPAL_FORM_TYPE: Partial<Record<CaseKey, string>> = {
  NOMINATIVE: "NOM_SG",
  GENITIVE: "GEN_SG",
  PARTITIVE: "PART_SG",
};

/** How many candidate words to pull before filtering down to the ones that work. */
const CANDIDATES = 60;

interface Candidate {
  id: string;
  lemma: string;
  translation: string;
  /** Which of the two local sets the word takes. See lib/estonian/caseQuestion.ts. */
  semanticTypes: string | null;
  /** The band the word sits at, for ranking its own sentences. See lib/dict/plainness.ts. */
  cefr: string | null;
  examples: string;
  forms: { formType: string; value: string; morphCode: string | null }[];
}

/**
 * The examples for one case. See `caseExamplesFor`, which this is one key of.
 */
export async function caseExamples(
  ownerId: string,
  key: CaseKey,
  limit = 6,
  within?: readonly string[],
): Promise<CaseExample[]> {
  return (await caseExamplesFor(ownerId, [key], limit, within)).get(key) ?? [];
}

/**
 * The same, for several cases at once, off one read of the candidate words.
 *
 * `/grammar/build-a-word` walks a learner through all fourteen in one sitting, and
 * asking the question above once per case is three queries fourteen times over
 * on a page somebody is waiting for. Which words are worth looking at does not
 * depend on the case: only the filtering and the ranking under it do, and both
 * are in memory. One reader rather than two, because a second copy of "which
 * words illustrate a case" is the fault this file's own header describes,
 * where the illative page led with a form nobody says.
 */
export async function caseExamplesFor(
  ownerId: string,
  keys: readonly CaseKey[],
  limit = 6,
  /**
   * The lemmas a module has taught, off the step's own address. With it the
   * deck read and the dictionary top-up both stay inside the list, so a case
   * page opened from an evening shows the ending on words the learner has
   * met rather than on whatever the deck or the dictionary lists first. See
   * `verbExamples`, which had the same hole and the same fix.
   */
  within?: readonly string[],
): Promise<Map<CaseKey, CaseExample[]>> {
  const scoped = within ? { lemma: { in: [...within] } } : {};
  const select = {
    id: true,
    lemma: true,
    translation: true,
    // Which of the two local sets this word takes, which is not in its
    // spelling: see lib/estonian/caseQuestion.ts.
    semanticTypes: true,
    // The band, which decides whether this word's sentences are ranked for a
    // beginner rather than by length. See lib/dict/plainness.ts.
    cefr: true,
    examples: true,
    forms: { select: { formType: true, value: true, morphCode: true } },
  } as const;

  /*
    The learner's own nouns first: a case is easier to believe in a word you
    are already studying than in whatever the dictionary happens to list first.

    Both of these are ordered, and neither was. This is a reference page a
    learner comes back to, and the six words on it were decided by the order
    Postgres returned rows in: `rank` below has four values and `sort` is
    stable, so ties keep whatever order arrived, and the top-up query was the
    only one of the three that said which order it wanted. It looked settled
    because a plan for the same rows usually is, and it is not a promise. The
    same shape as the dictionary leading with an arbitrary one of two entries,
    one page along.

    Oldest card first, because the words somebody has been studying longest are
    the ones they can read a new case off, and that order is then *kept*.

    Sorting the deck words by lemma afterwards was the first attempt and it
    reads badly, which is the sort of thing only looking at the page tells you:
    the six real words under `seesütlev` came out `aadress, aasta, abi,
    abikaasa, aastapäev, abielu`, six words from the top of the alphabet under a
    heading that says "words from your deck first". Deterministic, and it looks
    like a bug. Postgres does not return `IN (…)` in the order the ids were
    given, so keeping the deck's own order means putting it back by hand.

    The top-up below stays on cefr and lemma. That is the empty-deck case, where
    easiest-first is the right answer and there is no better order to preserve.
  */
  const deckIds = await prisma.card.findMany({
    where: { ownerId, suspended: false, lexemeId: { not: null }, lexeme: { pos: "NOUN", ...scoped } },
    distinct: ["lexemeId"],
    orderBy: [{ createdAt: "asc" }, { lexemeId: "asc" }, { id: "asc" }],
    take: CANDIDATES,
    select: { lexemeId: true },
  });
  const owned = deckIds.map((c) => c.lexemeId!).filter(Boolean);
  const deckOrder = new Map(owned.map((id, at) => [id, at]));

  const mine: Candidate[] = owned.length
    ? (await prisma.lexeme.findMany({ where: { id: { in: owned } }, select }))
      .sort((a, b) => (deckOrder.get(a.id) ?? 0) - (deckOrder.get(b.id) ?? 0))
    : [];

  // Topped up from the dictionary, easiest words first, so an empty deck still
  // gets a page worth reading on day one.
  const [rest, reach] = await Promise.all([
    prisma.lexeme.findMany({
      where: { pos: "NOUN", id: { notIn: owned.length ? owned : ["-"] }, ...scoped },
      orderBy: [{ cefr: "asc" }, { lemma: "asc" }, { id: "asc" }],
      take: CANDIDATES,
      select,
    }) as Promise<Candidate[]>,
    // And how a beginner's word orders its own sentences, asked beside the
    // top-up because the two do not need each other.
    sentenceReach(),
  ]);

  /*
    A WORD ONLY ILLUSTRATES A CASE IT ACTUALLY TAKES. The illative page led
    with `Inglismaa / Inglismaasse`, which is not how anybody says "to
    England": a place name in `-maa` uses the outside cases and the rule over
    a genitive stem cannot know that. The same is true of a person or an
    animal, which this page could not know either until the dictionary started
    carrying the Institute's own classification: the seesütlev page was
    illustrating itself with `hobuses`. See lib/estonian/caseQuestion.ts.
  */
  const fits = (key: CaseKey) => (lex: Candidate) => caseFits(key, {
    lemma: lex.lemma,
    semanticTypes: lex.semanticTypes,
    nomSg: lex.forms.find((f) => f.formType === "NOM_SG")?.value ?? null,
  });

  const out = new Map<CaseKey, CaseExample[]>();
  for (const key of keys) {
    const takes = fits(key);
    const built = [
      ...mine.filter(takes).map((lex) => toExample(lex, key, true, reach)),
      ...rest.filter(takes).map((lex) => toExample(lex, key, false, reach)),
    ].filter(isExample);

    // Deck words first, since a case is easier to believe in a word you are
    // already studying, and within each half the ones that can also be shown
    // inside a real sentence, because that is the row that teaches the most.
    const rank = (e: CaseExample) => (e.inDeck ? 0 : 2) + (e.sentence ? 0 : 1);
    out.set(key, built.sort((a, b) => rank(a) - rank(b)).slice(0, limit));
  }
  return out;
}

function isExample(value: CaseExample | null): value is CaseExample {
  return value !== null;
}

function toExample(
  lex: Candidate, key: CaseKey, inDeck: boolean, reach: PlainReach,
): CaseExample | null {
  const genitive = lex.forms.find((f) => f.formType === "GEN_SG")?.value ?? null;

  /*
    THE THREE PRINCIPAL PARTS ARE STORED SLOTS; THE OTHER ELEVEN ARE A QUESTION
    FOR `caseAnswer`.

    This walked its own precedence and got the illative wrong twice over.
    `PRINCIPAL_FORM_TYPE` listed only the nominative, genitive and partitive, so
    `ILL_SG_SHORT` was never consulted; and the Ekilex lookup above it takes
    `SgIll`, the long form, which then beat the short one sitting in the same
    form list. The grammar reference prints its examples with a provenance
    label, so it was showing `toasse` under a tag saying a lexicographer wrote
    it down, which is the worst version of this fault: right about the source
    and wrong about the word.
  */
  const principalType = PRINCIPAL_FORM_TYPE[key];
  const retrieved = principalType
    ? lex.forms.find(
        (f) => caseFromMorphCode(f.morphCode) === key && numberFromMorphCode(f.morphCode) === "SINGULAR",
      )
    : undefined;
  const principal = principalType
    ? lex.forms.find((f) => f.formType === principalType)?.value
    : undefined;

  const stems = stemsFrom(lex.forms);
  const answer = principalType ? null : caseAnswer(stems, key);
  const form = retrieved?.value ?? principal ?? answer?.value;
  if (!form) return null;

  const origin: CaseExample["origin"] =
    retrieved ? "EKILEX" : principal ? "STORED" : (answer?.origin ?? "DERIVED");

  /*
    THE SENTENCE IS LOOKED FOR UNDER EITHER FORM.

    A lexicographer writing a sentence about going into a room may have used
    `tuppa` or `toasse`, and the card should find its example either way. It
    asks for the form it leads with first, so where both appear in the
    dictionary the sentence shown is the one using the form printed above it.
  */
  const alsoRight = principalType ? null : answer?.alsoRight ?? null;
  const examples = parseExamples(lex.examples);
  const second = alsoRight && alsoRight !== form ? alsoRight : null;
  // Plainest first where the word is a beginner's, so the reference shows the
  // case in a sentence they can read. See lib/dict/plainness.ts.
  const plainest = plainerFirst(lex.cefr, reach);
  const lead = sentenceContaining(examples, form, plainest);
  const found = lead ?? (second ? sentenceContaining(examples, second, plainest) : null);

  const shown = found ? (lead ? form : second) : null;
  const verdict = shown ? readCase(caseIndex(stems), shown) : null;

  return {
    lexemeId: lex.id,
    lemma: lex.lemma,
    translation: lex.translation,
    genitive,
    form,
    alsoRight: second,
    origin,
    inDeck,
    sentence: toSentence(found),
    sentenceForm: shown,
    unmistakable: verdict?.kind === "one" && verdict.key === key,
  };
}

function toSentence(example: { et: string; en?: string | null } | null) {
  return example ? { et: example.et, en: example.en ?? null } : null;
}
