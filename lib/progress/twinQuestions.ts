import { buildCloze, mentions } from "@/lib/estonian/cloze";
import { gapForms } from "@/lib/estonian/gapForms";
import { derivedVerbForms, pres1sgFrom } from "@/lib/estonian/conjugate";
import { stemsFrom } from "@/lib/estonian/derive";
import { slotCodeOf } from "@/lib/estonian/morph";
import { caseIndex } from "@/lib/estonian/whichCase";
import { lentFor, parseExamples, sentenceEnglish, sentenceWords, type Example, type Rank } from "@/lib/dict/examples";
import { formSentencesFor, type LexemeForCards } from "@/lib/srs/cards";
import { slotWithin, type ModuleScope } from "@/lib/course/scope";
import { mayStandIn, type TwinGroup, type TwinKind, type TwinWord } from "@/lib/collections/twins";

/**
 * THE QUESTIONS A ROUND OF KAKSIKUD ASKS, BUILT FROM THE DICTIONARY.
 *
 * Two shapes, and the table in `lib/collections/twins.ts` says which group gets
 * which.
 *
 * THE SENTENCE DECIDES. A sentence a lexicographer recorded, with one word of
 * the group taken out, its English line above it, and every word of the group
 * offered in the form the gap needs: `Ma ____ võtmeid` over "I'm looking for
 * my keys", with `otsin` and `ostan` underneath. The English is what makes it
 * fair, because a lookalike often fits a sentence grammatically and means
 * something else, and saying what the sentence means is the only honest way
 * to ask which one the writer used. Afterwards a sentence using the other word
 * is shown beside it, since two sentences side by side teach the difference
 * faster than any definition.
 *
 * GUESS THE OTHER HALF. For a pair a rule built (`guessable`), one word and its
 * meaning, and the question what the other one means. It is reasoned rather
 * than recalled, so it grades nothing.
 *
 * NOTHING IS WRITTEN (ADR-005). The sentence is recorded, the form the gap
 * held is the writer's, and the other words are put into the same slot off the
 * dictionary's own forms: a stored form, a person built on the stored first
 * person (ADR-005 amendment 1), or a case off the genitive stem. A word that
 * cannot be put into the slot drops the sentence rather than being guessed at.
 *
 * Pure: no Prisma, no network, no clock. `lib/progress/twins.ts` reads the rows.
 */

export interface TwinRow {
  id: string;
  lemma: string;
  pos: string;
  cefr: string | null;
  translation: string;
  /** The raw `Lexeme.examples` column. */
  examples: string | null;
  forms: { formType: string; value: string; morphCode?: string | null }[];
}

export interface TwinOption {
  lemma: string;
  /** The word in the slot the gap needs, as it would sit in the sentence. */
  text: string;
  means: string;
}

export interface TwinSentence {
  lemma: string;
  lexemeId: string;
  sentence: string;
  form: string;
  en: string;
}

export interface TwinSentenceQuestion {
  shape: "sentence";
  groupId: string;
  kind: TwinKind;
  drifted: boolean;
  tell: string | null;
  lexemeId: string;
  lemma: string;
  /** The dictionary's gloss of the answer, which is what `gapMeaning` marks in the English. */
  gloss: string;
  /** The recorded sentence with the word taken out, at `BLANK`. */
  gapped: string;
  sentence: string;
  form: string;
  en: string;
  options: TwinOption[];
  answer: number;
  /** Options Estonian lets stand in here, accepted as nearly right. */
  standIns: number[];
  /** A sentence using one of the other words, for after the answer. */
  contrast: TwinSentence | null;
}

export interface TwinGuessQuestion {
  shape: "guess";
  groupId: string;
  kind: TwinKind;
  known: { lemma: string; means: string };
  asked: { lemma: string; lexemeId: string };
  /** English meanings to pick from. */
  options: string[];
  answer: number;
}

export type TwinQuestion = TwinSentenceQuestion | TwinGuessQuestion;

/** Longest sentence a gap is cut from: a beginner reads the line, not a paragraph. */
const MAX_WORDS = 14;

/**
 * Every spelling of a word, to the slots that claim it.
 *
 * Read the way the dictionary stores it: every stored form under its code
 * (`slotCodeOf` reads a principal part and an Ekilex code alike), the persons
 * a rule builds on a verb's stored first person, and the cases a rule builds
 * on a nominal's genitive stem. Two vocabularies of slot sit side by side for
 * a nominal, Ekilex's codes and the case keys, and that is harmless because
 * both words of a pair are indexed the same way.
 */
