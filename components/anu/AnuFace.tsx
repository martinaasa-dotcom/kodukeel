import type { CSSProperties } from "react";

/**
 * Anu, the tutor, as a face of her own.
 *
 * She is not the Kodukeel mark and deliberately does not look like it. The
 * mark is the app (`components/brand.tsx`, a pixel tilde on a violet tile) and
 * Anu is somebody inside it: a round gold face with a pink tilde for hair, the
 * õ turned into a person, which is what makes her read as a character rather
 * than a logo wearing a hat. Every place she speaks draws this and nothing
 * else: the corner button, the panel, the avatar beside each reply, the
 * `/tutor` page and the landing page's closing corner.
 *
 * She is alive the way a face is: she blinks, glances about now and then,
 * breathes a little, and her hair bounces a beat behind her head. Moods are
 * expressions rather than speeds: `cheer` squeezes her eyes into smiles and
 * hops, `thinking` looks up and to the side with a small mouth and the hair
 * tipped over, `talking` works her mouth while a reply is on its way. Every
 * keyframe ends where it began, so the global reduced-motion rule, which
 * plays an animation once in no time, leaves her still and smiling. Her idle
 * loops run on one clock shared by every copy of her (lib/ux/loopSync.ts), so
 * a new page or a reload picks her up mid-breath rather than from the top.
 *
 * `--watch-x` and `--watch-y` on an ancestor aim her eyes (see
 * `MascotWatch`), and they default to nothing. Colours are four tokens,
 * `--anu-face`, `--anu-line`, `--anu-hair` and `--anu-cheek`, declared once for
 * both themes: she is the same person in the dark.
 *
 * Keyframes live in app/globals.css under `anu-`.
 */
export type AnuMood = "happy" | "cheer" | "thinking" | "talking";

export function AnuFace({
  size = 40,
  mood = "happy",
  animate = true,
  className = "",
  style,
}: {
  size?: number;
  mood?: AnuMood;
  /** Off wherever she is repeated down a list, which is every avatar after
   *  the first in a conversation: a column of blinking faces is a crowd. */
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const live = animate ? `anu-live anu-${mood}` : `anu-still anu-${mood}`;
  const smiling = mood === "cheer";
  const thinking = mood === "thinking";
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`anu-face ${live} ${className}`}
      style={{ overflow: "visible", ...style }}
      role="img"
      aria-label="Anu"
    >
      {/* The wiggle a hover gives her plays on a layer round the one that
          breathes, so reaching for her never restarts her breathing. */}
      <g className="anu-play">
      <g className="anu-body">
        {/* Hair: the tilde of the õ, one beat behind the head. */}
        <g className="anu-hair-play">
          <path
            className="anu-hair"
            d="M21.5 12.5q5.25-6.2 10.5 0t10.5 0"
            style={{ fill: "none", stroke: "var(--anu-hair)", strokeWidth: 4.6, strokeLinecap: "round" }}
          />
        </g>
        <circle
          cx="32"
          cy="38"
          r="19.5"
          style={{ fill: "var(--anu-face)", stroke: "var(--anu-line)", strokeWidth: 3 }}
        />
        <circle className="anu-cheek" cx="21" cy="43.5" r="3.4" style={{ fill: "var(--anu-cheek)" }} />
        <circle className="anu-cheek" cx="43" cy="43.5" r="3.4" style={{ fill: "var(--anu-cheek)" }} />
        <g className="anu-eyes">
          {smiling ? (
            <>
              <path d="M22.6 37.2q2.6-3.4 5.2 0" style={{ fill: "none", stroke: "var(--anu-line)", strokeWidth: 2.4, strokeLinecap: "round" }} />
              <path d="M36.2 37.2q2.6-3.4 5.2 0" style={{ fill: "none", stroke: "var(--anu-line)", strokeWidth: 2.4, strokeLinecap: "round" }} />
            </>
          ) : (
            <g className="anu-look" style={thinking ? { transform: "translate(1.6px, -1.8px)" } : undefined}>
              <ellipse className="anu-eye" cx="25.2" cy="36.2" rx="2.3" ry="2.9" style={{ fill: "var(--anu-line)" }} />
              <ellipse className="anu-eye" cx="38.8" cy="36.2" rx="2.3" ry="2.9" style={{ fill: "var(--anu-line)" }} />
            </g>
          )}
        </g>
        {thinking ? (
          <circle cx="33.5" cy="46" r="2" style={{ fill: "var(--anu-line)" }} />
        ) : mood === "talking" ? (
          <ellipse className="anu-talk" cx="32" cy="45" rx="3.6" ry="2.6" style={{ fill: "var(--anu-line)" }} />
        ) : smiling ? (
          <path d="M25 42.5q7 8.4 14 0z" style={{ fill: "var(--anu-line)", stroke: "var(--anu-line)", strokeWidth: 1.6, strokeLinejoin: "round" }} />
        ) : (
          <path d="M25.4 43.4q6.6 6 13.2 0" style={{ fill: "none", stroke: "var(--anu-line)", strokeWidth: 2.6, strokeLinecap: "round" }} />
        )}
      </g>
      </g>
    </svg>
  );
}
