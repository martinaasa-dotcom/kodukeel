import { Card, Chip, SectionTitle } from "@/components/ui";
import { HARD_LEARNERS, HARD_SHARE } from "@/lib/srs/defer";
import type { HardWordReading } from "@/lib/progress/hard";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";

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
export function TooHard({ words, locale }: { words: readonly HardWordReading[]; locale: Locale }) {
  if (words.length === 0) return null;
  const t = (english: string) => tr(locale, english);

  return (
    <Card className="mt-8">
      <SectionTitle hint={countOf(locale, words.length, "word")}>
        {t("Too complicated")}
      </SectionTitle>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        {fill(t("Words learners have put aside as too hard for now. Once {people} people, and {share} percent of everyone who has the word, have done that, it’s taught a level later for everybody."), {
          people: HARD_LEARNERS,
          share: Math.round(HARD_SHARE * 100),
        })}
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
              {fill(t("{used} of {limit}"), { used: word.learners, limit: word.holders })}
            </span>
            {/* The one thing on the row that is a fact about this deployment
                rather than about the word. */}
            {word.moved && <Chip tone="hard">{t("moved up")}</Chip>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
