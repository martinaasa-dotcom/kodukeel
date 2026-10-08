/**
 * ESTONIAN SEEN FROM UKRAINIAN: THE PROSE BEHIND `/grammar/ukrainian`.
 *
 * Most people reading this app in Ukrainian live in Estonia because of the
 * war, and they think in Ukrainian rather than in English. A reference that
 * explains the partitive by way of English is asking them to go through their
 * weakest language to reach the one they are learning. Ukrainian already has
 * most of what an English speaker finds strange here: cases, no articles, free
 * word order, aspect, a genitive of part. So this page says what carries over,
 * what does not, and where a Ukrainian ear and keyboard trip.
 *
 * The rules are `grammar.ts`'s, and for its reasons:
 *
 * 1. **The prose holds no Estonian.** An Estonian word arrives in a `{slot}`
 *    filled from `SPEAKER_LEMMAS`, `FAMILIAR` or `SOUND_LETTERS`, never typed
 *    into a sentence. `ukrainian.test.ts` keeps the tripwire on every line and
 *    asserts every lemma named here is one the shipped dictionary holds, so
 *    the page cannot teach a word it made up (ADR-005). An ending in a slot is
 *    read off `CASES`, which is where the app keeps them.
 * 2. **The English compares with Ukrainian**, in «ёлочки», because that is
 *    what the page is about. Every line is translated into Ukrainian in
 *    `lib/copy/i18n/areas/speakers.ts`. There is no Russian half, on purpose:
 *    a page about Ukrainian may not appear in the Russian table at all
 *    (`purity-ru.test.ts`), and a reader of Russian is not who it is for.
 * 3. **No etymology beyond the textbook.** A word is said to have come from
 *    German or from a Slavic language only where that is the standard account;
 *    everywhere else the page says nothing about where a word came from.
 * 4. **No case is named in Latin**, which is the rule every screen keeps. A
 *    case is named by its Estonian name, read off `CASES` into a slot.
 */
import { CASES } from "./cases";
import type { CaseKey } from "./types";

/**
 * The Estonian words the prose points at, by the slot that names them.
 *
 * Requests against the dictionary, like `NUMBER_LEMMAS` and `EMOJI_LEMMAS`:
 * `ukrainian.test.ts` fails on one the shipped dictionary does not hold. Keyed
 * by what the word does in the sentence rather than by the word itself, so the
 * translation tables never carry an Estonian spelling, even as a slot name.
 */
export const SPEAKER_LEMMAS = {
  /** The one third-person pronoun, «він» and «вона» alike. */
  he: "tema",
  /** The verb Ukrainian drops in the present and Estonian keeps. */
  be: "olema",
  /** What does the work of a future tense. */
  tomorrow: "homme",
  /** The first number after which the noun takes the partial form. */
  two: "kaks",
  /** The negator a partial object follows. */
  not: "ei",
  /** You, to one person you are close to. */
  youOne: "sina",
  /** You, politely or to more than one. */
  youMany: "teie",
} as const;

export type SpeakerSlot = keyof typeof SPEAKER_LEMMAS;

/**
 * The endings a sentence names, by slot, read off `CASES` rather than typed.
 *
 * A slot whose name is a Latin case name would put that name into a
 * translation table, which the Latin sweep reads as a screen naming a case,
 * so the slots are named for what the ending does.
 */
export const SPEAKER_ENDINGS: Readonly<Record<string, CaseKey>> = {
  have: "ADESSIVE",
  with: "COMITATIVE",
  as: "ESSIVE",
  become: "TRANSLATIVE",
};

/** The case names a sentence names, by slot, read off `CASES` the same way. */
export const SPEAKER_CASE_NAMES: Readonly<Record<string, CaseKey>> = {
  part: "PARTITIVE",
};

/** An ending's spelling, with the hyphen a reference prints it with. */
export function endingFor(slot: string): string | null {
  const key = SPEAKER_ENDINGS[slot];
  const spec = key ? CASES.find((c) => c.key === key) : undefined;
  return spec && spec.suffix ? `-${spec.suffix}` : null;
}

/** A case's Estonian name, the way a class names it. */
export function caseNameFor(slot: string): string | null {
  const key = SPEAKER_CASE_NAMES[slot];
  return CASES.find((c) => c.key === key)?.et ?? null;
}

/**
 * The four letters a Ukrainian keyboard has no key for, by the slot the
 * typing section names them in. The same four the welcome wizard names.
 */
export const TYPED_LETTERS = { a: "õ", b: "ä", c: "ö", d: "ü" } as const;

