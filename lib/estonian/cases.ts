import type { CaseKey } from "./types";

export interface CaseSpec {
  readonly key: CaseKey;
  /** English grammatical name. */
  readonly en: string;
  /** Estonian grammatical name, as used in class. */
  readonly et: string;
  /**
   * The question a *person or an animal* answers with this case: `kellega?`.
   *
   * Estonian has two interrogative pronouns and they decline alike through all
   * fourteen cases: `kes` for somebody, `mis` for something. Which one a word
   * takes is a fact about the word, and the app was asking every word with the
   * `mis` one: `hobune → millega?` about an animal, `õpetaja → millesse?`
   * about a person. That is the first thing anybody learning Estonian is
   * taught to keep apart.
   */
  readonly asksPerson: string;
  /** What `asksPerson` is asking, in English: `kellega?` is "with whom?". */
  readonly asksPersonEn: string;
  /** The question a thing answers: `millega?`. */
  readonly asksThing: string;
  /** What `asksThing` is asking, in English: `millega?` is "with what?". */
  readonly asksThingEn: string;
  /**
   * The place adverb this case answers, where it has one, and `null` otherwise.
   *
   * SPLIT OFF BECAUSE IT CANNOT ASK ABOUT ONE CASE. `kus?` is answered by the
   * seesütlev and by the alalütlev, `kuhu?` by the sisseütlev and by the
   * alaleütlev, `kust?` by the seestütlev and by the alaltütlev: each covers a
   * pair, one from each of the two local sets. That is why `caseQuestionFor`
   * leaves it off a card. `tuba → milles? kus?` prints a question a learner
   * can answer correctly with `toal` and be marked wrong for, because the card
   * wanted the other case the adverb names.
   *
   * It stays part of the case's *name*, which is what a class writes on the
   * board and what `question` below joins, because there the pair is the point.
   */
  readonly asksWhere: string | null;
  /** What `asksWhere` is asking, in English, and `null` in step with it. */
  readonly asksWhereEn: string | null;
  /**
   * The case's own name: both interrogatives, and the adverb where it has one.
   *
   * Derived rather than typed, which is what stopped the two halves of this
   * table disagreeing. The first three rows named both pronouns (`kes? mis?`)
   * and the other eleven named only `mille-`, so a screen printing a case's
   * question said something true of every word for three cases and something
   * true of half the dictionary for the rest.
   */
  readonly question: string;
  /** The same name in English, joined the same way: "in whom? what is it in? where?" */
  readonly questionEn: string;
  /**
   * The short reading, for a label with no word in front of it to decide with.
   *
   * `questionEn` is the case's whole *name* and runs to three questions, which
   * is right on the reference page beside the Estonian name it translates and
   * is a mouthful inside a sentence: "toas is the seesütlev (in whom? what is
   * it in? where?) of tuba" is a note nobody finishes. This is the `mis` series
   * and the place adverb, which is what `cases.ts` printed for eleven of the
   * fourteen before `asksPerson` existed at all.
   *
   * It is deliberately not `caseQuestionFor`'s job. That function knows which
   * word the question is about and picks the pronoun to match; this is for the
   * places that hold a spelling rather than a subject, a search result saying
   * which form was typed and a chip under a grammar heading. Where the word is
   * known, ask `caseQuestionEnglishFor` instead.
   */
  readonly asksEn: string;
  /** Suffix added to the genitive stem. Empty for the three principal parts. */
  readonly suffix: string;
  /** True when the form must be stored, not derived. */
  readonly principal: boolean;
  readonly gloss: string;
}

/** A row of the table below: everything a case is, bar its assembled name. */
type CaseRow = Omit<CaseSpec, "question" | "questionEn" | "asksEn">;

