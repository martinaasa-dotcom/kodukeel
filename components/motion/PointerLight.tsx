"use client";

import { useEffect } from "react";

/**
 * A SOFT LIGHT THAT FOLLOWS A POINTER ACROSS A CARD.
 *
 * Mounted once in the signed-in shell rather than in every card, because one
 * passive listener on the document costs the same whether there are three
 * cards on a screen or thirty, and a card that had to remember to subscribe is
 * the card that forgot. It writes two custom properties, `--gx` and `--gy`, on
 * the `.glow` element under the pointer, once a frame at most; the light itself
 * is a `::after` in app/globals.css, so the paint stays on the compositor and
 * nothing here re-renders React.
 *
 * Mouse and pen only. A finger has no position between taps, so a light that
 * jumped to wherever a thumb landed would read as a flash rather than as a
 * light. And nothing is written at all for anybody who asked for less motion,
 * since the light moving *is* the motion.
 */
export function PointerLight() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const host = (e.target as Element | null)?.closest?.<HTMLElement>(".glow");
      if (!host) return;
      const box = host.getBoundingClientRect();
      host.style.setProperty("--gx", `${Math.round(e.clientX - box.left)}px`);
      host.style.setProperty("--gy", `${Math.round(e.clientY - box.top)}px`);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => {
      document.removeEventListener("pointermove", move);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
