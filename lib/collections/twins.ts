/**
 * WORDS THAT LOOK ALIKE AND ARE NOT THE SAME WORD.
 *
 * A learner reported it in their own words: `ostma` is to buy and `otsima` is
 * to look for, `kuulma` is to hear and `kuulama` is to listen, and nothing in
 * the app ever put the two side by side. They are not one problem, and the
 * table says which of three it is, because each needs a different kind of help:
 *
 * 1. A PAIR A RULE MADE. `kasvama` and `kasvatama` are one root with a suffix
 *    that changes who does what, and so are thirty more. Learn the rule once and
 *    every pair after it is half known (`makes`, `itself`, `attends`). Some of
 *    them have drifted, and the rule misleads there, which is said (`drifted`).
 * 2. ONE ENGLISH WORD, SEVERAL ESTONIAN ONES. `algama`, `alustama` and
 *    `hakkama` are all "to begin" and the sentence around them decides which
 *    (`sense`).
 * 3. A COINCIDENCE. `ostma` and `otsima` are a letter or two apart and nothing
 *    joins them, so they are learned as a pair (`lookalike`).
 *
 * WHAT IS WRITTEN HERE AND WHAT IS NOT. A word is a lemma, and a lemma is a
 * request against the dictionary like a unit's word list: `twins.test.ts`
 * fails on one the shipped dictionary does not hold under that part of speech,
 * so nothing here can introduce a word (ADR-005). Every other string is
 * English, which is the one language this project writes, and none of it
 * names an Estonian form: the screen puts the words beside the line. The
 * meanings are written for contrast rather than copied from the gloss,
 * because a gloss says what one word means and this has to say how two
 * differ. They were written by the developer's best judgement and are for a
 * native speaker to read; edit them here.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */

export type TwinKind = "makes" | "itself" | "attends" | "sense" | "lookalike";

export type TwinPos = "VERB" | "NOUN" | "ADJECTIVE";

export interface TwinWord {
  /** A request against the dictionary, under `pos`. */
  readonly lemma: string;
  readonly pos: TwinPos;
  /** What it means, written to be told apart from the words beside it. English. */
  readonly means: string;
}

export interface TwinGroup {
  /** A slug, the lemmas joined, which is what an address names a group by. */
  readonly id: string;
  readonly kind: TwinKind;
  readonly words: readonly TwinWord[];
  /**
   * How to tell this group apart, where the kind's own rule does not already
   * say it. English, and naming no Estonian form.
   */
  readonly tell?: string;
  /**
   * A pair the rule built whose meaning has moved on, so the rule misleads.
   * The page says so, and the guessing question is never asked of one.
   */
  readonly drifted?: true;
  /**
   * Pairs inside the group that Estonian lets stand in for each other in some
   * sentences. A pick of the other one there is accepted as nearly right and
   * the difference is shown, which is the same call the review card makes
   * about a second right word (`lib/questions/neighbours.ts`): refusing
   * correct Estonian is the dearer mistake.
   */
  readonly overlap?: readonly Overlap[];
}

/**
 * Two words of a group that can stand in for each other, and only in the
 * sense `when` reads in the sentence's English: `jõudma` and `saabuma` are
 * both "to arrive", and only the first is "to afford", so a sentence about
 * affording something does not accept the second.
 */
export interface Overlap {
  readonly words: readonly [string, string];
  readonly when: RegExp;
}

const CAN = /\b(can|could|able|cannot|can't|couldn't)\b/i;

