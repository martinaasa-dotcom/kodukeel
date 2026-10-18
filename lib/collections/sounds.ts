/**
 * EVERY SOUND OF ESTONIAN, ON ONE PAGE, SAID BY A PERSON (`/grammar/sounds`).
 *
 * What the page shows and in what order, as data, so a test can hold every
 * recording it names to the catalog (`lib/audio/native.ts`) and the page can
 * stay a layout. Nothing Estonian is typed here: every word on the page is a
 * recording's own text, said by the native speaker who develops this app, and
 * the English is what each one means or what to do with your mouth.
 *
 * The order is the order a learner meets the trouble in: the vowels an
 * English speaker has no letter for, then what a doubled letter does, which
 * is the one thing about Estonian a beginner cannot hear yet and has to be
 * told to listen for, then the consonants, then the words that are easy to
 * mix up, then stress, then the alphabet, which is what you need to spell
 * your name to somebody at a counter.
 *
 * Pure.
 */

/** A key: the sound alone, and a line about it. */
export interface SoundNote {
  readonly clip: string;
  readonly glyph: string;
  readonly note?: string;
}

/** A word to press, and what it means. */
export interface HeardWord {
  readonly clip: string;
  readonly en: string;
  /** The letters to highlight. */
  readonly mark?: string;
}

/** Words heard side by side, and what they are there to show. */
export interface WordSet {
  readonly words: readonly HeardWord[];
  readonly caption?: string;
}

/** The nine vowels, each held on its own. The four an English keyboard has not got carry a line. */
export const VOWELS: readonly SoundNote[] = [
  { clip: "sound-a", glyph: "a" },
  { clip: "sound-e", glyph: "e" },
  { clip: "sound-i", glyph: "i" },
  { clip: "sound-o", glyph: "o" },
  { clip: "sound-u", glyph: "u" },
  { clip: "sound-ou", glyph: "õ", note: "an o said with the lips spread, not rounded" },
  { clip: "sound-ae", glyph: "ä", note: "the a in cat" },
  { clip: "sound-oe", glyph: "ö", note: "an e said with rounded lips" },
  { clip: "sound-ue", glyph: "ü", note: "an i said with rounded lips" },
];

/** The four letters the page opens on. */
export const SPECIAL = VOWELS.filter((v) => v.note);

/** A short vowel beside a long one, and two vowels gliding into one syllable. */
export const VOWEL_WORDS: readonly { readonly title: string; readonly words: readonly HeardWord[] }[] = [
  {
    title: "One vowel, short",
    words: [
      { clip: "vowel-vesi", en: "water" },
      { clip: "vowel-ema", en: "mother" },
    ],
  },
  {
    title: "Two the same: one long vowel, held",
    words: [
      { clip: "vowel-pood", en: "shop", mark: "oo" },
      { clip: "vowel-tee", en: "tea, road", mark: "ee" },
      { clip: "vowel-oeoe", en: "night", mark: "öö" },
      { clip: "vowel-kuu", en: "moon, month", mark: "uu" },
      { clip: "vowel-toeoe", en: "work", mark: "öö" },
      { clip: "vowel-suur", en: "big", mark: "uu" },
    ],
  },
  {
    title: "Two different: they glide into one",
    words: [
      { clip: "vowel-ei", en: "no", mark: "ei" },
      { clip: "vowel-leib", en: "bread", mark: "ei" },
      { clip: "month-mai", en: "May", mark: "ai" },
    ],
  },
];

/** The consonants worth listening to, and m against mm. */
export const CONSONANTS: readonly SoundNote[] = [
  { clip: "sound-h", glyph: "h", note: "always said, even at the end of a word" },
  { clip: "sound-r", glyph: "r", note: "rolled with the tip of the tongue" },
  { clip: "sound-s", glyph: "s", note: "always an s, never a z" },
  { clip: "sound-sh", glyph: "š", note: "the sh in shoe" },
  { clip: "sound-zh", glyph: "ž", note: "the s in pleasure" },
  { clip: "sound-v", glyph: "v", note: "like an English v" },
  { clip: "sound-m", glyph: "m", note: "a short m" },
  { clip: "sound-mm", glyph: "mm", note: "a long m: hold it" },
];

