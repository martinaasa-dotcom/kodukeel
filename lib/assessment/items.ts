import { CASES } from "@/lib/estonian/cases";
import { twinsOf } from "@/lib/estonian/gapForms";
import { buildCloze, ESTONIAN_WORD, mentions, naturalSentence, nominalOpener } from "@/lib/estonian/cloze";
import { caseAnswer, stemsFrom } from "@/lib/estonian/derive";
import { dictationWords } from "@/lib/estonian/dictation";
import { caseFromMorphCode, numberFromMorphCode, slotCodeOf } from "@/lib/estonian/morph";
import { plainAsk } from "@/lib/estonian/plainAsk";
import type { CaseKey } from "@/lib/estonian/types";
import { unitIntroducing } from "@/lib/collections/syllabus";
import { shuffle } from "@/lib/random/shuffle";
import {
  bandOf,
  differentMeaning,
  differentSentence,
  differentText,
  formNearness,
  glossNearness,
  glossOption,
  pickOptions,
  sentenceNamesTheAnswer,
  sentenceNearness,
  sentenceOption,
  type GlossOption,
} from "@/lib/questions/distractors";
import { BANDS, type Band, type ChoiceItem, type DictationItem, type Item, type SpeakItem, type WriteItem } from "./types";
import { SAME_SPELLING, sameSpelling } from "@/lib/copy/values";
import { heardIndex, meaningsHeard, type HeardIndex } from "./heard";
import { rng as seededRng } from "@/lib/random/seeded";

/**
 * Turning the dictionary into a placement test.
 *
 * Every question here is assembled out of material the dictionary already
 * holds: a lemma, a stored gloss, a principal part, a case computed from the
 * genitive stem by the app's own derivation, an example sentence a
 * lexicographer recorded. Nothing is written, nothing is inflected, nothing is
 * translated. That is the only way a test can be trusted to mark an answer,
 * and it is the same rule the writing exercise is built on: the correctness of
 * a form is decided by string comparison against an authoritative source before
 * anything else happens.
 *
 * It also means the test degrades honestly. The built-in dictionary carries no
 * example sentences, so with no Ekilex key there are no dictation items and no
 * sentence-meaning items, and the sections that survive say how many questions
 * they managed to ask. A thinner test reported as thin is useful; a thin test
 * reported as a full one is a lie about somebody's Estonian.
 *
 * Pure. The caller reads the rows; this only shapes them.
 */

export interface WordRow {
  id: string;
  lemma: string;
  translation: string;
  pos: string;
  cefr: string | null;
  government: string | null;
  forms: readonly { formType: string; value: string; morphCode?: string | null }[];
  examples: readonly { et: string; en?: string | null }[];
}

/** The harder of two bands, which is what a question costs to answer. */
function raise(a: Band, b: Band | undefined): Band {
  if (!b) return a;
  return BANDS.indexOf(a) >= BANDS.indexOf(b) ? a : b;
}

/**
 * The seeded generator, under the name this file and its tests already use.
 *
 * Seeded rather than `Math.random` so a test asserts on a fixed paper, and so
 * two learners handed the same dictionary on the same day do not sit an
 * identical test.
 *
 * A RE-EXPORT RATHER THAN A COPY, AND THE SEQUENCE DID NOT MOVE. This was the
 * fourth transcription of mulberry32 in the tree, byte for byte the same as
 * `rng`, which was checked over five seeds and two thousand draws each before
 * the body was deleted. It matters here more than anywhere: a paper is
 * addressed by its seed, so a generator that quietly diverged would set a
 * candidate one check and mark them against another.
 */
export { seededRng as mulberry32 };



/**
 * Every spelling of a word the dictionary can vouch for.
 *
 * The stored principal parts, whatever paradigm Ekilex returned, and the ten
 * regular cases the app computes off the genitive stem. Nothing here is
 * generated in the sense ADR-005 forbids: a derivation is a deterministic rule
 * over a form already stored, wrong the same way for every word that takes the
 * ending, where a model is wrong about one word unpredictably.
 */
function vouchedForms(word: WordRow): string[] {
  const out = new Set<string>([word.lemma, ...word.forms.map((f) => f.value)]);
  /*
    Every spelling, not the first one: a word with two illatives has both, and
    this set is what stops a distractor being drawn that is secretly the answer.
  */
  const stems = stemsFrom(word.forms);
  for (const spec of CASES) {
    for (const value of caseAnswer(stems, spec.key)?.accepted ?? []) out.add(value);
  }
  return [...out].filter((f) => f.trim());
}

/** Forms a lexicographer actually wrote down, as opposed to computed ones. */
function attestedForms(word: WordRow): Set<string> {
  return new Set([word.lemma, ...word.forms.map((f) => f.value)].map((f) => f.toLowerCase()));
}

/** A gloss with what a learner would otherwise eliminate it by. */
function glossFor(word: WordRow): GlossOption {
  return glossOption({
    text: word.translation,
    pos: word.pos,
    band: bandOf(word.cefr),
    theme: unitIntroducing(word.lemma, word.pos),
  });
}

function usableWords(words: readonly WordRow[]): WordRow[] {
  return words.filter((w) => w.lemma.trim() && w.translation.trim() && bandOf(w.cefr));
}

