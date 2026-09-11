/**
 * WHO IS TALKING, BESIDE EVERY LINE THEY SAY.
 *
 * A learner read a conversation back and asked where the drawings had gone and
 * whether the bubbles could say who was speaking. Both halves of that are one
 * fault. `components/scene/SceneVignette.tsx` puts two people in a room on the
 * briefing and on the cover between two rooms, and then the conversation
 * itself is two columns of cards: the only things saying which side a line
 * belongs to are which edge it sits against and which ink it is written in,
 * and a colour may not be the only thing carrying a distinction here any more
 * than anywhere else (`docs/14-design-system.md`).
 *
 * So the person is beside the line. It is the vignette's own figure at thirty
 * pixels, head and shoulders, drawn in the same strokes and the same ink,
 * turned to face the conversation: the other side looks in from the left and
 * the learner from the right, which is the one sign the vignette already uses
 * to stop two people in a room facing away from each other.
 *
 * ONE PER RUN, NOT ONE PER LINE. A reaction and the move after it are two
 * bubbles from one person, and a face over each of them reads as two people
 * agreeing with each other. The caller draws this once beside a turn's whole
 * run, which is the same grouping `inOneBreath` already does for the words
 * underneath.
 *
 * DECORATION, AND IT SAYS SO. It is `aria-hidden` and carries nothing a reader
 * needs: what a screen reader is told is the sentence beside it ("They said:",
 * "You said:"), which is what the debrief's own transcript has always done.
 * A drawing may not be the only thing carrying a distinction either.
 */
export function SceneFace({ who }: {
  /** Which side of the conversation this is. Decides which way they face. */
  who: "you" | "them";
}) {
  const you = who === "you";
  return (
    <span
      aria-hidden
      className="mt-1 inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
      style={{
        background: you ? "var(--accent-soft)" : "var(--surface)",
        boxShadow: "var(--shadow-sm)",
        color: you ? "var(--accent-deep)" : "var(--ink-2)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/*
          The head, and shoulders that lean the way they are looking. Two
          paths and a circle, which is the vignette's own person with the legs
          off, for the reason the figure behind a counter has none: at this
          size a full body is a smudge and the shoulders are what read.
        */}
        <circle cx={12} cy={8} r={4} />
        <path d="M 5 21 C 6 15 18 15 19 21" />
        {/* The raised arm, on the side they are turned toward. */}
        <path d={you ? "M 17 12 L 20 14" : "M 7 12 L 4 14"} />
      </svg>
    </span>
  );
}