/** Which round trains a point, by its route. Each is an existing practice mode. */
export type Drill = "/review/pairs" | "/review/dictation" | "/review/speaking";

export interface SpeakerPoint {
  /** English, with every Estonian word or ending in a `{slot}`. */
  readonly text: string;
  /** The round that trains it, where there is one. */
  readonly drill?: Drill;
  /** The letter a sound point is about, from `SOUND_LETTERS`, drawn as its heading. */
  readonly letter?: SoundLetter;
}

/** The letters a sound point is headed by, kept out of the prose. */
export const SOUND_LETTERS = {
  otilde: "õ",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
} as const;

export type SoundLetter = keyof typeof SOUND_LETTERS;

export interface SpeakerSection {
  readonly id: "have" | "new" | "sounds" | "typing" | "you" | "words";
  readonly title: string;
  /** One line under the heading. */
  readonly lead: string;
  readonly points: readonly SpeakerPoint[];
}

export const SPEAKER_SECTIONS: readonly SpeakerSection[] = [
  {
    id: "have",
    title: "What you already have",
    lead: "Much of what makes Estonian hard for English speakers is already in your Ukrainian.",
    points: [
      { text: "Cases. Ukrainian has seven and Estonian has fourteen, but eleven of the fourteen are one form with an ending added." },
      { text: "No articles, just as in Ukrainian, and the same free word order." },
      { text: "A whole object against a partial one works much like aspect. A finished «прочитав книжку» takes the whole object, and an unfinished «читав книжку» puts it in the {part}." },
      { text: "The {part} also does what the Ukrainian «родовий» does in «налий води», and after a no, as in «не маю часу». After {not}, the object goes into it too." },
      { text: "«У мене є» is built exactly the Estonian way: the owner takes the {have} ending and the verb to be follows." },
      { text: "The {with} ending covers what the instrumental does with «з» and without it: «з другом», «ножем», «автобусом»." },
    ],
  },
  {
    id: "new",
    title: "What is new",
    lead: "Five places where Ukrainian habits lead you the wrong way.",
    points: [
      { text: "No grammatical gender. The one word {he} means both «він» and «вона», and an adjective never changes to match." },
      { text: "The verb {be} stays in the present. Ukrainian says «Я студент»; Estonian needs the verb every time." },
      { text: "No future tense. The present does the job, often with a word like {tomorrow}, where Ukrainian says «буду читати» or «читатиму»." },
      { text: "After every number from {two} up, the noun takes the {part} and stays singular. Ukrainian says «п'ять книжок» with a plural; Estonian never does." },
      { text: "Ukrainian uses one instrumental for «працювати вчителем» and «стати вчителем». Estonian splits it: {as} for a role you have, {become} for one you take on." },
    ],
  },
  {
    id: "sounds",
    title: "Sounds",
    lead: "Four vowels Ukrainian does not have, and a few habits to unlearn.",
    points: [
      { letter: "otilde", text: "Say «о», then spread your lips as if smiling, keeping the tongue where it was.", drill: "/review/speaking" },
      { letter: "auml", text: "Between «е» and «а», with the mouth open wide.", drill: "/review/speaking" },
      { letter: "ouml", text: "Say «е» with your lips rounded.", drill: "/review/speaking" },
      { letter: "uuml", text: "Say «і» and push your lips forward as for «у».", drill: "/review/speaking" },
      { text: "Estonian has three lengths of sound, and a doubled letter is a long one. Ukrainian has no long vowels, but its long consonants in «знання» and «життя» are the same idea.", drill: "/review/pairs" },
      { text: "Estonian g is always «ґ», never «г». Estonian h is close to «г», only without the voice.", drill: "/review/dictation" },
      { text: "The letters b, d and g are less voiced than «б», «д» and «ґ», and p, t and k have no puff of air. What tells them apart is mostly length and strength.", drill: "/review/dictation" },
      { text: "The stress always falls on the first syllable.", drill: "/review/speaking" },
    ],
  },
  {
    id: "typing",
    title: "Typing",
    lead: "A Ukrainian keyboard has no {a}, {b}, {c} or {d}. Add the Estonian layout and switch to it when you write Estonian.",
    points: [
      { text: "Android, with Gboard: in the keyboard, tap Settings, then Languages, then Add keyboard, and choose Estonian. Touch and hold the space bar to switch." },
      { text: "iPhone: Settings, General, Keyboard, Keyboards, Add New Keyboard, then Estonian. Touch and hold the globe key to switch." },
      { text: "Windows 11: Settings, Time and language, Language and region. Open the menu beside your language, choose Language options, then Add a keyboard and pick Estonian. The Windows key and Space switch layouts." },
      { text: "Mac: System Settings, Keyboard, then Edit beside Input Sources under Text Input. Press the plus button, choose Estonian and press Add. Control and Space switch." },
      { text: "On a computer, the row of letters under every box types them for you, if you asked for it. You can turn it on or off in Settings." },
    ],
  },
  {
    id: "you",
    title: "«Ти» or «ви»",
    lead: "Customs vary, so follow the other person's lead.",
    points: [
      { text: "Estonians move to {youOne} sooner than Ukrainians move to «ти»: with colleagues, with people your own age, and often in shops." },
      { text: "Use {youMany} with officials, with older people you do not know, and with more than one person." },
    ],
  },
  {
    id: "words",
    title: "Words that look familiar",
    lead: "A few Estonian words you will recognize, and a few that only look like Ukrainian.",
    points: [],
  },
];

