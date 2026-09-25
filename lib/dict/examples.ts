/**
 * Example sentences.
 *
 * `Lexeme.examples` is a JSON string column, which is the right shape for a
 * handful of sentences per word and the wrong shape to trust blindly — it is
 * written by the Ekilex mapper, by the learner's own edits and by restores of
 * old backups. Everything reading it comes through here, so a malformed or
 * outdated blob degrades to "no examples" instead of throwing on a page.
 *
 * The sentences themselves are attested Estonian recorded by lexicographers,
 * never generated (ADR-005). That is what makes the cloze and sentence-building
 * exercises possible at all: the app can rearrange and blank real sentences
 * because it never has to invent one.
 */

import { naturalSentence } from "@/lib/estonian/cloze";
import { isRefusedSentence } from "@/lib/dict/refused";
import { englishFor } from "@/lib/dict/exampleEnglish";

export type ExampleSource = "EKILEX" | "SEED" | "USER" | "AI";

export interface Example {
  /** The Estonian sentence, exactly as recorded. */
  et: string;
  /** An English translation, when one exists. Ekilex has none on a reader key. */
  en?: string | null;
  /**
   * A REVIEWER HAS READ THIS SENTENCE'S ENGLISH AND SAID IT WAS WRONG.
   *
   * `CLEAR_TRANSLATION` sets `en` back to null, which is the honest "not yet"
   * every sentence was in before the shipped table existed, and null is the
   * one thing that cannot say which of two facts it is. Nobody has answered
   * yet and somebody has answered and was wrong read identically, so the next
   * seed refilled the line from `prisma/data/example-english.json` and every
   * later render asked a model for it again: the reviewer's decision was
   * undone within a deploy, silently, across the whole deployment.
   *
   * A second stored fact rather than an inversion of the first, which is the
   * shape `emailsOff` and `emailsOn` take in `lib/settings` and for their
   * reason: one field holding both would mean "absent" reading one way for
   * most sentences and the other way for these, which is the rule whoever
   * next edits it gets backwards. Absent is still "not yet".
   */
  enRefused?: boolean;
  source: ExampleSource;
}

/** Sentences outside this range are unusable: a fragment, or a paragraph. */
const MIN_CHARS = 8;
export const MAX_CHARS = 140;
const MAX_PER_WORD = 8;

export function parseExamples(json: string | null | undefined): Example[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    /*
      A SENTENCE SOMEBODY HAS REFUSED NEVER COMES OUT OF THE COLUMN.

      This is the one reader of `Lexeme.examples` and about fifty callers come
      through it, several of which never reach `usableExamples`: the case
      walk, the grammar pages, the daily quest, the worksheet, the sprint and
      the two repairs in `prisma/repair.ts` among them. Refusing here is what
      makes one line in `lib/dict/refused.ts` reach every screen rather than
      most of them, and it covers a deployment that was seeded before the
      refusal was written, whose rows still hold the sentence.
    */
    return parsed.filter(isExample).filter((e) => !isRefusedSentence(e.et));
  } catch {
    return [];
  }
}

function isExample(value: unknown): value is Example {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.et === "string" && v.et.trim().length > 0;
}

/**
 * May anything fill in what this sentence means?
 *
 * The one reader of `enRefused`, so the shipped table, the seed's repair and
 * the runtime ask cannot disagree about whose line it is. False where a line
 * is already held, because there is nothing to fill.
 */
export function mayFillEnglish(example: Example): boolean {
  return !example.en && !example.enRefused;
}

export function serialiseExamples(examples: Example[]): string {
  return JSON.stringify(examples.map((e) => ({
    et: e.et.trim(),
    ...(e.en ? { en: e.en.trim() } : {}),
    // Kept, or the reviewer's decision lives exactly as long as the row does.
    ...(e.enRefused ? { enRefused: true } : {}),
    source: e.source,
  })));
}