/** Words that differ by how long one sound is held. */
export const LENGTH: readonly WordSet[] = [
  { words: [{ clip: "length-kapp", en: "a cupboard", mark: "pp" }, { clip: "length-kapis", en: "in the cupboard", mark: "p" }] },
  { words: [{ clip: "length-kott", en: "a bag", mark: "tt" }, { clip: "length-kotis", en: "in the bag", mark: "t" }] },
  { words: [{ clip: "length-kama", en: "a roasted flour mix", mark: "m" }, { clip: "length-kamm", en: "a comb", mark: "mm" }] },
  {
    caption: "Three lengths: short, long and longer still",
    words: [
      { clip: "length-kabi", en: "a hoof", mark: "b" },
      { clip: "length-kapi", en: "of the cupboard", mark: "p" },
      { clip: "length-kappi", en: "into the cupboard", mark: "pp" },
    ],
  },
  {
    caption: "Spelled alike, said apart: the last one is held longer",
    words: [
      { clip: "length-lina", en: "linen", mark: "n" },
      { clip: "length-linna-q2", en: "of the town", mark: "nn" },
      { clip: "length-laehen-linna", en: "I'm going to town", mark: "nn" },
    ],
  },
];

/** Words a learner is told to listen hard to tell apart. */
export const MIX_UPS: readonly WordSet[] = [
  { words: [{ clip: "pair-kaheksa", en: "eight", mark: "ka" }, { clip: "pair-ueheksa", en: "nine", mark: "ü" }] },
  { words: [{ clip: "number-kuus", en: "six", mark: "uu" }, { clip: "pair-kus", en: "where", mark: "u" }] },
  { words: [{ clip: "pair-juuni", en: "June", mark: "n" }, { clip: "pair-juuli", en: "July", mark: "l" }] },
  { words: [{ clip: "pair-millal", en: "when" }, { clip: "pair-kus", en: "where" }] },
];

/** Words said with their stress on the first syllable, split the way they are said. */
export const STRESS: readonly { readonly clip: string; readonly syllables: readonly string[]; readonly en: string }[] = [
  { clip: "word-tere", syllables: ["te", "re"], en: "hello" },
  { clip: "word-palun", syllables: ["pa", "lun"], en: "please" },
  { clip: "word-aitaeh", syllables: ["ai", "täh"], en: "thank you" },
  { clip: "word-naegemist", syllables: ["nä", "ge", "mist"], en: "bye" },
  { clip: "stress-hommikust", syllables: ["hom", "mi", "kust"], en: "morning, as in good morning" },
  { clip: "stress-ouhtust", syllables: ["õh", "tust"], en: "evening, as in good evening" },
];

/**
 * The alphabet in its own order: š, z and ž sit between s and t, and õ, ä, ö
 * and ü come after w. Nine letters are only in borrowed words and names.
 */
export const ALPHABET: readonly { readonly clip: string; readonly letter: string; readonly loanword: boolean }[] = [
  ["A", "letter-a", false], ["B", "letter-b", false], ["C", "letter-c", true], ["D", "letter-d", false],
  ["E", "letter-e", false], ["F", "letter-f", true], ["G", "letter-g", false], ["H", "letter-h", false],
  ["I", "letter-i", false], ["J", "letter-j", false], ["K", "letter-k", false], ["L", "letter-l", false],
  ["M", "letter-m", false], ["N", "letter-n", false], ["O", "letter-o", false], ["P", "letter-p", false],
  ["Q", "letter-q", true], ["R", "letter-r", false], ["S", "letter-s", false], ["Š", "letter-sh", true],
  ["Z", "letter-z", true], ["Ž", "letter-zh", true], ["T", "letter-t", false], ["U", "letter-u", false],
  ["V", "letter-v", false], ["W", "letter-w", true], ["Õ", "letter-ou", false], ["Ä", "letter-ae", false],
  ["Ö", "letter-oe", false], ["Ü", "letter-ue", false], ["X", "letter-x", true], ["Y", "letter-y", true],
].map(([letter, clip, loanword]) => ({ letter: letter as string, clip: clip as string, loanword: loanword as boolean }));

/** Every recording the page plays, for the test that holds them to the catalog. */
export function soundsPageClips(): string[] {
  return [
    ...VOWELS.map((v) => v.clip),
    ...VOWEL_WORDS.flatMap((g) => g.words.map((w) => w.clip)),
    ...CONSONANTS.map((c) => c.clip),
    ...LENGTH.flatMap((s) => s.words.map((w) => w.clip)),
    ...MIX_UPS.flatMap((s) => s.words.map((w) => w.clip)),
    ...STRESS.map((s) => s.clip),
    ...ALPHABET.map((a) => a.clip),
  ];
}
