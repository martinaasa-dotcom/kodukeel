"use client";

import { useRef, useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { submitCheck } from "@/app/actions";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { ButtonLink } from "@/components/Button";
import { Card, Note } from "@/components/ui";
import { NextPart } from "@/components/course/NextPart";
import { fill } from "@/lib/copy/locale";
import { NOT_REACHED } from "@/lib/copy/values";
import type { PracticeItem } from "@/lib/course/lessons/practice";
import { Quiz } from "../../lessons/[id]/Quiz";

/**
 * A CHECK, ONE QUESTION AT A TIME, MARKED BY THE SERVER AT THE END.
 *
 * The questions are the lesson's own (`Quiz`), so a check looks and works
 * like the practice step it follows from. What differs is the end: the
 * answers go to `submitCheck`, which rebuilds the paper and marks it, and the
 * screen says whether it passed, how close it was, and what to do next.
 */
export function CheckRunner({ checkId, attempt, items, needed, alreadyPassed, next }: {
  checkId: string;
  attempt: number;
  items: readonly PracticeItem[];
  needed: number;
  alreadyPassed: boolean;
  next: { id: string; label: string } | null;
}) {
  const t = useT();
  const locale = useLocale();
  const responses = useRef<(string | null)[]>(items.map(() => null));
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; marks: readonly string[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const finish = () => {
    setFailed(false);
    start(async () => {
      const res = await submitCheck(checkId, attempt, responses.current).catch(() => null);
      if (!res || !res.ok) { setFailed(true); return; }
      setResult({ score: res.score, total: res.total, passed: res.passed, marks: res.marks });
    });
  };

  if (items.length === 0) {
    return <Note tone="again">{t("This check has no questions to ask yet.")}</Note>;
  }

  return (
    <div className="flex flex-col gap-4" data-course-check={checkId}>
      {alreadyPassed && !result && (
        <Note tone="sky">{t("You've passed this one already. Taking it again is good practice and changes nothing.")}</Note>
      )}
      <Quiz
        items={items}
        summary={false}
        onAnswer={(at, response) => { responses.current[at] = response; }}
        onFinished={finish}
      />
      {pending && <p role="status" className="text-base" style={{ color: "var(--ink-2)" }}>{t("Marking it…")}</p>}
      {failed && (
        <div role="status" className="flex flex-col items-start gap-2">
          <Note tone="again">{t(NOT_REACHED)}</Note>
          <button type="button" className="tap-tint underline" onClick={finish}>{t("Try sending it again")}</button>
        </div>
      )}
      {result && (
        <Card tone={result.passed ? "sky" : "butter"} data-check-result={result.passed ? "passed" : "not-yet"}>
          <p role="status" className="flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {result.passed && <Check size={18} aria-hidden />}
            {result.passed
              ? fill(t("Passed: {score} of {total}."), { score: formatScore(result.score), total: result.total })
              : fill(t("{score} of {total}. You need {needed} to pass."), { score: formatScore(result.score), total: result.total, needed })}
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
            {result.passed
              ? next ? fill(t("{next} is open."), { next: next.label }) : t("That's every part done.")
              : t("Go over the words that slipped, then try again. The next go asks a different mix.")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.passed ? (
              next ? <NextPart programmeId={next.id} to="/course" label={fill(t("Start {part}"), { part: next.label })} /> : null
            ) : (
              <>
                <ButtonLink href="/review">{t("Review your words")}</ButtonLink>
                <ButtonLink href={`/course/check/${checkId}?try=${attempt + 1}`} variant="primary">
                  <RotateCcw size={15} aria-hidden /> {t("Try again")}
                </ButtonLink>
              </>
            )}
          </div>
        </Card>
      )}
      {/*
        WHAT SLIPPED, TO GO OVER BEFORE THE NEXT GO: each question that was not
        right, with its answer, the way the quest's finish lists its answers.
      */}
      {result && result.marks.some((m) => m !== "right") && (
        <section aria-labelledby="check-slipped">
          <h2 id="check-slipped" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{t("What to go over")}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {items.map((item, i) => result.marks[i] === "right" ? null : (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 rounded-[var(--r)] border px-4 py-2.5" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
                {item.kind === "type" ? (
                  <>
                    <span style={{ color: "var(--ink-2)" }}><LessonText text={item.en} locale={locale} /></span>
                    <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>{item.answer}</span>
                  </>
                ) : (
                  <>
                    <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{item.et}</span>
                    <span style={{ color: "var(--ink-2)" }}><LessonText text={item.answer} locale={locale} /></span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A score with a half in it (a nearly) says so; a whole one does not print ".0". */
function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
