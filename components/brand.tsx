import type { CSSProperties } from "react";

/**
 * Õ — the mascot.
 *
 * Estonian's most recognizable letter is already a round face with a squiggle on
 * top, so the mascot is just that letter taken literally: a soft ring, two eyes,
 * a tilde for hair. It carries the brand in the sidebar, on the landing page and
 * in every empty state, which is why it is a component and not an asset.
 *
 * The tilde sits clear of the head, and that is the letter rather than a
 * preference. On an õ the diacritic is a separate stroke above the bowl; this
 * one used to reach four and a half units into it, so it read as a cowlick
 * growing out of the scalp instead of a mark over a letter. Clearing it is also
 * what makes it animatable: a stroke fused to the head has nothing it can do,
 * and a stroke with daylight under it can bounce.
 *
 * Every moving part is its own group. They all animate `transform`, and the last
 * declaration on an element wins, so the eyes can only glance and blink at once
 * by nesting one inside the other. Keyframes and the reasoning about their
 * periods live in app/globals.css.
 */
const TIMING: Record<string, { tilde: string; face: string }> = {
  happy: { tilde: "tilde-drift 4.2s ease-in-out infinite", face: "1" },
  cheer: { tilde: "tilde-hop 1.9s cubic-bezier(0.34, 1.56, 0.64, 1) infinite", face: "0.62" },
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
  /** The blink, the glance, the breath, the smile and the hair. Off wherever the
   *  mark is a label rather than a character: a chat avatar repeated down a
   *  thread, the offline screen, anything favicon-sized. */
  animate?: boolean;
  /** Let the eyes be aimed from outside, through `--watch-x` and `--watch-y` on
   *  any ancestor. `components/MascotWatch.tsx` is what sets them; this stays a
   *  plain server component so the mark does not pull a listener into every
   *  page that draws it. The idle glance switches off when it is on, because two
   *  things moving the same eyes is a twitch rather than a look. */
  watch?: boolean;
  mood?: "happy" | "thinking" | "cheer";
}) {
  const t = TIMING[mood] ?? TIMING.happy!;
  /* Moods scale every facial period by one factor, so cheering speeds the whole
     face up together rather than leaving the blink at its idle rate while the
     hair hops. */
  const beat = (seconds: number) => `${(seconds * Number(t.face)).toFixed(2)}s`;
  const on = (name: string, seconds: number, origin: string): CSSProperties | undefined =>
    animate ? { animation: `${name} ${beat(seconds)} ease-in-out infinite`, transformOrigin: origin } : undefined;

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
      {/* The bowl of the õ, and everything drawn on it, breathing as one piece so
          the features do not swim about inside the head. Firework gold with an
          ink edge, which is the sticker the rest of the app is made of, and the
          same four hues as the letter tiles: gold, blush, violet and cyan. */}
      <g style={on("mascot-breathe", 4, "32px 40px")}>
        <circle cx="32" cy="40" r="18" fill="var(--cta)" stroke="var(--on-hue)" strokeWidth="2.6" />

        {/* Eyes are ink dots with a glint, never white discs: a white eye with
            no pupil on a coloured face is the blank stare that reads as creepy. */}
        <g style={watch ? { transform: "translate(var(--watch-x, 0px), var(--watch-y, 0px))" } : undefined}>
          <g style={watch ? undefined : on("mascot-look", 7.3, "32px 37px")}>
            <g style={on("blink", 5.5, "32px 37px")}>
              <circle cx="25.6" cy="37.4" r="2.7" fill="var(--on-hue)" />
              <circle cx="38.4" cy="37.4" r="2.7" fill="var(--on-hue)" />
              <circle cx="26.5" cy="36.4" r="0.9" fill="white" />
              <circle cx="39.3" cy="36.4" r="0.9" fill="white" />
            </g>
          </g>
        </g>

        <g fill="var(--blush)">
          <ellipse cx="21.4" cy="43.2" rx="3" ry="2" />
          <ellipse cx="42.6" cy="43.2" rx="3" ry="2" />
        </g>

        {/* Thinking is a straight line, and a straight line widening is a mouth
            being stretched rather than a face pulling one, so it holds still. */}
        {mood === "thinking" ? (
          <path d="M28.4 45.2h7.2" stroke="var(--on-hue)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        ) : (
          <path
            d={mood === "cheer" ? "M27 43.8c1.8 3.6 8.2 3.6 10 0" : "M28.2 44.4c1.4 2.4 6.2 2.4 7.6 0"}
            stroke="var(--on-hue)"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
            style={on("mascot-smile", 6.1, "32px 45px")}
          />
        )}
      </g>

      {/* The hair: a violet tilde with the same ink edge as the head. The only
          part with daylight under it, so the only part that can properly move. */}
      <g style={animate ? { animation: t.tilde, transformOrigin: "32px 15.15px" } : undefined}>
        <path d="M21 15.15q5.5-6.5 11 0t11 0" fill="none" stroke="var(--on-hue)" strokeWidth="7" strokeLinecap="round" />
        <path d="M21 15.15q5.5-6.5 11 0t11 0" fill="none" stroke="var(--accent)" strokeWidth="4.2" strokeLinecap="round" />
      </g>
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
/*
  The name in the four hues of the letter tiles, gold, blush, violet and cyan,
  walked in that order. Each letter carries an ink outline (`.wordmark` in
  app/globals.css), which is what a reader actually reads it by: gold on the
  cream ground is a poster colour rather than an ink, so the outline carries
  the contrast and the wrapper says `data-ornament` for the measuring suites.
  The spans are inside one word, so it is still read out as one word.
*/
const NAME: ReadonlyArray<readonly [string, string]> = [
  ["K", "cta"], ["o", "blush"], ["d", "accent"], ["u", "sky"],
  ["k", "cta"], ["e", "blush"], ["e", "accent"], ["l", "sky"],
];

export function Wordmark({ size = 34, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <Mascot size={size} />
      <span className="flex flex-col">
        <span
          lang="et"
          data-ornament
          className="wordmark whitespace-nowrap text-xl font-bold leading-none tracking-tight"
        >
          {NAME.map(([letter, hue], i) => (
            <span key={i} style={{ color: `var(--${hue})` }}>{letter}</span>
          ))}
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
