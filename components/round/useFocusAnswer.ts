"use client";

import { useEffect, type RefObject } from "react";

/**
 * THE CARET GOES BACK TO THE ANSWER BOX WHEN THE NEXT QUESTION ARRIVES.
 *
 * A round keeps one answer box for every card, so `autoFocus` fires once, on
 * the first. Pressing Next takes away the button that held the caret, the
 * browser leaves it on the body, and the learner has to click into the box
 * for every card after the first. It is the box being enabled again by the
 * same render that cleared the mark, so the caret is handed back here, after
 * that render has committed.
 *
 * `ready` is "the box can be typed in": no verdict showing, no look back
 * standing in the card's place. `key` is whatever changes when the question
 * does. Nothing is scrolled, since the card is already where the learner is
 * looking and the box is part of it.
 */
export function useFocusAnswer(
  ref: RefObject<HTMLElement | null>,
  ready: boolean,
  key: string | number | null,
) {
  useEffect(() => {
    if (!ready) return;
    ref.current?.focus({ preventScroll: true });
  }, [ref, ready, key]);
}