/**
 * A word means everything the dictionary says it means, not just the line
 * printed as the answer.
 *
 * "What does kallis mean" offered `expensive`, `beautiful`, `fast` and
 * `morning`, and the learner who chose `beautiful` had a case: `kallis` is
 * also what you call somebody you are fond of, so with no sentence around it
 * the question is asking which of two real senses the dictionary happened to
 * print. Nothing in the ranking could see that, because `differentMeaning`
 * compares one gloss against another and a sense the gloss does not mention is
 * invisible to it.
 *
 * What *is* visible is a second entry under the same lemma, and `@@unique` is
 * on `(lemma, pos)` so the dictionary holds plenty: `hall` is a noun meaning
 * frost and an adjective meaning gray, and offering "gray" as a wrong answer
 * to "what does hall mean" marks somebody wrong for knowing the word. So every
 * gloss the dictionary files under this lemma is treated as an answer, and
 * none of them can stand as a distractor.
 *
 * It does not reach a sense that no entry records, which is the `kallis` case
 * itself: that one is a gloss worth correcting rather than a rule worth
 * writing, and `npm run audit:glosses` and the report queue are the two ways
 * that happens. What this rules out is the half a rule can see.
 */
function meaningTest(
  word: WordRow,
  pool: readonly WordRow[],
  /** Meanings that were also on the screen or in the recording, so may not be wrong answers. */
  alsoRight: readonly string[] = [],
): (a: string, b: string) => boolean {
  const senses = pool
    .filter((w) => w.lemma.toLowerCase() === word.lemma.toLowerCase() && w.id !== word.id)
    .map((w) => w.translation)
    .concat(alsoRight);
  if (senses.length === 0) return differentMeaning;
  return (a, b) => differentMeaning(a, b) && senses.every((sense) => differentMeaning(a, sense));
}

/** The label pattern for one word, as `naturalSentence` needs to be told about it. */
function openerFor(word: WordRow): ((opening: string) => boolean) | undefined {
  return nominalOpener(word.pos, [...attestedForms(word)]);
}

// ── Gaps ─────────────────────────────────────────────────────────────────────

/**
 * A sentence worth putting a hole in.
 *
 * Long enough that the context can decide the answer and short enough to hold
 * in your head, which is the whole premise of the task: nobody is being asked
 * to remember an ending, they are being asked to read. Ekilex records phrase
 * fragments alongside whole sentences, and a gap in a fragment is a question
 * with nothing to answer it from.
 */
export function gappable(sentence: string, opensWithNominal?: (word: string) => boolean): boolean {
  const count = dictationWords(sentence).length;
  if (count < 3 || count > 12 || sentence.trim().length > 90) return false;
  return naturalSentence(sentence, opensWithNominal);
}

export interface Gap {
  /** The sentence with one word replaced by a blank. */
  text: string;
  /** The whole sentence, restored, which is the explanation afterwards. */
  full: string;
  /**
   * What the sentence means, where the dictionary already holds it.
   *
   * The English is the honest answer to "why that form", and on a syncretic
   * spelling it is the only one: `laulu` is three cases at once and no rule in
   * this app can parse which, so a learner told the sentence decides is told
   * nothing they can act on. Put the sentence back in English and the role the
   * ending is playing is visible. It ships, so this costs no call and no key
   * (`lib/dict/exampleEnglish.ts`), and it is read *after* an answer is in:
   * `Question.tsx` prints the gap alone, which is why the placement check is
   * on `SENTENCE_WITHOUT_ENGLISH`.
   */
  en: string | null;
  /** The form that was taken out, spelled exactly as the sentence spelled it. */
  answer: string;
  /** Other forms of the same word, none of them standing in the sentence. */
  siblings: string[];
  /**
   * Every other spelling of the word, for marking a typed answer.
   *
   * Not `siblings`, which is chosen to make good wrong options and is the
   * attested forms alone wherever there are three: a seeded entry stores its
   * principal parts, so the derived cases never reached it, and `toast`
   * typed for `toas` came back from `checkAnswer` as a slip, credit 0.8 and
   * right. These are what the sentence could not have wanted.
   */
  rivals: string[];
}

/**
 * Takes one word out of a sentence a lexicographer recorded.
 *
 * **This is what a placement test is actually made of.** The state examination
 * calls it `valikvastustega lünkülesanne` and sets ten of them in the B1
 * reading part; every Estonian school's own placement test is a page of them.
 * A sentence with a hole in it, and a few forms of one word to choose between.
 * What none of them do, anywhere, is ask a learner to name a case, which is
 * what this module used to spend half of its reading section on.
 *
 * Nothing is written and nothing is inflected: `buildCloze` hides a word that
 * a lexicographer put there, and the options are forms the dictionary already
 * vouches for. That is the same latitude the mock exam takes with the same
 * function, and the two call it rather than each keeping a copy.
 *
 * Two guards beyond the exam's, both learned from reading what came out.
 *
 * A blank at the very start of the sentence hands the answer over, because the
 * word standing there is capitalized and none of the distractors is: `____ eas
 * naine` offered `Viljakas`, `viljaka`, `viljakat` and `viljakate`, and the
 * capital letter answers it without a word of Estonian.
 *
 * And the answer has to be the only form that fits. Estonian syncretism means
 * two of a word's forms are often the same string, which `differentText`
 * already catches, but two *different* forms can both be grammatical in one
 * slot: an object is genitive or partitive depending on whether the action
 * finished. So a sibling that is the answer's partner in that pair is dropped
 * rather than offered. It costs a distractor and it is the one ambiguity this
 * shape can actually be rid of.
 *
 * AND A THIRD, WHICH IS THE ANSWER PRINTED IN BOLD ABOVE THE BOX. The screen
 * leads with the word and what it means (`WriteQuestion`), deliberately,
 * because the question is the *form* and the vocabulary is not what a writing
 * band is measuring. That holds right up until the sentence wants the
 * dictionary form, and then the boldest thing on the screen is the string the
 * learner types back: `Minu ____ ja ema elavad Tallinnas` over `isa`,
 * `Rahulolev ____ on iga firma unistus` over `klient`. Measured over the
 * shipped dictionary, 1,549 of 4,294 gappable words, 36 percent.
 *
 * A question nobody can get wrong is worse in a measurement than on a card,
 * which this module already says about the meaning question it refuses for a
 * word spelled the same in both languages. It is worse again here: writing is
 * one of the three skills whose average is the learner's level, it is the
 * noisiest of them because nothing floors a typed answer the way four options
 * do, and a free mark inside a six-item band is most of the distance between
 * two bands.
 *
 * So the loop passes over such a sentence and takes the next one that wants a
 * real form. A word with nothing else to offer gets no writing item at all,
 * which is what this function has always done for a word it cannot gap, and
 * `buildPaper` refuses a task it cannot fill and reports the shortfall rather
 * than padding the band.
 *
 * THE TEST IS THE WHOLE CUE AND NOT THE LEMMA, which `npm run audit:questions`
 * is what found: written against the lemma alone it still let through `saun`,
 * glossed "sauna", over a gap wanting `sauna`. The English is printed beside
 * the word and answers the question just as completely, which is the same
 * shape as the meaning question this module already refuses for a word spelled
 * the same in both languages. It is the ladder `lib/srs/cards.ts` walks over
 * `${lemma}, ${translation}`, asked once here because a writing item has no
 * quieter rung to fall to.
 */
