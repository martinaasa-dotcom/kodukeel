"use client";

import { useEffect, useState } from "react";
import { LetterTile, type LetterHue } from "@/components/LetterTile";
import { dealHeroLetters, type HeroLetterSpot } from "@/lib/ux/heroLetters";
import type { LetterEdge } from "@/lib/ux/letterMotion";

/**
 * THE FOUR LETTERS AN ENGLISH KEYBOARD HAS NOT GOT, LYING ON TONIGHT'S CARD.
 *
 * The landing page's ornament, brought to the one card inside the app that is
 * the evening's front door. They are dealt afresh on each visit
 * (`lib/ux/heroLetters.ts`), and dealt only once the page is in the browser:
 * a server cannot roll the same dice as the client, and a placement written on
 * the server and moved on hydration is four letters jumping on arrival, which
 * is what "freaking out" looked like in the prototype. So there is nothing
 * here on the first paint, and then the four fade in where they belong. They
 * do not hop in: a hop on every visit to Today is a hop somebody sees ten
 * times an evening.
 *
 * Wider than a phone only. On a phone the card is the width of the screen and
 * a letter over its side edge is a letter off the screen.
 */
const LOOK: Record<string, { hue: LetterHue; character: string }> = {
  "õ": { hue: "butter", character: "wander" },
  "ä": { hue: "mint", character: "hop" },
  "ö": { hue: "sky", character: "swing" },
  "ü": { hue: "blush", character: "tumble" },
};

function placement(spot: HeroLetterSpot): React.CSSProperties {
  const along = `calc(${(spot.at * 100).toFixed(1)}% - 1.25rem)`;
  switch (spot.edge) {
    case "top": return { top: "-1.35rem", left: along };
    case "bottom": return { bottom: "-1.35rem", left: along };
    case "left": return { left: "-1.1rem", top: along };
    default: return { right: "-1.1rem", top: along };
  }
}

function travelFor(edge: LetterEdge): { x: number; y: number } {
  return edge === "top" || edge === "bottom" ? { x: 30, y: 1 } : { x: 1, y: 22 };
}

export function HeroLetters() {
  const [deal, setDeal] = useState<HeroLetterSpot[] | null>(null);
  // Dealt after mount, for the reason in the header.
  useEffect(() => setDeal(dealHeroLetters()), []);
  if (!deal) return null;
  return (
    <span aria-hidden className="hero-letters pointer-events-none absolute inset-0 z-20 hidden md:block">
      {deal.map((spot, i) => {
        const look = LOOK[spot.letter]!;
        return (
          <LetterTile
            key={spot.letter}
            letter={spot.letter}
            hue={look.hue}
            edge={spot.edge}
            character={look.character}
            tilt={[-7, 11, -9, 14][i]!}
            travel={travelFor(spot.edge)}
            room={0.7}
            delay={i * 0.6}
            reach={260}
            className="h-10 w-10 text-xl"
            style={placement(spot)}
          />
        );
      })}
    </span>
  );
}
