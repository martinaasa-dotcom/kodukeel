import { SHELVES, shelfItems, type ShelfItem } from "@/lib/ux/modes";

/**
 * WHAT EACH GAME SAYS ABOUT ITSELF, FOR THE FIVE MOCKUPS.
 *
 * MOCKUP. `hook` is the sentence that makes somebody want to press, said the
 * way a friend would describe the game to you, and `teaser` is the question it
 * puts first. `minutes` is a rough figure for a sitting and is not measured.
 */
export interface LookGame extends ShelfItem {
  shelf: string;
  shelfName: string;
  hook: string;
  teaser: string;
  minutes: number;
  /** Something true about this learner's own round, where there is one. */
  live?: string;
}

const COPY: Record<string, { hook: string; teaser: string; minutes: number }> = {
  "/review/match": { hook: "Eight pairs against the clock. Beat your own best.", teaser: "How fast can you pair eight?", minutes: 2 },
  "/review/listening": { hook: "Twenty words, nothing written. Just your ears.", teaser: "Would you catch it at a counter?", minutes: 4 },
  "/review/dictation": { hook: "Hear a sentence, then write every word of it, õ and all.", teaser: "Can you spell what you hear?", minutes: 5 },
  "/review/speaking": { hook: "Say it, then hear yourself beside a native voice.", teaser: "How close do you sound?", minutes: 5 },
  "/quest": { hook: "Two minutes on the endings you miss most.", teaser: "Which ending keeps tripping you?", minutes: 2 },
  "/review/letters": { hook: "The letters are all there. Put them back in order.", teaser: "Can you rebuild it?", minutes: 3 },
  "/sonad": { hook: "Six letters, seven tries, one new word a day.", teaser: "Can you find it in seven?", minutes: 3 },
  "/crossword": { hook: "A fresh grid every morning, with the clues in English.", teaser: "Today's grid is waiting.", minutes: 15 },
  "/review/sentences": { hook: "Every word is right. The order isn't, yet.", teaser: "Where does each word go?", minutes: 5 },
  "/review/map": { hook: "Is the ball in the house or coming out? The ending says.", teaser: "In, out, or on top?", minutes: 4 },
  "/review/twins": { hook: "Two words that look alike and mean different things.", teaser: "algama or alustama?", minutes: 5 },
  "/review/sayings": { hook: "Phrases that mean something other than they say.", teaser: "What really happened?", minutes: 5 },
  "/review/wordplay": { hook: "A bat is a leather mouse. Take words apart and laugh.", teaser: "What's a leather mouse?", minutes: 5 },
  "/situations": { hook: "A café, a ticket window, the doctor's. Talk your way through.", teaser: "Could you order a coffee?", minutes: 8 },
  "/review/describe": { hook: "Look at a picture and write five sentences about it.", teaser: "What's going on here?", minutes: 10 },
  "/review/openers": { hook: "Hear how a sentence starts and see the ending coming.", teaser: "How does it end?", minutes: 5 },
  "/review/twenty": { hook: "I'm thinking of something. Ask me in Estonian.", teaser: "Can you guess it in twenty?", minutes: 10 },
};

const EXTRAS: Record<string, ShelfItem> = {
  "/situations": { href: "/situations", tone: "sky", icon: "MessagesSquare", title: "Situations", subtitle: "A café, a ticket window, the doctor's" },
};

export function lookGames(live: Record<string, string | undefined> = {}): LookGame[] {
  return SHELVES.flatMap((shelf) => shelfItems(shelf, EXTRAS).map((m) => {
    const copy = COPY[m.href] ?? { hook: m.subtitle, teaser: m.subtitle, minutes: 5 };
    return { ...m, shelf: shelf.id, shelfName: shelf.name, ...copy, live: live[m.href] };
  }));
}

export const LOOK_SHELVES = SHELVES;

export const OPTIONS = [
  { n: 3, name: "Bento", line: "One board of tiles, the big games big." },
] as const;
