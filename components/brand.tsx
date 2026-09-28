import { useId, type CSSProperties } from "react";

/**
 * The mark: a tilde drawn in pixels, white on a violet tile.
 *
 * The tilde is what the app is about. In mathematics `~` means "about this
 * much", and that is the bar this app sets: Estonian somebody can use on a
 * person, not Estonian without a mistake in it. It is drawn the way a screen
 * draws a character, ten columns and two pixels deep, because Estonia runs its
 * state online and a mark that looks typed says so without a word.
 *
 * The pixels touch. An earlier drawing left a hairline between them, and
 * square tiles in staggered rows with gaps between them are the café wall
 * illusion: the eye reads the rows as tilted, more strongly the smaller the
 * mark gets, so the tilde looked crooked at favicon size. Still, it is one
 * path; moving, it is ten columns that overlap their neighbours by a hair.
 *
 * The grid is the same rotated half a turn, which is what makes it sit level,
 * and then it is set down crooked on purpose, the way the old õ sticker was:
 * the tile tipped one way and the tilde tipped a little the other way on it,
 * because the whole argument of the app is that nothing has to be perfect.
 * The colours are the brand's own and do not follow the theme: the tile is
 * the violet of Vikerkaar öös in both themes, the same as the icon files
 * (`app/icon.svg`, `public/app-icon.svg`, `app/apple-icon.tsx`), so the mark
 * in the rail and the mark on a home screen are one drawing.
 *
 * It moves by its columns, which is the one thing a pixel drawing can do that
 * a stroke cannot: while it is happy it wipes away and types itself back in
 * every few seconds, column by column, like a cursor writing the character, a hop when there is something to celebrate, and the columns lighting
 * one after another, like a cursor, while it thinks. Inside a `BrandLink` it
 * plays as well: a pointer on it tips the tile and sets the pixels dancing
 * through the Vikerkaar öös colours with the name hopping after them, and a
 * press throws the pixels in the air and lets them land. Each column carries
 * its index as `--c` and its distance from the middle as `--dir`, so one set
 * of keyframes staggers and spreads them. Keyframes live in app/globals.css,
 * and under `prefers-reduced-motion` all of it settles to the still mark.
 */
const TOPS = [2, 1, 0, 0, 1, 2, 3, 3, 2, 1] as const;
/**
 * The pixel confetti a cheering mark throws once when it arrives, which is
 * the end of every round. Each piece is a pixel of the tilde's own size in
 * one of the Vikerkaar öös colours, thrown at its own angle, distance and
 * spin, laid out by hand so it reads as a handful rather than a pattern.
 */
const CONFETTI = [
  { a: -80, d: 58, r: 200, hue: "--cta" },
  { a: -50, d: 70, r: -160, hue: "--blush" },
  { a: -20, d: 62, r: 240, hue: "--sky" },
  { a: 12, d: 74, r: -210, hue: "--mint" },
  { a: 40, d: 60, r: 180, hue: "--cta" },
  { a: 70, d: 68, r: -240, hue: "--blush" },
  { a: 100, d: 56, r: 150, hue: "--sky" },
  { a: 140, d: 64, r: -190, hue: "--cta" },
  { a: 175, d: 72, r: 220, hue: "--mint" },
  { a: 210, d: 58, r: -170, hue: "--blush" },
  { a: 245, d: 66, r: 200, hue: "--sky" },
  { a: 280, d: 62, r: -230, hue: "--cta" },
] as const;
const W = 66;
const S = W / 10;
const X0 = 50 - W / 2;
const Y0 = 50 - 2.5 * S;
/** The whole tilde as one outline, for the still mark. Generated from `TOPS`. */
export const TILDE_PATH =
  "M17 46.7H23.6V40.1H30.2V33.5H36.8H43.4V40.1H50V46.7H56.6V53.3H63.2H69.8V46.7H76.4V40.1H83V53.3H76.4V59.9H69.8V66.5H63.2H56.6V59.9H50V53.3H43.4V46.7H36.8H30.2V53.3H23.6V59.9H17Z";

