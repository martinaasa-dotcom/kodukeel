"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceCard, ChoiceGroup } from "@/components/Choice";
import { DiacriticBar } from "@/components/DiacriticBar";
import { GlossedSentence } from "@/components/GlossedSentence";
import { Speak } from "@/components/Speak";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { DialectNote } from "@/components/course/DialectNote";
import { Card, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import type { GlossedToken } from "@/lib/dict/glossed";
// By its own module, never the barrel, which imports every lesson the course has.
import { markPhrase } from "@/lib/course/lessons/practice";
import type { ReadQuestion, ReadText as ReadTextSpec } from "@/lib/course/lessons/types";
import { OPTION_CLASS, optionState, VERDICT_CLASS, type Verdict } from "@/lib/ux/verdict";

/**
 * A REAL TEXT, AFTER THE CONVERSATION (B2 on, `LessonSpec.read`).
 *
 * What the part's situation really puts in front of somebody: a notice in the
 * stairwell, a message from the school, a letter from an office. It is drawn
 * after the transcript in the Listen step, read rather than heard. At B2
 * nothing on the screen asks anything about it (docs/43-lessons.md §13.6).
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
 * FROM C1'S THIRD PART THE TEXT IS ASKED ABOUT (§15.7), under it, in the
 * paper's three shapes (`ReadQuestion`): statements matched to the text's
 * sections, which are numbered over the lines; a whole sentence chosen for a
 * gap, the line it takes out drawn as a gap until it is answered; and short
 * answers marked as a typed phrase is (`markPhrase`). Nothing is graded. A
 * regional word says its standard word under the line (`DialectNote`).
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
  const questions = text.questions ?? [];
  const [checked, setChecked] = useState<readonly boolean[]>(() => questions.map(() => false));
  // A line a gap question takes out is drawn as a gap until that question is checked.
  const gapOf = new Map(questions.flatMap((q, i) => (q.kind === "gap" ? [[q.line, i] as const] : [])));
  const asked = questions.length > 0;
  return (
    <Card>
      <div data-lesson-read>
        <SectionTitle level={3} hint={asked ? t("read it, then answer") : t("read it, nothing is asked")}>
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
            const section = line.section !== undefined && line.section !== (i === 0 ? undefined : text.lines[i - 1]!.section) ? line.section : null;
            const gap = gapOf.get(i);
            const hidden = gap !== undefined && !checked[gap];
            return (
              <li key={`${i}:${line.et}`} className="flex flex-col gap-1" data-read-line={i + 1} data-read-section={line.section}>
                {section !== null && <span className="label-xs" style={{ color: "var(--ink-3)" }}>{fill(t("Section {n}"), { n: String(section) })}</span>}
                {hidden ? (
                  <span className="text-lg font-semibold" style={{ color: "var(--accent-deep)" }} data-read-gap={gap + 1}>
                    {fill(t("Gap {n}: choose the sentence below."), { n: String(gap + 1) })}
                  </span>
                ) : glossed && glossed.length > 0 ? (
                  <GlossedSentence tokens={[...glossed]} sentence={line.et} prose offerTurnOff={false} />
                ) : (
                  <span className="flex items-start gap-2">
                    <Speak text={line.et} size={15} label={t("Hear the sentence")} />
                    <span lang="et" className="text-lg" style={{ color: "var(--ink)" }}>{line.et}</span>
                  </span>
                )}
                {!hidden && <DialectNote et={line.et} />}
                {english && !hidden && <span className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line.en} locale={locale} /></span>}
              </li>
            );
          })}
        </ol>
        {asked && (
          <section aria-labelledby="read-questions" className="mt-6 flex flex-col gap-6" data-read-questions>
            <h4 id="read-questions" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{t("Questions on the text")}</h4>
            {questions.map((q, i) => (
              <ReadQuestionCard
                key={i}
                q={q}
                n={i + 1}
                of={questions.length}
                text={text}
                checked={checked[i] ?? false}
                onChecked={() => setChecked((all) => all.map((c, j) => (j === i ? true : c)))}
              />
            ))}
          </section>
        )}
      </div>
    </Card>
  );
}

/** One question about the text, answered and then checked: nothing graded, the right answer shown in words. */
function ReadQuestionCard({ q, n, of, text, checked, onChecked }: {
  q: ReadQuestion; n: number; of: number; text: ReadTextSpec; checked: boolean; onChecked: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const sections = [...new Set(text.lines.flatMap((l) => (l.section === undefined ? [] : [l.section])))];
  const [picks, setPicks] = useState<readonly (number | null)[]>(() => (q.kind === "match" ? q.statements.map(() => null) : [null]));
  const [typed, setTyped] = useState("");
  // Checking takes the button away, so the caret goes to the line saying how it went.
  const resultRef = useRef<HTMLParagraphElement>(null);
  const pressed = useRef(false);
  useEffect(() => {
    if (checked && pressed.current) { pressed.current = false; resultRef.current?.focus(); }
  }, [checked]);
  /* A typed answer most of the way there is painted nearly, as every typed mark is (`close`). */
  const typedMark = q.kind === "short" && typed.trim() !== "" ? markPhrase(typed, q.accept) : null;
  const verdicts: Verdict[] = q.kind === "match"
    ? q.statements.map((s, j) => (picks[j] === s.section ? "right" : "wrong"))
    : q.kind === "gap" ? [picks[0] === q.answer ? "right" : "wrong"]
      : [typedMark ? (typedMark.verdict === "wrong" && typedMark.close ? "nearly" : typedMark.verdict) : "wrong"];
  const right = verdicts.filter((v) => v === "right").length;
  const ready = q.kind === "short" ? typed.trim() !== "" : picks.every((p) => p !== null);
  const check = () => {
    pressed.current = true;
    onChecked();
    sound(verdicts.every((v) => v === "right") ? "right" : "wrong");
  };
  const heading = q.kind === "match" ? t("Which section says it?") : q.kind === "gap" ? fill(t("Which sentence fills gap {n}?"), { n: String(n) }) : t("Answer in a word or two");

  return (
    <div data-read-question={n} data-read-kind={q.kind}>
      <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>{fill(t("Question {n} of {total}"), { n: String(n), total: String(of) })}</p>
      <p className="mb-3 text-lg font-semibold" style={{ color: "var(--ink)" }}>{heading}</p>

      {q.kind === "match" && (
        <ol className="flex flex-col gap-4">
          {q.statements.map((s, j) => (
            <li key={`${j}:${s.et}`} className="flex flex-col gap-2">
              <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{s.et}</p>
              <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={s.en} locale={locale} /></p>
              <ChoiceGroup ariaLabel={s.et} select="one" answer={checked} className="flex flex-wrap gap-2">
                {sections.map((section) => {
                  const picked = picks[j] === section;
                  if (!checked) {
                    return (
                      <ChoiceCard
                        key={section}
                        selected={picked}
                        onSelect={() => setPicks((all) => all.map((p, k) => (k === j ? section : p)))}
                        title={fill(t("Section {n}"), { n: String(section) })}
                      />
                    );
                  }
                  return (
                    <button
                      key={section}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      disabled
                      className={`choice-btn rounded-[var(--r-lg)] border px-4 py-2 text-base font-semibold ${OPTION_CLASS[optionState(section === s.section, picked)]}`}
                    >
                      {fill(t("Section {n}"), { n: String(section) })}
                    </button>
                  );
                })}
              </ChoiceGroup>
            </li>
          ))}
        </ol>
      )}

      {q.kind === "gap" && (
        <ChoiceGroup ariaLabel={heading} select="one" answer={checked} className="choice-grid">
          {q.options.map((o, j) => {
            const picked = picks[0] === j;
            if (!checked) {
              return (
                <ChoiceCard
                  key={`${j}:${o.et}`}
                  selected={picked}
                  onSelect={() => setPicks([j])}
                  title={o.et}
                  titleLang="et"
                  layout="stacked"
                />
              );
            }
            return (
              <button
                key={`${j}:${o.et}`}
                type="button"
                role="radio"
                aria-checked={picked}
                disabled
                className={`choice-btn rounded-[var(--r-lg)] border px-4 py-3 text-left text-base font-semibold ${OPTION_CLASS[optionState(j === q.answer, picked)]}`}
              >
                <span lang="et">{o.et}</span>
                <span className="mt-0.5 block text-sm font-normal" style={{ color: "var(--ink-2)" }}><LessonText text={o.en} locale={locale} /></span>
              </button>
            );
          })}
        </ChoiceGroup>
      )}

      {q.kind === "short" && (
        <>
          <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{q.q.et}</p>
          <p className="mb-2 text-base" style={{ color: "var(--ink-2)" }}><LessonText text={q.q.en} locale={locale} /></p>
          <input
            lang="et"
            className="field w-full"
            value={typed}
            disabled={checked}
            aria-label={fill(t("Your answer to question {n}, in Estonian"), { n: String(n) })}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && ready && !checked) { e.preventDefault(); check(); } }}
          />
          {!checked && <div className="under-field"><DiacriticBar /></div>}
        </>
      )}

      {/* Mounted empty and filled, since a status region that arrives holding its words is often not read. */}
      <p className="sr-only" role="status">
        {!checked ? null : q.kind === "match"
          ? fill(t("{n} of {total} matched to their section."), { n: String(right), total: String(q.statements.length) })
          : verdicts[0] === "right" ? t("That's it.") : verdicts[0] === "nearly" ? t("Nearly.") : t("Not quite.")}
      </p>
      {checked ? (
        <p ref={resultRef} tabIndex={-1} className={`verdict-panel mt-3 outline-none ${VERDICT_CLASS[verdicts.every((v) => v === "right") ? "right" : verdicts.some((v) => v !== "wrong") ? "nearly" : "wrong"]}`}>
          {q.kind === "match"
            ? fill(t("{n} of {total} matched to their section."), { n: String(right), total: String(q.statements.length) })
            : verdicts[0] === "right" ? t("That's it.") : verdicts[0] === "nearly" ? t("Nearly.") : t("Not quite.")}
          {q.kind === "short" && <>{" "}<span lang="et" className="font-bold">{q.accept[0]}</span></>}
        </p>
      ) : (
        <div className="mt-3 flex justify-end">
          <Button variant={ready ? "primary" : "secondary"} disabled={!ready} onClick={check}>
            <Check size={15} aria-hidden /> {t("Check")}
          </Button>
        </div>
      )}
    </div>
  );
}