export function slotIndex(row: Pick<TwinRow, "lemma" | "pos" | "forms">): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const claim = (spelling: string | null | undefined, slot: string | null | undefined) => {
    const form = spelling?.trim().toLocaleLowerCase("et");
    if (!form || !slot || form.includes(" ")) return;
    const held = out.get(form) ?? new Set<string>();
    held.add(slot);
    out.set(form, held);
  };
  for (const f of row.forms) claim(f.value, slotCodeOf(f));
  if (row.pos === "VERB") {
    for (const d of derivedVerbForms({ lemma: row.lemma, pres1sg: pres1sgFrom(row.forms) ?? undefined })) {
      claim(d.value, d.morphCode);
    }
  } else {
    for (const [spelling, keys] of caseIndex(stemsFrom(row.forms))) for (const key of keys) claim(spelling, key);
  }
  return out;
}

/**
 * The spelling of a word that sits in the same slot as a form of its twin.
 *
 * The spelling whose slots match exactly is preferred, then the one sharing
 * the most, then the first stored. Null where no spelling shares a slot at all,
 * which drops the sentence.
 */
export function sameSlot(index: Map<string, Set<string>>, slots: ReadonlySet<string>): string | null {
  let best: { spelling: string; shared: number; exact: boolean } | null = null;
  for (const [spelling, held] of index) {
    let shared = 0;
    for (const s of held) if (slots.has(s)) shared++;
    if (shared === 0) continue;
    const exact = shared === held.size && shared === slots.size;
    if (!best || (exact && !best.exact) || (exact === best.exact && shared > best.shared)) {
      best = { spelling, shared, exact };
    }
  }
  return best?.spelling ?? null;
}

function capitalLike(text: string, like: string): string {
  const first = like[0];
  if (!first || first === first.toLocaleLowerCase("et")) return text;
  return text[0] ? text[0].toLocaleUpperCase("et") + text.slice(1) : text;
}

function cardsShape(row: TwinRow, borrowed: readonly Example[], rank: Rank | undefined): LexemeForCards {
  return {
    lemma: row.lemma, translation: row.translation, pos: row.pos, semanticTypes: null,
    gradation: "NONE", gradationNote: null, government: null, examples: row.examples,
    plainest: rank, forms: row.forms, borrowed: [...borrowed],
  } as LexemeForCards;
}

interface Found { example: Example; form: string; slots: Set<string>; en: string }

/** The sentences a word can be gapped out of, with the form and the slots it is in. */
function sentencesOf(
  row: TwinRow, index: Map<string, Set<string>>, borrowed: readonly Example[], rank: Rank | undefined,
): Found[] {
  const own = parseExamples(row.examples);
  // What a gap may hide is one answer for the whole app: the forms
  // `gapForms` reaches, narrowed here to one spelling in this sentence.
  const hideable = gapForms(row);
  const out: Found[] = [];
  for (const example of formSentencesFor(cardsShape(row, borrowed, rank))) {
    const words = sentenceWords(example.et);
    if (words.length < 3 || words.length > MAX_WORDS) continue;
    const en = (sentenceEnglish(own, example.et) ?? example.en)?.trim();
    if (!en) continue;
    for (const word of words) {
      const slots = index.get(word);
      if (!slots || !hideable.has(word) || !lentFor(example, word)) continue;
      out.push({ example, form: word, slots, en });
      break;
    }
  }
  return out;
}

/**
 * The sentence questions one word of a group can be asked, best first.
 *
 * Exported so `twinQuestions.test.ts` can build every one the shipped
 * dictionary makes and ask whether any prints its own answer.
 */