/**
 * The 14 Estonian cases in their traditional order.
 *
 * The first three are principal parts — unpredictable, and stored.
 * The remaining eleven are regular suffixes on the genitive stem, which is the
 * single most motivating fact for a beginner: learn the genitive, get eleven cases.
 *
 * EVERY QUESTION WORD CARRIES WHAT IT IS ASKING, IN ENGLISH.
 *
 * `kus?` is how this language names a case and it is also four letters an
 * English speaker cannot cash in. The app printed the Estonian question as the
 * identity of a case on every screen that names one, which is right, and then
 * printed the Latin name beside it as the only thing in English, which is
 * useless: somebody who does not already know what `milles?` asks is not
 * helped by being told it is the inessive. A learner reported exactly that,
 * looking at a table of fourteen rows where every English word on it was a
 * Latin term. The reading is what they needed and the app had never had one.
 *
 * So the question leads in both languages and the Latin name is a footnote on
 * the reference page for the ending, which is the one place somebody reading
 * an English grammar has to be able to find their way in from.
 *
 * Three rules shape the wording, and they are why the readings are not all the
 * same shape:
 *
 * 1. **It is a question somebody would actually say**, so the preposition
 *    strands where English strands it. "What is it in?" rather than "in what?",
 *    which is a grammar book clearing its throat.
 * 2. **The middle of each local trio is the long one**, because that is the
 *    static case and the other two are arrows: "into what?", "what is it in?",
 *    "out of what?" mirror "where to?", "where?", "where from?" exactly.
 * 3. **Nothing here is Estonian and nothing inflects the learner's word.** This
 *    is authored English about a question word, which is the latitude
 *    `lib/estonian/grammar.ts` and `plainAsk.ts` already take.
 *
 * A question word that occurs twice reads the same both times, which is
 * asserted: `kuhu?` is "where to?" on the sisseütlev and on the alaleütlev,
 * and two readings of one word would be two answers to one question.
 */
const ROWS: readonly CaseRow[] = [
  { key: "NOMINATIVE",  en: "Nominative",  et: "nimetav",    asksPerson: "kes?",      asksPersonEn: "who?",           asksThing: "mis?",      asksThingEn: "what?",                 asksWhere: null,    asksWhereEn: null,           suffix: "",    principal: true,  gloss: "the book" },
  { key: "GENITIVE",    en: "Genitive",    et: "omastav",    asksPerson: "kelle?",    asksPersonEn: "whose?",         asksThing: "mille?",    asksThingEn: "of what?",              asksWhere: null,    asksWhereEn: null,           suffix: "",    principal: true,  gloss: "of the book" },
  { key: "PARTITIVE",   en: "Partitive",   et: "osastav",    asksPerson: "keda?",     asksPersonEn: "whom?",          asksThing: "mida?",     asksThingEn: "what? (some of it)", asksWhere: null,    asksWhereEn: null,           suffix: "",    principal: true,  gloss: "some of the book" },
  { key: "ILLATIVE",    en: "Illative",    et: "sisseütlev", asksPerson: "kellesse?", asksPersonEn: "into whom?",     asksThing: "millesse?", asksThingEn: "into what?",            asksWhere: "kuhu?", asksWhereEn: "where to?",    suffix: "sse", principal: false, gloss: "into the book" },
  { key: "INESSIVE",    en: "Inessive",    et: "seesütlev",  asksPerson: "kelles?",   asksPersonEn: "in whom?",       asksThing: "milles?",   asksThingEn: "what is it in?",        asksWhere: "kus?",  asksWhereEn: "where?",       suffix: "s",   principal: false, gloss: "in the book" },
  { key: "ELATIVE",     en: "Elative",     et: "seestütlev", asksPerson: "kellest?",  asksPersonEn: "about whom?",    asksThing: "millest?",  asksThingEn: "out of what?",          asksWhere: "kust?", asksWhereEn: "where from?",  suffix: "st",  principal: false, gloss: "out of the book" },
  { key: "ALLATIVE",    en: "Allative",    et: "alaleütlev", asksPerson: "kellele?",  asksPersonEn: "to whom?",       asksThing: "millele?",  asksThingEn: "onto what?",            asksWhere: "kuhu?", asksWhereEn: "where to?",    suffix: "le",  principal: false, gloss: "onto the book" },
  { key: "ADESSIVE",    en: "Adessive",    et: "alalütlev",  asksPerson: "kellel?",   asksPersonEn: "who has it?",    asksThing: "millel?",   asksThingEn: "what is it on?",        asksWhere: "kus?",  asksWhereEn: "where?",       suffix: "l",   principal: false, gloss: "on the book" },
  { key: "ABLATIVE",    en: "Ablative",    et: "alaltütlev", asksPerson: "kellelt?",  asksPersonEn: "from whom?",     asksThing: "millelt?",  asksThingEn: "off what?",             asksWhere: "kust?", asksWhereEn: "where from?",  suffix: "lt",  principal: false, gloss: "off the book" },
  { key: "TRANSLATIVE", en: "Translative", et: "saav",       asksPerson: "kelleks?",  asksPersonEn: "becoming who?",  asksThing: "milleks?",  asksThingEn: "becoming what?",        asksWhere: null,    asksWhereEn: null,           suffix: "ks",  principal: false, gloss: "becoming a book" },
  { key: "TERMINATIVE", en: "Terminative", et: "rajav",      asksPerson: "kelleni?",  asksPersonEn: "up to whom?",    asksThing: "milleni?",  asksThingEn: "up to what?",           asksWhere: null,    asksWhereEn: null,           suffix: "ni",  principal: false, gloss: "up to the book" },
  { key: "ESSIVE",      en: "Essive",      et: "olev",       asksPerson: "kellena?",  asksPersonEn: "as who?",        asksThing: "millena?",  asksThingEn: "what would it be as?",  asksWhere: null,    asksWhereEn: null,           suffix: "na",  principal: false, gloss: "as a book" },
  { key: "ABESSIVE",    en: "Abessive",    et: "ilmaütlev",  asksPerson: "kelleta?",  asksPersonEn: "without whom?",  asksThing: "milleta?",  asksThingEn: "without what?",         asksWhere: null,    asksWhereEn: null,           suffix: "ta",  principal: false, gloss: "without the book" },
  { key: "COMITATIVE",  en: "Comitative",  et: "kaasaütlev", asksPerson: "kellega?",  asksPersonEn: "with whom?",     asksThing: "millega?",  asksThingEn: "with what?",            asksWhere: null,    asksWhereEn: null,           suffix: "ga",  principal: false, gloss: "with the book" },
] as const;

