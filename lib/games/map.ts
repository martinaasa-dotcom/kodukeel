import type { CaseKey } from "@/lib/estonian/types";

/**
 * MAP: AN ENDING IS A DIRECTION, A HAVING, A COMPANY.
 *
 * A learner meets `-lt` as a string of letters and a question word, and what it
 * means is "off", which is a picture. Map is that picture. A row of emoji shows
 * somebody walking into the very thing the word names, a present going to the
 * very person, and the learner picks the form of the same word that matches.
 * Every option is a form of the one word, so meaning cannot help and only the
 * ending can; the picture is what makes the ending mean something rather than
 * be memorised.
 *
 * THE WORD IS IN THE PICTURE. The first version drew a book moving towards a
 * box whatever the word was, so `abi`, help, was asked "what is it with?" over
 * a book joined to an empty square, and the operator called the drawings
 * horrible and pointless, rightly: a picture that is not of the word teaches
 * nothing about the word. So a scene is the word's own emoji off
 * `lib/collections/emoji.ts`, which is a join of Unicode's names against the
 * dictionary's glosses and writes neither side, plus one companion and an
 * arrow emoji for the direction. A word with no emoji is not asked, which is
 * the honest answer for `abi`.
 *
 * A PERSON IS "THEY". Where the companion is a human emoji the question says
 * "they" ("Where are they going?"), and where it is a thing it says "it"
 * ("Who is it going to?" of a present). Asserted in `map.test.ts` over every
 * scene, so a new one cannot ask "where is it?" of somebody walking.
 *
 * TEN CASES, AND WHY NOT FOURTEEN. The six local cases, the comitative, the
 * abessive, the translative and the terminative each have an emoji picture
 * that is honest: in, out of, into, on, off, onto, with, without, turning
 * into, until. The translative is a sparkle and an arrow into the word, which
 * the operator asked for by name. The terminative is a time, an arrow to a
 * number and its clock face ("until five o'clock"), so it is asked of the hour
 * words alone, since "as far as the bus" has no picture anybody reads the same
 * way. The essive is "as", which no companion makes true of an arbitrary word,
 * and the operator's call is to leave it out of this game, so its ending is
 * never shown here, not even as a wrong answer. The three stored forms are out
 * for the reason they always were: the app's own grammar text says English
 * marks none of what the partitive does (`lib/estonian/caseReading.ts`).
 *
 * WHAT GOES INTO A WORD DEPENDS ON WHAT THE WORD IS. Somebody walks into a
 * place, a bus or a tent; a coin goes into a handbag or a box; a ball goes on
 * and off everything else. A word that is neither a place nor a container is
 * not asked "in", "into" or "out of" here at all, because the alternative was a
 * person walking into a notebook.
 *
 * WHICH TRIO A WORD TAKES IS NOT DECIDED HERE. `lib/estonian/caseQuestion.ts`
 * says whether the word is a person, so the outside trio is a present going to
 * and from somebody rather than a ball going on and off something, and a word
 * is never asked a case Estonian does not use for it.
 *
 * Pure and holds no Estonian: the prompts are English and the forms come from
 * the dictionary (ADR-005).
 */

/** The cases Map asks about, in the order the round weighs them. */
export const MAP_CASES: readonly CaseKey[] = [
  "INESSIVE", "ELATIVE", "ILLATIVE", "ADESSIVE", "ABLATIVE", "ALLATIVE",
  "COMITATIVE", "ABESSIVE", "TRANSLATIVE", "TERMINATIVE",
];

/** One emoji in a scene. `word` marks the one the forms are about. */
export interface SceneGlyph {
  readonly glyph: string;
  readonly word?: boolean;
}

/**
 * How a scene is laid out. A row reads left to right with an arrow for a
 * direction; `inside` puts the companion inside the word's emoji; `on` stands
 * it on top.
 */
export type SceneLayout =
  | { readonly kind: "row"; readonly parts: readonly SceneGlyph[] }
  | { readonly kind: "inside"; readonly host: string; readonly guest: string }
  | { readonly kind: "on"; readonly host: string; readonly guest: string };

export interface MapScene {
  readonly layout: SceneLayout;
  /** What is being asked, in English, about the picture. Never spells the answer. */
  readonly ask: string;
  /** What the picture says, for somebody who cannot see it. */
  readonly alt: string;
}

