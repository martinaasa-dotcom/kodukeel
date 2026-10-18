/**
 * ESTONIAN SAID BY A PERSON, WHERE A PERSON HAS SAID IT.
 *
 * Every other clip in this app is TartuNLP's synthetic voice, and for a
 * sentence that is good. For the sounds themselves it is not: the service
 * reads sentences, so a bare `õ` or a held `mm` is a fragment to it, and the
 * difference between `kapp` and `kapis` is a length a vocoder smooths over.
 * So the native Estonian speaker who develops this app recorded them, read off
 * a script, in one take: the sounds alone, the length contrasts, lesson 1's
 * words at two speeds, the months, the numbers, two dialogues and the alphabet.
 *
 * This is the catalog of those clips. `scripts/build-native-audio.ts` cuts
 * them out of the recording in `scripts/recordings/`, trims and levels them
 * through the same `lib/audio/wav.ts` every synthetic clip goes through, and
 * writes `public/audio/native/<id>.wav`; `native.test.ts` holds the catalog
 * and the files to each other in both directions.
 *
 * Two ways in. A screen about sounds plays a clip by id (`nativeClip`). And
 * any speaker button whose text is one of these words or lines plays the
 * person instead of the synthesizer (`nativeFor`), unless the screen chose a
 * voice on purpose: a conversation's cast and the listening round's changing
 * speakers keep theirs, because one person playing every part is not a
 * conversation.
 *
 * A sound and a letter's name are never looked up by text: `a` is a vowel on
 * one screen and the name of a letter on another, and only the screen knows
 * which it meant.
 *
 * Pure. No React, no network; the browser half is `lib/audio/clip.ts`.
 */

export type NativeKind =
  /** A sound on its own: a vowel held, a consonant breathed or hissed. */
  | "sound"
  /** A word or phrase, at the speed somebody says it, or slowly where `slow`. */
  | "word"
  /** One of a set of words that differ only in how long a sound is held. */
  | "length"
  /** One of two words a learner is told to listen hard to tell apart. */
  | "pair"
  | "month"
  | "number"
  /** A phone number, read the way somebody reads one out, digit by digit. */
  | "phone"
  /** A word said with its stress where Estonian puts it, on the first syllable. */
  | "stress"
  /** A whole line of one of the first two lessons' conversations. */
  | "line"
  /** The name of a letter of the alphabet, the way it is said when spelling. */
  | "letter";

export interface NativeClip {
  readonly id: string;
  /** What is said, as it is written; for a letter, the letter. */
  readonly text: string;
  readonly kind: NativeKind;
  /** Said slowly on purpose, beside a take of the same text at speed. */
  readonly slow?: boolean;
}