export function Mascot({
  size = 40,
  className = "",
  style,
  animate = true,
  watch = false,
  mood = "happy",
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** The moving columns. Off wherever the mark is a label rather than a
   *  moment: a chat avatar repeated down a thread, the offline screen,
   *  anything favicon-sized. */
  animate?: boolean;
  /** The tilde leans a little toward the pointer, set by `MascotWatch`
   *  through two custom properties on a wrapper. */
  watch?: boolean;
  mood?: "happy" | "thinking" | "cheer";
}) {
  const bg = `kk-mark-${useId().replace(/:/g, "")}`;
  const lean: CSSProperties | undefined = watch
    ? {
        transform: "translate(calc(var(--watch-x, 0px) * 1.6), calc(var(--watch-y, 0px) * 1.6))",
        transition: "transform 180ms ease-out",
      }
    : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`mark-svg ${animate ? `mark-live mark-${mood}` : ""} ${className}`}
      style={style}
      role="img"
      aria-label="Kodukeel"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--mark-from)" }} />
          <stop offset="1" style={{ stopColor: "var(--mark-to)" }} />
        </linearGradient>
      </defs>
      {/* The tile sits a little crooked and the tilde a little crooked on
          it, the other way: nothing about getting by in a language is
          square. Tilted inside the box rather than as the box, so the
          element keeps the size it declares; `.mark-body` is scaled to fit
          its own corners. */}
      {/* Three layers, so nothing a hand does interrupts the loop: the press
          plays on the outside, the hover inside it, and the idle sway on the
          tile itself, which is also where it sits crooked. A loop that is
          never swapped out is a loop that never restarts. */}
      <g className="mark-pop">
      <g className="mark-giddy">
      <g className="mark-body">
      <rect width="100" height="100" rx="23" fill={`url(#${bg})`} />
      <g className="mark-tilde">
      <g className="mark-tip">
      <g style={lean}>
        {animate ? (
          TOPS.map((top, c) => (
            // The same three layers per column: it types itself in on the
            // outside, flies on a press in the middle and dances on a hover
            // on the pixel itself.
            <g key={c} className="pixel-col" style={{ "--c": c, "--dir": c - 4.5 } as CSSProperties}>
              <g className="pixel-fly">
                <rect
                  className="pixel"
                  x={X0 + c * S - 0.2}
                  y={Y0 + top * S}
                  width={S + 0.4}
                  height={2 * S}
                  style={{ fill: "var(--mark-ink)" }}
                />
              </g>
            </g>
          ))
        ) : (
          <path d={TILDE_PATH} style={{ fill: "var(--mark-ink)" }} />
        )}
      </g>
      </g>
      </g>
      </g>
      </g>
      </g>
      {animate && mood === "cheer" &&
        CONFETTI.map((p, i) => (
          <rect
            key={i}
            aria-hidden
            className="mark-confetti"
            x={50 - S / 2}
            y={50 - S / 2}
            width={S}
            height={S}
            style={{ fill: `var(${p.hue})`, "--a": `${p.a}deg`, "--d": `${p.d}px`, "--r": `${p.r}deg`, "--i": i } as CSSProperties}
          />
        ))}
    </svg>
  );
}

/**
 * The mascot plus the name, as used in the sidebar and the landing nav.
 *
 * It does not shrink and the name does not break, which is two declarations
 * rather than a preference. `overflow-wrap: anywhere` is inherited from the
 * body and counts toward min-content, so the automatic minimum of a flex item
 * holding this is one character wide: put the wordmark in a row beside anything
 * that wants the space and it gives up all of it. The landing footer is that
 * row, and it read "Kodukee" with the "l" on the line under it, which is the
 * one word on the page that may never be hyphenated or wrapped, because it is
 * a name rather than a sentence. Fixed here rather than at each caller: a
 * wordmark squeezed by its neighbor is a property of the wordmark, and the
 * next row somebody puts it in would break it again.
 */
export function Wordmark({ size = 34, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <span className="flex shrink-0 flex-col">
      {/*
        The mark sits beside the name alone, centred against it rather than
        against the name and the subtitle together: against the whole
        two-line block, a 34px mark on a phone-icon-sized row read as paired
        with the gap between the lines rather than with either of them. The
        subtitle keeps the same left edge without being inside this row, by
        the mark's own width plus the row's gap rather than a second copy of
        either number.
      */}
      <span className="flex items-center gap-2.5">
        <Mascot size={size} />
        <span
          lang="et"
          className={`font-display whitespace-nowrap font-bold leading-none tracking-tight ${size >= 44 ? "text-2xl" : "text-xl"}`}
          style={{ color: "var(--ink)" }}
        >
          {/* A span a letter, so a hover or a press on the link can make the
              name hop after the mark. The letters are hidden from a reader and
              the word is said once, whole, since some readers spell a run of
              one-letter spans out a letter at a time. */}
          <span className="sr-only">kodukeel</span>
          <span aria-hidden>
            {"kodukeel".split("").map((ch, i) => (
              <span key={i} className="wm-letter" style={{ "--i": i } as CSSProperties}>
                <span className="wm-jump">{ch}</span>
              </span>
            ))}
          </span>
        </span>
      </span>
      {subtitle && (
        <span
          className="label-xs mt-1"
          style={{ color: "var(--ink-3)", marginLeft: size + 10 }}
        >
          {subtitle}
        </span>
      )}
    </span>
  );
}