/** Somebody walking, facing the way the arrow points. */
export const WALKER = "🚶‍➡️";
/** Somebody standing, for being inside a place. */
export const STANDER = "🧍";
/** What goes to and from a person, and what a person has. */
export const GIFT = "🎁";
/** What goes on and off a thing, and rolls onto a foot as readily as onto a chair. */
export const BALL = "⚽";
/** What goes into and out of a container: a handbag, a purse, a box. */
export const COIN = "🪙";
export const ARROW = "➡️";
export const WITH = "➕";
export const WITHOUT = "🚫";
/** What something turns into. */
export const SPARKLE = "✨";

/**
 * One to ten as keycaps, and their clock faces, for "until five o'clock".
 * Eleven and twelve have no keycap of their own, and two keycaps side by side
 * do not fit the circle the word is drawn in, so those two hours are not drawn.
 */
const KEYCAPS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const CLOCKS = ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"];

/** The keycap an hour is drawn as, one to ten, or null for any other. */
export function hourGlyph(hour: number): string | null {
  if (!Number.isInteger(hour) || hour < 1 || hour > KEYCAPS.length) return null;
  return KEYCAPS[hour - 1] ?? null;
}

/** The companions that are people, whose question says "they". */
export const HUMAN_COMPANIONS: readonly string[] = [WALKER, STANDER];

/** Every companion and joiner, so a word drawn by one of them is not drawn twice. */
const COMPANIONS = [WALKER, STANDER, GIFT, BALL, COIN, ARROW, WITH, WITHOUT, SPARKLE];

/**
 * THINGS A PERSON GETS INTO, BY THEIR EMOJI. The dictionary files a bus, a
 * door, a bed and a notebook under one code, so whether somebody can walk into
 * a word that is not a place is read off the picture instead: something you
 * ride, and the handful of things you step into. Compared without the
 * variation selector, which some emoji carry and some fonts drop.
 */
const STEP_INTO: ReadonlySet<string> = new Set([
  "🚗", "🚕", "🚙", "🚌", "🚎", "🚐", "🚑", "🚒", "🚓", "🚚", "🚛", "🚜", "🚂", "🚆", "🚇", "🚊",
  "🚋", "🚃", "🚄", "🚅", "🚈", "🚝", "🚞", "🚢", "⛴", "🛳", "🚤", "🛥", "⛵", "🛶", "🚁", "✈",
  "🛩", "🚀", "🚡", "🚠", "🚟", "🚪", "🛁", "🚿", "🚽", "🛗", "⛺", "🛖",
]);

/** Whether a word's emoji is something a person gets into. */
export function stepsInto(glyph: string | null): boolean {
  return glyph !== null && STEP_INTO.has(glyph.replace(/\uFE0F/g, "").trim());
}

/** What the scene is told about the word it is drawing. */
export interface SceneWord {
  /** Whether the word is a person or an animal, from `asksAboutPerson`. */
  readonly animate: boolean;
  /** The word's own emoji, or null where it has none. */
  readonly glyph: string | null;
  /** The hour this word names, one to twelve, or null where it names none. */
  readonly hour: number | null;
  /**
   * What the dictionary says the word is, from `placeKind`: somewhere a person
   * can be, something that holds things, or neither.
   */
  readonly place: "place" | "container" | null;
}

/**
 * The picture for one case, or null where Map does not draw it: a case it
 * does not ask, or a word with no emoji of its own.
 */