/** What each kind is, said once for the page and the round. English. */
export const KIND_COPY: Readonly<Record<TwinKind, { title: string; rule: string; short: string }>> = {
  makes: {
    title: "It happens, or you make it happen",
    short: "Add -ta- and somebody makes it happen",
    rule:
      "Add -ta- (sometimes -sta-) and the verb gets a doer. The short one happens by itself. " +
      "The long one is somebody making it happen to something else.",
  },
  itself: {
    title: "You do it, or it happens by itself",
    short: "Add -u- and it happens by itself",
    rule:
      "Add -u- (sometimes -du-) and nobody is doing it any more. The short one is you doing " +
      "something to something. The long one is the change happening on its own, or to you.",
  },
  attends: {
    title: "It reaches you, or you reach for it",
    short: "The longer one is on purpose",
    rule:
      "One of each pair just arrives at your ears or eyes. The other is on purpose: you choose " +
      "to listen, or you choose to look.",
  },
  sense: {
    title: "One English word, several Estonian ones",
    short: "The sentence decides",
    rule:
      "English uses one verb where Estonian has two or three. What comes after the verb in the " +
      "sentence usually tells you which one it is.",
  },
  lookalike: {
    title: "They look alike and mean nothing alike",
    short: "No rule, learn them as a pair",
    rule:
      "No rule joins these. They differ by a letter or two and mean different things, so they " +
      "are learned side by side.",
  },
};

/** Said beside a pair the rule built and the meaning left behind. */
export const DRIFTED_NOTE =
  "The rule built this pair, but the meaning has moved on. Learn the two as separate words.";

/** The order the kinds are taught in: the rules first, because a rule pays for itself. */
export const KIND_ORDER: readonly TwinKind[] = ["makes", "itself", "attends", "sense", "lookalike"];

const v = (lemma: string, means: string): TwinWord => ({ lemma, pos: "VERB", means });
const n = (lemma: string, means: string): TwinWord => ({ lemma, pos: "NOUN", means });
const a = (lemma: string, means: string): TwinWord => ({ lemma, pos: "ADJECTIVE", means });

function group(
  kind: TwinKind,
  words: readonly TwinWord[],
  extra: Omit<TwinGroup, "id" | "kind" | "words"> = {},
): TwinGroup {
  return { id: words.map((w) => w.lemma).join("-"), kind, words, ...extra };
}

