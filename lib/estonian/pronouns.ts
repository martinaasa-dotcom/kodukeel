import { morphCodeOf } from "./morph";
import type { CaseKey } from "./types";

/**
 * THE SIX PERSONAL PRONOUNS, IN THE ENGLISH THEY ACTUALLY TAKE, AND THE SHORT
 * FORM EVERYBODY SAYS.
 *
 * Two things a learner meets in their first fortnight and this app could say
 * nothing useful about. The first is that English inflects its pronouns where
 * it inflects nothing else: `mina` is glossed "I, me" and the dictionary is
 * right, and a learner who taps `mind` in `Ta armastab mind` and is handed the
 * headword's whole gloss has been told both answers and which one this is. It
 * is "me", and no rule over a gloss gets there, because the rule is a fact
 * about English rather than about Estonian. So it is authored, here, in the one
 * language this project writes (ADR-005).
 *
 * The second is the pair. `mina` and `ma`, `sina` and `sa`, `meie` and `me`
 * are one word twice, the long one is what the dictionary is headed by and the
 * short one is what anybody says, and until this the app taught the headword
 * and then put the short form in front of the learner in every sentence it
 * showed them without ever saying the two were connected. **Nothing here
 * writes one**: `twinsOf` reads the pair off the entry's own stored forms,
 * which Ekilex records for every pronoun that has them, the
 * way `spokenForm` reads the one it says out loud (`lib/scenes/lexicon.ts`).
 *
 * DELIBERATELY PARTIAL, like `lib/estonian/terms.ts` and `plainAsk` and for
 * their reason. The six personal pronouns are in it because English has a
 * different word for each role; `see` and `too` are not, because "this" is
 * "this" in every role English has, and `kes` and `mis` are not for the same
 * reason. A pronoun the table does not name gets no reading at all rather than
 * a frame built over its gloss, which is what stops "in the this".
 *
 * The lemmas are **requests against the course**, the way `SUBJECT_PRONOUN`
 * and `numberWords` are: `pronouns.test.ts` fails if the course stops teaching
 * one, and no Estonian form is typed anywhere in this file.
 *
 * Pure: no React, no Next, no Prisma, no Estonian.
 */

/** The four things English calls one person, where they are four words. */
interface PronounEnglish {
  /** Doing it: "I", "he, she". */
  readonly subject: string;
  /** Having it done to them: "me", "him, her". */
  readonly object: string;
  /** Whose it is: "my", "his, her". */
  readonly possessive: string;
  /**
   * The one thing English lost, where the pronoun is one of the two that had
   * it, and null on the four where there is nothing to say.
   *
   * `sina` and `teie` are both "you" and are not the same word: one is a
   * person you know and the other is a room full of them or a stranger at a
   * counter. Every scene in this app is answered in `teie`, so it is the
   * pronoun this panel is tapped on most, and "to you" over `teile` with "to
   * you" over `sulle` teaches a learner that the choice does not matter. Both
   * members are marked rather than only the second, because the contrast is
   * the lesson and a bare "you" beside a qualified one reads as the unmarked
   * default rather than as the informal one.
   */
  readonly qualifier?: string;
  /**
   * The have-construction, written out whole.
   *
   * Estonian has no verb for have: the owner takes the alalütlev and the thing
   * owned becomes the subject, which is what `mul on` is. `caseReading` says
   * the same thing about a noun ("the man has it") and cannot be reused here,
   * because its frame puts the gloss where English wants a conjugated verb
   * after it: "he, she have it" is not a sentence. So the whole clause is
   * authored per person, which is also where the third person's two spellings
   * of the verb live.
   */
  readonly has: string;
}

const PRONOUNS: Record<string, PronounEnglish> = {
  mina: { subject: "I", object: "me", possessive: "my", has: "I have it" },
  sina: {
    subject: "you", object: "you", possessive: "your", has: "you have it",
    qualifier: "one person you know",
  },
  tema: { subject: "he, she", object: "him, her", possessive: "his, her", has: "he has it, she has it" },
  meie: { subject: "we", object: "us", possessive: "our", has: "we have it" },
  teie: {
    subject: "you", object: "you", possessive: "your", has: "you have it",
    qualifier: "polite, or more than one",
  },
  nemad: { subject: "they", object: "them", possessive: "their", has: "they have it" },
};

/** The lemmas this table answers for, for the test that keeps it honest. */
export const PRONOUN_LEMMAS = Object.keys(PRONOUNS);

/** Whether the table has anything to say about this word at all. */
export function isPersonalPronoun(lemma: string): boolean {
  return Object.hasOwn(PRONOUNS, lemma.trim().toLocaleLowerCase("et"));
}

/** The four fields a frame may reach for: the words, never the register note. */
type PronounRole = "subject" | "object" | "possessive" | "has";

/** Which of the four English words a case reaches for, and what goes round it. */
interface PronounFrame {
  readonly role: PronounRole;
  /** `%` is where the English pronoun goes. */
  readonly shape: string;
}