/**
 * A word a Ukrainian reader will recognize, or will think they recognize.
 *
 * Every lemma here is held to three things by `ukrainian.test.ts`: the
 * shipped dictionary holds it, its English gloss there carries `meaning`, and
 * nothing in its own entry contradicts the claim. The Ukrainian is the
 * everyday word, written here because it is not Estonian and this module may
 * write it. `note` says where it came from only where that is the textbook
 * account, or what it is not where it misleads.
 */
export interface FamiliarWord {
  readonly lemma: string;
  /** The sense the dictionary's English gloss has to carry for the claim to hold. */
  readonly meaning: string;
  /** The everyday Ukrainian for it. */
  readonly uk: string;
  readonly kind: "familiar" | "misleading";
  /** One line of English, with no Estonian in it. */
  readonly note?: string;
}

export const FAMILIAR: readonly FamiliarWord[] = [
  { lemma: "kartul", meaning: "potato", uk: "картопля", kind: "familiar", note: "It came into Estonian from German." },
  { lemma: "sink", meaning: "ham", uk: "шинка", kind: "familiar", note: "It came into Estonian from German." },
  { lemma: "vann", meaning: "bath", uk: "ванна", kind: "familiar", note: "It came into Estonian from German." },
  { lemma: "diivan", meaning: "sofa", uk: "диван", kind: "familiar" },
  { lemma: "kapsas", meaning: "cabbage", uk: "капуста", kind: "familiar" },
  { lemma: "pliit", meaning: "stove", uk: "плита", kind: "familiar" },
  { lemma: "vagun", meaning: "wagon", uk: "вагон", kind: "familiar" },
  { lemma: "raamat", meaning: "book", uk: "книжка", kind: "familiar", note: "It came into Estonian from a Slavic language. Compare «грамота»." },
  { lemma: "turg", meaning: "market", uk: "ринок", kind: "familiar", note: "It came into Estonian from a Slavic language. Compare «торг»." },
  { lemma: "rist", meaning: "cross", uk: "хрест", kind: "familiar", note: "It came into Estonian from a Slavic language." },
  { lemma: "nädal", meaning: "week", uk: "тиждень", kind: "misleading", note: "A week, not «неділя»." },
  { lemma: "lava", meaning: "stage", uk: "сцена", kind: "misleading", note: "A stage, not «лава», the bench." },
  { lemma: "kass", meaning: "cat", uk: "кіт", kind: "misleading", note: "A cat, however much it sounds like «каса», the till." },
];

/** The two halves of the list, each under a line of its own. */
export const FAMILIAR_HEADINGS: Readonly<Record<FamiliarWord["kind"], string>> = {
  familiar: "You will recognize these, or a relative of them in Ukrainian.",
  misleading: "These look like Ukrainian words and mean something else.",
};

/** Every Estonian word this page names, which is what the attestation test reads. */
export const UKRAINIAN_PAGE_LEMMAS: readonly string[] = [
  ...Object.values(SPEAKER_LEMMAS),
  ...FAMILIAR.map((w) => w.lemma),
];

/** Every English line the page draws, for the translation and the tripwire. */
export function speakerLines(): string[] {
  const lines: string[] = [];
  for (const section of SPEAKER_SECTIONS) {
    lines.push(section.title, section.lead);
    for (const point of section.points) lines.push(point.text);
  }
  for (const word of FAMILIAR) if (word.note) lines.push(word.note);
  lines.push(...Object.values(FAMILIAR_HEADINGS));
  return lines;
}
