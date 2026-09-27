import type { CSSProperties } from "react";

/**
 * The mark: the letter õ, drawn in ink on a gold tile.
 *
 * It used to be a ring of four hues turning on a bare background, drawn
 * that way so it would not read as a face. That argument held while the
 * mark stood alone in the rail; it stopped holding the day the same brand
 * needed a favicon, a home-screen icon and a share image, and each of
 * those is a fixed square somebody looks at without ever seeing the
 * wordmark beside it. Three different treatments of one brand read as
 * three brands, which is the reasoning behind the design settled on: one
 * flat glyph, on one tile, everywhere the mark appears. Every other
 * place that draws this mark (app/icon.svg, app/apple-icon.tsx,
 * app/opengraph-image.tsx, public/app-icon.svg,
 * public/app-icon-maskable.svg) draws it in the same gold and ink as
 * literal hexes, because those are static files with no theme to read;
 * this component reads the tokens those hexes are the light theme's own
 * values of, so the two never drift apart.
 *
 * The tilde sits clear of the ring, which is the letter rather than a
 * preference: on an õ the diacritic is a separate stroke above the bowl,
 * and a stroke with daylight under it is the one part that can move on
 * its own. The ring is a single closed stroke now rather than four
 * turning quarters, and a closed circle spinning shows no motion at all,
 * so only the tilde still drifts. Keyframes live in app/globals.css.
 *
 * The fill is `var(--cta)` and the strokes are `var(--cta-ink)`, the
 * token this app already reads wherever text sits on that gold, held at
 * a contrast that clears 4.5:1 on the fill in both themes rather than
 * flipping to near-white the way `--ink` does. A colour typed here
 * instead would be the sixth hue meaning the design system's own rule
 * refuses.
 */
const TILDE_ANIMATION: Record<string, string> = {
  happy: "tilde-drift 4.2s ease-in-out infinite",
  cheer: "tilde-hop 1.9s cubic-bezier(0.34, 1.56, 0.64, 1) infinite",
  thinking: "tilde-sway 5.4s ease-in-out infinite",
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
  /** The drifting tilde. Off wherever the mark is a label rather than a
   *  moment: a chat avatar repeated down a thread, the offline screen,
   *  anything favicon-sized. */
  animate?: boolean;
  /** Kept for callers that aimed the old face's eyes; the mark has none. */
  watch?: boolean;
  mood?: "happy" | "thinking" | "cheer";
}) {
  void watch;
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
      <rect width="64" height="64" rx="16" fill="var(--cta)" />
      {/* The bowl of the õ, one closed ring in ink rather than the four
          turning quarters this used to be. */}
      <circle cx="32" cy="38" r="13" fill="none" stroke="var(--cta-ink)" strokeWidth="7" />
      {/* The tilde, clear of the bowl, the only part with daylight under it
          and so the only part that moves on its own. */}
      <path
        d="M20 17q6-7 12 0t12 0"
        fill="none"
        stroke="var(--cta-ink)"
        strokeWidth="6"
        strokeLinecap="round"
        style={animate ? { animation: TILDE_ANIMATION[mood] ?? TILDE_ANIMATION.happy, transformOrigin: "32px 17px" } : undefined}
      />
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
    <span className="flex shrink-0 items-center gap-2.5">
      <Mascot size={size} />
      <span className="flex flex-col">
        <span
          lang="et"
          className={`font-display whitespace-nowrap font-bold leading-none tracking-tight ${size >= 44 ? "text-2xl" : "text-xl"}`}
          style={{ color: "var(--ink)" }}
        >
          kodukeel
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
