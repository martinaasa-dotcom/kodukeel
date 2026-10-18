"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playClip, untilQuiet } from "@/lib/audio/clip";
import { LETTER_GAP_MS, PAUSE_GAP_MS, type SpellPart } from "@/lib/collections/spelling";
import { useAudioPrefs } from "@/components/AudioPrefs";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SAYS A TEXT LETTER BY LETTER, in the native speaker's recordings of the
 * letters' names, and says which letter it is on.
 *
 * One spelling at a time: pressing again, typing a new text or leaving the
 * screen ends the one in progress at the letter it was on, because two
 * spellings talking over each other is the one thing that makes a name
 * impossible to follow. `active` is the index into the parts being said, so a
 * name with two n's lights the right n rather than both. `slow` stretches the
 * gaps and never the letters, since a letter's name said slowly is a
 * different sound and a gap is where a listener writes.
 */
export function useSpeller() {
  const { pace } = useAudioPrefs();
  const run = useRef(0);
  const [active, setActive] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => {
    run.current += 1;
    setActive(null);
    setBusy(false);
  }, []);

  useEffect(() => () => {
    run.current += 1;
  }, []);

  const spell = useCallback(async (parts: readonly SpellPart[], { slow = false }: { slow?: boolean } = {}) => {
    const me = ++run.current;
    const gap = slow ? 3 : 1;
    setBusy(true);
    for (const [i, part] of parts.entries()) {
      if (run.current !== me) return;
      if (part.kind === "pause") {
        setActive(null);
        await wait(PAUSE_GAP_MS * gap);
        continue;
      }
      if (part.kind === "other") continue;
      setActive(i);
      try {
        // A letter is asked for by id, so it plays at the speed it was said (`rateFor`).
        await playClip({ text: part.letter, nativeId: part.clip, pace });
      } catch {
        break;
      }
      await untilQuiet(4000);
      if (run.current !== me) return;
      await wait(LETTER_GAP_MS * gap);
    }
    if (run.current === me) {
      setActive(null);
      setBusy(false);
    }
  }, [pace]);

  return { active, spell, stop, speaking: busy };
}
