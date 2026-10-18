/**
 * WHICH SENTENCES A MODULE READING MAY SHOW UNDER A POINT: THE ONES ABOUT
 * WORDS THE LEARNER HAS MET.
 *
 * A grammar page carries one or two pinned sentences under each claim it makes
 * (`lib/estonian/grammarExamples.ts`), chosen for how well they show the point
 * and for nothing about who is reading. Opened from the reference that is
 * right. Opened from the fourth evening of A1 it put `Alustame tööd
 * esmaspäeval` and `Ahv sööb banaani` under "One ending each for I, you, he or
 * she, we, you all and they", with the verb in the accent color, to somebody
 * who had met neither `alustama` nor `sööma`. It was reported from exactly
 * there: the marked word is the one the sentence exists to show, so it is the
 * one that has to be a word they already hold. A rule is easier to believe on a
 * verb you know, and a sentence of strangers teaches the strangers rather than
 * the rule.
 *
 * Two moves, both pure. `keepMet` drops a pin whose marked word is not a
 * spelling of anything the evenings have taught. `fromMetVerbs` fills what that
 * leaves short with a sentence a lexicographer recorded under one of the
 * learner's own verbs, carrying the slot the point is about: the present tense,
 * the negative, the past. Nothing here writes Estonian (ADR-005). Every
 * sentence is one the dictionary already holds, and every form marked in it is
 * a form of the verb it is recorded under, which is the standing `borrow.ts`
 * gives a word's own usages: a spelling found in a word's own sentence is that
 * word's.
 *
 * The reads that need a database are in `lib/progress/moduleExamples.ts`; this
 * is only the decisions, so they can be driven without one.
 */
import { sentenceTiles } from "@/lib/estonian/cloze";

/** A sentence as a page draws it. Structurally `ResolvedExample`, which lives behind Prisma. */
export interface PointLine {
  et: string;
  en: string | null;
  /** The word carrying the point, marked on screen. */
  form: string;
  lexemeId: string;
}

/** The marked word of a pin, for the filter. */
export interface PinnedForm {
  readonly form: string;
}

/**
 * The pins whose marked word is a spelling the module has taught.
 *
 * `spellings` is every form of every taught word, lower-cased
 * (`moduleSpellings`), so `Mul` counts once `mina` has been taught and `sööb`
 * does not until `sööma` has.
 */
export function keepMet<T extends PinnedForm>(pins: readonly T[], spellings: ReadonlySet<string>): T[] {
  return pins.filter((pin) => spellings.has(pin.form.toLocaleLowerCase("et")));
}

/** One verb the learner has met, with what the page needs to look inside its sentences. */
export interface MetVerb {
  lexemeId: string;
  lemma: string;
  /** Every slot the app can vouch for, by Ekilex's own code (`conjugatedForms`). */
  forms: readonly { code: string; value: string }[];
  /** The sentences recorded under this verb, already refused and filtered. */
  sentences: readonly { et: string; en: string | null }[];
}

/**
 * The slots a point is about, as a family of codes, read off a pin's slot.
 *
 * `VERB:IndPrPl1` is the point "one ending each for I, you, we", which every
 * present-tense sentence shows, so it is the family `IndPr` and any person
 * stands. The negative (`IndPrPs_`) stays its own family: it is the one code
 * whose spelling is shared with another slot, and `fromMetVerbs` has a rule for
 * it. A case slot has no verb behind it and answers null, which is what keeps
 * this to verbs.
 */
export function slotFamily(slot: string | undefined): string | null {
  if (!slot?.startsWith("VERB:")) return null;
  const code = slot.slice("VERB:".length);
  if (!/^[A-Z][A-Za-z]+/.test(code)) return null;
  return code.replace(/(Sg|Pl)[123]$/, "");
}

const NEGATIVE = "IndPrPs_";

/** A sentence longer than this is a paragraph to somebody reading it as an example. */
const MAX_TILES = 8;
/** Words in it the learner has not met. One is a lesson, three is a wall. */
const MAX_STRANGERS = 2;

export interface MetVerbPick extends PointLine {
  /** The verb it was recorded under, so a page can spread its examples across verbs. */
  lemma: string;
  /** How many of its words the learner has not met. */
  strangers: number;
}

/**
 * Every sentence of the learner's own verbs that shows a slot in the family,
 * simplest first.
 *
 * `met` is in teaching order, oldest first, so a later index is a more recent
 * verb. The order is what the learner can read straight through first (fewest
 * words they have not met), then the shortest, then the verb they met most
 * recently, because an example is there to reinforce what has just been taught.
 *
 * THE SPELLING HAS TO BE THIS SLOT AND NO OTHER, the rule `readCase` states for
 * a case. A spelling two slots of the verb claim is refused, so `Ma loen
 * raamatut` is a present first person and a bare `loe` is neither claimed. The
 * one exception is the negative, which shares its spelling with the singular
 * imperative: it counts only straight after `ei`, which is the whole of what
 * distinguishes the two in a sentence somebody wrote.
 */
