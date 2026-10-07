"use client";

import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";

import { useCallback, useState } from "react";
import { Award } from "lucide-react";
import { recordCheckpoint } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { Confetti } from "@/components/Confetti";
import { Et } from "@/components/Et";
import { EstonianInput } from "@/components/EstonianInput";
import { Card, Empty, Meter, Page } from "@/components/ui";
import { checkAnswer, countsAsRecalled } from "@/lib/estonian/answer";
import { BLANK } from "@/lib/estonian/cloze";
import type { CheckpointQuestion } from "@/lib/collections/checkpoint";
import type { Level } from "@/lib/collections/syllabus";
import { Explain } from "@/components/Explain";
import { NOT_REACHED } from "@/lib/copy/values";

/**
 * Sits a level checkpoint.
 *
 * No feedback until the end, and that is deliberate rather than an omission: a
 * checkpoint measures what the learner can already do, and telling them the
 * answer to question three teaches them something that question eleven then
 * tests. A lesson corrects as it goes; an exam does not.
 *
 * The question list is snapshotted on mount, like every other session here —
 * `recordCheckpoint` is a Server Action and Next re-runs the page after one,
 * which would otherwise deal a freshly seeded paper mid-exam.
 */
export function CheckpointSession({
  level, title, blurb, passMark, initialQuestions,
}: {
  level: Level;
  title: string;
  blurb: string;
  passMark: number;
  initialQuestions: CheckpointQuestion[];
}) {
  const t = useT();
  const [questions] = useState(initialQuestions);
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState("");
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState<{ lemma: string; expected: string; given: string }[]>([]);
  const [answers, setAnswers] = useState<
    { id: string; lemma: string; kind: string; correct: boolean; durationMs: number }[]
  >([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [done, setDone] = useState<{ passed: boolean; level: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = questions.length;
  const question = questions[at];

  const finish = useCallback(async (
    finalCorrect: number,
    finalAnswers: typeof answers,
  ) => {
    setSaving(true);
    const result = await recordCheckpoint(level, finalCorrect, total, finalAnswers).catch(() => null);
    setSaving(false);
    if (!result || !result.ok) { setError(t(result ? result.error : NOT_REACHED)); return; }
    setDone({ passed: result.passed, level: result.level });
  }, [level, total, t]);

  const submit = useCallback(() => {
    if (!question || saving || done) return;
    const result = checkAnswer(typed, question.answer, "et", question.rivals);
    const ok = countsAsRecalled(result.verdict);
    const tally = correct + (ok ? 1 : 0);
    if (ok) setCorrect(tally);
    else setWrong((w) => [...w, { lemma: question.lemma, expected: question.answer, given: typed.trim() }]);

    const record = {
      // Generated per answer so a retried submit settles rather than
      // double-counting, the same property the offline outbox relies on.
      id: typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${question.id}-${Date.now()}`,
      lemma: question.lemma,
      kind: question.kind,
      correct: ok,
      durationMs: Math.min(Date.now() - startedAt, 600_000),
    };
    const nextAnswers = [...answers, record];
    setAnswers(nextAnswers);
    setStartedAt(Date.now());

    setTyped("");
    if (at + 1 < total) setAt(at + 1);
    else void finish(tally, nextAnswers);
  }, [answers, at, correct, done, finish, question, saving, startedAt, total, typed]);

  if (total === 0) {
    return (
      <Page title={t(title)} lead={t(blurb)}>
        <Empty
          title={t("Not enough words from this level yet")}
          body={t("A checkpoint asks about the whole level, so work through a few of its units first.")}
          action={<ButtonLink href="/learn">{t("Back to the course")}</ButtonLink>}
        />
      </Page>
    );
  }

  if (done) {
    const pct = Math.round((correct / total) * 100);
    return (
      <Page title={t(title)} eyebrow={fill(t("{level} checkpoint"), { level })}>
        <Card className="flex flex-col gap-4">
          {done.passed && <Confetti />}
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--accent-deep)" }}>
            <Award size={16} aria-hidden /> {done.passed ? t("Passed") : t("Not this time")}
          </div>
          <h2 className="text-3xl tnum">{fill(t("{correct} of {total}, {pct}%"), { correct, total, pct })}</h2>
          <p className="text-lg">
            {done.passed
              ? fill(t("That's {level} behind you. The course now starts you at {next}."), { level, next: done.level ?? "" })
              : fill(t("You need {mark}% to pass this one. Nothing's changed on your course, and you can try again whenever you like."), { mark: passMark })}
          </p>
          {wrong.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Worth another look:")}</p>
              <ul className="flex flex-col gap-1 text-sm">
                {wrong.map((w, i) => (
                  <li key={`${w.lemma}-${i}`} className="flex flex-wrap gap-2">
                    <Et className="font-semibold">{w.expected}</Et>
                    <span style={{ color: "var(--ink-3)" }}>
                      {w.given ? <>{t("you wrote")} <Et>{w.given}</Et></> : t("left blank")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/learn">{t("Back to the course")}</ButtonLink>
            <ButtonLink href="/review" variant="ghost">{t("Review now")}</ButtonLink>
          </div>
        </Card>
      </Page>
    );
  }

  if (!question) return null;
  const [wordIsBefore, wordIsAfter = ""] = t("The word is {word} ({gloss}). Write it in the form this sentence needs.").split("{word}");

  return (
    <Page
      title={t(title)}
      eyebrow={fill(t("{level} checkpoint"), { level })}
      lead={`${t(blurb)} ${t("You'll find out how you did at the end, not after each answer.")}`}
    >
      <div className="flex flex-col gap-5">
        <Meter pct={Math.round((at / total) * 100)} label={fill(t("Question {n} of {total}"), { n: at + 1, total })} />
        <Card className="flex flex-col gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            {fill(t(question.kind === "gap"
              ? "Question {n} of {total}, fill the gap"
              : "Question {n} of {total}, write it in Estonian"), { n: at + 1, total })}
          </span>
          {question.kind === "gap" ? (
            <>
              <p className="text-xl"><Et>{question.sentence}</Et></p>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                {wordIsBefore}<Et>{question.lemma}</Et>{wordIsAfter.replace("{gloss}", question.gloss)}
              </p>
            </>
          ) : (
            <p className="text-2xl">{question.gloss}</p>
          )}
          <EstonianInput
            key={question.id}
            value={typed}
            onChange={setTyped}
            large
            autoFocus
            ariaLabel={t("Your answer in Estonian")}
            placeholder={question.kind === "gap" ? BLANK : undefined}
            onEnter={submit}
          />
          {/* The one action on a checkpoint question, so the loud one. */}
          <Button variant="primary" onClick={submit} className="self-start" disabled={saving}>
            {at + 1 === total ? t("Finish") : t("Next")}
          </Button>
          {saving && <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Marking…")}</p>}
          {error && <p className="text-sm" role="alert" style={{ color: "var(--again-ink)" }}>{t(error)}</p>}
          <Explain label={t("What happens if I pass, or don't")}>
            {t("Pass, and the course moves you up a level. Don't, and nothing changes: one bad evening doesn't take away a level you already have.")}
          </Explain>
        </Card>
      </div>
    </Page>
  );
}