/**
 * Keeps the sentences worth showing a learner: not fragments, not paragraphs,
 * no duplicates, shortest first.
 *
 * Shortest first is deliberate — a first example that fits on one line is worth
 * more to a beginner than a subtler one that runs to three, and the cloze
 * generator takes the first sentence that works.
 *
 * A ONE-WORD "SENTENCE" IS A DIFFERENT WORD WEARING A FULL STOP. Ekilex files
 * a compound's own usage under the base word it was built from, so `poeg`'s
 * three recorded usages are `Rongapoeg.`, `Särjepoeg.` and `Kuningapoeg.`,
 * none of which contain `poeg` as a word, all of them shorter than any real
 * sentence for it would be, and shortest-first was putting the compound in
 * front of a beginner who has not met `kuningas` yet. That is worse than the
 * case this file already reasons about, where a real sentence simply does
 * not carry the exact form asked for: this one is not a sentence at all, so
 * there is nothing in it to mark and nothing for `teachingSentence` to point
 * a beginner at. `sentenceWords` already splits on the same boundary a case
 * ending is matched on, so a spelling with nothing on either side of a space
 * is a spelling with one word in it.
 *
 * AND A USAGE THAT TRAILS OFF, SPLITS TWO ALTERNATIVES WITH A SLASH, OR NAMES
 * ITSELF BEFORE ILLUSTRATING IS THE SAME FAULT IN A DIFFERENT SHAPE.
 * `naturalSentence` (`lib/estonian/cloze.ts`) is the exam's own answer to
 * that, and the mock exam, the placement check and `borrow.ts` each read it
 * downstream of this function. Four more callers, `flash.ts`, the government
 * drill, the grammar reference's case examples and this app's own word
 * pages, read `sentenceContaining` with nothing downstream at all: `sellepärast`,
 * taught in the first A1 unit, was reaching a beginner as `"Küsin seda
 * sellepärast, et .."` with nothing after the comma. It belongs here rather
 * than in every caller for the reason the one-word check does: a filter three
 * callers already apply and four do not is a filter with a gap in it, and a
 * gap found once by reading a screenshot is a gap found a second time by a
 * learner. Without a part of speech to hand it, this catches everything
 * `naturalSentence` can decide alone, ellipsis, a slash, a parenthetical
 * aside, a fragment with no closing punctuation, a numbered list item, and
 * leaves the label pattern (a usage opening with its own headword) to a
 * caller that has the word's part of speech, through `teachingSentence`'s own
 * optional third argument or `borrow.ts`'s.
 */
export function usableExamples(examples: Example[], plainest?: Rank): Example[] {
  const seen = new Set<string>();
  const out: Example[] = [];

  for (const example of examples) {
    const et = example.et.trim().replace(/\s+/g, " ");
    const key = et.toLowerCase();
    if (et.length < MIN_CHARS || et.length > MAX_CHARS) continue;
    if (sentenceWords(et).length < 2) continue;
    /*
      And again here rather than only in `parseExamples`, because a list
      mapped straight out of a live Ekilex lookup has never been near the
      column: `lib/ekilex/mapper.ts` builds fresh `Example`s and hands them
      to `mergeExamples`, which is this function. Two doors, two refusals.
    */
    if (isRefusedSentence(et)) continue;
    if (!naturalSentence(et)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...example, et });
  }

  /*
    A SENTENCE SOMEBODY RECORDED OUTRANKS A SENTENCE SOMEBODY TYPED.

    Shortest first was the only rule here, and `Lexeme` is shared, so eight
    short sentences added by one learner pushed every Ekilex usage off a word
    for everybody. Those usages are what the cloze cards, the mock exam and
    the level check are built out of, so this was one learner rewriting the
    Estonian other people are examined on. Attested first, then the learner's
    own, and at most `MAX_USER_PER_WORD` of those, which is enough for the
    line from class this was built for and not enough to take a word over.
  */
  const attested = out.filter((e) => e.source !== "USER" && e.source !== "AI");
  const mine = out.filter((e) => e.source === "USER" || e.source === "AI");
  const byLength = (a: Example, b: Example) => a.et.length - b.et.length;
  return [
    ...attested.sort(plainest ?? byLength),
    ...mine.sort(byLength).slice(0, MAX_USER_PER_WORD),
  ].slice(0, MAX_PER_WORD);
}

/**
 * How the attested sentences are ordered, where the caller has an opinion.
 *
 * Shortest first is the default and the right one for a reader who can already
 * read Estonian. It is the wrong one for a beginner, because Ekilex records a
 * usage to illustrate a word rather than to teach one, and what shortest
 * selects for is the noun phrase and the idiom: `tere` was taught with `No
 * tere, Juhan.` over `Tere, mina olen Katrin.` because the first is ten
 * characters shorter. `lib/dict/plainness.ts` is the ranking that fixes it and
 * the argument for it; this is only the seam it plugs into, so that the
 * ordering stays decided in one place and a caller with nothing to say still
 * gets exactly the order it always had.
 *
 * It orders and never filters, so the cap and the attested-before-typed tier
 * above are untouched: a word whose only sentence is hard still gets it.
 */
export type Rank = (a: Example, b: Example) => number;

/** How many of a shared word's sentences one learner may occupy. */
export const MAX_USER_PER_WORD = 2;

/**
 * Merges freshly fetched sentences into what is already stored.
 *
 * A translation the learner has typed, or one already resolved, survives a
 * refetch — the same rule the English gloss follows in lib/dict/lookup.ts.
 */