export function sceneFor(key: CaseKey, word: SceneWord): MapScene | null {
  // An hour is drawn by its number and its clock, and only ever asked "until when?".
  if (key === "TERMINATIVE") {
    const n = word.hour === null ? null : hourGlyph(word.hour);
    const clock = word.hour === null ? undefined : CLOCKS[word.hour - 1];
    if (!n || !clock) return null;
    return {
      layout: { kind: "row", parts: [{ glyph: ARROW }, { glyph: n, word: true }, { glyph: clock }] },
      ask: "Until when?", alt: "An arrow to a number and its clock face",
    };
  }
  const w = word.glyph?.trim();
  if (!w || COMPANIONS.includes(w)) return null;
  const me: SceneGlyph = { glyph: w, word: true };
  const g = (glyph: string): SceneGlyph => ({ glyph });
  const row = (...parts: SceneGlyph[]): SceneLayout => ({ kind: "row", parts });

  // Into, in, out of: a person where a person can be, a coin where a coin can
  // be, and nothing at all where neither is true, since a person walking into a
  // notebook is a picture of nothing.
  const enter = word.place === "place" || stepsInto(w);
  const holder = !enter && word.place === "container";

  switch (key) {
    case "INESSIVE":
      if (enter) return { layout: { kind: "inside", host: w, guest: STANDER }, ask: "Where are they?", alt: "A person standing inside it" };
      if (holder) return { layout: { kind: "inside", host: w, guest: COIN }, ask: "Where is it?", alt: "A coin inside it" };
      return null;
    case "ELATIVE":
      if (enter) return { layout: row(me, g(ARROW), g(WALKER)), ask: "Where are they coming from?", alt: "A person walking out of it" };
      if (holder) return { layout: row(me, g(ARROW), g(COIN)), ask: "Where is it coming from?", alt: "A coin coming out of it" };
      return null;
    case "ILLATIVE":
      if (enter) return { layout: row(g(WALKER), g(ARROW), me), ask: "Where are they going?", alt: "A person walking into it" };
      if (holder) return { layout: row(g(COIN), g(ARROW), me), ask: "Where is it going?", alt: "A coin going into it" };
      return null;
    case "ADESSIVE":
      return word.animate
        ? { layout: row(me, g(GIFT)), ask: "Who has it?", alt: "Somebody holding a present" }
        : { layout: { kind: "on", host: w, guest: BALL }, ask: "Where is it?", alt: "A ball on top of it" };
    case "ABLATIVE":
      return word.animate
        ? { layout: row(me, g(ARROW), g(GIFT)), ask: "Who is it coming from?", alt: "A present coming from somebody" }
        : { layout: row(me, g(ARROW), g(BALL)), ask: "Where is it coming from?", alt: "A ball rolling off it" };
    case "ALLATIVE":
      return word.animate
        ? { layout: row(g(GIFT), g(ARROW), me), ask: "Who is it going to?", alt: "A present going to somebody" }
        : { layout: row(g(BALL), g(ARROW), me), ask: "Where is it going?", alt: "A ball rolling onto it" };
    case "COMITATIVE":
      return {
        layout: row(g(WALKER), g(WITH), me),
        ask: word.animate ? "Who are they with?" : "What do they have with them?",
        alt: word.animate ? "A person together with somebody" : "A person together with it",
      };
    case "ABESSIVE":
      return {
        layout: row(g(WALKER), g(WITHOUT), me),
        ask: word.animate ? "Who are they without?" : "What are they without?",
        alt: word.animate ? "A person without somebody" : "A person without it",
      };
    case "TRANSLATIVE":
      return {
        layout: row(g(SPARKLE), g(ARROW), me),
        ask: "What is it turning into?",
        alt: "Something turning into it",
      };
    default:
      return null;
  }
}

/** Every human companion a scene draws, which is what decides "they" over "it". */
export function humansIn(layout: SceneLayout): string[] {
  const glyphs = layout.kind === "row" ? layout.parts.filter((p) => !p.word).map((p) => p.glyph) : [layout.guest];
  return glyphs.filter((g) => HUMAN_COMPANIONS.includes(g));
}

/**
 * The three cases that go together as one picture, or null.
 *
 * The local cases come as a set of three, and the set is the point: the same
 * word in `-s`, `-st` and `-sse` is one place seen at rest, leaving and
 * arriving, so those are what a local question offers, and the learner tells
 * three moves of one picture apart. The other cases have no such set.
 */
export function trioOf(key: CaseKey): readonly CaseKey[] | null {
  if (key === "INESSIVE" || key === "ELATIVE" || key === "ILLATIVE") return ["INESSIVE", "ELATIVE", "ILLATIVE"];
  if (key === "ADESSIVE" || key === "ABLATIVE" || key === "ALLATIVE") return ["ADESSIVE", "ABLATIVE", "ALLATIVE"];
  return null;
}

/** Options in a question. Three, which is what a trio is. */
export const MAP_OPTIONS = 3;

/** Questions in a round. Ten words, one question each. */
export const MAP_QUESTIONS = 10;

export interface FormChoice {
  readonly key: CaseKey;
  /** The form as it is printed. */
  readonly text: string;
}

/**
 * The wrong answers for one question, as case keys.
 *
 * A local question is offered the other two of its own trio, which is the
 * whole exercise. Where a trio cannot be filled, because a form is missing or
 * spelled the same as another, and for every other case, the rest are the
 * forms of the same word nearest the answer in spelling, which is the hardest
 * thing to cross out. Never a form spelled like the answer or like another
 * option, because two right answers is a broken question.
 *
 * `nearness` and `same` are passed in so this stays free of the distractor
 * module's own imports and can be driven with plain functions.
 */
