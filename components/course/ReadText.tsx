"use client";

import { BookOpen } from "lucide-react";
import { GlossedSentence } from "@/components/GlossedSentence";
import { Speak } from "@/components/Speak";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, SectionTitle } from "@/components/ui";
import type { GlossedToken } from "@/lib/dict/glossed";
import type { ReadText as ReadTextSpec } from "@/lib/course/lessons/types";

/**
 * A REAL TEXT, AFTER THE CONVERSATION (B2 on, `LessonSpec.read`).
 *
 * What the part's situation really puts in front of somebody: a notice in the
 * stairwell, a message from the school, a letter from an office. It is drawn
 * after the transcript in the Listen step, read rather than heard, and nothing
 * on the screen asks anything about it (docs/43-lessons.md §13.6).
 *
 * THE NEW WORDS ARE THE UNDERLINED ONES. The page hands over the dictionary
 * under every word the lessons have not taught by tonight and nothing under
 * the rest (`lib/course/lessons/read.ts`), so an underline means "you haven't
 * met this one" and opens its entry under the line (`GlossedSentence`). The
 * underlines are always on here, whatever the learner's setting for sentences
 * elsewhere, because a text written to run ahead of the course is the place
 * they are the point, as in reading mode; so the panel does not offer to turn
 * them off. Where no tokens came (the dictionary was out of reach), the text is
 * drawn plain, which is still the text.
 *
 * The English sits under each line behind the same toggle as the
 * conversation's, so the step's one switch covers both.
 */
export function ReadText({ text, tokens, english }: {
  text: ReadTextSpec;
  tokens: readonly (readonly GlossedToken[])[] | null;
  english: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <Card>
      <div data-lesson-read>
        <SectionTitle level={3} hint={t("read it, nothing is asked")}>
          <span className="inline-flex items-center gap-2">
            <BookOpen size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />
            <LessonText text={text.genre} locale={locale} />
          </span>
        </SectionTitle>
        <p className="mb-4 text-base" style={{ color: "var(--ink-2)" }}>
          {t("The underlined words are new. Press one to see what it means.")}
        </p>
        <ol className="flex flex-col gap-4">
          {text.lines.map((line, i) => {
            const glossed = tokens?.[i];
            return (
              <li key={`${i}:${line.et}`} className="flex flex-col gap-1" data-read-line={i + 1}>
                {glossed && glossed.length > 0 ? (
                  <GlossedSentence tokens={[...glossed]} sentence={line.et} prose offerTurnOff={false} />
                ) : (
                  <span className="flex items-start gap-2">
                    <Speak text={line.et} size={15} label={t("Hear the sentence")} />
                    <span lang="et" className="text-lg" style={{ color: "var(--ink)" }}>{line.et}</span>
                  </span>
                )}
                {english && <span className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line.en} locale={locale} /></span>}
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
