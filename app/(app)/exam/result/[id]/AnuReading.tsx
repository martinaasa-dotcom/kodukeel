"use client";

import { Card } from "@/components/ui";
import { AnuTextReading } from "@/components/anu/TextReading";
import { useT } from "@/components/Locale";

/**
 * Anu reading the text back, on request and after the fact.
 *
 * DELIBERATELY NOT PART OF THE SCORE, AND DELIBERATELY NOT AUTOMATIC.
 *
 * Not part of the score, because a model may not decide whether Estonian is
 * correct: the composition's marks came from length and the words the task
 * named, both settled mechanically before this button existed. Anu's note is
 * advice sitting beside a mark she did not award.
 *
 * Not automatic, because it is a paid call and most people sit a paper to see a
 * number rather than to be taught. Asking makes the spend follow the interest.
 *
 * What she says, and every way it can fail to arrive, is drawn by
 * `AnuTextReading`, which the writing evening's draft reads through too, so
 * the two cannot say different things about one answer from one route.
 */
export function AnuReading({ text, level, title, marks }: {
  text: string;
  level: string;
  /** Which of the two written tasks this was, now that there are two. */
  title?: string;
  /** What it scored, so the text and its mark are read together. */
  marks?: string;
}) {
  const t = useT();
  return (
    <Card>
      {title && (
        <p className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>{title}</span>
          {marks && <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>{marks}</span>}
        </p>
      )}
      <p
        className="whitespace-pre-wrap text-md leading-relaxed"
        style={{ color: "var(--ink)" }}
        lang="et"
      >
        {text}
      </p>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
        <AnuTextReading
          text={text}
          level={level}
          heading={t("Anu's read it. None of this changes your marks.")}
          invite={t("She doesn't mark anything, so your result stays exactly as it is.")}
          offline={t("Anu needs a connection to read it. Your result is safe either way.")}
        />
      </div>
    </Card>
  );
}
