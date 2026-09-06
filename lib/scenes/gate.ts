/**
 * The checks a composed line has to pass, and it is withheld whole when it
 * fails any of them.
 *
 * There were four and there are six. The two that arrived late were each a
 * line that reached a learner and should not have: `Kust sina nüüd tuleb?`,
 * which is inside the word list and is not Estonian, and `Kuhu sa ikka
 * lähed?` on the beat that asks where the learner is *now*, which is the
 * question they answered two turns ago. Vouching is about vocabulary, and
 * neither of those is a vocabulary fault.
 *
 * `docs/19-situations.md` §2. Never shown with a caveat: a caveat still puts a
 * wrong form in front of somebody trying to learn one, which is the same rule
 * `lib/tutor/verify.ts` follows about a grader's note. What the learner sees
 * instead is the fallback, which is somebody who did not catch what they said.
 *
 * THIS FILE IS THE ONE COPY. `npm run eval:scene` measured the rejection rate
 * §29 publishes, and it did it against an implementation living in the script,
 * which is a number measured on code that was not going to ship. The script
 * reads this now, so the figure and the gate are the same thing. That is the
 * argument `PROVIDER_KEY_ENV` makes about itself: a list that lives in a script
 * measures the script.
 *
 * Everything the checks need comes in as data, because the eval builds it from
 * `prisma/data/expanded.json` and the app builds it from the database, and this
 * module may reach neither.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import type { CaseKey } from "@/lib/estonian/types";
import { PERSON_CODES, words, type Lexicon, type PersonCode } from "./lexicon";
import { MAX_WORDS, isQuestion } from "./retrieval";
import { QUESTION_SHAPE, type BeatSpec } from "./types";

/**
 * Which check withheld a line. A line can fail more than one.
 *
 * The list rather than a bare union, because `npm run eval:scene` prints one
 * line per check and printed a list of its own: the day a fifth check was
 * added the run looked exactly the same and said nothing about it.
 */
export const CHECKS = [
  "shape", "vouching", "register", "government", "facts", "agreement", "topic", "giveaway",
] as const;

export type Check = (typeof CHECKS)[number];

/** A word that demands a case of its complement, by every form it has. */
export interface GovernedWord {
  readonly lemma: string;
  readonly forms: ReadonlySet<string>;
  /** Every case its entry names, never only the primary. */
  readonly cases: ReadonlySet<CaseKey>;
}

export interface GateContext {
  /** The scene's closed word list. Vouching is against this, not the dictionary. */
  readonly lexicon: Lexicon;
  /** Every form of the course's question words, which stand in for a governed complement. */
  readonly questionWords?: ReadonlySet<string>;
  /** Forms of the pronoun this scene's register forbids. */
  readonly wrongRegister: ReadonlySet<string>;
  /**
   * The nominative of each personal pronoun, to the person a verb beside it
   * has to be in. `sa` and `sina` to `IndPrSg2`, and nothing else: an oblique
   * form is not a subject, so `sind` is deliberately absent and a line saying
   * `Kas ma saan sind aidata?` is a line this check has nothing to say about.
   *
   * Handed in rather than written here, like `wrongRegister` and for the same
   * reason: this module may not write Estonian, and which spellings are the
   * nominative of `mina` is the dictionary's answer (ADR-005).
   */
  readonly subjects?: ReadonlyMap<string, PersonCode>;
  /** The governed words the scene can see. */
  readonly governed: readonly GovernedWord[];
  /** Every case form of every nominal, so a token can be asked which case it is. */
  readonly caseOf: ReadonlyMap<string, ReadonlySet<CaseKey>>;
  /**
   * Every number this run was actually dealt, as it may be written.
   *
   * THE ONE THING VOUCHING CANNOT SEE. The four checks above are all about
   * words, and a number is not a word: `words()` drops it, the lexicon has
   * never held one, and a line reading "Kas kell 14:00 sobib?" on a card that
   * says 15:30 passes every one of them. That was survivable while composition
   * was the rung below `datumLine`, because a beat that names a value the card
   * dealt was answered off the card before a model was ever asked. It is not
   * survivable now that a model is asked first on every beat: a made-up time
   * is a fact about the run rather than a word out of scope, the learner is
   * being asked to agree to it, and no amount of vocabulary checking notices.
   *
   * So a digit run in a composed line has to be one the card dealt. Empty means
   * this run dealt no numbers, and then any digit at all is invented.
   */
  readonly dealt?: ReadonlySet<string>;
  /**
   * Every form of the beat's own topic words, where the caller has one.
   *
   * A LINE FOR A BEAT HAS TO BE ABOUT THE BEAT. Retrieval has asked this of a
   * recorded sentence since it was written (`onTopic`) and nothing asked it of
   * a composed one, so a model asked for "they ask where you are now" wrote
   * `Kuhu sa ikka lähed?`, which is grammatical, is inside the word list, and
   * is the question the learner answered two turns ago. On the screen that is
   * the app asking the same thing twice and marking the second answer wrong.
   *
   * Absent or empty means the caller has nothing to say about the topic, which
   * is how an aside is gated: it is a line about whatever the learner asked.
   */
  readonly topic?: ReadonlySet<string>;
  /**
   * Every spelling that would answer this beat (`answerForms`), where the
   * caller has one.
   *
   * A LINE MAY NOT HAND OVER THE FORM IT IS ABOUT TO ASK FOR, which is the
   * fault `npm run audit:questions` hunts on every card and which the bank's
   * own test has asked of a drafted line since it was written. Nothing asked
   * it of a line composed live, and a real run produced `Kas sa juba oled
   * poes?` on the beat whose whole job is getting the learner to say `poes`:
   * they copy it out, retrieve nothing, and the scheduler writes down a
   * recall.
   */
  readonly answers?: ReadonlySet<string>;
}

