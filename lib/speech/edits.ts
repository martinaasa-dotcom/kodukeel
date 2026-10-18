/**
 * HOW MANY OF THE WORDS HEARD WERE CHANGED BEFORE SENDING (docs/41-fifth-batch.md, D3, VB-14).
 *
 * Every transcript lands in a box the learner can change before it counts, so
 * the share of heard words changed is the in-app stand-in for a panel of real
 * voices: an upper bound on misrecognition, since a learner also edits their
 * own grammar. Counted here, on the device, where both texts are, and only the
 * two numbers ever leave it: what the recognizer heard is not sent (D21).
 *
 * A word heard counts as changed where the sent text does not hold it, as a
 * multiset, so a word said twice and kept once is one change. Case and the
 * punctuation round a word are not a change, since the box writes a capital
 * and a learner adds a full stop.
 */
const word = (raw: string) => raw.toLocaleLowerCase("et").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
const wordsOf = (text: string) => text.split(/\s+/).map(word).filter(Boolean);

export interface EditCounts {
  readonly wordsHeard: number;
  readonly wordsChanged: number;
}

export function editCounts(heard: string, sent: string): EditCounts {
  const heardWords = wordsOf(heard);
  const kept = new Map<string, number>();
  for (const w of wordsOf(sent)) kept.set(w, (kept.get(w) ?? 0) + 1);
  let changed = 0;
  for (const w of heardWords) {
    const left = kept.get(w) ?? 0;
    if (left > 0) kept.set(w, left - 1);
    else changed += 1;
  }
  return { wordsHeard: heardWords.length, wordsChanged: changed };
}

/** How many words a text holds, read the way `editCounts` reads them. */
export function wordCount(text: string): number {
  return wordsOf(text).length;
}

/**
 * WHETHER WHAT IS ABOUT TO BE MARKED IS WHAT WAS HEARD, word for word.
 *
 * `Review.spoken` says an answer was said aloud and marked on what was heard
 * (D4), and it is what the "said aloud" reading on Progress and the recall
 * comparison in `npm run report:speech` both read. An answer the learner
 * changed after the microphone filled the box is partly typed, and one they
 * cleared and typed over is not spoken at all, so neither is written as spoken.
 * The same words in the same order, with case and the punctuation round a word
 * ignored as `editCounts` ignores them: a capital the box wrote and a full stop
 * a learner added are not an edit. Where nothing was heard, nothing was said.
 */
export function keptAsHeard(heard: string, sent: string): boolean {
  const said = wordsOf(heard);
  const marked = wordsOf(sent);
  return said.length > 0 && said.length === marked.length && said.every((w, i) => w === marked[i]);
}