export function mergeExamples(existing: Example[], incoming: Example[]): Example[] {
  const byText = new Map(existing.map((e) => [e.et.trim().toLowerCase(), e]));
  for (const example of incoming) {
    const key = example.et.trim().toLowerCase();
    const held = byText.get(key);
    /*
      And a refusal survives a refetch for the reason the translation does:
      Ekilex answering again is not somebody saying the English was right.
    */
    byText.set(key, {
      ...example,
      ...(held?.en ? { en: held.en } : {}),
      ...(held?.enRefused ? { enRefused: true } : {}),
    });
  }
  return usableExamples([...byText.values()]);
}

/**
 * The English already stored against one exact sentence of a word, or null.
 *
 * The one reader of "does the dictionary already say what this line means",
 * asked by every screen that puts a recorded sentence in front of a learner:
 * the review card and the daily quest reconstruct a gap card's sentence by
 * putting the answer back and look it up here, and the grammar pages and the
 * word of the day hand over the sentence they chose. Matched on the exact
 * spelling, because a translation belongs to the sentence it was made of and
 * a near miss is a different line.
 *
 * Null is "not yet", never "no": `SentenceTranslation` is what turns one into
 * the other, once per sentence per deployment.
 */
export function translationOf(examples: Example[], sentence: string): string | null {
  return examples.find((e) => e.et === sentence)?.en ?? null;
}

/**
 * WHAT A SENTENCE MEANS, WHICHEVER ENTRY IT IS FILED UNDER.
 *
 * `translationOf` answers off one entry's own examples, which is every
 * sentence a card was cut from until `lib/dict/borrow.ts` existed: a word may
 * now be drilled in a sentence recorded under another headword, and for those
 * the match found nothing. The screen then had no line to print and asked a
 * model for one, and `translateExample` correctly refused, because the
 * sentence really is not on that word. What a learner read was
 * `Olen Rootsis käinud vaid ühe korra.` with nothing under it on a card for
 * `üks`, since the sentence is filed under `kord`, and then an error naming
 * this app's own storage.
 *
 * An English line is a fact about the **sentence**, which is why the shipped
 * table is keyed on the sentence rather than on the entry, so the line was
 * already built and one entry over. This asks the entry first and that table
 * behind it.
 *
 * THE CHEAP ANSWER IS ALSO THE RIGHT ONE, AND THAT WAS MEASURED RATHER THAN
 * ASSUMED. The other way to reach it is `borrowedSentences()`, which is the
 * borrowed pool the card builder already reads, and it costs a full read of
 * the heaviest column in the dictionary, 1.46 MB and 360ms of index building
 * per cache fill, on the hottest read in the app, every minute of active use
 * on every instance. Over the shipped dictionary the two cover 11,125 and
 * 11,126 of the 11,223 borrowable sentences, which is the same 99.1% and one
 * sentence apart, so the pool buys nothing a free deployment can afford.
 *
 * AND A REFUSAL IS RESPECTED WHEREVER IT CAN BE SEEN. A line a reviewer took
 * off leaves `en` null on the entry that holds it, so an entry that holds the
 * sentence answers for it and the table is never asked: that is what stops
 * the shipped line being handed back over a decision somebody made, which is
 * the fault `mayFillEnglish` exists for one door over. What is left, and is
 * written down rather than left to be rediscovered, is a sentence refused on
 * the entry that owns it and *borrowed* by another: this cannot see that row,
 * so it prints the shipped line. That needs a reviewer's refusal, on a
 * sentence another word borrows, on a card cut from it.
 */
export function sentenceEnglish(examples: Example[], sentence: string): string | null {
  const held = examples.find((e) => e.et === sentence);
  if (held) return held.en ?? null;
  return englishFor(sentence);
}

/**
 * The first sentence that contains a form as a whole word.
 *
 * Whole-word, not substring, and that is the entire point: `toa` sits inside
 * `toas`, so a substring match would happily present a sentence as an example
 * of a case it does not contain — teaching the opposite of the lesson. A
 * sentence with a translation wins, because a learner can check their reading
 * against it.
 */
export function sentenceContaining(examples: Example[], form: string, plainest?: Rank): Example | null {
  const wanted = form.trim().toLocaleLowerCase("et");
  if (!wanted) return null;
  const matches = usableExamples(examples, plainest).filter((e) => sentenceWords(e.et).includes(wanted));
  return matches.find((e) => e.en) ?? matches[0] ?? null;
}

/**
 * A sentence split into lowercased words, with Estonian's own letters kept and
 * punctuation dropped. Hyphens stay inside a word: `üle-eestiline` is one word.
 */
export function sentenceWords(sentence: string): string[] {
  return sentence.toLocaleLowerCase("et").split(/[^\p{L}\p{M}-]+/u).filter(Boolean);
}

