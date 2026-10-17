"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceGroup } from "@/components/Choice";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { markPhrase, type PracticeItem, type TypedMark } from "@/lib/course/lessons";
import { isAdvanceKey } from "@/lib/ux/advanceKey";
import { OPTION_CLASS, optionState, VERDICT_CLASS } from "@/lib/ux/verdict";

/**
 * PRACTISE AND REVIEW: ONE QUESTION AT A TIME, BUILT BY THE SERVER FROM THE
 * LEDGER (`lib/course/lessons/practice.ts`).
 *
 * A heard phrase and a read word are picked from four meanings; a meaning is
 * then typed back in Estonian. The questions arrive already built, so nothing
 * here decides what a learner may be asked, and every one of them is
 * something the Words step has just shown.
 *
 * IT GRADES NOTHING WHILE LESSONS ARE IN PREVIEW. Once they are the course,
 * the review step is the review queue and grades through `gradeCard` like
 * every other round (ADR-016); until then a lesson changes nobody's deck, which
 * is what lets a reviewer open one without moving their own schedule.
 *
 * A hue is never the only thing saying how an answer went: the option wears
 * the app's marking class and the live region says it in words.
 */
export function Quiz({ items, onFinished }: { items: readonly PracticeItem[]; onFinished: () => void }) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [mark, setMark] = useState<TypedMark | null>(null);
  const [firstTime, setFirstTime] = useState(0);
  const [over, setOver] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  const item = items[Math.min(at, items.length - 1)];
  const answered = item ? (item.kind === "type" ? mark !== null : picked !== null) : false;

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  if (!item) return null;

  const next = () => {
    if (at >= items.length - 1) {
      setOver(true);
      onFinished();
      return;
    }
    setAt((n) => n + 1);
    setPicked(null);
    setTyped("");
    setMark(null);
  };

  if (over) {
    return (
      <div data-lesson-quiz="done">
        <Card tone="sky">
          <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {fill(t("{n} of {total} right the first time."), { n: String(firstTime), total: String(items.length) })}
          </p>
          <p role="status" className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
            {firstTime === items.length
              ? t("Every one. Carry on when you're ready.")
              : t("The ones you missed come back in the review at the end of the next lesson.")}
          </p>
        </Card>
      </div>
    );
  }

  const pick = (option: string) => {
    if (picked !== null || item.kind === "type") return;
    setPicked(option);
    const right = option === item.answer;
    if (right) setFirstTime((n) => n + 1);
    sound(right ? "right" : "wrong");
  };

  const check = () => {
    if (item.kind !== "type" || mark !== null) return;
    const m = markPhrase(typed, item.accept);
    setMark(m);
    if (m.verdict === "right") setFirstTime((n) => n + 1);
    sound(m.verdict === "wrong" ? "wrong" : "right");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (answered && isAdvanceKey(e)) {
      e.preventDefault();
      next();
    }
  };

  return (
    <div data-lesson-quiz={at + 1} onKeyDown={onKeyDown}>
      <Card>
        <SectionTitle hint={fill(t("{n} of {total}"), { n: String(at + 1), total: String(items.length) })}>
          {item.kind === "hear" ? t("Listen. What does it mean?") : item.kind === "pick" ? t("What does it mean?") : t("Say it in Estonian")}
        </SectionTitle>

        {item.kind === "hear" && (
          <div className="flex flex-wrap items-center gap-3">
            <Speak key={`${at}-${item.et}`} text={item.et} size={22} autoplay insist label={t("Play it again")} />
            {picked !== null && <p lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{item.et}</p>}
          </div>
        )}
        {item.kind === "pick" && (
          <div className="flex flex-wrap items-center gap-3">
            <p lang="et" className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{item.et}</p>
            <Speak text={item.et} size={18} />
          </div>
        )}

        {item.kind !== "type" ? (
          <ChoiceGroup ariaLabel={t("What it means")} select="one" className="choice-grid mt-4">
            {item.options.map((option) => {
              const state = picked === null ? null : optionState(option === item.answer, option === picked);
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === picked}
                  disabled={picked !== null}
                  onClick={() => pick(option)}
                  className={`choice-btn rounded-[var(--r-lg)] px-4 py-3 text-left text-base font-semibold ${state ? OPTION_CLASS[state] : ""}`}
                >
                  <LessonText text={option} locale={locale} />
                </button>
              );
            })}
          </ChoiceGroup>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-xl font-bold" style={{ color: "var(--ink)" }}><LessonText text={item.en} locale={locale} /></p>
            <input
              lang="et"
              className="field-lg w-full"
              value={typed}
              disabled={mark !== null}
              aria-label={t("Your answer, in Estonian")}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mark === null) {
                  e.preventDefault();
                  e.stopPropagation();
                  check();
                }
              }}
            />
            {mark === null && <div className="under-field"><DiacriticBar /></div>}
            {mark !== null && (
              <div className={`verdict-panel ${VERDICT_CLASS[mark.verdict === "wrong" && mark.close ? "nearly" : mark.verdict]}`}>
                <p>
                  {t(mark.note)}{" "}
                  {mark.verdict !== "right" && (
                    <>
                      {t("It's")} <span lang="et" className="font-bold">{item.answer}</span>
                    </>
                  )}
                </p>
              </div>
            )}
            {mark !== null && (
              <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
                <Speak text={item.answer} size={15} /> {t("hear it")}
              </span>
            )}
          </div>
        )}

        <p role="status" aria-live="polite" className="sr-only">
          {item.kind === "type"
            ? mark ? `${t(mark.note)} ${item.answer}` : ""
            : picked === null ? "" : picked === item.answer ? t("Right.") : fill(t("Not this one. It means {answer}."), { answer: t(item.answer) })}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {item.kind === "type" && mark === null ? (
            <Button variant="primary" onClick={check}>
              <Check size={15} aria-hidden /> {t("Check")}
            </Button>
          ) : answered ? (
            <Button ref={nextRef} variant="primary" onClick={next}>
              {at >= items.length - 1 ? t("Done") : t("Next")} <ArrowRight size={15} aria-hidden />
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
