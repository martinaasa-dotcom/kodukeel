"use client";

import { useEffect, useState } from "react";

/**
 * A LINE THAT IS TRUE OF EVERY WORD, SAID ONCE A ROUND.
 *
 * `lib/copy/firstTry.ts` offers its line on a word's first production, so a
 * word carries it once in its life. That is right about the word and wrong
 * about the screen: an evening meets five new words and every one of them is
 * a first production, so the same sentence sat over five boxes in a row, in
 * the closing round again, and every evening after. Read five times a night it
 * stops being read at all, which is the fault the line was written to avoid.
 *
 * So the round keeps it for the first card that qualifies, by key, and that
 * card keeps it for as long as it is on the screen. Nothing is stored, so a
 * new round is a new first time.
 */
export function useOncePerRound(eligible: boolean, key: string | null): boolean {
  const [owner, setOwner] = useState<string | null>(null);
  useEffect(() => {
    if (eligible && key !== null && owner === null) setOwner(key);
  }, [eligible, key, owner]);
  return eligible && key !== null && (owner === null || owner === key);
}