/**
 * The sentence to teach a word with, and which form of it the sentence carries.
 *
 * A first meeting shows the word doing its job, so the ranking is by how
 * closely the sentence matches what is about to be asked. The form on the card
 * wins outright: a learner meeting the partitive of `kohv` learns nothing from
 * a sentence carrying the nominative, and the whole claim of the screen is that
 * this is the word in use. The lemma is the fallback, and a sentence carrying
 * neither is still worth showing, because seeing the word inflected differently
 * is how anybody works out that Estonian inflects.
 *
 * `forms` is in priority order and may hold duplicates or blanks; the caller
 * assembles it from whatever the card knows.
 *
 * `opensWithNominal` is the one thing `usableExamples` cannot decide on its
 * own, because refusing a usage that opens with its own headword and a comma
 * (the label pattern, where a dictionary names itself and then illustrates a
 * sense the gloss beside it may not) is only safe on a nominal: a verb
 * standing before a comma is an ordinary main clause. That needs the word's
 * part of speech, which this function is not otherwise handed, so it is
 * optional and a caller with `pos` and `forms` in hand builds one through
 * `nominalOpener` (`lib/estonian/cloze.ts`), the same way `borrow.ts` already
 * does. Left out, a first meeting still gets everything `usableExamples`
 * itself refuses: a fragment, a compound, an ellipsis, a slash, a
 * parenthetical aside.
 */
/**
 * Every sentence of a word's that an exercise may be built out of.
 *
 * The two rules together, which is how every caller wants them and is the one
 * shape that kept being written out by hand: `usableExamples` is the
 * dictionary entry's own rule about what is worth printing, and
 * `naturalSentence` is the stricter one a *question* needs, because Ekilex
 * records a usage against a sense and what comes back is sometimes
 * lexicography rather than something somebody said.
 *
 * ONE HOME, BECAUSE TWO COPIES IS EXACTLY HOW THIS WENT WRONG. The guided
 * lesson's page wrote both lines out and the end-of-level checkpoint's page
 * wrote neither, so the checkpoint built gap questions out of
 * `Vanemametnikud on: ... 9) insener;` and `Esimene tingimus on, et ..`, on a
 * measurement whose own screen says passing it moves the learner up a level.
 * The two pages resolve the same kind of row for the same kind of exercise and
 * had drifted a rule apart.
 */
export function teachableSentences(
  examples: Example[],
  opensWithNominal?: (word: string) => boolean,
  plainest?: Rank,
): Example[] {
  const usable = usableExamples(examples, plainest);
  return opensWithNominal
    ? usable.filter((e) => naturalSentence(e.et, opensWithNominal))
    : usable;
}

export function teachingSentence(
  examples: Example[],
  forms: readonly (string | null | undefined)[],
  opensWithNominal?: (word: string) => boolean,
  plainest?: Rank,
): { example: Example; form: string | null } | null {
  const usable = teachableSentences(examples, opensWithNominal, plainest);
  if (usable.length === 0) return null;

  const tried = new Set<string>();
  for (const form of forms) {
    const wanted = form?.trim();
    if (!wanted) continue;
    const key = wanted.toLocaleLowerCase("et");
    if (tried.has(key)) continue;
    tried.add(key);

    const match = sentenceContaining(usable, wanted, plainest);
    if (match) return { example: match, form: wanted };
  }

  // Nothing matched, so nothing is marked up: pointing at a word that is not
  // the one being taught would be worse than pointing at nothing.
  return { example: usable[0]!, form: null };
}

/**
 * A sentence cut into runs, with the whole-word occurrences of `form` flagged
 * so a caller can draw them differently.
 *
 * The boundaries are the same character class `sentenceWords` splits on rather
 * than `\b`, which is defined on ASCII word characters: `\bõun\b` does not mean
 * what it looks like it means, because õ is not one of them. Returns a single
 * unmarked run when there is nothing to mark, so the caller has one shape to
 * render either way.
 */
export function splitOnForm(sentence: string, form: string | null): { text: string; match: boolean }[] {
  const wanted = form?.trim();
  if (!wanted) return [{ text: sentence, match: false }];

  // No hyphen in this class. It is only special inside a character class, and
  // the pattern below interpolates outside one, where `\-` is an invalid escape
  // under the `u` flag and throws rather than failing to match: every
  // hyphenated Estonian word went through here, `üle-eestiline` included.
  const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{M}-])(${escaped})(?![\\p{L}\\p{M}-])`, "giu");

  const runs: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const hit of sentence.matchAll(pattern)) {
    const at = hit.index;
    if (at > last) runs.push({ text: sentence.slice(last, at), match: false });
    runs.push({ text: hit[0], match: true });
    last = at + hit[0].length;
  }
  if (last < sentence.length) runs.push({ text: sentence.slice(last), match: false });

  return runs.length > 0 ? runs : [{ text: sentence, match: false }];
}
