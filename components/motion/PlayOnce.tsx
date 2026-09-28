"use client";

import { useEffect } from "react";

/**
 * A MOVE THAT PLAYS ONCE AND ALWAYS LANDS.
 *
 * The small flourishes round the app (a glyph in the rail bobbing as a pointer
 * reaches it, a crossword letter landing in its square, the main button
 * squashing under a press) are one-shot animations. Read off `:hover` or
 * `:active`, each one is cut off the moment the pointer leaves or lifts,
 * wherever it was, which is the thing snapping rather than finishing. So an
 * element asks for one with two attributes and this sets the third:
 *
 * - `data-hop-on` is what starts it, `hover` or `press`;
 * - `data-hop-end` names the keyframes whose end clears it;
 * - `data-hop` is present while it plays, and the stylesheet keys on that.
 *
 * Once started it is not restarted until it has landed, so a pointer wobbling
 * over an edge cannot make it stutter, and it is cleared by its own
 * `animationend`, never by the pointer. One listener on the document serves
 * every element, so nothing has to wire itself up, and under reduced motion
 * the global rule plays each once in no time, which ends it at rest at once.
 */
export function PlayOnce() {
  useEffect(() => {
    const start = (el: Element | null) => {
      if (!el || el.hasAttribute("data-hop")) return;
      el.setAttribute("data-hop", "");
    };
    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-hop-on="hover"]');
      if (!el) return;
      // Moving between two children of one element is not reaching it again.
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      start(el);
    };
    const onDown = (e: PointerEvent) => {
      start((e.target as Element | null)?.closest?.('[data-hop-on="press"]') ?? null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      start((e.target as Element | null)?.closest?.('[data-hop-on="press"]') ?? null);
    };
    const onEnd = (e: AnimationEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-hop]");
      if (el && el.getAttribute("data-hop-end") === e.animationName) el.removeAttribute("data-hop");
    };
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("animationend", onEnd);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("animationend", onEnd);
    };
  }, []);
  return null;
}

/**
 * Starts a one-shot on an element from code, for a flourish that answers
 * something other than a pointer, such as a letter typed into a square.
 */
export function playOnce(el: Element | null) {
  if (el && !el.hasAttribute("data-hop")) el.setAttribute("data-hop", "");
}
