"use client";

import { useCallback, useEffect, useRef, type FocusEvent, type RefObject } from "react";

/**
 * A HOVER THAT FINISHES ITS BEAT.
 *
 * Read off `:hover`, a move stops the instant the pointer leaves, wherever it
 * was: the tile snaps back from halfway through a tilt and the pixels drop out
 * of the air. That reads as the thing breaking rather than as it calming down.
 * So the element is marked `data-play` while it is reached for, and when the
 * pointer leaves, every move still playing inside it is told to stop at the
 * end of the beat it is on, and `data-play` comes off once they have all come
 * to rest. Every hover keyframe here starts and ends at rest, which is what
 * makes coming off it invisible.
 *
 * Reaching back in before they have finished puts them back on the loop
 * rather than starting over, so a pointer wandering across the edge does not
 * make it stutter. A keyboard gets the same through `:focus-visible`.
 */
export function useFinishingHover<T extends HTMLElement>(ref: RefObject<T | null>) {
  const leaving = useRef(0);

  const start = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    leaving.current += 1;
    if (el.hasAttribute("data-play")) {
      for (const a of el.getAnimations({ subtree: true })) {
        if (a.effect?.getTiming().iterations !== Infinity && isHoverLoop(a)) {
          a.effect?.updateTiming({ iterations: Infinity });
        }
      }
    }
    el.setAttribute("data-play", "");
  }, [ref]);

  const stop = useCallback(() => {
    const el = ref.current;
    if (!el || !el.hasAttribute("data-play")) return;
    const token = ++leaving.current;
    // Only what the hover started: the idle loops underneath never finish.
    const running = el
      .getAnimations({ subtree: true })
      .filter((a) => a.playState !== "finished" && (isHoverLoop(a) || isHoverOnce(a)));
    for (const a of running) {
      const timing = a.effect?.getComputedTiming();
      if (!timing || timing.iterations !== Infinity || !isHoverLoop(a)) continue;
      // Still waiting out its stagger: nothing has moved yet, so stop now.
      const at = timing.currentIteration ?? null;
      a.effect?.updateTiming({ iterations: at === null ? 0 : Math.floor(at) + 1 });
    }
    Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(() => {
      if (leaving.current === token) el.removeAttribute("data-play");
    });
  }, [ref]);

  useEffect(() => () => { leaving.current += 1; }, []);

  return {
    onPointerEnter: start,
    onPointerLeave: stop,
    onFocus: (e: FocusEvent<T>) => { if (e.currentTarget.matches(":focus-visible")) start(); },
    onBlur: stop,
  };
}

/** A loop the hover started, as against the idle loops beneath it. */
function isHoverLoop(a: Animation): boolean {
  const name = (a as CSSAnimation).animationName;
  return typeof name === "string" && HOVER_LOOPS.has(name);
}

/** A move the hover plays once, like the name hopping, waited for too. */
function isHoverOnce(a: Animation): boolean {
  return (a as CSSAnimation).animationName === "wordmark-hop";
}

const HOVER_LOOPS = new Set(["mark-giddy", "tilde-tip", "pixel-dance", "anu-wiggle", "anu-hair-flick"]);
