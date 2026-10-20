import { ARROW, BALL, type MapScene, type SceneLayout } from "./map";

/**
 * PLACE WORDS: WHERE A THING IS, SAID WITH A WORD AFTER THE NOUN.
 *
 * The cases in Map say a direction with an ending. Estonian says the rest of
 * "where" with a word that comes after the noun and takes it in the genitive:
 * `laua all`, `laua peal`, `laua taga`. They are not endings, so the case
 * round could not touch them, and they are the other half of what a learner
 * needs to say where anything is.
 *
 * A QUESTION IS A PICTURE AND THREE PHRASES. The word's own emoji, a ball in
 * some place relative to it, and the noun's genitive with each of three place
 * words after it. Only the place word differs, so only the place word can be
 * what the learner is choosing.
 *
 * NOTHING HERE IS WRITTEN. The genitive is the stored principal part, the place
 * word is a dictionary entry with its own recorded sentence, and putting one
 * after the other is the rule the A1 unit `kohasonad` teaches in its blurb.
 * The phrase is a join of two attested pieces and the screen says so; the
 * sentence printed after the answer is a lexicographer's, and holds the place
 * word. Pure, and holds no Estonian beyond the six lemmas it asks the
 * dictionary about: the prompts are English (ADR-005).
 *
 * SIX AND NOT FIFTEEN. These are the ones an emoji and a ball can show without
 * a reader guessing: on, under, in front of, behind, beside, above. Between,
 * opposite, around, through, along, over and across need two things or a
 * movement the picture cannot hold in one glance, and `inside` is Map's own
 * inessive. They are not left out for being hard.
 */

export interface PlaceWord {
  /** The dictionary entry, uninflected. */
  readonly lemma: string;
  /** What is being asked, in English. Never spells the answer. */
  readonly ask: string;
  readonly alt: string;
  /** The picture of a ball in that place relative to the word's emoji. */
  readonly layout: (host: string) => SceneLayout;
}

const kind = (k: "under" | "above" | "front" | "behind", host: string): SceneLayout =>
  ({ kind: k, host, guest: BALL });

export const PLACE_WORDS: readonly PlaceWord[] = [
  { lemma: "peal", ask: "Where is the ball?", alt: "A ball on top of it",
    layout: (host) => ({ kind: "on", host, guest: BALL }) },
  { lemma: "all", ask: "Where is the ball?", alt: "A ball underneath it",
    layout: (host) => kind("under", host) },
  { lemma: "ees", ask: "Where is the ball?", alt: "A ball in front of it",
    layout: (host) => kind("front", host) },
  { lemma: "taga", ask: "Where is the ball?", alt: "A ball behind it",
    layout: (host) => kind("behind", host) },
  { lemma: "kõrval", ask: "Where is the ball?", alt: "A ball next to it",
    layout: (host) => ({ kind: "row", parts: [{ glyph: host, word: true }, { glyph: BALL }] }) },
  { lemma: "kohal", ask: "Where is the ball?", alt: "A ball floating above it, not touching",
    layout: (host) => kind("above", host) },
];

/** The place words, by lemma, for the query that fetches their entries. */
export const PLACE_LEMMAS: readonly string[] = PLACE_WORDS.map((w) => w.lemma);

/**
 * Pairs that read alike in a picture and are never offered together: a ball
 * resting on a thing and one floating over it differ by a gap, and in front of
 * a thing and beside it differ by a few pixels, so asking the learner to tell
 * them apart tests the drawing rather than the word.
 */
const TOO_ALIKE: readonly (readonly [string, string])[] = [
  ["peal", "kohal"],
  ["ees", "kõrval"],
  ["taga", "kõrval"],
];

function alike(a: string, b: string): boolean {
  return TOO_ALIKE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** The picture for one place word, or null where the noun has no emoji to put it beside. */
export function placeScene(word: PlaceWord, hostGlyph: string | null): MapScene | null {
  const host = hostGlyph?.trim();
  if (!host || host === BALL || host === ARROW) return null;
  return { layout: word.layout(host), ask: word.ask, alt: word.alt };
}

/**
 * The two wrong place words for one answer, or null where fewer than two can
 * be told apart from it. Chosen in the order given, which the caller shuffles,
 * so the commonest word is not always the distractor.
 */
export function pickWrongPlaces(answer: string, others: readonly string[]): string[] | null {
  const out: string[] = [];
  for (const lemma of others) {
    if (lemma === answer || alike(lemma, answer)) continue;
    if (out.some((o) => alike(o, lemma))) continue;
    out.push(lemma);
    if (out.length === 2) return out;
  }
  return null;
}

/** Place questions in a round of ten, at most. The case endings stay the lesson. */
export const MAX_PLACE_QUESTIONS = 3;
