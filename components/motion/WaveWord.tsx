/**
 * A WORD THAT CAN RIPPLE, LETTER BY LETTER.
 *
 * The letters of an Estonian word are what this app is about, so the one bit of
 * play a word gets is its own letters hopping in turn, left to right, the way it
 * is said. `app/globals.css` holds the motion (`.wave-word`, `.wave-letter`):
 * it plays on arrival where the caller passes `arrive`, or once whenever an
 * ancestor carrying `data-hop-on` is reached (`components/motion/PlayOnce.tsx`),
 * which should then name `WAVE_END` as its `data-hop-end` so the ripple is
 * cleared by its last letter rather than its first.
 *
 * Nothing here writes Estonian: it splits a word somebody else supplied into
 * the characters it is spelled with. A word split into one element per letter
 * is read letter by letter by some screen readers, so the letters are hidden
 * from them and the word is said once, whole: by the caller where the element
 * around it already carries a name (`named`), and by a visually hidden copy
 * otherwise. Server-safe: no state, no effect, no "use client".
 */
import type { CSSProperties } from "react";

export const WAVE_END = "word-ripple-last";

/**
 * Longer than this and the word is drawn as plain text. A ripple needs the
 * letters held on one line, and a long compound held on one line at a card's
 * type size is wider than a phone: the word keeps its ability to wrap instead.
 */
export const WAVE_MAX = 16;

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

export function WaveWord({
  text,
  arrive = false,
  named = false,
  className = "",
}: {
  text: string;
  /** Ripple once as the word mounts, rather than only when reached for. */
  arrive?: boolean;
  /** The element around this already carries the word as its accessible name. */
  named?: boolean;
  className?: string;
}) {
  const letters = graphemes(text);
  if (letters.length > WAVE_MAX) return <span className={className}>{text}</span>;
  return (
    <>
      {!named && <span className="sr-only">{text}</span>}
      <span aria-hidden className={`wave-word${arrive ? " wave-arrive" : ""} ${className}`}>
        {letters.map((ch, i) =>
          ch === " " ? (
            <span key={i}> </span>
          ) : (
            <span key={i} className="wave-letter" style={{ "--i": i } as CSSProperties}>
              {ch}
            </span>
          ),
        )}
      </span>
    </>
  );
}