export const CASES: readonly CaseSpec[] = ROWS.map((row) => ({
  ...row,
  question: [row.asksPerson, row.asksThing, row.asksWhere].filter(Boolean).join(" "),
  questionEn: [row.asksPersonEn, row.asksThingEn, row.asksWhereEn].filter(Boolean).join(" "),
  asksEn: [row.asksThingEn, row.asksWhereEn].filter(Boolean).join(" "),
}));

/**
 * WHAT EACH ESTONIAN QUESTION WORD IS ASKING, KEYED ON THE WORD.
 *
 * Built from the rows above rather than typed a second time, which is what
 * makes "one table" true rather than aspirational: the reading of `kuhu?` is a
 * fact about `kuhu?` and not about whichever of the two cases named it.
 *
 * Keyed on the word so a caller holding a question *string* can read it, which
 * most of them are: `caseQuestionFor` returns one of three words depending on
 * what the dictionary knows about the word on the card, `CaseSpec.question`
 * joins all three, and the exam and the quest carry the string down to a
 * screen with no spec beside it. One lookup answers every one of them.
 */
const ENGLISH_FOR_QUESTION: Readonly<Record<string, string>> = Object.fromEntries(
  ROWS.flatMap((row) => {
    const pairs: [string, string][] = [
      [row.asksPerson, row.asksPersonEn],
      [row.asksThing, row.asksThingEn],
    ];
    if (row.asksWhere && row.asksWhereEn) pairs.push([row.asksWhere, row.asksWhereEn]);
    return pairs;
  }),
);

/** Every question word the table knows, for the tests. */
export const QUESTION_WORDS: readonly string[] = Object.keys(ENGLISH_FOR_QUESTION);

/**
 * What a question is asking, in English, for any question this table can print.
 *
 * Takes a whole question rather than one word, because that is what a screen
 * holds: `kelles? milles? kus?` is the seesütlev's own name and comes back as
 * "in whom? what is it in? where?". A word it does not know is left out rather
 * than guessed at, and a question it knows nothing about at all returns null,
 * which every caller renders as the Estonian on its own exactly as before.
 */
export function questionInEnglish(question: string | null | undefined): string | null {
  if (!question) return null;
  const read = question
    .trim()
    .split(/\s+/)
    .map((word) => ENGLISH_FOR_QUESTION[word])
    .filter((x): x is string => Boolean(x));
  return read.length > 0 ? read.join(" ") : null;
}

/**
 * How a case is named when it is one of several to choose between.
 *
 * The Estonian name and the question, which is the pair a class hears together
 * and the pair that lets somebody actually pick. A list of Latin names asks an
 * English speaker to remember a translation of a translation; the question is
 * the thing they will hear in a shop, and the reading is what tells them what
 * it means the first time they meet it.
 */
export function caseOptionLabel(spec: CaseSpec): string {
  return `${spec.et} · ${spec.question}`;
}

export function caseByKey(key: string): CaseSpec | undefined {
  return CASES.find((c) => c.key === key);
}
