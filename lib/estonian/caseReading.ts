import { sensesOf } from "@/lib/dict/synonyms";
import { asksAboutPerson, caseIsUnsaidFor, type CaseSubject } from "./caseQuestion";
import type { CaseKey } from "./types";

/**
 * THE WORD WEARING AN ENDING, SAID IN ENGLISH IN AS FEW WORDS AS ARE TRUE.
 *
 * `/grammar/build-a-word` puts `raamatu + -lt = raamatult` on the screen and
 * then explains, four lines further down, that the alaltütlev is what comes
 * off a surface and whoever you took a thing from. Both halves are right and
 * the reader asked for the one in between: what does the word that was just
 * built actually *mean*. It was reported that way, off that screen, and the
 * gap is real. A learner watching an ending arrive cannot cash it in until
 * somebody says "off the book", and "off, and from a person" is a fact about
 * the ending rather than about the word in front of them.
 *
 * So this composes one short English phrase out of two things the app already
 * holds: a frame per case, authored here, and the word's own English gloss,
 * which is the one authored column in the whole dictionary pipeline. Nothing
 * is generated, no model is involved, and **nothing here is Estonian**, which
 * is `lib/estonian/grammar.ts`'s standing rule and is asserted the same way.
 * English is the one language this project may write (ADR-005).
 *
 * THE GLOSS IS READ TO ITS FIRST SENSE, AND THAT IS WHAT MAKES THE FRAME SAFE.
 * `lib/estonian/plainAsk.ts` considered exactly this shape and refused it, for
 * a reason worth reading before touching this file: a gloss is a
 * comma-separated list, `tuba` is "room, chamber", and "when something is
 * inside room, chamber" is worse than saying nothing. That argument holds
 * against a whole gloss and against a *question*, which is what that module
 * writes. This is a reading of an answer already on the screen, and the list
 * is what `sensesOf` exists to take apart, so what goes in the frame is `room`
 * and what comes out is "in the room". Where the first sense is not one short
 * noun, nothing is printed: a reading nobody can check is worse than none, and
 * a reading somebody checks and finds wrong is worse still.
 *
 * A PERSON IS NOT A SURFACE. The three outside endings are the same letters
 * either way and are not the same sentence in English: `raamatule` is onto the
 * book and `mehele` is to the man, `mehel` is the man has it. That is the
 * distinction the case's own `plain` carries ("onto, and to a person") and it
 * is read here through `asksAboutPerson`, which is the same fact
 * `caseQuestionFor` picks the pronoun with, asked of the module that owns it:
 * what a classification means is `caseQuestion.ts`'s to decide and this table's
 * to act on, a pair `scripts/test-invariants.ts` holds closed. And a reading is
 * withheld outright where the language does not put the word in that case at
 * all: `caseIsUnsaidFor` is the one predicate for that and it asks for positive
 * evidence, so "in the friend" is never written and `toale` is left alone.
 *
 * Pure: no React, no Next, no Prisma, no clock, no Estonian.
 */

/** How a case reads with one word in it. `%` is where the English gloss goes. */
interface Frame {
  /** The reading for a thing, which is every word unless the next field applies. */
  readonly thing: string;
  /** The reading for a person, where English says it another way entirely. */
  readonly person?: string;
}

/**
 * Ordered as `CASES` is, and total over all fourteen rather than partial.
 *
 * Total, with `null` where a case is deliberately left alone, which is not the
 * same thing as a key nobody wrote: `plainAsk` is partial and a missing entry
 * there is indistinguishable from an oversight. `Record<CaseKey, Frame | null>`
 * makes a fifteenth case a build error and makes the one refusal a decision
 * somebody took, which the osastav's own entry argues for at length.
 */
const FRAMES: Record<CaseKey, Frame | null> = {
  NOMINATIVE: { thing: "the %" },
  GENITIVE: { thing: "of the %" },

  /*
    THE ONE CASE THAT GETS NO FRAME, AND THE REASON IS THE REFERENCE'S OWN.

    `CASE_NOTES` says of the osastav that "English marks none of this, so there
    is nothing to carry over", and a one-phrase reading claiming otherwise is
    this screen contradicting the paragraph printed under it. "some of it" is
    right for `vett` and wrong twice over for everything else: `Ma loen
    raamatut` is reading a book and not finishing it rather than reading some
    of it, and `meest` under "some of the man" is a portion of a person, which
    is what the five words on this screen would actually have printed.

    So the case keeps its `plain`, its summary and its english hook, which are
    on the same panel and say it properly at the length it needs, and this adds
    nothing. `null` rather than a missing key, so the decision is stated and a
    fifteenth case is still a build error.
  */
  PARTITIVE: null,

  /*
    Inside. Never reached for a word the Institute calls a person, since
    `caseIsUnsaidFor` refuses the row before a frame is chosen. A word it has
    no classification for keeps the inside trio and gets a reading, which is
    what that predicate refusing to guess means one module over.
  */
  ILLATIVE: { thing: "into the %" },
  INESSIVE: { thing: "in the %" },
  ELATIVE: { thing: "out of the %" },

  /*
    On top, and the three where the person reading differs. The adessive is
    the one worth spelling out: Estonian has no verb for have, the owner takes
    this ending and the thing owned becomes the subject, so "the man has it" is
    the sentence a teacher writes on the board rather than a translation of a
    preposition.
  */
  ALLATIVE: { thing: "onto the %", person: "to the %" },
  ADESSIVE: { thing: "on the %", person: "the % has it" },
  ABLATIVE: { thing: "off the %", person: "from the %" },

  /*
    The five with one job each. "becoming a %" rather than "into a %", which
    is what the ending does and is also the only wording that cannot be
    confused with the sisseütlev two rows up: "into the room" and "into a
    teacher" are one preposition doing two unrelated jobs, and an article is
    too quiet a thing to hang that difference on.
  */
  TRANSLATIVE: { thing: "becoming a %" },
  TERMINATIVE: { thing: "up to the %" },
  ESSIVE: { thing: "as a %" },
  ABESSIVE: { thing: "without the %" },
  COMITATIVE: { thing: "with the %" },
};