export function gapFrom(word: WordRow): Gap | null {
  const forms = vouchedForms(word);
  const attested = attestedForms(word);
  const objectPair = new Set(
    // The genitive and the partitive, which is the pair an object is in.
    // A third entry here asked `deriveCase` for the genitive, which is a
    // principal part: it answered `undefined` every time it was ever called.
    [word.forms.find((f) => f.formType === "GEN_SG")?.value,
     word.forms.find((f) => f.formType === "PART_SG")?.value]
      .filter((f): f is string => !!f)
      .map((f) => f.toLowerCase()),
  );

  // Exactly what `WriteQuestion` prints above the box.
  const cue = `${word.lemma} ${word.translation}`;

  for (const example of word.examples) {
    const sentence = example.et.trim().replace(/\s+/g, " ");
    if (!gappable(sentence, openerFor(word))) continue;

    const cloze = buildCloze(sentence, forms);
    if (!cloze || cloze.index === 0) continue;
    // See the header: the screen prints the word and what it means above the
    // gap, so either of them spelling the answer makes the item a free mark.
    if (mentions(cue, cloze.answer)) continue;

    const standing = new Set(
      [...cloze.text.matchAll(ESTONIAN_WORD)].map((m) => m[0].toLowerCase()),
    );
    const answer = cloze.answer.toLowerCase();
    const ambiguous = objectPair.has(answer);
    // Not the answer, and not its twin: `aegasid` is right wherever `aegu` is.
    const twins = twinsOf(word, cloze.answer);
    const siblings = forms.filter((f) => {
      const lower = f.toLowerCase();
      if (twins.has(lower) || standing.has(lower)) return false;
      return !(ambiguous && objectPair.has(lower));
    });

    // Attested forms make better wrong answers than computed ones, so they are
    // offered alone wherever there are enough of them. The right answer is
    // always the word the sentence itself used, whichever way this falls.
    const written = siblings.filter((f) => attested.has(f.toLowerCase()));
    const pool = written.length >= 3 ? written : siblings;
    if (pool.length < 3) continue;

    const en = example.en?.trim();
    return {
      text: cloze.text, full: cloze.full, answer: cloze.answer,
      en: en || null, siblings: pool,
      rivals: forms.filter((f) => f.toLowerCase() !== answer),
    };
  }
  return null;
}

/**
 * What the form in the gap is for, in the words somebody would say out loud.
 *
 * THE NAME IS NOT THE EXPLANATION, WHICH IS WHAT THIS REPLACED. The version
 * before it read "The gap takes laulu, which is laul in the omastav (of
 * what?), the osastav (what? (some of it)) or the sisseütlev (into what? where
 * to?). The sentence decides which." Every clause of that is true. It was
 * reported off the level check as too wordy to read, and the reader was right
 * twice over: three names and three bracketed questions is a paragraph of
 * grammar vocabulary at somebody who has just answered a question, and not one
 * of them says why `laulu` and not `laul`. A name is a thing you look up, and
 * a learner mid-check has neither the room nor the reason.
 *
 * `lib/estonian/plainAsk.ts` is the layer under the name and was built for
 * exactly this complaint one screen over: a clause a person who has never
 * opened a grammar book can act on, keyed on the slot rather than written
 * again here, so the flash card and this cannot say two different things about
 * one ending. Nothing about CLAUDE.md's rule on the Estonian names is reversed
 * by it: the grammar reference, the dictionary entry and every screen that
 * *names* a case still lead with `seesütlev`, and this screen names none.
 *
 * Null wherever the app would have to guess, which is most of the interesting
 * spellings. Estonian syncretism means `laulu` is the omastav, the osastav and
 * the short sisseütlev at once, `tuba` is the nimetav and the osastav, and
 * which one a sentence is using is a parse this app does not have and must not
 * pretend to. The old copy answered that by listing all three; this answers it
 * by saying nothing and letting the sentence and its English do the work, which
 * is the one honest explanation available for a form the dictionary cannot
 * place.
 */
interface Placed {
  /** The plain-English clause for the slot the spelling is in. */
  clause: string;
  /** Whether the dictionary says the spelling is a plural. */
  plural: boolean;
}

