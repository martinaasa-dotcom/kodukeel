import type { GapMeaning as Meaning } from "@/lib/copy/gapMeaning";

/**
 * THE ONE DRAWING OF WHAT THE SENTENCE AROUND A GAP SAYS.
 *
 * Six screens put a gap in front of a learner, and before this each of them
 * answered "what does this line mean" for itself or not at all: the review
 * card, the sprint and the daily quest printed the bare gloss of the missing
 * word, the unit lesson and the flash round printed it as a sentence of
 * English prose, and the learn ladder was the one screen that had the whole
 * line and drew it flat, with nothing saying which of its words the gap
 * wanted. One component rather than six, for the reason `EstonianSentence`
 * gives about itself: six copies are six answers and the one nobody is
 * looking at drifts.
 *
 * `lib/copy/gapMeaning.ts` decides everything worth deciding, including both
 * refusals, so this holds no rule at all. A caller that has a line to draw
 * draws it; a caller handed `null` has nothing to say and says nothing.
 *
 * `lang="en"` because it is English sitting under an Estonian sentence, and a
 * screen reader that is given neither reads one in the other's phonology.
 */
export function GapMeaning({ meaning, className }: {
  meaning: Meaning;
  className?: string;
}) {
  return (
    <p
      lang="en"
      data-gap-meaning
      className={className ?? "text-base leading-snug"}
      style={{ color: "var(--ink-2)" }}
    >
      {meaning.runs.map((run, i) => (
        run.asked
          /*
            The word the gap is asking for, which is the whole of why this is a
            sentence rather than the gloss it replaced: the learner is told
            what to say and where in the line it goes. `--ink` rather than the
            accent, because the accent is what the Estonian sentence above
            already marks its own gap with, and two accents on one card is two
            things claiming to be the answer.
          */
          ? <strong key={i} style={{ color: "var(--ink)" }}>{run.text}</strong>
          : <span key={i}>{run.text}</span>
      ))}
    </p>
  );
}
