"use client";

import { useSyncExternalStore } from "react";

/**
 * What a visitor has done on the landing page, for the closing panel to say
 * back to them.
 *
 * The page asks them to build a word and to order a drink, and then used to
 * end on the same send-off whether they had done either or neither. A close
 * that can say "you built six forms and ordered a coffee" is talking to the
 * person who did it. Held in memory for the life of the tab and nowhere else:
 * nothing is stored, nothing is sent, and a reload starts it again, which is
 * right for a page somebody is deciding about rather than using.
 */
interface Visit {
  /** Forms the visitor built with their own presses, in the order they built them. */
  readonly built: readonly string[];
  /** Whether they finished the café scene, and what they ordered if so. */
  readonly ordered: string | null;
}

let visit: Visit = { built: [], ordered: null };
const listeners = new Set<() => void>();
const EMPTY: Visit = { built: [], ordered: null };

function emit() {
  for (const listener of listeners) listener();
}

export function rememberBuilt(form: string) {
  if (!form || visit.built.includes(form)) return;
  visit = { ...visit, built: [...visit.built, form] };
  emit();
}

export function rememberOrdered(what: string) {
  visit = { ...visit, ordered: what };
  emit();
}

export function useVisit(): Visit {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => visit,
    () => EMPTY,
  );
}