function clauseFor(word: WordRow, value: string): Placed | null {
  const lower = value.toLowerCase();
  const stored = word.forms.filter((f) => f.value.toLowerCase() === lower);

  const claimed = new Set<CaseKey>();
  const numbers = new Set<"SINGULAR" | "PLURAL">();
  for (const form of stored) {
    /*
      `slotCodeOf` rather than `morphCodeOf`, and that is the whole of what
      was wrong with the first version of this. A principal part carries no
      Ekilex code, so a private table here translated `GEN_SG` into a case and
      **threw the number away**: `NOM_PL`, `GEN_PL` and `PART_PL` were mapped
      onto the singular keys, so 828 of the gaps the shipped dictionary builds
      described a plural with the singular's clause and `sõbrad` was explained
      as "the form you use as the plain dictionary word", which is false about
      the word in front of the learner. One reading of "which slot is this",
      in the module that owns the codes, and the number comes off the same
      answer as the case.
    */
    const code = slotCodeOf(form);
    const key = caseFromMorphCode(code);
    if (!key) continue;
    claimed.add(key);
    const number = numberFromMorphCode(code);
    if (number) numbers.add(number);
  }
  /*
    And a derived case is always singular: `caseAnswer` builds the eleven
    obliques off the genitive stem, which is the singular table, and a plural
    oblique is stored because no rule reaches it.
  */
  const stems = stemsFrom(word.forms);
  for (const spec of CASES) {
    const answer = caseAnswer(stems, spec.key);
    if (answer?.accepted.some((f) => f.toLowerCase() === lower)) {
      claimed.add(spec.key);
      numbers.add("SINGULAR");
    }
  }
  if (claimed.size > 0) {
    // Two cases is the syncretism below; two numbers is the same ambiguity
    // about a different axis and gets the same silence, since a sentence
    // claiming one of them would be right half the time.
    if (claimed.size !== 1 || numbers.size !== 1) return null;
    const clause = plainAsk([...claimed][0]!);
    return clause ? { clause, plural: [...numbers][0] === "PLURAL" } : null;
  }

  /*
    Not a case at all, so a verb form: `aidata` is the da-tegevusnimi and
    nothing else, and a verb slot cannot be syncretic with a case. Two stored
    codes on one spelling is the same ambiguity as two cases and gets the same
    silence.

    Read through `slotCodeOf` for the reason above, and this branch is where
    that was doing the most damage: `plainAsk` is keyed on Ekilex's codes and
    every seeded verb carries `INF_DA`, `PART_TUD`, `PRES_1SG` or `PAST_1SG`,
    so the clause was null on every one of the 249 verb gaps in the shipped
    dictionary and the explanation stopped at "The gap takes X rather than Y."
  */
  const codes = new Set(stored.map(slotCodeOf).filter((c): c is string => !!c));
  if (codes.size !== 1) return null;
  const clause = plainAsk([...codes][0]!);
  return clause ? { clause, plural: false } : null;
}

/**
 * Why that word and not one of the others.
 *
 * The sentence leads, because the sentence is the reason: put the word back
 * and the ending is doing something a learner can see. What it means comes
 * next, where the dictionary holds it, and that is the half this screen was
 * missing: `Väljast kostab lindude laulu.` explains nothing to somebody who
 * cannot read it, and "Birdsong can be heard outside." explains the form
 * without naming a single case. Then one line saying which word was wanted,
 * and, only where the dictionary can place the spelling without guessing, the
 * plain clause `lib/estonian/plainAsk.ts` holds for that slot.
 *
 * **What it may not do is lead with the label, or reach for one at all.** Two
 * versions of this have now been reported as unreadable, and both were the
 * same fault at different lengths: "Here kõhn is in the nimetav, the
 * nominative. The dictionary form. The subject of a sentence, and what you
 * point at.", and then three names with three bracketed questions after it.
 * The grammar reference is where a learner goes to be told what a case is
 * called; a screen marking an answer is not.
 */
export function explainForm(word: WordRow, answer: string): string {
  if (answer.toLowerCase() === word.lemma.toLowerCase()) {
    /*
      The clause here would be "as the plain dictionary word", which is the
      sentence above it again.

      Measured unreachable from both callers, and kept rather than deleted for
      that reason rather than in spite of it. `gapFrom` refuses a gap whose
      answer is spelled out in the cue and the cue holds the lemma, and the
      learn ladder tests the same thing itself and passes null; so this fires
      on none of the gaps the shipped dictionary builds. What is on the other
      side of deleting it is "The gap takes tuba rather than tuba.", which is
      a sentence no third caller should be able to reach by not knowing about
      this, and one line is a cheap guard against it.
    */
    return `The gap takes ${word.lemma} exactly as the dictionary spells it.`;
  }
  const takes = `The gap takes ${answer} rather than ${word.lemma}.`;
  const placed = clauseFor(word, answer);
  if (!placed) return takes;
  /*
    The plural is said before the clause and instead of it in one case, which
    is the nominative: every other clause stays true of a plural, since a
    plural allative is still the form something goes to, and "as the plain
    dictionary word" is a claim about this exact spelling that a plural makes
    false. Saying "that is the plural" and stopping is the whole of what a
    learner needs there, because the dictionary word is printed in the
    sentence above it.
  */
  if (placed.plural) {
    return placed.clause === plainAsk("NOMINATIVE")
      ? `${takes} That is the plural.`
      : `${takes} That is the plural, and the form you use ${placed.clause}.`;
  }
  return `${takes} That is the form you use ${placed.clause}.`;
}

