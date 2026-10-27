"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playNativeSequence, type PlayingSequence } from "@/lib/audio/clip";
import { LETTER_GAP_MS, PAUSE_GAP_MS, SLOW_GAPS, type SpellPart } from "@/lib/collections/spelling";

/**
 * SAYS A TEXT LETTER BY LETTER, in the native speaker's recordings of the
 * letters' names, and says which letter it is on.
 *
 * One spelling at a time: pressing again, typing a new text or leaving the
 * screen ends the one in progress, because two spellings talking over each
 * other is the one thing that makes a name impossible to follow. `active` is
 * the index into the parts being said, so a name with two n's lights the
 * right n rather than both. `slow` stretches the gaps and never the letters,
 * since a letter's name said slowly is a different sound and a gap is where a
 * listener writes.
 *
 * THE WORD PLAYS AS ONE CLIP (`playNativeSequence`). Played a letter at a
 * time, every letter was a new audio element with its own start, and the gaps
 * in one word came out at anything from a third of a second to over one,
 * which was reported as some letters starting at once and some after half a
 * second. Joined, the gaps are exactly `LETTER_GAP_MS` and `PAUSE_GAP_MS`,
 * and each letter lights off the clip's own play position.
 */
export function useSpeller() {
  const run = useRef(0);
  const playing = useRef<PlayingSequence | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const halt = useCallback(() => {
    run.current += 1;
    playing.current?.stop();
    playing.current = null;
  }, []);

  const stop = useCallback(() => {
    halt();
    setActive(null);
    setBusy(false);
  }, [halt]);

  useEffect(() => halt, [halt]);

  const spell = useCallback(async (parts: readonly SpellPart[], { slow = false }: { slow?: boolean } = {}) => {
    halt();
    const me = run.current;
    const stretch = slow ? SLOW_GAPS : 1;
    // Which part each recording is, and the silence after it: a letter's gap,
    // or a word's where a pause follows. "Other" is shown and never said.
    const said: { at: number; id: string; text: string; gapAfterMs: number }[] = [];
    parts.forEach((part, at) => {
      if (part.kind === "letter") said.push({ at, id: part.clip, text: part.letter, gapAfterMs: LETTER_GAP_MS * stretch });
      else if (part.kind === "pause" && said.length > 0) said[said.length - 1]!.gapAfterMs = PAUSE_GAP_MS * stretch;
    });
    if (said.length === 0) return;
    setBusy(true);
    let play: PlayingSequence;
    try {
      play = await playNativeSequence(said);
    } catch {
      if (run.current === me) {
        setActive(null);
        setBusy(false);
      }
      return;
    }
    if (run.current !== me) {
      play.stop();
      return;
    }
    playing.current = play;
    /*
      EVERY LETTER IS LIT, AND IN ORDER, HOWEVER SLOWLY FRAMES ARRIVE. Lit only
      while a frame landed inside its own recording, a short letter could be
      passed over whole: a busy phone or WebKit's coarse play position read
      `currentTime` before the letter and again after it, and the letter
      never lit (CI caught "M, r, i" for Mari). The light now follows the
      last letter that has started and steps one letter a frame, so it can
      fall a frame behind but never skip, and it stays on a letter through
      the gap after it rather than going dark between letters.
    */
    let shown = -1;
    let lastLit = false;
    const last = play.spans.length - 1;
    const frame = () => {
      if (run.current !== me) return;
      const now = play.audio.currentTime;
      let started = -1;
      play.spans.forEach((span, i) => { if (now >= span.from) started = i; });
      if (started > shown) shown += 1;
      // The last letter goes dark once it has finished, and only once it has lit.
      const over = lastLit && now >= play.spans[last]!.to;
      if (shown === last) lastLit = true;
      setActive(shown < 0 || over ? null : said[shown]!.at);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    await play.ended;
    if (run.current === me) {
      run.current += 1;
      playing.current = null;
      setActive(null);
      setBusy(false);
    }
  }, [halt]);

  return { active, spell, stop, speaking: busy };
}
