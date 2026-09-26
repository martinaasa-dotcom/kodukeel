import type { CSSProperties } from "react";

/**
 * The mark: the letter õ, drawn as a ring of the four night colours with an
 * ink tilde over it.
 *
 * Estonian's most recognizable letter is the brand, and it used to be a face:
 * eyes, cheeks and a smile on the bowl. That read as an app for children, so
 * the bowl is a ring now, a quarter in each of gold, blush, violet and cyan,
 * the same four hues as the letter tiles. It is still alive: the ring turns
 * slowly and the tilde drifts, hops when there is something to celebrate and
 * sways while thinking.
 *
 * The tilde sits clear of the bowl, and that is the letter rather than a
 * preference. On an õ the diacritic is a separate stroke above the bowl, and a
 * stroke with daylight under it is the one part that can move on its own.
 * Keyframes live in app/globals.css.
 */
const TIMING: Record<string, { tilde: string; face: string }> = {
  happy: { tilde: "tilde-drift 4.2s ease-in-out infinite", face: "1" },
  cheer: { tilde: "tilde-hop 1.9s cubic-bezier(0.34, 1.56, 0.64, 1) infinite", face: "0.25" },
  thinking: { tilde: "tilde-sway 5.4s ease-in-out infinite", face: "1.35" },
};

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
  /** The turning ring and the drifting tilde. Off wherever the mark is a label
   *  rather than a moment: a chat avatar repeated down a thread, the offline
   *  screen, anything favicon-sized. */
  animate?: boolean;
  /** Kept for callers that aimed the old face's eyes; the mark has none. */
  watch?: boolean;
  mood?: "happy" | "thinking" | "cheer";
}) {
  const t = TIMING[mood] ?? TIMING.happy!;
  void watch;
  /* A mood scales the ring's turn by the same factor as the tilde, so a cheer
     speeds the whole mark up together. */
  const turn: CSSProperties | undefined = animate
    ? { animation: `mark-turn ${(24 * Number(t.face)).toFixed(2)}s linear infinite`, transformOrigin: "32px 40px" }
    : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Kodukeel"
    >
      {/* The bowl of the õ as a ring of the four night colours, a quarter
          each, turning slowly as one piece. It is the letter tiles' palette
          made into the letter, with no face drawn on it: a mark rather than a
          character, which is what keeps it from reading as a children's app. */}
      <g style={turn}>
        {RING.map(([hue, turn]) => (
          <circle
            key={hue}
            cx="32"
            cy="40"
            r="15"
            fill="none"
            stroke={`var(--${hue})`}
            strokeWidth="8.5"
            strokeDasharray={`${QUARTER} ${CIRCUMFERENCE - QUARTER}`}
            transform={`rotate(${turn - 90} 32 40)`}
          />
        ))}
      </g>

      {/* The tilde, in ink, clear of the bowl. The only part with daylight
          under it, so the only part that moves on its own. */}
      <path
        d="M20 15.5q6-7 12 0t12 0"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="5.2"
        strokeLinecap="round"
        style={animate ? { animation: t.tilde, transformOrigin: "32px 15.5px" } : undefined}
      />
    </svg>
  );
}

const CIRCUMFERENCE = 2 * Math.PI * 15;
const QUARTER = CIRCUMFERENCE / 4;
const RING: ReadonlyArray<readonly [string, number]> = [
  ["cta", 0], ["blush", 90], ["accent", 180], ["sky", 270],
];

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
    <span className="flex shrink-0 items-center gap-2.5">
      <Mascot size={size} />
      <span className="flex flex-col">
        <span
          lang="et"
          className="font-display whitespace-nowrap text-xl font-bold leading-none tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Kodukeel
        </span>
        {subtitle && (
          <span className="label-xs mt-1" style={{ color: "var(--ink-3)" }}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
