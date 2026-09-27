/**
 * WHERE THE FOUR LETTERS SIT ON TONIGHT'S CARD, CHOSEN FRESH EACH TIME.
 *
 * The landing page's case card carries õ, ä, ö and ü tucked over its edges at
 * fixed places, because that card is looked at once. Today's hero is opened
 * every evening, and four letters that sit in exactly the same four places
 * every evening are furniture by the second week. So each visit deals them
 * again: which edge each is on, and how far along it.
 *
 * Two rules keep a deal from looking like an accident. The long edges carry
 * at most two and the short sides one, and two on one edge stand at least `MIN_GAP` of its length apart,
 * or they read as one clump rather than as four things lying on a card. And
 * nothing is placed in the outer tenth of an edge, where a letter would sit on
 * the rounded corner and look like it was falling off.
 *
 * On a phone the card is the width of the screen, so a letter over a side edge
 * would hang off it: `sides: false` deals the top and the bottom only, two
 * each.
 *
 * Pure: a random source in, a deal out, so a test can hand it a fixed one.
 */
import type { LetterEdge } from "./letterMotion";

export const HERO_LETTERS = ["õ", "ä", "ö", "ü"] as const;

/** Two letters on one edge are at least this far apart, as a share of it. */
export const MIN_GAP = 0.18;

export interface HeroLetterSpot {
  letter: (typeof HERO_LETTERS)[number];
  edge: LetterEdge;
  /** How far along its edge, from 0.1 to 0.9: left to right, or top to bottom. */
  at: number;
}

const EDGES: readonly LetterEdge[] = ["top", "bottom", "left", "right"];

export function dealHeroLetters(
  random: () => number = Math.random,
  { sides = true }: { sides?: boolean } = {},
): HeroLetterSpot[] {
  const taken: Partial<Record<LetterEdge, number[]>> = {};
  const out: HeroLetterSpot[] = [];
  for (const letter of HERO_LETTERS) {
    for (let tries = 0; tries < 40; tries++) {
      const edges = sides ? EDGES : EDGES.filter((e) => e === "top" || e === "bottom");
      const edge = edges[Math.floor(random() * edges.length)]!;
      // The side edges are short, so a letter there keeps to the middle band.
      // On a phone Anu's button floats over the bottom right of the screen,
      // which is where the card's bottom edge ends: letters keep left of it.
      const [lo, hi] = edge === "left" || edge === "right" ? [0.25, 0.75]
        : edge === "bottom" && !sides ? [0.1, 0.6] : [0.1, 0.9];
      const at = lo + random() * (hi - lo);
      const here = taken[edge] ?? [];
      const room = edge === "left" || edge === "right" ? 1 : 2;
      if (here.length >= room || here.some((other) => Math.abs(other - at) < MIN_GAP)) continue;
      taken[edge] = [...here, at];
      out.push({ letter, edge, at: Math.round(at * 1000) / 1000 });
      break;
    }
  }
  return out;
}