export function fromMetVerbs(
  met: readonly MetVerb[],
  family: string,
  spellings: ReadonlySet<string>,
): MetVerbPick[] {
  const picks: (MetVerbPick & { order: number })[] = [];

  met.forEach((verb, order) => {
    // Which slots claim each spelling, so an ambiguous one can be refused.
    const claimed = new Map<string, Set<string>>();
    for (const form of verb.forms) {
      // Only one-word forms: a particle verb's particle rides along in every
      // form (`loen läbi`), and marking half of that is marking a guess.
      if (/\s/.test(form.value)) continue;
      const key = form.value.toLocaleLowerCase("et");
      const held = claimed.get(key) ?? new Set<string>();
      held.add(form.code);
      claimed.set(key, held);
    }

    for (const sentence of verb.sentences) {
      if (!sentence.en) continue;
      const tiles = sentenceTiles(sentence.et);
      if (tiles.length < 3 || tiles.length > MAX_TILES) continue;
      const lower = tiles.map((t) => t.toLocaleLowerCase("et"));
      const strangers = lower.filter((t) => !spellings.has(t)).length;
      if (strangers > MAX_STRANGERS) continue;

      const at = lower.findIndex((tile, i) => {
        const codes = claimed.get(tile);
        if (!codes) return false;
        const negated = lower[i - 1] === "ei";
        // The negative is a member of the present's family by spelling only:
        // `ei loe` is not somebody saying what they do.
        const inFamily = [...codes].filter((c) => c.startsWith(family) && (family === NEGATIVE || c !== NEGATIVE));
        if (inFamily.length === 0) return false;
        if (family === NEGATIVE) return negated;
        // After `ei` the spelling is a negative whatever else it spells.
        if (negated) return false;
        return inFamily.length === codes.size;
      });
      if (at < 0) continue;

      picks.push({
        et: sentence.et, en: sentence.en, form: lower[at]!, lexemeId: verb.lexemeId,
        lemma: verb.lemma, strangers, order,
      });
    }
  });

  return picks
    .sort((a, b) => a.strangers - b.strangers || a.et.length - b.et.length || b.order - a.order)
    .map(({ order: _order, ...pick }) => pick);
}

/**
 * THE POINTS WHERE ANY SENTENCE SHOWING THE SLOT SHOWS THE POINT.
 *
 * A pin is chosen because it illustrates one claim. A sentence found by slot
 * alone can only illustrate a claim about the slot: "one ending each for I,
 * you, we" is shown by any present-tense line, and "the verb loses its ending
 * after ei" by any `ei loe`. It cannot show "it covers the future too", which
 * needs a sentence about tomorrow, or "built with to be, never to have", which
 * needs the construction, and putting an ordinary present-tense line under
 * either would be a sentence that illustrates nothing, or something false.
 * So a point is filled from the learner's own verbs only where it is listed
 * here, keyed by topic and by the point's own text for the reason
 * `TOPIC_EXAMPLES` is (an index follows a reorder and a point does not). A
 * point not on the list is held to its pins and shows none until the learner
 * has met their verbs. The test fails on a key that matches no point.
 */
export const FILLS_BY_SLOT: Readonly<Record<string, readonly string[]>> = {
  olema: ["The verb you'll use in every conversation, and it's irregular"],
  "present-tense": [
    "One ending each for I, you, he or she, we, you all and they",
    "One form for both \"I eat\" and \"I'm eating\"",
  ],
  negation: ["The verb loses its ending and goes back to its shortest shape"],
  imperfect: ["For anything that's over, even if it was five minutes ago"],
};

/** One point of a page, with what the pins left and the family its pins were about. */
export interface PointToFill {
  point: string;
  kept: readonly PointLine[];
  /** Null where the point may not be filled by slot, which then only filters. */
  family: string | null;
}

/** How many sentences a point carries, as many as the pinned page does. */
export const PER_POINT = 2;

/**
 * Top each point up to `PER_POINT` from the learner's own verbs.
 *
 * Spread across the page rather than point by point: the same verb under four
 * claims in a row reads as a dictionary with nothing else in it, so a verb
 * already used is passed over until every other has had a turn, and the same
 * sentence is never drawn twice.
 */
export function fillPoints(
  points: readonly PointToFill[],
  met: readonly MetVerb[],
  spellings: ReadonlySet<string>,
): Map<string, PointLine[]> {
  const out = new Map<string, PointLine[]>();
  const usedSentences = new Set<string>();
  const usedVerbs = new Set<string>();
  const byFamily = new Map<string, MetVerbPick[]>();

  const poolFor = (family: string) => {
    let pool = byFamily.get(family);
    if (!pool) {
      pool = fromMetVerbs(met, family, spellings);
      byFamily.set(family, pool);
    }
    return pool;
  };

  for (const { point, kept } of points) {
    for (const line of kept) {
      usedSentences.add(line.et);
    }
    out.set(point, [...kept]);
  }

  for (const { point, family } of points) {
    const lines = out.get(point)!;
    if (family && lines.length < PER_POINT) {
      const pool = poolFor(family).filter((p) => !usedSentences.has(p.et));
      const fresh = pool.filter((p) => !usedVerbs.has(p.lemma));
      for (const pick of [...fresh, ...pool.filter((p) => usedVerbs.has(p.lemma))]) {
        if (lines.length >= PER_POINT) break;
        if (usedSentences.has(pick.et)) continue;
        // One verb at most once under one point, however many sentences it has.
        if (lines.some((l) => l.lexemeId === pick.lexemeId)) continue;
        lines.push({ et: pick.et, en: pick.en, form: pick.form, lexemeId: pick.lexemeId });
        usedSentences.add(pick.et);
        usedVerbs.add(pick.lemma);
      }
    }
    if (lines.length === 0) out.delete(point);
  }
  return out;
}
