import type { CaseKey } from "@/lib/estonian/types";

/**
 * MAP: AN ENDING IS A DIRECTION, A HAVING, A BECOMING.
 *
 * A learner meets `-lt` as a string of letters and a question word, and what it
 * means is "off", which is a picture. Map is that picture. A small drawing
 * shows something moving off a table, into a house, towards a person, and the
 * learner picks the form of the same word that matches. Every option is a form
 * of the one word, so meaning cannot help and only the ending can; the drawing
 * is what makes the ending mean something rather than be memorised.
 *
 * ELEVEN CASES, AND WHY NOT FOURTEEN. The eleven that are built by gluing an
 * ending onto the genitive stem each have a picture that is honest: a place, a
 * direction, a becoming, a limit, a role, a lack, a company. The other three
 * are the stored forms, and the app's own grammar text says English marks none
 * of what the partitive does, so a picture claiming "some of it" would
 * contradict the paragraph printed under it (`lib/estonian/caseReading.ts`).
 * They stay out until there is something true to draw.
 *
 * A SCENE IS CHOSEN BY THE CASE AND BY WHAT KIND OF WORD IT IS, NOT BY THE
 * WORD. There are eight drawings and no art per word, which is what makes this
 * possible to ship. Which trio of local cases a word takes is decided by
 * `lib/estonian/caseQuestion.ts` and is never decided here, so the drawing for
 * `-l` is a table unless the word is a person, and a word is never asked a
 * case Estonian does not use for it.
 *
 * Pure and holds no Estonian: the prompts are English and the forms come from
 * the dictionary (ADR-005).
 */

/** The cases Map asks about, in the order the round weighs them. */
export const MAP_CASES: readonly CaseKey[] = [
  "INESSIVE", "ELATIVE", "ILLATIVE", "ADESSIVE", "ABLATIVE", "ALLATIVE",
  "COMITATIVE", "TRANSLATIVE", "ESSIVE", "ABESSIVE", "TERMINATIVE",
];

/** What is drawn. Eight pictures, shared by eleven cases. */
export type SceneKind =
  | "container" | "surface" | "person"
  | "change" | "limit" | "role" | "lack" | "together";

/** Where the thing is in a scene that moves. `once` for the scenes that do not. */
export type Stage = "rest" | "leave" | "arrive" | "once";

export interface MapScene {
  readonly kind: SceneKind;
  readonly stage: Stage;
  /** What is being asked, in English, about the picture. Never spells the answer. */
  readonly ask: string;
  /** What the picture says, for somebody who cannot see it. */
  readonly alt: string;
}

const PLACE_ASK: Record<Exclude<Stage, "once">, string> = {
  rest: "Where is it?",
  leave: "Where is it coming from?",
  arrive: "Where is it going?",
};

const PERSON_ASK: Record<Exclude<Stage, "once">, string> = {
  rest: "Who has it?",
  leave: "Who is it coming from?",
  arrive: "Who is it going to?",
};

const PLACE: Partial<Record<CaseKey, { kind: "container" | "surface"; stage: Exclude<Stage, "once"> }>> = {
  INESSIVE: { kind: "container", stage: "rest" },
  ELATIVE: { kind: "container", stage: "leave" },
  ILLATIVE: { kind: "container", stage: "arrive" },
  ADESSIVE: { kind: "surface", stage: "rest" },
  ABLATIVE: { kind: "surface", stage: "leave" },
  ALLATIVE: { kind: "surface", stage: "arrive" },
};

const OTHER: Partial<Record<CaseKey, { kind: SceneKind; ask: string; alt: string }>> = {
  TRANSLATIVE: { kind: "change", ask: "What is it turning into?", alt: "A book with an arrow pointing to an empty outline" },
  TERMINATIVE: { kind: "limit", ask: "How far does it go?", alt: "A book travelling along a path that stops at a line" },
  ESSIVE: { kind: "role", ask: "What is it acting as?", alt: "A book standing on a podium under an empty name tag" },
  ABESSIVE: { kind: "lack", ask: "What is missing?", alt: "A book beside an empty outline with a cross through it" },
  COMITATIVE: { kind: "together", ask: "What is it with?", alt: "A book side by side with something else, joined by a line" },
};

/**
 * The picture for one case.
 *
 * `animate` is whether the word is a person or an animal, which is the one fact
 * about the word that changes the drawing: the outside trio on a person is
 * "has it, from, to", and on a thing it is "on, off, onto". Null for a case
 * Map does not draw.
 */
export function sceneFor(key: CaseKey, animate: boolean): MapScene | null {
  const place = PLACE[key];
  if (place) {
    const person = animate && place.kind === "surface";
    const kind: SceneKind = person ? "person" : place.kind;
    const verb = place.stage === "rest" ? "at rest" : place.stage === "leave" ? "leaving" : "arriving";
    const subject = person ? "a person" : place.kind === "container" ? "a house" : "a table";
    return {
      kind, stage: place.stage,
      ask: (person ? PERSON_ASK : PLACE_ASK)[place.stage],
      alt: `A book ${verb}, with ${subject}`,
    };
  }
  const other = OTHER[key];
  if (!other) return null;
  return { kind: other.kind, stage: "once", ask: other.ask, alt: other.alt };
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