export const NATIVE_CLIPS: readonly NativeClip[] = [
  { id: "sound-a", text: "a", kind: "sound" },
  { id: "sound-e", text: "e", kind: "sound" },
  { id: "sound-i", text: "i", kind: "sound" },
  { id: "sound-o", text: "o", kind: "sound" },
  { id: "sound-u", text: "u", kind: "sound" },
  { id: "sound-ae", text: "ä", kind: "sound" },
  { id: "sound-ou", text: "õ", kind: "sound" },
  { id: "sound-oe", text: "ö", kind: "sound" },
  { id: "sound-ue", text: "ü", kind: "sound" },
  { id: "sound-h", text: "h", kind: "sound" },
  { id: "sound-v", text: "v", kind: "sound" },
  { id: "sound-r", text: "r", kind: "sound" },
  { id: "sound-s", text: "s", kind: "sound" },
  { id: "sound-sh", text: "š", kind: "sound" },
  { id: "sound-zh", text: "ž", kind: "sound" },
  { id: "sound-m", text: "m", kind: "sound" },
  { id: "sound-mm", text: "mm", kind: "sound" },
  { id: "vowel-pood", text: "pood", kind: "word" },
  { id: "vowel-tee", text: "tee", kind: "word" },
  { id: "vowel-oeoe", text: "öö", kind: "word" },
  { id: "vowel-kuu", text: "kuu", kind: "word" },
  { id: "vowel-toeoe", text: "töö", kind: "word" },
  { id: "vowel-suur", text: "suur", kind: "word" },
  { id: "vowel-vesi", text: "vesi", kind: "word" },
  { id: "vowel-ema", text: "ema", kind: "word" },
  { id: "vowel-ei", text: "ei", kind: "word" },
  { id: "vowel-leib", text: "leib", kind: "word" },
  { id: "vowel-jah", text: "jah", kind: "word" },
  { id: "length-kapp", text: "kapp", kind: "length" },
  { id: "length-kapis", text: "kapis", kind: "length" },
  { id: "length-kott", text: "kott", kind: "length" },
  { id: "length-kotis", text: "kotis", kind: "length" },
  { id: "length-linn", text: "linn", kind: "length" },
  { id: "length-linna", text: "linna", kind: "length" },
  { id: "length-kama", text: "kama", kind: "length" },
  { id: "length-kamm", text: "kamm", kind: "length" },
  { id: "length-kabi", text: "kabi", kind: "length" },
  { id: "length-kapi", text: "kapi", kind: "length" },
  { id: "length-kappi", text: "kappi", kind: "length" },
  { id: "length-lina", text: "lina", kind: "length" },
  { id: "length-linna-q2", text: "linna", kind: "length" },
  { id: "length-laehen-linna", text: "lähen linna", kind: "length" },
  { id: "word-aitaeh", text: "aitäh", kind: "word" },
  { id: "word-aitaeh-slow", text: "aitäh", kind: "word", slow: true },
  { id: "word-tere-ouhtust", text: "Tere õhtust", kind: "word" },
  { id: "word-tere-ouhtust-slow", text: "Tere õhtust", kind: "word", slow: true },
  { id: "word-tere-hommikust", text: "Tere hommikust", kind: "word" },
  { id: "word-tere-hommikust-slow", text: "Tere hommikust", kind: "word", slow: true },
  { id: "word-tere", text: "Tere", kind: "word" },
  { id: "word-tere-paeevast", text: "Tere päevast", kind: "word" },
  { id: "word-palun", text: "Palun", kind: "word" },
  { id: "word-head-aega", text: "Head aega", kind: "word" },
  { id: "word-naegemist", text: "Nägemist", kind: "word" },
  { id: "pair-kaheksa", text: "kaheksa", kind: "pair" },
  { id: "pair-ueheksa", text: "üheksa", kind: "pair" },
  { id: "pair-juuni", text: "juuni", kind: "pair" },
  { id: "pair-juuli", text: "juuli", kind: "pair" },
  { id: "pair-millal", text: "millal", kind: "pair" },
  { id: "pair-kus", text: "kus", kind: "pair" },
  { id: "month-jaanuar", text: "jaanuar", kind: "month" },
  { id: "month-veebruar", text: "veebruar", kind: "month" },
  { id: "month-maerts", text: "märts", kind: "month" },
  { id: "month-aprill", text: "aprill", kind: "month" },
  { id: "month-mai", text: "mai", kind: "month" },
  { id: "month-juuni", text: "juuni", kind: "month" },
  { id: "month-juuli", text: "juuli", kind: "month" },
  { id: "month-august", text: "august", kind: "month" },
  { id: "month-september", text: "september", kind: "month" },
  { id: "month-oktoober", text: "oktoober", kind: "month" },
  { id: "month-november", text: "november", kind: "month" },
  { id: "month-detsember", text: "detsember", kind: "month" },
  { id: "number-null", text: "null", kind: "number" },
  { id: "number-ueks", text: "üks", kind: "number" },
  { id: "number-kaks", text: "kaks", kind: "number" },
  { id: "number-kolm", text: "kolm", kind: "number" },
  { id: "number-neli", text: "neli", kind: "number" },
  { id: "number-viis", text: "viis", kind: "number" },
  { id: "number-kuus", text: "kuus", kind: "number" },
  { id: "number-seitse", text: "seitse", kind: "number" },
  { id: "number-kaheksa", text: "kaheksa", kind: "number" },
  { id: "number-ueheksa", text: "üheksa", kind: "number" },
  { id: "number-kuemme", text: "kümme", kind: "number" },
  { id: "phone-number", text: "viis viis viis üks kaks kolm neli", kind: "phone" },
  { id: "stress-hommikust", text: "hommikust", kind: "stress" },
  { id: "stress-ouhtust", text: "õhtust", kind: "stress" },
  { id: "stress-kohv", text: "kohv", kind: "stress" },
  { id: "stress-hea", text: "hea", kind: "stress" },
  { id: "stress-halb", text: "halb", kind: "stress" },
  { id: "line-tere-tere", text: "Tere, tere!", kind: "line" },
  { id: "line-vabandust-ma-ei-saa-aru-palun-korrake", text: "Vabandust, ma ei saa aru. Palun korrake.", kind: "line" },
  { id: "line-aeglasemalt-palun", text: "Aeglasemalt, palun.", kind: "line" },
  { id: "line-kas-te-raeaegite-inglise-keelt", text: "Kas te räägite inglise keelt?", kind: "line" },
  { id: "line-jah-natuke", text: "Jah, natuke.", kind: "line" },
  { id: "line-selge-aitaeh", text: "Selge! Aitäh!", kind: "line" },
  { id: "letter-a", text: "A", kind: "letter" },
  { id: "letter-b", text: "B", kind: "letter" },
  { id: "letter-c", text: "C", kind: "letter" },
  { id: "letter-d", text: "D", kind: "letter" },
  { id: "letter-e", text: "E", kind: "letter" },
  { id: "letter-f", text: "F", kind: "letter" },
  { id: "letter-g", text: "G", kind: "letter" },
  { id: "letter-h", text: "H", kind: "letter" },
  { id: "letter-i", text: "I", kind: "letter" },
  { id: "letter-j", text: "J", kind: "letter" },
  { id: "letter-k", text: "K", kind: "letter" },
  { id: "letter-l", text: "L", kind: "letter" },
  { id: "letter-m", text: "M", kind: "letter" },
  { id: "letter-n", text: "N", kind: "letter" },
  { id: "letter-o", text: "O", kind: "letter" },
  { id: "letter-p", text: "P", kind: "letter" },
  { id: "letter-q", text: "Q", kind: "letter" },
  { id: "letter-r", text: "R", kind: "letter" },
  { id: "letter-s", text: "S", kind: "letter" },
  { id: "letter-sh", text: "Š", kind: "letter" },
  { id: "letter-z", text: "Z", kind: "letter" },
  { id: "letter-zh", text: "Ž", kind: "letter" },
  { id: "letter-t", text: "T", kind: "letter" },
  { id: "letter-u", text: "U", kind: "letter" },
  { id: "letter-v", text: "V", kind: "letter" },
  { id: "letter-w", text: "W", kind: "letter" },
  { id: "letter-ou", text: "Õ", kind: "letter" },
  { id: "letter-ae", text: "Ä", kind: "letter" },
  { id: "letter-oe", text: "Ö", kind: "letter" },
  { id: "letter-ue", text: "Ü", kind: "letter" },
  { id: "letter-x", text: "X", kind: "letter" },
  { id: "letter-y", text: "Y", kind: "letter" },
];