export function explainGap(word: WordRow, gap: Gap): string {
  return [gap.full, gap.en, explainForm(word, gap.answer)].filter(Boolean).join(" ");
}

/**
 * The same explanation for the typed gap, with the sentence left out of it.
 *
 * The two shapes of this task reveal the sentence differently. The multiple
 * choice one is still showing the blanked line when it marks, so its
 * explanation has to put the sentence back together; the typed one draws the
 * whole sentence in bold, with the wanted form picked out in the accent, in
 * `FullSentence` directly above this string. Sending `explainGap` to both put
 * that sentence on screen twice, once in bold and once again as the opening
 * clause of a grey paragraph, with the answer itself then appearing a third
 * time inside `explainForm`. It was reported as a wall of text and it was one.
 *
 * What is left is the half the drawing above cannot say: what the sentence
 * means, where the dictionary holds it, and which form it wanted.
 */
export function explainWrittenGap(word: WordRow, gap: Gap): string {
  return [gap.en, explainForm(word, gap.answer)].filter(Boolean).join(" ");
}

// ── Reading ──────────────────────────────────────────────────────────────────

/**
 * Reading is asked in three ways, and all three are shapes a real test sets.
 *
 * Knowing a word, choosing the form a sentence needs, and understanding a
 * whole recorded sentence. The state examination's published reading tasks are
 * `valikvastustega ülesanne`, `valikvastustega lünkülesanne` and `sobitamine`;
 * the placement tests Estonian language schools set are almost entirely the
 * middle one. None of them asks what a case is called.
 *
 * This module used to. Half of every reading section was metalanguage: which
 * case is this ending, which form does this case call for, which case does
 * this verb govern. Three faults came with it, and the third is the one that
 * matters. The questions named the grammar rather than using it, which is not
 * how anybody is taught or examined. They were worded as facts the dictionary
 * could not support, asking "which case does the verb demand of its object"
 * about 45 entries that are nouns and adjectives, and about verbs like
 * `kõlbama` that take no object at all. And 18 of them offered a second
 * genuinely correct case as a wrong answer, because a word's government string
 * names every case it governs and the distractor pool drew from all of them:
 * `segama` governs the partitive and the comitative, and a learner who knew
 * the comitative was marked wrong for it. A placement test that marks somebody
 * wrong for being right is the one thing this file's own comment says it may
 * never do.
 */
/**
 * What a meaning question says after it has been answered.
 *
 * "film is film." was a true sentence and read as a fault, on the two question
 * shapes that print one: thirty entries in the shipped dictionary are spelled
 * the same in both languages. Says the fact instead, which is what the review
 * screen and the dictionary entry now say for the same words.
 */
function meansLine(lemma: string, translation: string): string {
  return sameSpelling(lemma, translation) ? SAME_SPELLING : `${lemma} is ${translation}.`;
}

export function readingItems(
  words: readonly WordRow[],
  rng: () => number,
  /**
   * What every spelling in the dictionary means. The listening word question
   * learned to rule out every entry its spelling belongs to (`meie` is also
   * the genitive plural of `mina`), and this one prints the same spelling and
   * had not: "I, me" stood among the wrong answers for `meie`. Optional for
   * the reason `listeningItems` gives.
   */
  heard: HeardIndex = new Map(),
): ChoiceItem[] {
  const pool = usableWords(words);
  const glosses = pool.map(glossFor);
  const out: ChoiceItem[] = [];
  const inPool = heardIndex(pool);

  for (const word of shuffle(pool, rng)) {
    /*
      AND NOT A WORD SPELLED THE SAME IN BOTH LANGUAGES. Thirty entries in the
      shipped dictionary are: `film`, `moment`, `sport`, `park`, `stress`. The
      question is the Estonian word and the right option is the English gloss,
      so for those two the question prints its own answer and the item cannot
      be got wrong. On a card that costs a deck slot; here it costs the
      placement, because a band's score is what decides a learner's level and
      an item nobody can fail measures nothing. `meansLine` below already knew
      about these words and only said so after the answer.
    */
    if (sameSpelling(word.lemma, word.translation)) continue;
    const band = bandOf(word.cefr)!;
    const set = pickOptions({
      answer: glossFor(word), candidates: glosses, rng,
      distinct: meaningTest(word, pool, meaningsHeard(word.lemma, inPool, heard)),
      nearness: glossNearness,
    });
    if (!set) continue;
    out.push({
      id: `r-mean-${word.id}`,
      kind: "choice",
      skill: "reading",
      band,
      lemma: word.lemma,
      question: "What does this word mean?",
      et: word.lemma,
      heard: false,
      options: set.options,
      estonianOptions: false,
      answer: set.answer,
      because: meansLine(word.lemma, word.translation),
    });
  }

  for (const word of shuffle(pool, rng)) {
    const gap = gapFrom(word);
    if (!gap) continue;
    const set = pickOptions({
      answer: { text: gap.answer }, candidates: gap.siblings.map((text) => ({ text })), rng,
      distinct: differentText, nearness: formNearness,
    });
    if (!set) continue;
    out.push({
      id: `r-gap-${word.id}`,
      kind: "choice",
      skill: "reading",
      /*
        Never A1. Choosing between four endings of a word asks for more than
        the word, so the easiest gap is still a step past the vocabulary
        question above it, and the first band stays what it should be: can you
        read this word at all.
      */
      band: raise(bandOf(word.cefr)!, "A2"),
      lemma: word.lemma,
      question: "Which one fits the gap?",
      et: gap.text,
      heard: false,
      options: set.options,
      estonianOptions: true,
      answer: set.answer,
      because: explainGap(word, gap),
    });
  }

  const translated = pool.flatMap((w) => {
    const opener = openerFor(w);
    return w.examples
      .filter((e) => e.en && e.en.trim() && naturalSentence(e.et, opener))
      .map((e) => ({ word: w, et: e.et, en: e.en!.trim() }))
      // A name spelled alike in both languages answers the question before
      // it is read, whatever the distractors turn out to be. See
      // sentenceNamesTheAnswer.
      .filter((e) => !sentenceNamesTheAnswer(e.et, e.en));
  });
  /*
    A sentence is never offered against another sentence about the same word.
    Two usages recorded under one headword are the likeliest pair in the whole
    dictionary to be two ways of saying one thing, and a distractor that is
    arguably right is worse than an easy one.
  */
  const sentenceOptions = translated.map((t) => ({ ...sentenceOption(t.en), from: t.word.id }));
  for (const sentence of shuffle(translated, rng)) {
    const set = pickOptions({
      answer: { ...sentenceOption(sentence.en), from: sentence.word.id },
      candidates: sentenceOptions.filter((o) => o.from !== sentence.word.id),
      rng, distinct: differentSentence, nearness: sentenceNearness,
    });
    if (!set) continue;
    out.push({
      id: `r-sent-${sentence.word.id}-${sentence.et.length}`,
      kind: "choice",
      skill: "reading",
      band: raise(bandOf(sentence.word.cefr)!, "B1"),
      lemma: sentence.word.lemma,
      question: "What does this sentence say?",
      et: sentence.et,
      heard: false,
      options: set.options,
      estonianOptions: false,
      answer: set.answer,
      because: `${sentence.et} means ${sentence.en}`,
    });
  }

  return out;
}

