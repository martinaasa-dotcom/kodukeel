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
 * English speaker has no letter for, the words one of those vowels tells
 * apart, then the consonants and the soft ones nothing in the spelling marks,
 * then what a doubled letter does, which is the one thing about Estonian a
 * beginner cannot hear yet and has to be told to listen for, then the words
 * that are easy to mix up, then stress, then the alphabet, which is what you
 * need to spell your name to somebody at a counter.
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
  /**
   * Which of two ways of saying the marked letters this word has, printed over
   * it: Estonian does not write a soft consonant, so where two words are spelled
   * alike the page has to say which is which in words.
   */
  readonly tag?: "plain" | "soft";
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
      { clip: "word-oude", en: "sister", mark: "õ" },
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
      { clip: "vowel-ouun", en: "an apple", mark: "õu" },
      { clip: "vowel-taeis", en: "full", mark: "äi" },
      { clip: "vowel-koeis", en: "a rope", mark: "öi" },
      { clip: "vowel-louug", en: "a chin", mark: "õu" },
    ],
  },
];

/**
 * Words one vowel apart. To an English ear õ is an o and ü is a u, and here
 * that hearing turns a belly into a place and a mouth into guilt.
 */
export const VOWEL_PAIRS: readonly WordSet[] = [
  { words: [{ clip: "pair-koht", en: "a place", mark: "o" }, { clip: "pair-kouht", en: "a belly", mark: "õ" }] },
  { words: [{ clip: "pair-suu", en: "a mouth", mark: "uu" }, { clip: "pair-suueue", en: "guilt", mark: "üü" }] },
  { words: [{ clip: "pair-tuli", en: "fire", mark: "u" }, { clip: "pair-tueli", en: "a quarrel", mark: "ü" }] },
  { words: [{ clip: "number-kuus", en: "six", mark: "uu" }, { clip: "pair-kueues", en: "a nail", mark: "üü" }] },
  { words: [{ clip: "pair-kera", en: "a sphere", mark: "e" }, { clip: "pair-kaera", en: "a racket, a din", mark: "ä" }] },
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

/**
 * SOFT CONSONANTS. On some l, n, t and s Estonian raises the middle of the
 * tongue toward the roof of the mouth, as though a little y came with it.
 * Nothing in the spelling says so, which is the whole difficulty: `palk` the
 * salary and `palk` the log are one string and two words, and only the native
 * speaker's recording can show which is which.
 */
export const SOFT_ALIKE: readonly WordSet[] = [
  { words: [{ clip: "soft-palk-plain", en: "a salary", mark: "l", tag: "plain" }, { clip: "soft-palk", en: "a log", mark: "l", tag: "soft" }] },
  { words: [{ clip: "soft-tall-plain", en: "a lamb", mark: "ll", tag: "plain" }, { clip: "soft-tall", en: "a stable", mark: "ll", tag: "soft" }] },
  { words: [{ clip: "soft-hall-plain", en: "frost", mark: "ll", tag: "plain" }, { clip: "soft-hall", en: "gray", mark: "ll", tag: "soft" }] },
  { words: [{ clip: "soft-vill-plain", en: "wool", mark: "ll", tag: "plain" }, { clip: "soft-vill", en: "a blister", mark: "ll", tag: "soft" }] },
  { words: [{ clip: "soft-kutsu-plain", en: "invite!", mark: "ts", tag: "plain" }, { clip: "soft-kutsu", en: "a puppy", mark: "ts", tag: "soft" }] },
];

/** The same letters, plain in one word and soft in the next. */
export const SOFT_BESIDE: readonly WordSet[] = [
  { words: [{ clip: "soft-kalla", en: "pour!", mark: "ll", tag: "plain" }, { clip: "soft-kallis", en: "dear", mark: "ll", tag: "soft" }] },
  { words: [{ clip: "soft-kann-plain", en: "a jug", mark: "nn", tag: "plain" }, { clip: "soft-pann", en: "a frying pan", mark: "nn", tag: "soft" }] },
  { words: [{ clip: "soft-mets", en: "a forest", mark: "ts", tag: "plain" }, { clip: "soft-muets", en: "a hat", mark: "ts", tag: "soft" }] },
  { words: [{ clip: "soft-kas", en: "asks a yes or no", mark: "s", tag: "plain" }, { clip: "soft-kass", en: "a cat", mark: "ss", tag: "soft" }] },
  { words: [{ clip: "soft-pasun", en: "a trumpet", mark: "s", tag: "plain" }, { clip: "soft-poiss", en: "a boy", mark: "ss", tag: "soft" }] },
];

/**
 * Two more soft ones, for the ear: nothing plain beside them. No caption, since
 * each word carries its own tag and a caption would drop this set's words a
 * line below the pair it sits beside.
 */
export const SOFT_MORE: readonly WordSet[] = [
  { words: [{ clip: "soft-buss", en: "a bus", mark: "ss", tag: "soft" }, { clip: "soft-pall", en: "a ball", mark: "ll", tag: "soft" }] },
];

/** Words that differ by how long one sound is held. */
export const LENGTH: readonly WordSet[] = [
  { words: [{ clip: "length-kapp", en: "a cupboard", mark: "pp" }, { clip: "length-kapis", en: "in the cupboard", mark: "p" }] },
  { words: [{ clip: "length-kott", en: "a bag", mark: "tt" }, { clip: "length-kotis", en: "in the bag", mark: "t" }] },
  { words: [{ clip: "length-kama", en: "a roasted flour mix", mark: "m" }, { clip: "length-kamm", en: "a comb", mark: "mm" }] },
  { words: [{ clip: "length-kala", en: "a fish", mark: "l" }, { clip: "length-kalla", en: "pour!", mark: "ll" }] },
  { words: [{ clip: "length-tule", en: "come!", mark: "l" }, { clip: "length-tulle", en: "into the fire", mark: "ll" }] },
  { words: [{ clip: "length-kana", en: "a hen", mark: "n" }, { clip: "length-kanna", en: "carry!", mark: "nn" }] },
  {
    caption: "Two double n's, held for different lengths",
    words: [{ clip: "length-konn", en: "a frog", mark: "nn" }, { clip: "length-nunnu", en: "cute", mark: "nn" }],
  },
  {
    caption: "With b, p and pp",
    words: [
      { clip: "length-kabi", en: "a hoof", mark: "b" },
      { clip: "length-kapi", en: "of the cupboard", mark: "p" },
      { clip: "length-kappi", en: "into the cupboard", mark: "pp" },
    ],
  },
  {
    caption: "With g, k and kk",
    words: [
      { clip: "length-lagi", en: "a ceiling", mark: "g" },
      { clip: "length-laki", en: "of the lacquer", mark: "k" },
      { clip: "length-lakki", en: "into the lacquer", mark: "kk" },
    ],
  },
  {
    caption: "With a vowel",
    words: [
      { clip: "length-sada", en: "a hundred", mark: "a" },
      { clip: "length-saada", en: "send!", mark: "aa" },
      { clip: "length-tahan-saada", en: "I want to get it", mark: "aa" },
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
  {
    caption: "Long, shorter, and long again",
    words: [
      { clip: "length-konn", en: "a frog", mark: "nn" },
      { clip: "length-konna", en: "of the frog", mark: "nn" },
      { clip: "length-naeen-konna", en: "I see a frog", mark: "nn" },
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
    ...VOWEL_PAIRS.flatMap((s) => s.words.map((w) => w.clip)),
    ...CONSONANTS.map((c) => c.clip),
    ...SOFT_ALIKE.flatMap((s) => s.words.map((w) => w.clip)),
    ...SOFT_BESIDE.flatMap((s) => s.words.map((w) => w.clip)),
    ...SOFT_MORE.flatMap((s) => s.words.map((w) => w.clip)),
    ...LENGTH.flatMap((s) => s.words.map((w) => w.clip)),
    ...MIX_UPS.flatMap((s) => s.words.map((w) => w.clip)),
    ...STRESS.map((s) => s.clip),
    ...ALPHABET.map((a) => a.clip),
  ];
}
