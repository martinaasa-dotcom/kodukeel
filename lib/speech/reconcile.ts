import { soundKey } from "@/lib/estonian/sounds";
import type { Decoding, RawTurn } from "./engine";

/**
 * WHAT WAS HEARD, AND WHAT IT IS READ AS, KEPT APART.
 *
 * Two transcripts with two jobs (`docs/39-speech.md` D4, section 3.3):
 *
 *   `heard` is the model's own greedy reading, exactly as it came back. It is
 *   the only text anything about *sounds* may ever be read from, and in this
 *   batch nothing is: the model writes most mispronounced words as the right
 *   word, so a transcript says whether the words came across and nothing
 *   reliable about how they were said.
 *
 *   `understood` is `heard` with the hesitation marks taken out and a word the
 *   dictionary does not hold repaired, in the only ways the dictionary can
 *   vouch for. It is what goes into the box, and from there into a
 *   conversation or an answer exactly as typed text does.
 *
 * Every word also carries whether the machine was unsure of it: the forms
 * list does not hold it, or the second decoding of the same audio heard
 * something else. That rule was measured at 83.2% of marked words really
 * wrong, against 34.8% for a confidence line, and the box draws such a word
 * with a dotted underline.
 *
 * Nothing here is a model and nothing here writes Estonian (ADR-005): a repair
 * only ever swaps a non-word for a spelling the caller handed in as one the
 * moment could hold, and only where exactly one such spelling qualifies.
 */

export type RepairRule = "sound" | "boundary" | "joined" | "hesitation";

export interface Repair {
  /** What was heard, one word or two. */
  readonly from: string;
  /** What it was read as. Empty where a hesitation was taken out. */
  readonly to: string;
  readonly rule: RepairRule;
}

export interface HeardWord {
  /** The word as it goes into the box. */
  readonly text: string;
  /** What the model heard in its place, which differs only where a repair was made. */
  readonly heard: string;
  /** Drawn dotted: the forms list does not hold it, the two decodings disagree, or it was repaired. */
  readonly unsure: boolean;
  /** The dictionary turned a non-word into this; such a word earns no grade (D13). */
  readonly repaired: boolean;
  /** Heard identically by both decodings. Part of "heard as spelled" (D19). */
  readonly agreed: boolean;
  /** The forms list holds the word as heard. `null` where nobody could ask, offline. */
  readonly known: boolean | null;
}

export interface Hearing {
  readonly heard: string;
  readonly understood: string;
  readonly words: readonly HeardWord[];
  readonly repairs: readonly Repair[];
  /** Seconds of speech, for the reading on Progress. */
  readonly seconds: number;
}

export interface ReconcileOptions {
  /**
   * Whether the forms list holds a spelling, lower-cased. Answers `true` or
   * `false` where it was asked, and `undefined` where it could not be, which is
   * the offline case: then only the two decodings decide what is unsure.
   */
  readonly known?: (word: string) => boolean | undefined;
  /**
   * The spellings this moment could honestly contain, lower-cased: a scene's
   * forms, a card's answers. A repair may land only on one of these. Empty
   * means no repair is made, which is the honest answer where nobody knows
   * what could be said.
   */
  readonly expect?: ReadonlySet<string>;
}

/** The marks the model writes for a filled pause: `e`, `ee`, `mhm`, an `e-` glued to a word. */
const HESITATION = /^(e+|m+h*m*|h+m+|ah+|oh+)$/;
const GLUED = /^e-(?=\p{L})/u;