export function sentenceQuestionsFor(
  group: TwinGroup,
  word: TwinWord,
  rows: ReadonlyMap<string, TwinRow>,
  borrowed: (lexemeId: string) => readonly Example[],
  rank: (row: TwinRow) => Rank | undefined,
  scope: ModuleScope | null,
  limit = 2,
): TwinSentenceQuestion[] {
  const row = rows.get(`${word.lemma}|${word.pos}`);
  if (!row) return [];
  const others = group.words.filter((w) => w.lemma !== word.lemma);
  const indexes = new Map(group.words.flatMap((w) => {
    const r = rows.get(`${w.lemma}|${w.pos}`);
    return r ? [[w.lemma, slotIndex(r)] as const] : [];
  }));
  if (indexes.size !== group.words.length) return [];

  const out: TwinSentenceQuestion[] = [];
  for (const found of sentencesOf(row, indexes.get(word.lemma)!, borrowed(row.id), rank(row))) {
    // Inside the module, a form is asked only once the page teaching it is read.
    const slot = [...found.slots][0];
    if (!slotWithin(scope, slot, word.lemma)) continue;
    // A spelling one of the other words also has is no question at all.
    if (others.some((o) => indexes.get(o.lemma)!.has(found.form))) continue;

    const cloze = buildCloze(found.example.et, [found.form]);
    if (!cloze) continue;
    const options: TwinOption[] = [{ lemma: word.lemma, text: cloze.answer, means: word.means }];
    let complete = true;
    for (const o of others) {
      const spelling = sameSlot(indexes.get(o.lemma)!, found.slots);
      if (!spelling) { complete = false; break; }
      options.push({ lemma: o.lemma, text: capitalLike(spelling, cloze.answer), means: o.means });
    }
    if (!complete) continue;
    const texts = options.map((o) => o.text.toLocaleLowerCase("et"));
    if (new Set(texts).size !== texts.length) continue;
    // The gap may not leave another option standing in the line beside it.
    if (options.some((o) => mentions(cloze.text, o.text))) continue;

    const ordered = rotate(options, found.example.et.length);
    const contrast = contrastFor(group, word, rows, indexes, borrowed, rank);
    out.push({
      shape: "sentence",
      groupId: group.id,
      kind: group.kind,
      drifted: group.drifted === true,
      tell: group.tell ?? null,
      lexemeId: row.id,
      lemma: word.lemma,
      gloss: row.translation,
      gapped: cloze.text,
      sentence: cloze.full,
      form: cloze.answer,
      en: found.en,
      options: ordered,
      answer: ordered.findIndex((o) => o.lemma === word.lemma),
      standIns: ordered.flatMap((o, i) => (o.lemma !== word.lemma && mayStandIn(o.lemma, word.lemma, found.en) ? [i] : [])),
      contrast,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * The options in an order the sentence fixes, so a reload asks the same
 * question the same way and the answer is not always first. A rotation rather
 * than a shuffle, because this module holds no random source.
 */
function rotate<T>(items: readonly T[], seed: number): T[] {
  const k = items.length === 0 ? 0 : seed % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}

/** A recorded sentence holding one of the other words, for after the answer. */
function contrastFor(
  group: TwinGroup,
  word: TwinWord,
  rows: ReadonlyMap<string, TwinRow>,
  indexes: ReadonlyMap<string, Map<string, Set<string>>>,
  borrowed: (lexemeId: string) => readonly Example[],
  rank: (row: TwinRow) => Rank | undefined,
): TwinSentence | null {
  for (const other of group.words) {
    if (other.lemma === word.lemma) continue;
    const row = rows.get(`${other.lemma}|${other.pos}`);
    const index = indexes.get(other.lemma);
    if (!row || !index) continue;
    const found = sentencesOf(row, index, borrowed(row.id), rank(row))[0];
    if (found) return { lemma: other.lemma, lexemeId: row.id, sentence: found.example.et, form: found.form, en: found.en };
  }
  return null;
}

/**
 * The guessing question for a pair a rule built: one word and its meaning, and
 * what the other one means.
 *
 * Three meanings to pick from: the right one, the known word's own (which is
 * the mix-up the rule exists to stop), and one more from another pair of the
 * same kind, chosen by `pick` so the caller decides how random it is.
 */
export function guessQuestionFor(
  group: TwinGroup,
  rows: ReadonlyMap<string, TwinRow>,
  askLong: boolean,
  decoy: string,
): TwinGuessQuestion | null {
  const [short, long] = group.words;
  if (!short || !long) return null;
  const known = askLong ? short : long;
  const asked = askLong ? long : short;
  const row = rows.get(`${asked.lemma}|${asked.pos}`);
  if (!row || decoy === asked.means || decoy === known.means) return null;
  const options = rotate([asked.means, known.means, decoy], asked.lemma.length + known.lemma.length);
  return {
    shape: "guess",
    groupId: group.id,
    kind: group.kind,
    known: { lemma: known.lemma, means: known.means },
    asked: { lemma: asked.lemma, lexemeId: row.id },
    options,
    answer: options.indexOf(asked.means),
  };
}