export function pickWrong(input: {
  answer: FormChoice;
  /** Every other form of the word that the language uses, by case. */
  others: readonly FormChoice[];
  /** Every spelling that counts as the answer, so none of them is offered as wrong. */
  accepted: readonly string[];
  nearness: (candidate: string, answer: string) => number;
  same: (a: string, b: string) => boolean;
}): FormChoice[] | null {
  const { answer, others, accepted, nearness, same } = input;
  const want = MAP_OPTIONS - 1;
  const taken: FormChoice[] = [];
  const fine = (c: FormChoice) =>
    c.key !== answer.key
    && !accepted.some((a) => same(a, c.text))
    && !taken.some((t) => same(t.text, c.text));

  const trio = trioOf(answer.key);
  if (trio) {
    for (const key of trio) {
      const c = others.find((o) => o.key === key);
      if (c && fine(c) && taken.length < want) taken.push(c);
    }
  }
  if (taken.length < want) {
    const rest = others
      .filter((o) => !taken.some((t) => t.key === o.key))
      .map((c) => ({ c, score: nearness(c.text, answer.text) }))
      .sort((a, b) => b.score - a.score || a.c.key.localeCompare(b.c.key));
    for (const { c } of rest) {
      if (taken.length >= want) break;
      if (fine(c)) taken.push(c);
    }
  }
  return taken.length === want ? taken : null;
}

/**
 * How the round weighs its cases.
 *
 * A round of ten words left to chance is a round of `-ga` and `-s`, since they
 * are the cases the dictionary has most sentences for, and the rare ones
 * (`-lt`, `-ta`, `-ni`) would almost never be asked. So the pool is dealt one
 * case at a time in rotation and only then does the order of words matter.
 * `byCase` maps a case to its candidates, each already shuffled by the caller,
 * and a word is dealt once whichever case it comes up under.
 */
export function dealByCase<T>(
  byCase: ReadonlyMap<CaseKey, readonly T[]>,
  take: number,
  /** What makes two candidates the same word, so one word is asked once. */
  word: (item: T) => string,
): T[] {
  const queues = MAP_CASES
    .map((key) => [...(byCase.get(key) ?? [])])
    .filter((q) => q.length > 0);
  const out: T[] = [];
  const used = new Set<string>();
  while (out.length < take && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      if (out.length >= take) break;
      let next = q.shift();
      while (next !== undefined && used.has(word(next))) next = q.shift();
      if (next === undefined) continue;
      used.add(word(next));
      out.push(next);
    }
  }
  return out;
}

/**
 * THE LADDER A WORD CLIMBS, READ OFF THE LOG AND NEVER STORED.
 *
 * A picture is how an ending is first met and it is the wrong thing to keep
 * asking about a word somebody has had right three times, so the same word in
 * the same case is asked three ways, a rung at a time:
 *
 * 1. the picture, and three forms to pick from;
 * 2. only the question a class asks (`millesse?`), and three forms;
 * 3. the question and an empty box, and the form is typed.
 *
 * Which rung a word is on is a fact about what the learner has done, so it is
 * derived from the answers they gave in that case, oldest first: a Good answer
 * climbs one, anything else steps down one, never below the picture. ADR-014
 * says progress is derived and not counted, so there is no column and nothing
 * to drift; the rung a word is on tomorrow is whatever the log says tomorrow.
 *
 * Answers from every mode count, because a case typed correctly on a review
 * card is the same fact, and a learner who has produced `toas` three times has
 * no use for a picture of one. A word with no card has no log and is on the
 * picture. A hint-capped answer is Hard, which is not Good, so it does not
 * climb: needing help is not yet knowing.
 */
export type Rung = 1 | 2 | 3;

/** The newest answers read for one word and case: enough to climb to the top and fall once. */
export const RUNG_WINDOW = 6;

export function rungFrom(ratingsOldestFirst: readonly number[]): Rung {
  let rung: Rung = 1;
  for (const rating of ratingsOldestFirst.slice(-RUNG_WINDOW)) {
    rung = rating >= 3
      ? (Math.min(3, rung + 1) as Rung)
      : (Math.max(1, rung - 1) as Rung);
  }
  return rung;
}
