import { Card, Chip, SectionTitle } from "@/components/ui";
import { HARD_LEARNERS, HARD_SHARE } from "@/lib/srs/defer";
import type { HardWordReading } from "@/lib/progress/hard";

/**
 * WHAT THE "TOO COMPLICATED" BUTTON HAS SAID ABOUT THE COURSE.
 *
 * The queue above it is what learners wrote; this is the half nobody typed a
 * note for. It is a reading rather than a decision: the deployment has already
 * acted on the rows marked moved, because that is what the count is for, and
 * what a reviewer does with this is decide whether a word belongs in the unit
 * it is in at all. That is a change to `lib/collections/syllabus/`, which is a
 * pull request rather than a button, and saying so is more use than an Accept
 * that quietly does nothing.
 *
 * IT SHOWS THE ONES UNDER THE LINE TOO. A word at four learners out of nine is
 * the next thing to look at, and a panel that only listed what had already
 * been acted on would be reporting its own decisions back.
 */
export function TooHard({ words }: { words: readonly HardWordReading[] }) {
  if (words.length === 0) return null;

  return (
    <Card className="mt-8">
      <SectionTitle hint={`${words.length} ${words.length === 1 ? "word" : "words"}`}>
        Too complicated
      </SectionTitle>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Words learners put aside. At {HARD_LEARNERS} people and {Math.round(HARD_SHARE * 100)} percent
        of those holding the word, it is taught a band later for everybody.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {words.map((word) => (
          <li
            key={word.lexemeId}
            className="flex flex-wrap items-center gap-2 rounded-[var(--r)] border px-3 py-2"
            style={{ borderColor: "var(--rule-soft)", background: "var(--surface)" }}
          >
            <span lang="et" className="min-w-0 flex-1 text-base font-semibold" style={{ color: "var(--ink)" }}>
              {word.lemma}
            </span>
            {word.cefr && <Chip tone="sky">{word.cefr}</Chip>}
            <span className="tnum text-xs" style={{ color: "var(--ink-2)" }}>
              {word.learners} of {word.holders}
            </span>
            {/* The one thing on the row that is a fact about this deployment
                rather than about the word. */}
            {word.moved && <Chip tone="hard">moved up</Chip>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