export const TWIN_GROUPS: readonly TwinGroup[] = [
  /* ── It happens, or you make it happen ─────────────────────────────── */
  group("makes", [v("kasvama", "to grow (by itself)"), v("kasvatama", "to grow something, to raise")]),
  group("makes", [v("mõjuma", "to have an effect"), v("mõjutama", "to influence somebody")]),
  group("makes", [v("harjuma", "to get used to"), v("harjutama", "to practise")]),
  group("makes", [v("näima", "to seem"), v("näitama", "to show")]),
  group("makes", [v("säilima", "to last, to be kept"), v("säilitama", "to keep, to preserve")]),
  group("makes", [v("valmima", "to ripen, to get finished"), v("valmistama", "to make, to prepare")]),
  group("makes", [v("hävima", "to be destroyed"), v("hävitama", "to destroy")]),
  group("makes", [v("tutvuma", "to get to know"), v("tutvustama", "to introduce")]),
  group("makes", [v("põlema", "to burn (by itself)"), v("põletama", "to burn something")]),
  group("makes", [v("soovima", "to wish, to want"), v("soovitama", "to recommend")], { drifted: true }),
  group("makes", [v("puuduma", "to be missing"), v("puudutama", "to touch, to concern")], { drifted: true }),

  /* ── You do it, or it happens by itself ────────────────────────────── */
  group("itself", [v("muutma", "to change something"), v("muutuma", "to change, to become different")]),
  group("itself", [v("peatama", "to stop something"), v("peatuma", "to stop, to come to a halt")]),
  group("itself", [v("jätkama", "to carry on with something"), v("jätkuma", "to go on, to last")]),
  group("itself", [v("leidma", "to find"), v("leiduma", "to be found, to be there")]),
  group("itself", [v("üllatama", "to surprise somebody"), v("üllatuma", "to be surprised")]),
  group("itself", [v("huvitama", "to interest somebody"), v("huvituma", "to get interested")]),
  group("itself", [v("toetama", "to support somebody"), v("toetuma", "to lean on, to rely on")]),
  group("itself", [v("täitma", "to fill, to fill in"), v("täituma", "to fill up, to come true")]),
  group("itself", [v("kohtama", "to run into, to come across"), v("kohtuma", "to meet (by arrangement)")], {
    tell: "Running into somebody takes them as an object. Meeting them on purpose is meeting with them.",
  }),
  group("itself", [v("tundma", "to know (a person), to feel"), v("tunduma", "to seem")], { drifted: true }),
  group("itself", [v("keelama", "to forbid"), v("keelduma", "to refuse")], { drifted: true }),
  group("itself", [v("petma", "to cheat, to deceive"), v("pettuma", "to be disappointed")], { drifted: true }),

  /* ── It reaches you, or you reach for it ───────────────────────────── */
  group("attends", [v("kuulma", "to hear"), v("kuulama", "to listen")]),
  group("attends", [v("nägema", "to see"), v("vaatama", "to look, to watch")], {
    tell: "No shared root here, but the same split: seeing just happens, looking is on purpose.",
  }),

  /* ── One English word, several Estonian ones ───────────────────────── */
  group("sense", [
    v("algama", "to begin (by itself)"),
    v("alustama", "to begin something"),
    v("hakkama", "to start doing"),
  ], {
    tell:
      "Nothing after it: the thing begins by itself. An object after it: you begin something. " +
      "Another verb after it: you start doing that.",
    overlap: [
      { words: ["algama", "hakkama"], when: /\b(start|begin|began|begun)/i },
      { words: ["alustama", "hakkama"], when: /\b(start|begin|began|begun)/i },
    ],
  }),
  group("sense", [v("teadma", "to know (a fact)"), v("tundma", "to know (a person or place), to feel")], {
    tell: "Facts and answers take the first. People, places and feelings take the second.",
  }),
  group("sense", [v("minema", "to go (somewhere)"), v("käima", "to go and come back, to go regularly")], {
    tell: "Going somewhere is a trip with a direction. The other is a round trip or a habit.",
  }),
  group("sense", [
    v("oskama", "to know how to"),
    v("suutma", "to manage to"),
    v("võima", "may, can (it is possible)"),
    v("tohtima", "to be allowed to"),
  ], {
    tell: "A skill you learned, the strength to do it, a possibility, or permission.",
    overlap: [
      { words: ["võima", "tohtima"], when: /\b(may|might|allowed|permitted|can|could|cannot|can't|couldn't)\b/i },
      { words: ["oskama", "suutma"], when: CAN },
      { words: ["võima", "suutma"], when: CAN },
      { words: ["võima", "oskama"], when: CAN },
    ],
  }),
  group("sense", [v("jääma", "to stay, to remain"), v("jätma", "to leave something behind")], {
    tell: "You stay somewhere yourself. You leave something somewhere else.",
  }),
  group("sense", [
    v("viima", "to take (away from here)"),
    v("tooma", "to bring (here)"),
    v("kandma", "to carry, to wear"),
  ], {
    tell: "Away from where you are, towards where you are, or simply holding it as you go.",
  }),
  group("sense", [v("arvama", "to think (have an opinion)"), v("mõtlema", "to think (in your head), to mean")], {
    tell: "An opinion takes the first. Thinking something over, or meaning something, takes the second.",
    overlap: [{ words: ["arvama", "mõtlema"], when: /\b(think|thinks|thought)\b/i }],
  }),
  group("sense", [v("jõudma", "to get there, to manage"), v("saabuma", "to arrive")], {
    tell: "The first is everyday and also means managing in time. The second is the arrivals board.",
    overlap: [{ words: ["jõudma", "saabuma"], when: /\barriv/i }],
  }),
  group("sense", [v("valetama", "to tell a lie"), v("lamama", "to lie down, to be lying")], {
    tell: "English lies in two ways. Telling a lie and lying on the sofa are two words here.",
  }),

  /* ── They look alike and mean nothing alike ────────────────────────── */
  group("lookalike", [v("ostma", "to buy"), v("otsima", "to look for")]),
  group("lookalike", [v("õpetama", "to teach"), v("lõpetama", "to finish")]),
  group("lookalike", [v("vastama", "to answer"), v("vaatama", "to look, to watch")]),
  group("lookalike", [v("jooma", "to drink"), v("tooma", "to bring"), v("looma", "to create"), v("lootma", "to hope")]),
  group("lookalike", [v("võtma", "to take"), v("võima", "may, can"), v("võitma", "to win"), v("viima", "to take away")]),
  group("lookalike", [v("saama", "to get, to become"), v("saatma", "to send"), v("sadama", "to rain, to snow")]),
  group("lookalike", [v("sööma", "to eat"), v("lööma", "to hit")]),
  group("lookalike", [v("ärkama", "to wake up"), v("märkama", "to notice")]),
  group("lookalike", [v("nõudma", "to demand"), v("jõudma", "to get there, to manage")]),
  group("lookalike", [v("sõitma", "to drive, to ride"), v("võitma", "to win")]),
  group("lookalike", [v("kuulama", "to listen"), v("kuuluma", "to belong")]),
  group("lookalike", [v("juhtuma", "to happen"), v("juhtima", "to lead, to drive")]),
  group("lookalike", [v("valetama", "to tell a lie"), v("valutama", "to ache"), v("vahetama", "to swap, to change")]),
  group("lookalike", [v("valima", "to choose, to vote"), v("valama", "to pour")]),
  group("lookalike", [v("aitama", "to help"), v("eitama", "to deny")]),
  group("lookalike", [v("karistama", "to punish"), v("koristama", "to tidy up")]),
  group("lookalike", [v("kaebama", "to complain"), v("kaevama", "to dig")]),
  group("lookalike", [v("kaitsma", "to protect"), v("maitsma", "to taste")]),
  group("lookalike", [v("helistama", "to phone"), v("eelistama", "to prefer")]),
  group("lookalike", [v("küsima", "to ask"), v("püsima", "to stay put, to last")]),
  group("lookalike", [v("kutsuma", "to invite, to call"), v("katsuma", "to touch")]),
  group("lookalike", [v("arutama", "to discuss"), v("arvutama", "to calculate")]),
  group("lookalike", [v("märkima", "to mark, to note down"), v("märkama", "to notice")]),

  group("lookalike", [n("juuni", "June"), n("juuli", "July")]),
  group("lookalike", [n("keel", "language, tongue"), n("kell", "clock, o'clock")]),
  group("lookalike", [n("koht", "place"), n("kõht", "stomach"), n("kott", "bag")]),
  group("lookalike", [n("linn", "town, city"), n("lind", "bird")]),
  group("lookalike", [n("pilt", "picture"), n("pilet", "ticket")]),
  group("lookalike", [n("kala", "fish"), n("kana", "chicken")]),
  group("lookalike", [n("laud", "table"), n("laul", "song")]),
  group("lookalike", [n("köök", "kitchen"), n("söök", "food, a meal")]),

  group("lookalike", [a("vale", "wrong"), a("valge", "white")]),
  group("lookalike", [a("halb", "bad"), a("hall", "grey")]),
  group("lookalike", [a("kerge", "light, easy"), a("kõrge", "high, tall")]),
  group("lookalike", [a("kurb", "sad"), a("kurt", "deaf")]),
  group("lookalike", [a("vihane", "angry"), a("vihmane", "rainy")]),
  group("lookalike", [a("raske", "heavy, difficult"), a("rase", "pregnant")]),
];

