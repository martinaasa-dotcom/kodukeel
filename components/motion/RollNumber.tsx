import type { CSSProperties, ReactNode } from "react";

/**
 * A FIGURE WHOSE DIGITS ROLL UP INTO PLACE, ONCE, AS IT ARRIVES.
 *
 * A number on a summary is the thing the screen is about, and the one bit of
 * play it gets is its digits coming up from just below their line, a beat
 * apart, and settling, the way an odometer clicks over. It plays once, on the
 * first paint, because it is a CSS animation on markup the server wrote: the
 * page arrives already at the start of the move, so there is no flash of the
 * final figure followed by a reset, which is what a figure counted up from
 * zero in an effect would draw before hydration. It ends exactly where it
 * began, `translate` and `opacity` only, so a still frame and reduced motion
 * (`app/globals.css` switches `.roll-digit` off by name) are the number itself.
 *
 * The digits are hidden from a screen reader, which would otherwise read them
 * one by one, and the figure is said once, whole, by a visually hidden copy
 * written after them: after, so the first text a check meets when it measures
 * where a figure's first line sits is the figure, not the clipped copy.
 *
 * Only a plain figure rolls: digits with the separators and a short unit a
 * figure carries ("12", "85%", "1 204", "3m"). Anything else, a figure with an
 * icon beside it or "n/a", is drawn exactly as it was given. Server-safe.
 */
const FIGURE = /^[\d\s.,:%+−-]*\d[\d\s.,:%+−-]*[a-z%]{0,3}$/i;

/** Longer than this and it is not a figure but a sentence with a number in it. */
const ROLL_MAX = 8;

export function rolls(value: ReactNode): value is string | number {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.length <= ROLL_MAX && FIGURE.test(value.trim());
}

export function RollNumber({ value }: { value: ReactNode }) {
  if (!rolls(value)) return <>{value}</>;
  const text = String(value);
  const chars = Array.from(text);
  return (
    <>
      <span aria-hidden className="roll-number">
        {chars.map((ch, i) => (
          <span
            key={i}
            className={/\d/.test(ch) ? "roll-digit" : undefined}
            style={{ "--i": i } as CSSProperties}
          >
            {ch}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