// ── Listening ────────────────────────────────────────────────────────────────

/** A sentence short enough to hold in your head, which is what dictation asks. */
export function dictatable(sentence: string, opensWithNominal?: (word: string) => boolean): boolean {
  const count = dictationWords(sentence).length;
  if (count < 3 || count > 9 || sentence.length > 80) return false;
  return naturalSentence(sentence, opensWithNominal);
}

/**
 * Listening is a word, a sentence and a dictation.
 *
 * The A2 and B1 listening papers are short spoken excerpts answered from two
 * to four verbal options, plus a task with information to write down. So: hear
 * a word and pick its meaning, hear a sentence and pick the word that is in
 * it, and write down what you heard.
 *
 * The middle one replaces a question that asked which case the learner had
 * just heard, with the fourteen Estonian case names as options. Estonian
 * listening is genuinely hard, and it is hard because of consonant length and
 * word boundaries rather than because case names are difficult to recall.
 * Asking a beginner to identify `alaltütlev` from audio measured how much
 * grammatical vocabulary they had, in the section that is supposed to measure
 * whether they can follow somebody speaking.
 */
export function listeningItems(
  words: readonly WordRow[],
  rng: () => number,
  /**
   * What every spelling in the dictionary means, for the sentence question
   * below. Optional because a test and the audit hold only a pool, and the
   * pool's own index is always consulted as well.
   */
  heard: HeardIndex = new Map(),
): (ChoiceItem | DictationItem)[] {
  const pool = usableWords(words);
  const glosses = pool.map(glossFor);
  const out: (ChoiceItem | DictationItem)[] = [];
  const inPool = heardIndex(pool);

  for (const word of shuffle(pool, rng)) {
    /*
      A SPELLING PLAYED ALONE IS STILL A SPELLING TWO ENTRIES CAN CLAIM, WHICH
      THE SENTENCE QUESTION BELOW LEARNED FIRST AND THIS ONE DID NOT. What
      `meaningTest` reasons about on its own is a second entry under the same
      *lemma*, and what is played here is a *form*: the genitive plural of
      `mina` is `meie`, which is an entry in its own right, so "what does this
      mean" was asked of that spelling with "I, me" standing among the wrong
      answers and a learner who heard the plural of `mina` was marked wrong for
      hearing it. Nothing is guessed about which entry the spelling is: both
      meanings are ruled out, which costs a distractor and never a mark.
    */
    const set = pickOptions({
      answer: glossFor(word), candidates: glosses, rng,
      distinct: meaningTest(word, pool, meaningsHeard(word.lemma, inPool, heard)),
      nearness: glossNearness,
    });
    if (!set) continue;
    out.push({
      id: `l-word-${word.id}`,
      kind: "choice",
      skill: "listening",
      band: bandOf(word.cefr)!,
      lemma: word.lemma,
      question: "Listen, then pick what it means. The word is not written down.",
      et: word.lemma,
      heard: true,
      options: set.options,
      estonianOptions: false,
      answer: set.answer,
      because: meansLine(word.lemma, word.translation),
    });
  }

  for (const word of shuffle(pool, rng)) {
    const sentence = word.examples.find((e) => gappable(e.et, openerFor(word)));
    if (!sentence) continue;
    /*
      THE QUESTION SAYS "A WORD YOU HEARD", SO EVERY WORD IN THE RECORDING IS
      FAIR GAME, AND NONE OF THEIR MEANINGS MAY BE A WRONG ANSWER. `Moraali ja
      eetika kategooriad.` offered "morality" against "ethics" and marked the
      learner who heard `moraali` wrong. See `./heard.ts`.
    */
    const set = pickOptions({
      answer: glossFor(word), candidates: glosses, rng,
      distinct: meaningTest(word, pool, meaningsHeard(sentence.et, inPool, heard)),
      nearness: glossNearness,
    });
    if (!set) continue;
    out.push({
      id: `l-use-${word.id}`,
      kind: "choice",
      skill: "listening",
      // A word at sentence speed is harder than the same word on its own, which
      // is most of what makes listening hard in the first place.
      band: raise(bandOf(word.cefr)!, "A2"),
      lemma: word.lemma,
      question: "Listen to the whole sentence, then pick the meaning of a word you heard in it.",
      et: sentence.et,
      heard: true,
      options: set.options,
      estonianOptions: false,
      answer: set.answer,
      because: `${sentence.et} That sentence is about ${word.lemma}, which is ${word.translation}.`,
    });
  }

  for (const word of shuffle(pool, rng)) {
    const sentence = word.examples.find((e) => dictatable(e.et, openerFor(word)));
    if (!sentence) continue;
    out.push({
      id: `l-dict-${word.id}`,
      skill: "listening",
      band: raise(bandOf(word.cefr)!, "B1"),
      lemma: word.lemma,
      question: "Listen as often as you like, then write down what you heard.",
      et: sentence.et,
      kind: "dictation",
    });
  }

  return out;
}