/** A group by its slug, or nothing for a slug no group has. */
export function twinGroup(id: string | null | undefined): TwinGroup | undefined {
  return id ? TWIN_GROUPS.find((g) => g.id === id) : undefined;
}

/** The groups in one kind, in the order the table lists them. */
export function groupsOfKind(kind: TwinKind): TwinGroup[] {
  return TWIN_GROUPS.filter((g) => g.kind === kind);
}

/** Every lemma the table names, once, with the part of speech it names it under. */
export function twinLemmas(): { lemma: string; pos: TwinPos }[] {
  const seen = new Map<string, TwinPos>();
  for (const g of TWIN_GROUPS) for (const w of g.words) seen.set(`${w.lemma}|${w.pos}`, w.pos);
  return [...seen.keys()].map((key) => ({ lemma: key.split("|")[0]!, pos: seen.get(key)! }));
}

/**
 * Whether two words of one group may stand in for each other in a sentence
 * that means `english`.
 *
 * Order does not matter. A pair in two groups counts if either group says so.
 */
export function mayStandIn(first: string, second: string, english: string): boolean {
  return TWIN_GROUPS.some((g) =>
    (g.overlap ?? []).some(({ words: [x, y], when }) =>
      ((x === first && y === second) || (x === second && y === first)) && when.test(english)));
}

