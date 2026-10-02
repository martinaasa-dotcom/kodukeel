"use client";

import { useEffect, useRef } from "react";

/**
 * THE BUTTON THAT MOVES A ROUND ON IS ON THE SCREEN WHEN IT CHANGES.
 *
 * A card grows when it is answered: a verdict, the right answer, a sentence
 * under it. On a phone that pushes the footer holding the next press below
 * the fold and, worse, under whatever is pinned to the foot of the screen,
 * which is the tab bar or the module's own bar. Measured at 390 on the Learn
 * ladder, the card's "Continue" was a sliver of yellow showing above the bar
 * after every answer, and the learner had to know to scroll for it.
 *
 * So the element is brought into view whenever its key changes, at the
 * nearest edge and only as far as it needs to go: nothing moves when the
 * element is already on screen, and the caller's `dock-clear` class is the
 * scroll margin that keeps it clear of the bar.
 * Smooth unless the reader asked for less movement. Never on the first
 * render, since arriving at a card is not an answer and the top of the card
 * is what a learner reads first.
 */
export function useKeepInView<T extends HTMLElement>(key: string | number | boolean | null) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (key === null || key === false) return;
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    /*
      The window is scrolled by measurement rather than by `scrollIntoView`,
      and that is the fix rather than a style. The cards these footers sit in
      are `overflow-hidden` for their rounded corners, which makes each card a
      scroll container, and Chromium clips the footer's scroll margin to the
      card before it asks the window: measured on the closing review, the
      footer sat at 749 of 844 under a margin of 167 and `scrollIntoView` did
      nothing at all, instant or smooth, so the miss state's "Check it again"
      stayed under Anu's button. Reading the margin and the rectangle here
      gives the window the question it was never being asked.
    */
    const raf = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const below = parseFloat(style.scrollMarginBottom) || 0;
      const above = parseFloat(style.scrollMarginTop) || 0;
      const room = window.innerHeight;
      let dy = 0;
      if (rect.bottom + below > room) dy = rect.bottom + below - room;
      // Never past the element's own top: a footer taller than the room left
      // shows from its first line, which is where the button is read from.
      if (rect.top - dy < above) dy = Math.max(0, rect.top - above);
      if (dy > 0) window.scrollBy({ top: dy, behavior: still ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return ref;
}