// ── Writing ──────────────────────────────────────────────────────────────────

/**
 * The same gap, typed rather than chosen.
 *
 * `lünkülesanne` is a task the real paper sets, and it is the only shape in
 * which this app can ask somebody to *produce* a form and still mark it with
 * certainty: the sentence decides which form it wants, and a lexicographer
 * already wrote down which one that is.
 *
 * What it replaces was "write one Estonian sentence using kolmandik (third) in
 * the seesütlev (milles? kus?)", marked on whether `kolmandikus` turned up
 * anywhere in the answer. Three things were wrong with it. It asked for a case
 * by name, so it measured whether somebody had memorized fourteen labels
 * before it measured any Estonian. It asked for forms nobody would ever write,
 * because every noun in the dictionary has a grammatical inessive and almost
 * nothing is ever said to be inside a third. And its feedback restated the
 * question: it answered "why this form" with "because the seesütlev answers
 * milles?", which is the same sentence the learner had just read.
 *
 * A gap answers all three at once. The case is never named in the question, it
 * is the sentence's job to imply it; the form asked for is one somebody
 * actually wrote; and the explanation is the sentence with the word put back.
 */
export function writingItems(words: readonly WordRow[], rng: () => number): WriteItem[] {
  const out: WriteItem[] = [];
  for (const word of shuffle(usableWords(words), rng)) {
    const gap = gapFrom(word);
    if (!gap) continue;
    out.push({
      id: `w-${word.id}`,
      skill: "writing",
      band: raise(bandOf(word.cefr)!, "A2"),
      lemma: word.lemma,
      // The word itself is not interpolated in here: it is Estonian, and the
      // screen prints it under the question with `lang="et"` on it, beside
      // what it means. A question string is metalanguage and stays English.
      question: "Put this word into the gap, in the form the sentence needs.",
      translation: word.translation,
      sentence: gap.text,
      full: gap.full,
      targetForm: gap.answer,
      otherForms: gap.rivals,
      because: explainWrittenGap(word, gap),
      kind: "write",
    });
  }
  return out;
}

// ── Speaking ─────────────────────────────────────────────────────────────────

export function speakingItems(words: readonly WordRow[], rng: () => number): SpeakItem[] {
  const out: SpeakItem[] = [];
  for (const word of shuffle(usableWords(words), rng)) {
    const sentence = word.examples.find((e) => dictatable(e.et, openerFor(word)) && e.en);
    if (sentence) {
      out.push({
        id: `s-sent-${word.id}`,
        skill: "speaking",
        band: raise(bandOf(word.cefr)!, "B1"),
        lemma: word.lemma,
        question: "Listen to this said properly, then say how confident you would be saying it.",
        et: sentence.et,
        translation: sentence.en!.trim(),
        isSentence: true,
        kind: "speak",
      });
      continue;
    }
    out.push({
      id: `s-word-${word.id}`,
      skill: "speaking",
      band: bandOf(word.cefr)!,
      lemma: word.lemma,
      question: "Listen to this said properly, then say how confident you would be saying it.",
      et: word.lemma,
      translation: word.translation,
      isSentence: false,
      kind: "speak",
    });
  }
  return out;
}

// ── The paper ────────────────────────────────────────────────────────────────

/**
 * How many questions each skill may ask, and how many at any one band.
 *
 * **Eighty, and every number in it was measured rather than chosen.** The
 * shape came from a published CEFR placement test covering A1 to C1, which is
 * thirty five multiple choice at seven per level plus ten listening, ten
 * writing and five spoken. What it had instead was nineteen questions at two
 * per band per skill, and two four-option questions cannot decide anything:
 * one lucky guess moves a band from half to full, one slip moves it back.
 *
 * So `scripts/` was not the place for this and a simulation was. Learners at
 * each true level were sat against papers built from the shipped dictionary,
 * answering at the rates a learner actually answers, and the reported level
 * was compared with the one they were given. The old paper placed 43% of them
 * correctly and put 57% *below* where they were, which is exactly the
 * complaint this rewrite started from.
 *
 * Three things came out of the sweep and only one of them was the obvious one.
 *
 * **The threshold has to be reachable.** `PASS` is two thirds, so at two items
 * a band demands a perfect score and at four it demands three, which is
 * stricter than two thirds rather than looser. Multiples of three are the
 * sizes where two thirds is a score somebody can actually get, and 4 per band
 * measured *worse* than 3.
 *
 * **Writing was the bottleneck, not reading.** Its answers are typed rather
 * than chosen, so there is no floor under a band the way four options put one
 * under a reading band, and it is the noisiest of the three. At the same
 * eighty items, spending them on writing (6/3/6) placed 87% correctly where
 * spending them on listening (6/6/3) placed 83% and on reading (9/3/3) placed
 * 82%.
 *
 * **The overall level was then the weakest of three skills (ADR-020), so
 * noise in any one of them landed on the result.** It is their average now
 * (amendment 2, `overallFrom`), and the figures here were measured under the
 * old rule. That is why raising reading alone was
 * not enough: 7/2/2 took the placement from 43% to 52% and left a genuine C1
 * being told A1 more often than C1.
 *
 * Measured on the shipped dictionary at 6/3/6, by true level: pre-A1 97%, A1
 * 98%, A2 93%, B1 85%, B2 80%, C1 72%. Before: 99%, 62%, 42%, 25%, 18%, 12%.
 *
 * The paper is four times longer and the sitting is not, because `session.ts`
 * stops a skill one band past the first band it was not passed at. A beginner
 * answers about fifteen questions, somebody at A2 about forty, and somebody at
 * C1 the lot, which is the paper each of them needed.
 */