/** A word as compared: lower-cased, its edge punctuation off. Diacritics are kept, because they are the spelling. */
export function core(word: string): string {
  return word.normalize("NFC").toLocaleLowerCase("et").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function wordsOf(text: string): string[] {
  return text.normalize("NFC").split(/\s+/).filter(Boolean);
}

/**
 * Which greedy words the beam reading heard the same, by the longest common
 * run of cores. A word the beam put in a different place is still agreed on.
 */
function agreement(greedy: readonly string[], beam: readonly string[]): boolean[] {
  const a = greedy.map(core);
  const b = beam.map(core);
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const agreed = new Array<boolean>(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { agreed[i] = true; i++; j++; }
    else if (table[i + 1]![j]! >= table[i]![j + 1]!) i++;
    else j++;
  }
  return agreed;
}

/** The one spelling in `expect` that sounds like `word`, or nothing where none or several do. */
function onlySoundAlike(word: string, expect: ReadonlySet<string>, keys: ReadonlyMap<string, string[]>): string | null {
  const key = soundKey(word);
  if (!key) return null;
  const found = keys.get(key) ?? [];
  const distinct = [...new Set(found)];
  return distinct.length === 1 && distinct[0] !== word ? distinct[0]! : null;
}

function keysOf(expect: ReadonlySet<string>): Map<string, string[]> {
  const keys = new Map<string, string[]>();
  for (const spelling of expect) {
    const key = soundKey(spelling);
    if (!key) continue;
    const list = keys.get(key);
    if (list) list.push(spelling);
    else keys.set(key, [spelling]);
  }
  return keys;
}

/** Keep a word's capital and its trailing punctuation when its letters are swapped. */
function dress(original: string, replacement: string): string {
  const trailing = /[^\p{L}\p{N}]+$/u.exec(original)?.[0] ?? "";
  const leading = /^[^\p{L}\p{N}]+/u.exec(original)?.[0] ?? "";
  const first = original.replace(/^[^\p{L}\p{N}]+/u, "").charAt(0);
  const capital = first !== "" && first === first.toLocaleUpperCase("et") && first !== first.toLocaleLowerCase("et");
  const body = capital ? replacement.charAt(0).toLocaleUpperCase("et") + replacement.slice(1) : replacement;
  return leading + body + trailing;
}

/** What one finished turn was heard as, and read as. */
export function reconcile(turn: RawTurn, options: ReconcileOptions = {}): Hearing {
  const known = options.known ?? (() => undefined);
  const expect = options.expect ?? new Set<string>();
  const keys = keysOf(expect);
  const heard = turn.greedy.text.trim();
  const greedy = wordsOf(heard);
  const agreed = agreement(greedy, wordsOf(turn.beam.text));
  const repairs: Repair[] = [];
  const words: HeardWord[] = [];

  for (let i = 0; i < greedy.length; i++) {
    let word = greedy[i]!;
    const glued = GLUED.exec(word);
    if (glued) {
      repairs.push({ from: word, to: word.slice(glued[0].length), rule: "hesitation" });
      word = word.slice(glued[0].length);
    }
    const c = core(word);
    if (!c) continue;
    if (HESITATION.test(c)) {
      repairs.push({ from: word, to: "", rule: "hesitation" });
      continue;
    }
    const isKnown = known(c) ?? null;

    if (isKnown === false && expect.size > 0) {
      // Two words heard as one: `kirjutusretsepti` is `kirjutas retsepti`, one boundary away.
      const next = greedy[i + 1];
      const joined = next ? onlySoundAlike(c + core(next), expect, keys) : null;
      if (joined && known(core(next!)) === false) {
        const text = dress(next!, joined);
        repairs.push({ from: `${word} ${next}`, to: text, rule: "joined" });
        words.push({ text, heard: `${word} ${next}`, unsure: true, repaired: true, agreed: false, known: false });
        i++;
        continue;
      }
      const alike = onlySoundAlike(c, expect, keys);
      if (alike) {
        const text = dress(word, alike);
        repairs.push({ from: word, to: text, rule: "sound" });
        words.push({ text, heard: word, unsure: true, repaired: true, agreed: agreed[i]!, known: false });
        continue;
      }
      const split = boundary(c, keys);
      if (split) {
        const text = dress(word, split);
        repairs.push({ from: word, to: text, rule: "boundary" });
        words.push({ text, heard: word, unsure: true, repaired: true, agreed: agreed[i]!, known: false });
        continue;
      }
    }

    words.push({
      text: word,
      heard: word,
      unsure: isKnown === false || !agreed[i],
      repaired: false,
      agreed: agreed[i]!,
      known: isKnown,
    });
  }

  return {
    heard,
    understood: words.map((w) => w.text).join(" "),
    words,
    repairs,
    seconds: turn.seconds,
  };
}

/** One word heard where two were meant: the one split whose halves each sound like exactly one expected spelling. */
function boundary(word: string, keys: ReadonlyMap<string, string[]>): string | null {
  const found: string[] = [];
  for (let at = 2; at <= word.length - 2; at++) {
    const left = keys.get(soundKey(word.slice(0, at))) ?? [];
    const right = keys.get(soundKey(word.slice(at))) ?? [];
    const l = [...new Set(left)];
    const r = [...new Set(right)];
    if (l.length === 1 && r.length === 1) found.push(`${l[0]} ${r[0]}`);
  }
  const distinct = [...new Set(found)];
  return distinct.length === 1 ? distinct[0]! : null;
}

/** A decoding with nothing in it, for a turn where nothing was said. */
export const SILENT: Decoding = { text: "", tokens: [], timestamps: [], logProbs: [] };

/** The spoken words, without hesitations, each as compared: what a match or a verdict reads. */
export function coresOf(hearing: Hearing): string[] {
  return hearing.words.map((w) => core(w.text)).filter(Boolean);
}