const BY_ID = new Map(NATIVE_CLIPS.map((clip) => [clip.id, clip]));

/** The clip with this id. Throws on an id the catalog does not hold, which is a typo in a screen. */
export function nativeClip(id: string): NativeClip {
  const clip = BY_ID.get(id);
  if (!clip) throw new Error(`No native recording "${id}"`);
  return clip;
}

/**
 * WHICH CUT OF THE RECORDING THE FILES ARE. Raised whenever
 * `scripts/build-native-audio.ts` is run against a new recording or a new cut
 * list, because the service worker keeps a clip under its url for good and a
 * url that names the cut is the only way a re-cut clip reaches a phone that
 * heard the old one. Cut 2 found the ends of the words, below.
 */
export const NATIVE_CUT = 2;

/** Where the browser fetches a clip. */
export function nativeUrl(id: string): string {
  return `/audio/native/${id}.wav?v=${NATIVE_CUT}`;
}

/**
 * What two spellings of one utterance share: case, the punctuation and the
 * spacing gone. `Tere!` on a card and `Tere` in the recording are one word.
 */
export function utteranceKey(text: string): string {
  return text
    .toLocaleLowerCase("et")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * NOT EVERY CLIP ANSWERS FOR ITS SPELLING. `linna` is in the recording twice,
 * once as "of the town" and once as "into the town", which Estonian spells
 * alike and says differently, so neither may stand in for `linna` on a card
 * that has not said which it meant.
 */
const AMBIGUOUS = new Set(["length-linna", "length-linna-q2"]);

/**
 * Which kinds answer for a spelling, in the order they win: the words said as
 * words first, then the series that were said in a list, then the lines, then
 * the pairs and the lengths, which were said against a neighbor and are the
 * most marked.
 */
const LOOKUP_ORDER: readonly NativeKind[] = ["word", "month", "number", "stress", "line", "pair", "length"];

const LOOKUP = (() => {
  const atSpeed = new Map<string, NativeClip>();
  const slowly = new Map<string, NativeClip>();
  for (const kind of LOOKUP_ORDER) {
    for (const clip of NATIVE_CLIPS) {
      if (clip.kind !== kind || AMBIGUOUS.has(clip.id)) continue;
      const into = clip.slow ? slowly : atSpeed;
      const key = utteranceKey(clip.text);
      if (!into.has(key)) into.set(key, clip);
    }
  }
  return { atSpeed, slowly };
})();

/**
 * The recording that says this text, or null. Asked for slowly, the slow take
 * where there is one, and the take at speed otherwise, which the player then
 * slows the way it slows everything (`lib/audio/stretch.ts`).
 */
export function nativeFor(text: string, { slow = false }: { slow?: boolean } = {}): NativeClip | null {
  const key = utteranceKey(text);
  if (!key) return null;
  if (slow) {
    const taken = LOOKUP.slowly.get(key);
    if (taken) return taken;
  }
  return LOOKUP.atSpeed.get(key) ?? null;
}