export interface Verdict {
  /** Empty when the line may be shown. */
  readonly failed: readonly Check[];
  /** The words vouching could not account for, named so a retry can be told. */
  readonly unknown: readonly string[];
}

/**
 * Whether the line states a number nobody dealt.
 *
 * The comparison is whole runs against whole runs, the same rule the marker
 * reads a learner's time by: `15` inside `2015` is not the hour, and a card
 * that dealt 15:30 must not have `15:30` matched by a line saying `15`. Both
 * spellings of a clock time count, since Estonian writes `14.30` as readily as
 * `14:30` and `props.ts` deals both.
 */
function invented(text: string, dealt: ReadonlySet<string> | undefined): boolean {
  const runs = text.match(/\d{1,2}[:.]\d{2}|\d+/g);
  if (!runs) return false;
  const said = dealt ?? new Set<string>();
  return runs.some((run) => !said.has(run));
}

export function passes(verdict: Verdict): boolean {
  return verdict.failed.length === 0;
}

/**
 * Runs them all and reports every failure rather than the first.
 *
 * All of them rather than short-circuiting, because §6 allows one retry with
 * the failing words named and a retry told about one problem out of two comes
 * back with the other.
 */
export function runGate(text: string, beat: BeatSpec, context: GateContext): Verdict {
  const failed: Check[] = [];
  const tokens = words(text);

  if (!shapeOk(text, tokens, beat)) failed.push("shape");

  /*
    VOUCHING IS AGAINST THE SCENE'S OWN LIST, and that distinction is the whole
    constraint. Vouching against the dictionary would pass any Estonian word in
    the language; vouching against a few hundred lemmas means the model is
    choosing inside a box, and a line reaching outside it is a line the learner
    has not been taught to read.
  */
  const unknown = tokens.filter((word) => !context.lexicon.forms.has(word));
  if (unknown.length > 0) failed.push("vouching");

  if (tokens.some((word) => context.wrongRegister.has(word))) failed.push("register");

  if (governmentSuspect(tokens, context)) failed.push("government");

  if (disagrees(text, context)) failed.push("agreement");

  /*
    ON TOPIC, where the caller says what the topic is. `some` rather than
    `every`, for the reason `onTopic` gives about a recorded sentence: a line
    is about its beat if it names the thing the beat is about, and everything
    else in it is the sentence around that.
  */
  if (context.topic && context.topic.size > 0 && !tokens.some((word) => context.topic!.has(word))) {
    failed.push("topic");
  }

  if (context.answers && tokens.some((word) => context.answers!.has(word))) failed.push("giveaway");

  /*
    A NUMBER IN THE LINE IS A CLAIM ABOUT THE RUN, so it has to be one the run
    made. Read off the raw text rather than off `tokens`, because the tokenizer
    exists to find Estonian words and drops digits on the way past, which is
    exactly why nothing here could see this before.
  */
  if (invented(text, context.dealt)) failed.push("facts");

  return { failed, unknown };
}

/**
 * WHETHER THE SUBJECT AND THE VERB ARE THE SAME PERSON.
 *
 * `Kust sina nüüd tuleb?` passed every other check on this page and reached a
 * learner: every word is in the scene's list, the register is right, the verb
 * governs nothing, and no number is claimed. It is also not Estonian. Vouching
 * asks whether a spelling is a form of a word the scene may use and has no way
 * of asking whether it is the *right* form, which is the one thing a beginner
 * reading the other side's line cannot check for themselves.
 *
 * The tables are the app's own: `Lexicon.persons` is `derivedVerbForms` over a
 * stored first person, which `npm run audit:verbs` checked against Ekilex on
 * 797 verbs, plus whatever Ekilex recorded for the verbs no rule reaches. So
 * nothing here knows any Estonian; it compares two spellings the dictionary
 * supplied.
 *
 * DRAWN AS WEAKLY AS THE GOVERNMENT CHECK, and for its reason. There is no
 * parser, so a line with two subjects is two clauses and nothing here can say
 * which verb belongs to which: it fires only on a line with **exactly one**
 * personal pronoun in the nominative, and only where no verb in the line can
 * agree with it. `Kas sina oled see, kes tuleb?` holds a verb that agrees and
 * one that does not, and it passes, which is right.
 */
