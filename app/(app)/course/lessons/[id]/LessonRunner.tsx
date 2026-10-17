"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { RuleNote } from "@/components/RuleNote";
import { Speak } from "@/components/Speak";
import { useLocale, useT } from "@/components/Locale";
import { LessonText, lessonTextLang } from "@/components/course/LessonText";
import { Card, Chip, Page, SectionTitle, Stack } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import type { LessonSpec, PracticeItem, Taught } from "@/lib/course/lessons";
import { lessonLabel } from "@/lib/course/lessons/label";
import { Quiz } from "./Quiz";
import { SayIt } from "./SayIt";

/**
 * ONE LESSON, SIX STEPS, ALWAYS IN THIS ORDER (docs/43-lessons.md §1).
 *
 * Listen, Words and How it works ask nothing and grade nothing: a learner
 * meets the whole idea before anybody asks them a thing about it, which is
 * the change the plan was written for. Practise and Review ask, out of what
 * has been taught and nothing else. Say it sits between them as the headline.
 *
 * A learner always knows where they are, because the six steps are listed at
 * the top with the one they are on marked, in words as well as in colour. A
 * step can always be left: the button at the foot says "Continue" once the
 * step is done and "Skip this step" before, so nobody is held in a room, and
 * the three teaching steps are done the moment they are open.
 *
 * Pressing on moves the caret to the new step's heading, which a screen
 * reader reads out, and brings it to the top of the window, because a step is
 * taller than a phone and arriving halfway down the next one is how a press
 * reads as broken.
 */
const STEPS = ["listen", "words", "how", "practise", "say", "review"] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLE: Record<Step, string> = {
  listen: "Listen",
  words: "Words",
  how: "How it works",
  practise: "Practise",
  say: "Say it",
  review: "Review",
};

/** The three teaching steps are finished by being open. */
const ASKS: ReadonlySet<Step> = new Set(["practise", "say", "review"]);