/**
 * How many words a gloss's first sense may run to and still go in a frame.
 *
 * Measured over the shipped dictionary rather than guessed at, counted after
 * the article above has been stripped, since that is the order the rules run
 * in: of 5,194 nominals 4,408 first senses are one word and 645 are two, so
 * three keeps 77 more and refuses 63. Read the 63 rather than the total, which
 * is the rule `eval:scene` states about itself: they are "twilight before
 * rising of the sun", "in the estonian school system the 9-year comprehensive
 * school", "single game in e.g. chess". Those are sentences rather than
 * readings, and the honest thing to do with one is print nothing, since the
 * case's own explanation is on the same screen and says it properly.
 */
const MAX_WORDS = 3;

/**
 * A GLOSS SOMETIMES BRINGS ITS OWN ARTICLE, AND THE FRAME SUPPLIES ONE.
 *
 * Measured over the shipped dictionary: 74 first senses open with one, so
 * `ameeriklane` is "an american" and `avalikkus` is "the public sphere", and
 * dropped into a frame they read "in the an american" and "in the the public
 * sphere". Stripped rather than refused, because what is left is exactly the
 * reading wanted: "in the american", "in the public sphere". It runs before
 * the length rule, so an article does not eat a word of the budget, and before
 * the article rule below, so "an american" comes back out as "as an american"
 * rather than as "as a american".
 */
const OWN_ARTICLE = /^(?:an?|the)\s+/i;

/**
 * English says "an" by sound and this is spelling, so two classes break it.
 *
 * The short certain list rather than a pronunciation dictionary, which is the
 * shape `DA_ONLY_VERBS` takes one module over and for its reason: these
 * openings are never the other way, so firing on them can only be right, and
 * English spelling does not change under us the way a word list does. Measured
 * over the shipped dictionary, they are the whole of it: 5 senses take "an"
 * against the letter (`hour`, `honest`, `honesty`, `honour`, `hourglass`) and
 * 32 take "a" against it (`euro`, `university`, `use`, `one`, `ukrainian` and
 * their kin), and nothing else in 5,117 nominals is judged wrongly.
 *
 * `uni` excludes `unin` and `unim`, so "a uniform" and "a university" are right
 * without taking "an uninhabited" with them. The residual is a word in neither
 * class that English says by sound anyway, and it costs one article on two of
 * the fourteen frames.
 */
const SILENT_H = /^(?:hour|honest|honou?r|heir)/i;
const SOUNDS_LIKE_YOU = /^(?:eu|ewe|ufo|ubiq|uni(?![nm])|ura|uro|usa|use|usu|uti|uk|one\b|one[-'])/i;

/** The indefinite article for an English word. */
function article(noun: string): string {
  if (SILENT_H.test(noun)) return "an";
  if (SOUNDS_LIKE_YOU.test(noun)) return "a";
  return /^[aeiou]/i.test(noun) ? "an" : "a";
}

/**
 * The first sense of a gloss, where it is short enough to read inside a frame.
 *
 * `sensesOf` is the dictionary's own reading of what a gloss is made of, with
 * the parenthetical a course author wrote taken off: "bread (dark)" is bread
 * here, because "in the bread (dark)" is a note to a lexicographer rather than
 * a sentence. Which of the two breads it is stays the entry's business.
 */
function nounIn(gloss: string): string | null {
  const first = sensesOf(gloss)[0]?.of?.replace(OWN_ARTICLE, "");
  if (!first) return null;
  if (first.split(/\s+/).length > MAX_WORDS) return null;
  return first;
}

/**
 * The word in this case, in plain English, or null where nothing honest fits.
 *
 * Null is an answer rather than a gap, exactly as it is in `plainAsk`: a screen
 * with no reading prints the form and its explanation, which is what every
 * screen here did before this existed.
 */
export function caseReading(key: CaseKey, gloss: string, subject: CaseSubject): string | null {
  if (caseIsUnsaidFor(key, subject)) return null;
  const noun = nounIn(gloss);
  if (!noun) return null;
  const frame = FRAMES[key];
  if (!frame) return null;
  const person = asksAboutPerson(subject) ? frame.person : undefined;
  const shape = person ?? frame.thing;
  // The two frames that introduce a role take an article, and which article is
  // a question about the gloss rather than about the frame.
  return shape.includes("a %")
    ? shape.replace("a %", `${article(noun)} ${noun}`)
    : shape.replace("%", noun);
}
