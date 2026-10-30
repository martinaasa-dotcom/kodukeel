"use client";

import { useEffect, useRef } from "react";

/**
 * HANDS A CARD'S OWN PROGRESS UP TO WHOEVER KEEPS IT.
 *
 * Say it unmounts when the learner steps to another step, because that is what
 * closes its microphone and stops a story still playing, so whatever a card
 * held in its own state (a retelling typed into the box, the goes of a race,
 * the round of the fade) would be gone when they came back. A card reports it
 * here each time it changes, and is handed it back as its starting state on
 * the way in (`SayPlace.kept`).
 *
 * `value` has to keep its identity while nothing in it changed (a `useMemo`
 * over the fields), or it is reported on every render.
 */
export function useKeep<T>(value: T, onKeep: ((value: T) => void) | undefined): void {
  const keep = useRef(onKeep);
  useEffect(() => {
    keep.current = onKeep;
  });
  useEffect(() => {
    keep.current?.(value);
  }, [value]);
}