/**
 * Total over all fourteen, with `null` where English has nothing short and
 * certain to say, which is `caseReading`'s own discipline and half the value
 * of writing this down.
 *
 * The five that answer are the five a beginner meets: the three a course
 * teaches in its first fortnight (`mina`, `minu`, `mind`) and the two the
 * everyday sentences are built out of (`mulle`, `mul`), plus the three
 * prepositions English spells with one word apiece.
 *
 * THE INSIDE TRIO IS DELIBERATELY EMPTY. `minus` and `minust` are ordinary
 * Estonian where `mehes` is not, so `caseIsUnsaidFor` is not what refuses them
 * here; what refuses them is that the English is not one phrase. `räägib
 * minust` is "about me" and `minust sai õpetaja` is "I became", and a panel
 * printing one of those over the other teaches a learner something the rest of
 * the app would have to unteach. The form's own name and the case's own
 * explanation are still on the screen, which is what every screen showed
 * before this file existed.
 */
const FRAMES: Record<CaseKey, PronounFrame | null> = {
  NOMINATIVE: { role: "subject", shape: "%" },
  GENITIVE: { role: "possessive", shape: "%" },
  PARTITIVE: { role: "object", shape: "%" },

  ILLATIVE: null,
  INESSIVE: null,
  ELATIVE: null,

  ALLATIVE: { role: "object", shape: "to %" },
  ADESSIVE: { role: "has", shape: "%" },
  ABLATIVE: { role: "object", shape: "from %" },

  TRANSLATIVE: null,
  TERMINATIVE: null,
  ESSIVE: null,
  ABESSIVE: { role: "object", shape: "without %" },
  COMITATIVE: { role: "object", shape: "with %" },
};

/**
 * What one of the six says in English when it is wearing this ending, or null
 * where nothing short is true.
 *
 * `null` is an answer rather than a gap, exactly as it is in `caseReading` and
 * `plainAsk`: the screen prints the form's name and the entry's own gloss,
 * which is what it drew before this existed.
 */
export function pronounReading(lemma: string, key: CaseKey): string | null {
  const english = PRONOUNS[lemma.trim().toLocaleLowerCase("et")];
  if (!english) return null;
  const frame = FRAMES[key];
  if (!frame) return null;
  const said = frame.shape.replace("%", english[frame.role]);
  // The register rides on the end rather than inside the frame, so it reads
  // the same after a bare pronoun, a preposition and the have-construction.
  return english.qualifier ? `${said} (${english.qualifier})` : said;
}

/** One stored form, as every caller of this app already holds one. */
interface StoredForm {
  readonly value: string;
  readonly formType?: string | null;
  readonly morphCode?: string | null;
}

/** The two spellings of one form, either of which may be the one in hand. */
export interface Twins {
  /** The everyday one, where the spelling in hand is the long one. */
  readonly shorter: string | null;
  /** The long one, where the spelling in hand is the everyday one. */
  readonly longer: string | null;
}

const NO_TWINS: Twins = { shorter: null, longer: null };

/**
 * The other spelling of the form somebody is looking at.
 *
 * Ekilex records both under one code: `SgN` is `mina` and `ma`, `SgAd` is
 * `minul` and `mul`. A panel that has just told somebody what `mul` means is
 * the one place in the app where saying "and the long one is `minul`" costs
 * nothing and answers the question they were about to ask, and a learner who
 * has met `mina` on a card is owed the other half the same way: every sentence
 * the app then shows them says `ma`.
 *
 * Asked of the spelling rather than of a code, because the caller holds the
 * word as the sentence spelled it and the code is the dictionary's business.
 * Every code that spelling is stored under is read, so a form the dictionary
 * files twice cannot lose its pair.
 *
 * A PRONOUN ONLY, which is `spokenForm`'s own rule and its reason: a noun's
 * parallel form is a spelling variant (`haigusi` beside `haiguseid`) and not a
 * register, so calling one of them the everyday one would be this app making a
 * claim about Estonian nobody has checked. Nothing is written: both spellings
 * are the dictionary's own.
 */
export function twinsOf(pos: string, forms: readonly StoredForm[], spelling: string): Twins {
  if (pos !== "PRONOUN") return NO_TWINS;
  const wanted = spelling.trim().toLocaleLowerCase("et");
  if (!wanted) return NO_TWINS;
  const codes = new Set(
    forms.filter((f) => f.value.toLocaleLowerCase("et") === wanted).map(morphCodeOf),
  );
  if (codes.size === 0) return NO_TWINS;
  const parallel = forms
    .filter((f) => codes.has(morphCodeOf(f)))
    .map((f) => f.value)
    .filter((v) => v.toLocaleLowerCase("et") !== wanted);
  /*
    Shortest first, and then the spelling itself, because a comparator that
    returns 0 hands the answer to whatever order the rows arrived in, which is
    the query plan rather than a fact about Estonian. No pronoun the dictionary
    holds has two parallel spellings of one length today; the tie-break is what
    stops that being load-bearing.
  */
  const shortest = (from: string[]) => (
    from.sort((a, b) => a.length - b.length || a.localeCompare(b, "et"))[0] ?? null
  );
  return {
    shorter: shortest(parallel.filter((v) => v.length < wanted.length)),
    longer: shortest(parallel.filter((v) => v.length > wanted.length)),
  };
}
