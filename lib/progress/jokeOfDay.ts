import { JOKES, jokesForVisit, splitLine, voiceFor } from "@/lib/collections/jokes";
import { annotateTexts, plainTexts, type ReadableHeadline } from "@/lib/dict/headlines";

/**
 * THE JOKE ON TODAY, READY TO DRAW: A NEW ONE EACH VISIT AND A FEW SPARES.
 *
 * The card shows one joke and offers "another one", so it is handed a few
 * drawn at once (`jokesForVisit`) rather than a server action per
 * press: five more jokes is a few hundred bytes, and a button that has to ask
 * the server for a joke is a button that can fail. Each line comes with the
 * dictionary under every word it vouches for, through the same gate the news
 * headlines go through (`annotateTexts`), so a learner can tap `kodutöö` in
 * the middle of a joke and land on its entry.
 *
 * A new draw on every visit, which is what the operator asked for: a joke
 * already read is spent. What is held for the instance is each joke's
 * dictionary reading, keyed on the joke, since that is the same for everybody.
 *
 * NEVER THE REASON TODAY DOES NOT LOAD. The dictionary is asked once for all
 * the lines, and where it cannot answer the joke is drawn with plain words
 * and not remembered, so the next visit asks again. A joke with no dotted
 * words is a smaller joke; a home page that throws is no home page at all.
 */
export interface DrawnLine {
  /** Who says it, in Estonian, or null for the narrator. */
  by: string | null;
  /** Who says it, in English, for the line under it. */
  byEn: string | null;
  tokens: ReadableHeadline["tokens"];
  /** The line said aloud: what is said, without who says it. */
  said: string;
  /** The voice it is read in, or null for the learner's own. */
  voice: string | null;
  en: string;
}

export type DrawnJoke = DrawnLine[];

/** The one the card opens with and five more, which is more than anybody presses for over breakfast. */
export const JOKES_ON_THE_CARD = 6;

/**
 * Each joke drawn with its dictionary, remembered by its index for the life of
 * the instance. Bounded by the table itself, a few hundred lines, and a joke is
 * the same joke for everybody, so the second visit to draw it reads it from here.
 */
const memo = new Map<number, DrawnJoke>();

/**
 * A fresh handful for this visit: a new draw on every render of Today, so a
 * learner coming back to the page or reloading it meets another joke.
 *
 * `linked` is the learner's word-gloss setting (`lib/ux/wordGloss.ts`): off,
 * which is the default, means the words are drawn plain and the dictionary is
 * not asked at all, because off is the producer not looking rather than a
 * screen hiding what it found.
 */
export async function jokesForThisVisit(
  { linked, random = Math.random }: { linked: boolean; random?: () => number },
): Promise<DrawnJoke[]> {
  const picked = jokesForVisit(JOKES_ON_THE_CARD, random);
  if (!linked) return picked.map((i) => draw(i, plainTexts(JOKES[i]!.map(([et]) => splitLine(et).text))));
  const missing = picked.filter((i) => !memo.has(i));
  if (missing.length > 0) {
    const texts = missing.flatMap((i) => JOKES[i]!.map(([et]) => splitLine(et).text));
    let annotated: ReadableHeadline[];
    let keep = true;
    try {
      annotated = await annotateTexts(texts);
    } catch {
      annotated = plainTexts(texts);
      keep = false;
    }
    let at = 0;
    const drawn = new Map<number, DrawnJoke>();
    for (const i of missing) {
      const count = JOKES[i]!.length;
      drawn.set(i, draw(i, annotated.slice(at, at + count)));
      at += count;
    }
    if (!keep) return picked.map((i) => memo.get(i) ?? drawn.get(i)!);
    for (const [i, joke] of drawn) memo.set(i, joke);
  }
  return picked.map((i) => memo.get(i)!);
}

/** One joke's lines, each with the reading the dictionary gave it (or a plain one). */
function draw(index: number, readings: ReadableHeadline[]): DrawnJoke {
  return JOKES[index]!.map(([et, en], j) => {
    const said = splitLine(et);
    const english = splitLine(en);
    return {
      by: said.by,
      byEn: english.by,
      tokens: readings[j]!.tokens,
      said: said.text,
      voice: voiceFor(said.by),
      en: english.text,
    };
  });
}
