import { JOKES, jokesFor, splitLine, voiceFor } from "@/lib/collections/jokes";
import { annotateTexts, plainTexts, type ReadableHeadline } from "@/lib/dict/headlines";

/**
 * THE JOKE OF THE DAY, READY TO DRAW: TODAY'S AND A FEW SPARES.
 *
 * The card shows today's joke and offers "another one", so it is handed the
 * next few off the same walk (`jokesFor`) rather than a server action per
 * press: five more jokes is a few hundred bytes, and a button that has to ask
 * the server for a joke is a button that can fail. Each line comes with the
 * dictionary under every word it vouches for, through the same gate the news
 * headlines go through (`annotateTexts`), so a learner can tap `kodutöö` in
 * the middle of a joke and land on its entry.
 *
 * Held in memory per day for the instance, since a day's jokes are the same
 * for everybody whose day it is, and for a few days at once, because learners
 * in two time zones are on two different days for part of every day.
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

/** Today's and five more, which is more than anybody presses for over breakfast. */
export const JOKES_ON_THE_CARD = 6;

/** Days held at once: yesterday, today and tomorrow somewhere in the world. */
const DAYS_HELD = 3;
const memo = new Map<string, DrawnJoke[]>();

export async function jokesToday(dayKey: string): Promise<DrawnJoke[]> {
  const held = memo.get(dayKey);
  if (held) return held;
  const picked = jokesFor(dayKey, JOKES_ON_THE_CARD).map((i) => JOKES[i]!);
  const lines = picked.flatMap((joke) => joke.map(([et, en]) => ({ et: splitLine(et), en: splitLine(en) })));
  const texts = lines.map((l) => l.et.text);
  let annotated: ReadableHeadline[];
  let keep = true;
  try {
    annotated = await annotateTexts(texts);
  } catch {
    annotated = plainTexts(texts);
    keep = false;
  }
  let at = 0;
  const jokes = picked.map((joke) =>
    joke.map(() => {
      const line = lines[at]!;
      const tokens = annotated[at]!.tokens;
      at += 1;
      return { by: line.et.by, byEn: line.en.by, tokens, said: line.et.text, voice: voiceFor(line.et.by), en: line.en.text };
    }),
  );
  if (keep) {
    memo.set(dayKey, jokes);
    while (memo.size > DAYS_HELD) memo.delete(memo.keys().next().value!);
  }
  return jokes;
}