export function LessonRunner({ lesson, practice, review, next }: {
  lesson: LessonSpec;
  practice: readonly PracticeItem[];
  review: readonly PracticeItem[];
  next: { id: string; title: string } | null;
}) {
  const t = useT();
  const locale = useLocale();
  const [at, setAt] = useState(0);
  const [finished, setFinished] = useState<ReadonlySet<Step>>(new Set());
  const [over, setOver] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const step = STEPS[at]!;

  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start" });
  }, [at, over]);

  const finish = (s: Step) => setFinished((prev) => new Set(prev).add(s));
  const go = (n: number) => {
    moved.current = true;
    if (n >= STEPS.length) setOver(true);
    else setAt(n);
  };
  const done = !ASKS.has(step) || finished.has(step) || (step === "review" && review.length === 0);

  if (over) {
    return (
      <Page eyebrow={fill(t("Lesson {n}"), { n: lessonLabel(lesson) })} title={t(lesson.title)} titleLang={lessonTextLang(lesson.title, locale)}>
        <Stack>
          <section aria-labelledby="lesson-done">
            <h2 id="lesson-done" ref={heading} tabIndex={-1} className="text-xl font-bold" style={{ color: "var(--ink)" }}>
              {t("Lesson done")}
            </h2>
            <p className="mt-3 label-xs" style={{ color: "var(--ink-3)" }}>{t("What you can do now")}</p>
            <p className="mt-1 text-md" style={{ color: "var(--ink)" }}><LessonText text={lesson.goal} locale={locale} /></p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ButtonLink href="/course/lessons">{t("All lessons")}</ButtonLink>
              {next && (
                <ButtonLink variant="primary" href={`/course/lessons/${next.id}`}>
                  {t("Next:")} <LessonText text={next.title} locale={locale} /> <ArrowRight size={15} aria-hidden />
                </ButtonLink>
              )}
            </div>
          </section>
        </Stack>
      </Page>
    );
  }

  return (
    <Page eyebrow={fill(t("Lesson {n}"), { n: lessonLabel(lesson) })} title={t(lesson.title)} titleLang={lessonTextLang(lesson.title, locale)} lead={t(lesson.goal)} leadLang={lessonTextLang(lesson.goal, locale)}>
      <Stack>
        <nav aria-label={t("Tonight's steps")}>
          <ol className="flex flex-wrap gap-2" data-lesson-steps>
            {STEPS.map((s, i) => (
              <li key={s}>
                <Chip tone={i === at ? "accent" : finished.has(s) || i < at ? "sky" : "neutral"}>
                  <span aria-current={i === at ? "step" : undefined}>
                    {i < at && <Check size={12} aria-hidden className="mr-1 inline" />}
                    {fill(t("{n}. {step}"), { n: String(i + 1), step: t(STEP_TITLE[s]) })}
                  </span>
                </Chip>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-labelledby="lesson-step">
          <h2 id="lesson-step" ref={heading} tabIndex={-1} className="mb-4 text-xl font-bold scroll-mt-24" style={{ color: "var(--ink)" }}>
            {fill(t("Step {n} of {total}: {step}"), { n: String(at + 1), total: String(STEPS.length), step: t(STEP_TITLE[step]) })}
          </h2>
          {step === "listen" && <Listen lesson={lesson} />}
          {step === "words" && <Words lesson={lesson} />}
          {step === "how" && <How lesson={lesson} />}
          {step === "practise" && <Quiz key="practise" items={practice} onFinished={() => finish("practise")} />}
          {step === "say" && <SayIt lesson={lesson} onComplete={() => finish("say")} />}
          {step === "review" && (review.length > 0
            ? <Quiz key="review" items={review} onFinished={() => finish("review")} />
            : (
              <Card>
                <p className="text-base" style={{ color: "var(--ink-2)" }}>
                  {t("This is your first lesson, so there's nothing older to go over yet. From the next one, this is where earlier words come back.")}
                </p>
              </Card>
            ))}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {at > 0 ? (
            <Button variant="ghost" onClick={() => go(at - 1)}>
              <ArrowLeft size={15} aria-hidden /> {t("Back")}
            </Button>
          ) : <span />}
          <Button variant={done ? "primary" : "secondary"} onClick={() => go(at + 1)}>
            {done ? (at === STEPS.length - 1 ? t("Finish the lesson") : t("Continue")) : t("Skip this step")} <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </Stack>
    </Page>
  );
}

/** Step 1: the conversation, in the cast's voices, with the English under each line. */
function Listen({ lesson }: { lesson: LessonSpec }) {
  const t = useT();
  const locale = useLocale();
  const [english, setEnglish] = useState(true);
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("Read it, and press a line to hear it. Nothing is asked yet.")}</p>
        <Button variant="ghost" size="sm" onClick={() => setEnglish((on) => !on)} aria-pressed={!english}>
          {english ? t("Hide the English") : t("Show the English")}
        </Button>
      </div>
      <ol className="flex flex-col gap-4" data-lesson-conversation>
        {lesson.conversation.map((line, i) => (
          <li key={i} className="flex flex-col gap-1">
            <span className="label-xs" style={{ color: "var(--ink-3)" }}>{line.who}</span>
            {line.et && (
              <div className="flex items-start gap-2">
                <Speak text={line.et} voice={lesson.cast[line.who]} size={18} label={fill(t("Hear {who} say it"), { who: line.who })} />
                <p lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{line.et}</p>
              </div>
            )}
            {line.et && english && line.en && (
              <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line.en} locale={locale} /></p>
            )}
            {line.stage && (
              <p className="text-base italic" style={{ color: "var(--ink-3)" }}><LessonText text={line.stage} locale={locale} /></p>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** What a taught item is, in a few words, for the Words table. */
function kindOf(item: Taught, t: (english: string) => string): string | null {
  if (item.kind === "phrase") return item.et.includes(" ") ? t("phrase") : null;
  if (item.kind === "form") return fill(t("a form of {lemma}"), { lemma: item.of });
  if (item.kind === "verb") return t("a verb and its I-form");
  return null;
}

/**
 * Neighbours that mean the same thing share a row, so the long and the short
 * form read as one word with two spellings (`mina`, `ma`) rather than as two
 * words to learn.
 */
function rowsOf(items: readonly Taught[]): Taught[][] {
  const rows: Taught[][] = [];
  for (const item of items) {
    const last = rows[rows.length - 1];
    if (last && last[0]!.en === item.en && last[0]!.kind === item.kind) last.push(item);
    else rows.push([item]);
  }
  return rows;
}

/** Step 2: everything new tonight, in one table, with nothing asked. */
function Words({ lesson }: { lesson: LessonSpec }) {
  const t = useT();
  const locale = useLocale();
  if (lesson.teaches.length === 0) {
    return (
      <Card>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {t("No new words tonight. Everything in this lesson is something you've already met, put together.")}
        </p>
      </Card>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[var(--r-lg)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}>
      <table className="w-full min-w-[320px] text-base" data-lesson-words>
        <thead>
          <tr style={{ color: "var(--ink-3)" }}>
            <th scope="col" className="label-xs px-4 py-3 text-left">{t("Estonian")}</th>
            <th scope="col" className="label-xs px-4 py-3 text-left">{t("In English")}</th>
          </tr>
        </thead>
        <tbody>
          {rowsOf(lesson.teaches).map((row) => {
            const kind = kindOf(row[0]!, t);
            return (
              <tr key={row[0]!.et} className="border-t" style={{ borderColor: "var(--edge)" }}>
                <td className="px-4 py-3 align-top">
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {row.flatMap((item) => (item.kind === "verb" ? [item.et, item.first] : [item.et])).map((et) => (
                      <span key={et} className="flex items-center gap-2">
                        <Speak text={et} size={15} />
                        <span lang="et" className="font-bold" style={{ color: "var(--ink)" }}>{et}</span>
                      </span>
                    ))}
                  </span>
                  {kind && <span className="mt-0.5 block text-sm" style={{ color: "var(--ink-3)" }}>{kind}</span>}
                </td>
                <td className="px-4 py-3 align-top" style={{ color: "var(--ink-2)" }}>
                  <LessonText text={row[0]!.en} locale={locale} />
                  {row[0]!.kind === "verb" && (
                    <span className="mt-0.5 block"><span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{row[0]!.first}</span>: <LessonText text={row[0]!.firstEn} locale={locale} /></span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Step 3: the one idea of the evening, shown on tonight's own lines. */
function How({ lesson }: { lesson: LessonSpec }) {
  const t = useT();
  const locale = useLocale();
  const { how } = lesson;
  const examples = (how.examples ?? []).map((i) => lesson.conversation[i]).filter((l) => l?.et);
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <RuleNote summary={how.point} watchOut={how.watchOut} />
      </Card>
      {how.notes && how.notes.length > 0 && (
        <ul className="flex max-w-[65ch] flex-col gap-3">
          {how.notes.map((note) => (
            <li key={note} className="text-base leading-relaxed" style={{ color: "var(--ink)" }}><LessonText text={note} locale={locale} /></li>
          ))}
        </ul>
      )}
      {how.table && (
        <div className="overflow-x-auto rounded-[var(--r-lg)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}>
          <table className="w-full min-w-[320px] text-base" data-lesson-table>
            <thead>
              <tr style={{ color: "var(--ink-3)" }}>
                {how.table.head.map((h, i) => (
                  <th key={i} scope="col" className="label-xs px-4 py-3 text-left"><LessonText text={h} locale={locale} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {how.table.rows.map((row, r) => (
                <tr key={r} className="border-t" style={{ borderColor: "var(--edge)" }}>
                  {row.map((cell, c) => (
                    <td key={c} className="px-4 py-3 align-top">
                      {"et" in cell
                        ? <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{cell.et}</span>
                        : <span style={{ color: "var(--ink-2)" }}><LessonText text={cell.en} locale={locale} /></span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {examples.length > 0 && (
        <section>
          <SectionTitle hint={t("from tonight's conversation")}>{t("Where you heard it")}</SectionTitle>
          <ul className="flex flex-col gap-3">
            {examples.map((line, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <Speak text={line!.et!} voice={lesson.cast[line!.who]} size={15} />
                  <span lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{line!.et}</span>
                </span>
                <span className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line!.en ?? ""} locale={locale} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