/**
 * The twin a typed answer is, where somebody asked for one word wrote another
 * word the table pairs with it.
 *
 * Exact apart from case and the space round it, because a diacritic is the
 * whole difference between `sööma` and `lööma` and folding it away would name
 * a mix-up the learner did not make. Null where the two are not paired, or
 * where they are the same word. The group comes back with it, so a screen can
 * link to the pair.
 */
export function twinTyped(asked: string, typed: string): { twin: TwinWord; group: TwinGroup } | null {
  const want = asked.trim().toLocaleLowerCase("et");
  const got = typed.trim().toLocaleLowerCase("et");
  if (!want || !got || want === got) return null;
  for (const g of TWIN_GROUPS) {
    if (!g.words.some((w) => w.lemma === want)) continue;
    const twin = g.words.find((w) => w.lemma === got);
    if (twin) return { twin, group: g };
  }
  return null;
}

export interface LetterRun {
  readonly text: string;
  /** True where this run is letters the other word does not share in place. */
  readonly differs: boolean;
}

/**
 * One word split into the letters it shares with another and the ones it does
 * not, for a lookalike pair, so the screen can mark where the two part ways.
 *
 * Read off the longest common subsequence of letters, which is what an eye
 * does with `ostma` beside `otsima`: the o, the t, the m, the a are the same,
 * the s moved and the i is new. It writes nothing; every letter is the
 * word's own, and a run only says which ones to mark.
 */
export function letterRuns(word: string, other: string): LetterRun[] {
  const x = [...word];
  const y = [...other];
  const table: number[][] = Array.from({ length: x.length + 1 }, () => Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      table[i]![j] = x[i] === y[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const shared = Array<boolean>(x.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { shared[i] = true; i++; j++; }
    else if (table[i + 1]![j]! >= table[i]![j + 1]!) i++;
    else j++;
  }
  const runs: LetterRun[] = [];
  for (let k = 0; k < x.length; k++) {
    const differs = !shared[k];
    const last = runs[runs.length - 1];
    if (last && last.differs === differs) runs[runs.length - 1] = { text: last.text + x[k], differs };
    else runs.push({ text: x[k]!, differs });
  }
  return runs;
}

/**
 * Whether a group can be asked the guessing question: a pair a rule built and
 * the meaning kept, so the rule is a fair way to the answer.
 */
export function guessable(g: TwinGroup): boolean {
  if (g.kind !== "makes" && g.kind !== "itself" && g.kind !== "attends") return false;
  if (g.drifted || g.words.length !== 2) return false;
  // A shared root, or the rule has nothing to work with: seeing and looking
  // are the same split with two unrelated words.
  const [x, y] = [g.words[0]!.lemma, g.words[1]!.lemma];
  let shared = 0;
  while (shared < x.length && x[shared] === y[shared]) shared++;
  return shared >= 3;
}
