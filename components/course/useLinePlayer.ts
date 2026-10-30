"use client";

import { useEffect, useRef, useState } from "react";
import { playClip, stopClip, untilQuiet, type ClipRequest } from "@/lib/audio/clip";

/** What a play of every line came to, or null where the press was a Stop. */
export interface LinesPlayed {
  /** Lines the speech service actually said. */
  readonly heard: number;
  /** Stopped before the end, by the learner or by leaving the screen. */
  readonly stopped: boolean;
}

/**
 * Plays a run of lines one after another, the conversation's and the
 * retell's, with one press to start and the same press to stop. A line the
 * speech service will not say is passed over rather than ending the run, and
 * the caller is told how many were said, so a run over silence is never
 * counted as heard. Leaving the screen mid-run ends the line in the air.
 */
export function useLinePlayer() {
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const stop = useRef(false);
  const running = useRef(false);
  useEffect(() => () => {
    stop.current = true;
    if (running.current) stopClip();
  }, []);

  const toggle = async (
    lines: readonly (ClipRequest | null)[],
    { gapMs, onLine }: { gapMs: number; onLine?: (index: number) => void },
  ): Promise<LinesPlayed | null> => {
    if (running.current) {
      stop.current = true;
      stopClip();
      return null;
    }
    stop.current = false;
    running.current = true;
    setPlaying(true);
    let heard = 0;
    for (let i = 0; i < lines.length; i++) {
      if (stop.current) break;
      const line = lines[i];
      if (!line) continue;
      setActive(i);
      onLine?.(i);
      try {
        if ((await playClip(line)) === "played") heard += 1;
        await untilQuiet(20_000);
      } catch {
        // Passed over rather than ending the run.
      }
      if (stop.current) break;
      await new Promise((r) => setTimeout(r, gapMs));
    }
    running.current = false;
    setActive(null);
    setPlaying(false);
    return { heard, stopped: stop.current };
  };

  return { playing, active, toggle };
}