export function disagrees(text: string, context: GateContext): boolean {
  const subjects = context.subjects;
  if (!subjects) return false;
  /*
    A CLAUSE AT A TIME, and the clause boundary is the comma. `Ma ei tea, kus
    see on.` puts a first-person subject and a third-person verb in one
    sentence and is exactly right: the verb belongs to the other clause, whose
    subject is `see`. Estonian writes that comma, so the weakest thing that is
    still a clause boundary is available without a parser, and a check reading
    the sentence whole refused a line the bank has held since it was drafted.
  */
  for (const clause of text.split(/[,;:]/)) {
    const lower = words(clause);
    const said = lower.filter((t) => subjects.has(t));
    if (said.length !== 1) continue;
    const wanted = subjects.get(said[0]!)!;

    let agrees = false;
    let person = false;
    for (const token of lower) {
      for (const table of context.lexicon.persons.values()) {
        for (const code of PERSON_CODES) {
          if (table.get(code)?.toLowerCase() !== token) continue;
          person = true;
          if (code === wanted) agrees = true;
        }
      }
    }
    if (person && !agrees) return true;
  }
  return false;
}

/**
 * One sentence, inside the word count, punctuated, no markdown, and the shape
 * the move asked for.
 *
 * A move of `ask` that comes back without a question mark did not do what it
 * was told, and a greeting phrased as a question is not a greeting.
 */
function shapeOk(text: string, tokens: readonly string[], beat: BeatSpec): boolean {
  const trimmed = text.trim();
  const sentences = trimmed.split(/[.!?]+\s+/).filter(Boolean).length;
  const shape = QUESTION_SHAPE[beat.move];
  return sentences === 1
    && /[.!?]"?$/.test(trimmed)
    && !/[*_`#[\]]/.test(text)
    && tokens.length > 0
    && tokens.length <= MAX_WORDS
    && !(shape === "required" && !isQuestion(text))
    && !(shape === "forbidden" && isQuestion(text));
}

/**
 * The government check, as weakly as it can be drawn and still be a check.
 *
 * There is no parser here, so nothing can say which noun is a verb's
 * complement, and the strict reading, that every noun must be in a governed
 * case, fires on any sentence carrying an adjunct, which is most of them. So
 * this asks the weakest thing that is still a check: a line holding a governed
 * word has to hold **at least one** nominal in a case that word governs. A line
 * with no governed word and a line with no nominal are both outside what it can
 * say, and it passes them.
 *
 * Measured before it shipped rather than reasoned about. `npm run eval:scene`
 * builds a labeled set out of attested lines and the same lines with one
 * nominal moved into a case the verb does not govern: it withholds 44.3% of
 * real errors and 8.3% of good lines over 494 pairs, so §2's condition is met.
 * A check that fires on honest output is a check somebody waives.
 */
export function governmentSuspect(tokens: readonly string[], context: GateContext): boolean {
  const lower = tokens.map((t) => t.toLowerCase());
  const word = context.governed.find((g) => lower.some((t) => g.forms.has(t)));
  if (!word) return false;

  /*
    A QUESTION WORD IS THE COMPLEMENT. `Kust sa tuled?` holds a governed verb
    and one nominal, the subject, and the case the verb governs is carried by
    `kust`; a check that wanted a noun in the elative beside it withheld the
    sentence a lexicographer recorded for `kuhu`, and every short question a
    friend on the phone asks. The question words are the course's own
    (`kusisonad`), handed in by the caller.
  */
  const questions = context.questionWords;
  if (questions && lower.some((t) => questions.has(t))) return false;

  /*
    AND A SUBJECT IS NOT A COMPLEMENT. The check was written to catch a noun in
    the wrong case after a verb, and it was firing on `See aeg ei sobi enam`,
    where the only nominals are the subject in the nominative and the verb's
    complement is simply not said. A nominal that can be read as a nominative
    is left out of the count, so the check asks its own question: is there a
    noun here in an oblique case the verb does not govern.
  */
  const nominals = lower.filter((t) => context.caseOf.has(t) && !word.forms.has(t));
  const governed = nominals.some((t) => [...(context.caseOf.get(t) ?? [])].some((c) => word.cases.has(c)));
  if (governed) return false;
  const oblique = nominals.filter((t) => !context.caseOf.get(t)?.has("NOMINATIVE"));
  return oblique.length > 0;
}