export const BLUEPRINT = {
  reading: { total: 30, perBand: 6 },
  listening: { total: 15, perBand: 3 },
  writing: { total: 30, perBand: 6 },
  speaking: { total: 5, perBand: 1 },
} as const;

/**
 * The most questions a paper can hold, which is the blueprint added up.
 *
 * Derived rather than typed, because it is typed in one other place: the Zod
 * schema `recordAssessment` validates a finished sitting against. Those two
 * numbers were written independently and the moment the blueprint grew past
 * the schema's 60 every sitting was rejected on the way to being stored, with
 * the result still on screen and nothing in the history. That failure is
 * invisible from inside the check: the learner sees their level, presses on,
 * and the hub says nothing was ever measured.
 */
export const PAPER_SIZE = Object.values(BLUEPRINT).reduce((sum, s) => sum + s.total, 0);

/**
 * Picks the paper: bands in order, at most a couple of questions each, and no
 * word asked about twice.
 *
 * Ascending order is what makes the early stop in `session.ts` meaningful, and
 * it is also the kinder shape: a test that opens with C1 vocabulary tells a
 * beginner nothing except that they were right to be nervous.
 */
export function assemble(
  candidates: readonly Item[],
  limit: { total: number; perBand: number },
  /*
    Lemmas the paper has already asked about, shared across the four sections
    rather than reset for each. Each section used to keep its own, so one word
    could carry a reading question, a listening question and a written gap on
    the same paper, and with the gap questions that means the same recorded
    sentence three times over. Passing one set through makes a paper as wide as
    the dictionary allows.
  */
  usedLemmas: Set<string> = new Set(),
): Item[] {
  const perBand = new Map<Band, number>();
  const out: Item[] = [];

  for (const band of BANDS) {
    for (const item of candidates) {
      if (item.band !== band) continue;
      if (out.length >= limit.total) break;
      if ((perBand.get(band) ?? 0) >= limit.perBand) break;
      if (usedLemmas.has(item.lemma)) continue;
      usedLemmas.add(item.lemma);
      perBand.set(band, (perBand.get(band) ?? 0) + 1);
      out.push(item);
    }
  }
  return out;
}

export interface Paper {
  items: Item[];
  /** True when the dictionary could not fill a section, so it is not asked. */
  missing: string[];
}

/**
 * The whole test, in the order it is sat: reading, listening, writing, speaking.
 *
 * Kinds are interleaved inside a skill so that eight reading questions are not
 * eight of the same question, and each kind gets its turn at each band.
 */
export function buildPaper(words: readonly WordRow[], seed: number, heard: HeardIndex = new Map()): Paper {
  const rng = seededRng(seed);
  const spent = new Set<string>();

  /*
    Each section takes words the sections before it did not, which is what
    stops one word carrying a reading question, a listening question and a
    written gap on the same paper. On a thin dictionary that can exhaust the
    pool before the last section is reached, and an empty writing section is a
    worse outcome than a word asked about twice, so a section that comes out
    with nothing is built again without the restriction. `missing` still
    reports a section the dictionary genuinely cannot fill.
  */
  const section = (candidates: Item[], limit: { total: number; perBand: number }) => {
    const first = assemble(candidates, limit, spent);
    return first.length > 0 ? first : assemble(candidates, limit);
  };

  const reading = section(interleave(readingItems(words, rng, heard)), BLUEPRINT.reading);
  const listening = section(interleave(listeningItems(words, rng, heard)), BLUEPRINT.listening);
  const writing = section(writingItems(words, rng), BLUEPRINT.writing);
  const speaking = section(speakingItems(words, rng), BLUEPRINT.speaking);

  const missing: string[] = [];
  if (reading.length === 0) missing.push("reading");
  if (listening.length === 0) missing.push("listening");
  if (writing.length === 0) missing.push("writing");
  if (speaking.length === 0) missing.push("speaking");

  return { items: [...reading, ...listening, ...writing, ...speaking], missing };
}

/** Round-robins items by their id prefix, so one kind cannot fill a section. */
function interleave<T extends Item>(items: readonly T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const kind = item.id.slice(0, item.id.indexOf("-", 2));
    const bucket = buckets.get(kind);
    if (bucket) bucket.push(item);
    else buckets.set(kind, [item]);
  }
  const lists = [...buckets.values()];
  const out: T[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const list of lists) {
      const item = list[i];
      if (item) out.push(item);
    }
  }
  return out;
}
