"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LetterTile, type LetterHue } from "@/components/LetterTile";
import { dealHeroLetters, type HeroLetterSpot } from "@/lib/ux/heroLetters";
import { LETTER_CHEER_EVENT, type LetterEdge } from "@/lib/ux/letterMotion";

/**
 * THE FOUR LETTERS AN ENGLISH KEYBOARD HAS NOT GOT, LYING ON A HERO PANEL.
 *
 * The landing page's ornament, brought into the app on a handful of panels
 * (see `Lettered` below for which, and why not more). They are dealt afresh on each visit
 * (`lib/ux/heroLetters.ts`), and dealt only once the page is in the browser:
 * a server cannot roll the same dice as the client, and a placement written on
 * the server and moved on hydration is four letters jumping on arrival, which
 * is what "freaking out" looked like in the prototype. So there is nothing
 * here on the first paint, and then the four fade in where they belong. They
 * do not hop in: a hop on every visit to Today is a hop somebody sees ten
 * times an evening.
 *
 * On a phone they are smaller and keep to the top and bottom edges, since the
 * card is the width of the screen and a letter over its side would hang off
 * it.
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
    case "top": return { top: "-1.1rem", left: along };
    case "bottom": return { bottom: "-1.1rem", left: along };
    case "left": return { left: "-1.1rem", top: along };
    default: return { right: "-1.1rem", top: along };
  }
}

function travelFor(edge: LetterEdge): { x: number; y: number } {
  return edge === "top" || edge === "bottom" ? { x: 30, y: 1 } : { x: 1, y: 22 };
}

/** How long after the four arrive before a celebration's hop, in ms. */
const ARRIVAL_HOP_MS = 260;
/** A pointer coming back onto the card hops them at most this often, in ms. */
const REHOP_MS = 1400;

function cheer() {
  document.dispatchEvent(new CustomEvent(LETTER_CHEER_EVENT));
}

export function HeroLetters({ celebrate = false }: { celebrate?: boolean }) {
  const [deal, setDeal] = useState<HeroLetterSpot[] | null>(null);
  // Dealt after mount, for the reason in the header.
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 767px)").matches;
    setDeal(dealHeroLetters(Math.random, { sides: !phone }));
  }, []);
  // A celebration hops them on arrival. The tiles' own listeners are
  // attached in their effects, which run before this one.
  useEffect(() => {
    if (!deal || !celebrate) return;
    const t = window.setTimeout(cheer, ARRIVAL_HOP_MS);
    return () => window.clearTimeout(t);
  }, [deal, celebrate]);
  if (!deal) return null;
  return (
    <span aria-hidden className="hero-letters pointer-events-none absolute inset-0 z-20">
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
            className="h-8 w-8 text-base md:h-10 md:w-10 md:text-xl"
            style={placement(spot)}
          />
        );
      })}
    </span>
  );
}

/**
 * THE ONE WAY A SCREEN PUTS THE FOUR LETTERS ON ITS HERO.
 *
 * `.night` clips (`overflow: hidden`), and the letters hang over its edges, so
 * they cannot live inside the panel: this is the positioned box around it that
 * does not clip. A caller wraps the panel and moves any outer margin onto
 * `className`, or the bottom letters would hang off the margin rather than the
 * card.
 *
 * WHERE THEY GO IS A DECISION, AND IT IS "SPECIAL OCCASIONS". Four letters on
 * every panel are wallpaper by the second evening, and over a board, a
 * conversation, an exam or a round in play they are a second thing moving
 * beside the box somebody is typing õ into. So they sit on a handful of
 * fronts and endings: Today's card and the grammar front door (calm), the
 * page that is not there (calm, and a little absurd), and the moments worth
 * a flourish, the review session done, the evening's module learned, a level
 * measured, a personal best, and every word spelled in Tähed. On those
 * (`celebrate`) they hop in, and hop again when a pointer comes back onto the
 * card, which is the whole of the interaction: nothing to press, nothing in
 * the way of the buttons on it.
 */
export function Lettered({ children, className = "", celebrate = false, show = true }: {
  children: ReactNode;
  className?: string;
  celebrate?: boolean;
  /**
   * False draws the panel bare, for an occasion that is only sometimes one.
   * The wrapper stays either way, so the panel is not remounted (and does not
   * pop in twice) when the answer arrives after the first paint.
   */
  show?: boolean;
}) {
  const last = useRef(0);
  const onEnter = show && celebrate ? () => {
    const now = performance.now();
    if (now - last.current < REHOP_MS) return;
    last.current = now;
    cheer();
  } : undefined;
  return (
    <div className={`relative ${className}`} onPointerEnter={onEnter}>
      {children}
      {show && <HeroLetters celebrate={celebrate} />}
    </div>
  );
}
