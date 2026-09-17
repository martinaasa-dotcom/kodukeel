"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaseQuestion } from "@/components/CaseQuestion";
import { plainAskLine } from "@/lib/estonian/plainAsk";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight, Check, Ear, Sparkles, X } from "lucide-react";
import { completeLesson } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { Confetti } from "@/components/Confetti";
import { Et } from "@/components/Et";
import { EstonianInput } from "@/components/EstonianInput";
import { Speak } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { TooComplicated } from "@/components/TooComplicated";
import { Card, Empty, KeyCap, Meter, Page } from "@/components/ui";
import { BLANK, sizedBlank } from "@/lib/estonian/cloze";
import { orderIsRight, readOrder } from "@/lib/estonian/wordOrder";
import { ORDER_EXACT, orderVariantNote, ORDER_WRONG } from "@/lib/copy/values";
import { checkAnswer, countsAsRecalled } from "@/lib/estonian/answer";
import { isAnswerable, type LessonStep } from "@/lib/collections/lesson";
import { grammarPoint } from "@/lib/estonian/grammar";
import { OPTION_CLASS, VERDICT_CLASS, optionState } from "@/lib/ux/verdict";
import { isAdvanceKey } from "@/lib/ux/advanceKey";

interface Answer {
  id: string;
  lemma: string;
  kind: string;
  correct: boolean;
  durationMs: number;
}

/**
 * A lesson, one step at a time.
 *
 * Two rules from elsewhere in the app shape this component rather than the
 * markup:
 *
 * The step list is snapshotted into state on mount and never read from the prop
 * again. `completeLesson` is a Server Action, and Next re-runs the page's Server
 * Component after one; a session that indexed into its prop would have the plan
 * recomputed underneath it mid-answer.
 *
 * Nothing is graded until the last step. An abandoned lesson writes nothing
 * (ADR-016) — answers accumulate here and go to the server in one call at the
 * end, which is also what makes the submission idempotent, since each answer
 * carries an id generated once, here.
 */
export function LessonSession({
  unitId, unitTitle, initialSteps, part, parts, starred,
}: {
  unitId: string;
  unitTitle: string;
  initialSteps: LessonStep[];
  part: number;
  parts: number;
  /** The lexeme ids this learner has already favourited, read once by the page. */
  starred: readonly string[];
}) {
  /*
    The plan, snapshotted on mount for the reason the header gives, and
    writable for one thing only: a word somebody says is too complicated leaves
    the rest of the lesson with it. Nothing else may set it.
  */
  const [steps, setSteps] = useState(initialSteps);
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ ok: boolean; error?: string } | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  /* What the "too complicated" button did. See `putAside` below. */
  const [aside, setAside] = useState<string | null>(null);

  const step = steps[at];
  const total = useMemo(() => steps.filter(isAnswerable).length, [steps]);
  const answered = answers.length;
  const correct = answers.filter((a) => a.correct).length;

  const record = useCallback((lemma: string, kind: string, ok: boolean) => {
    setAnswers((prev) => [...prev, {
      // Generated once per answer so a retried submit settles rather than
      // double-counting, the same property the offline outbox relies on.
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${lemma}-${kind}-${prev.length}-${Date.now()}`,
      lemma, kind, correct: ok, durationMs: Math.min(Date.now() - startedAt, 600_000),
    }]);
  }, [startedAt]);

  const advance = useCallback(() => {
    setAt((i) => Math.min(i + 1, steps.length - 1));
    setStartedAt(Date.now());
  }, [steps.length]);

  /**
   * A word the learner has put aside, mid-lesson.
   *
   * The lesson is a list of steps rather than a queue of cards, and one word
   * has several of them: it is met, then chosen, then produced, then gapped.
   * So the rest of that word's steps go with it, or the lesson would carry on
   * asking about a word the app has just promised to leave alone. Everything
   * before the current step is kept exactly as it was, which is what lets the
   * index stay where it is: it now points at the first step that survived.
   *
   * Nothing is recorded for it. `completeLesson` builds cards for the lemmas
   * it was given answers about, so a word dropped here takes no cards at the
   * end, and one the learner already holds a card for was pushed by the action
   * before this ran (`lib/progress/deferrals.ts`). The recap carries no lemma,
   * so there is always a step left to land on.
   */
  const putAside = useCallback((note: string) => {
    const lemma = steps[at]?.lemma;
    if (!lemma) return;
    setSteps((list) => list.filter((s, i) => i < at || s.lemma !== lemma));
    setAside(note);
    setStartedAt(Date.now());
  }, [at, steps]);

  const submit = useCallback(async () => {
    if (saving || saved) return;
    setSaving(true);
    const result = await completeLesson(unitId, answers);
    setSaving(false);
    setSaved(result.ok ? { ok: true } : { ok: false, error: result.error });
  }, [answers, saved, saving, unitId]);

  useEffect(() => {
    if (step?.kind === "recap" && !saved && !saving) void submit();
  }, [saved, saving, step?.kind, submit]);

  if (steps.length === 0 || !step) {
    return (
      <Page title={unitTitle} lead="Nothing to teach here yet.">
        <Empty
          title="This unit has no words in the dictionary yet"
          body="Its words show up once dictionary lookups are turned on, or you can add them yourself."
          action={<ButtonLink href={`/learn/${unitId}`}>Back to the unit</ButtonLink>}
        />
      </Page>
    );
  }

  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <Page
      title={unitTitle}
      eyebrow={parts > 1 ? `Lesson ${part} of ${parts}` : "Lesson"}
      actions={
        <Link href={`/learn/${unitId}`} className="text-sm" style={{ color: "var(--accent-deep)" }}>
          Leave
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        <Meter pct={pct} label={`${answered} of ${total} questions answered`} />
        <StepCard
          key={step.id}
          step={step}
          onAnswer={record}
          onNext={advance}
          onAside={putAside}
          starred={starred}
          summary={{ correct, total: answered, saving, saved }}
        />
        {aside && (
          <p className="text-center text-xs" role="status" style={{ color: "var(--ink-2)" }}>
            {aside}{" "}
            <Link href="/words/mastery" className="underline" style={{ color: "var(--accent-deep)" }}>
              Bring it back
            </Link>
          </p>
        )}
      </div>
    </Page>
  );
}

/** Feedback shown after an answer, in the palette's fixed meanings (lib/ux/verdict.ts). */
function Verdict({ ok, note }: { ok: boolean; note?: string }) {
  return (
    <div
      className={`${VERDICT_CLASS[ok ? "right" : "wrong"]} flex items-start gap-2 rounded-[var(--r-sm)] p-3 text-sm`}
      role="status"
    >
      {ok ? <Check size={18} aria-hidden /> : <X size={18} aria-hidden />}
      <span>{note ?? (ok ? "Correct." : "Not this time.")}</span>
    </div>
  );
}

function Continue({ onNext, label = "Continue" }: { onNext: () => void; label?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isAdvanceKey(e)) { e.preventDefault(); onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext]);
  return (
    /*
      The loud one. This is the only thing to press on the step it sits on, and
      `components/Button.tsx` says what that means: one loud action per screen,
      everything else quiet. It was a plain secondary pill, so the first screen
      of a lesson offered "Start these 6 words" in the same weight as "Leave"
      two lines above it, on the way into the course.
    */
    <Button variant="primary" onClick={onNext} className="self-start">
      {label} <ArrowRight size={15} aria-hidden />
    </Button>
  );
}

/**
 * The options of a multiple choice.
 *
 * Number keys select, which is the difference between a lesson you can rattle
 * through and one that needs a mouse for every answer. Each button clears 44px
 * under a coarse pointer.
 */
function Options({
  options, answer, chosen, onChoose, lang,
}: {
  options: readonly string[];
  answer: number;
  chosen: number | null;
  onChoose: (i: number) => void;
  lang: "et" | "en";
}) {
  useEffect(() => {
    if (chosen !== null) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        onChoose(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chosen, onChoose, options.length]);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option, i) => {
        const isAnswer = i === answer;
        const picked = chosen === i;
        const settled = chosen !== null;
        return (
          <button
            key={option}
            type="button"
            disabled={settled}
            onClick={() => onChoose(i)}
            className={`choice-btn ${settled ? OPTION_CLASS[optionState(isAnswer, picked)] : ""} flex min-h-[44px] items-center gap-3 rounded-[var(--r-sm)] border p-3 text-left`}
          >
            {/* Not `aria-hidden`: the number is a key this round answers to,
                so hiding it takes the shortcut away from the one reader who
                cannot see the option to point at it. */}
            <KeyCap>{i + 1}</KeyCap>
            {lang === "et" ? <Et>{option}</Et> : <span>{option}</span>}
          </button>
        );
      })}
    </div>
  );
}

function StepCard({
  step, onAnswer, onNext, onAside, starred, summary,
}: {
  step: LessonStep;
  onAnswer: (lemma: string, kind: string, ok: boolean) => void;
  onNext: () => void;
  /** Told what the deferral said, so the lesson can drop the word and say so. */
  onAside: (note: string) => void;
  starred: readonly string[];
  summary: { correct: number; total: number; saving: boolean; saved: { ok: boolean; error?: string } | null };
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<{ ok: boolean; note: string } | null>(null);
  const [built, setBuilt] = useState<number[]>([]);

  const choose = (i: number, answer: number, lemma: string, kind: string) => {
    if (chosen !== null) return;
    setChosen(i);
    onAnswer(lemma, kind, i === answer);
  };

  const checkTyped = (expected: string, lemma: string, kind: string) => {
    if (checked) return;
    const result = checkAnswer(typed, expected, "et");
    const ok = countsAsRecalled(result.verdict);
    setChecked({ ok, note: result.note || (ok ? "Correct." : `It is “${result.expected}”.`) });
    onAnswer(lemma, kind, ok);
  };

  switch (step.kind) {
    case "intro":
      return (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--accent-deep)" }}>
            <Sparkles size={16} aria-hidden /> What this lesson gives you
          </div>
          <p className="text-lg">{step.canDo}</p>
          <p style={{ color: "var(--ink-2)" }}>{step.blurb}</p>
          {step.grammar.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>Grammar in this lesson</p>
              <ul className="flex flex-wrap gap-2">
                {step.grammar.map((id) => {
                  const point = grammarPoint(id);
                  if (!point) return null;
                  return (
                    <li key={id}>
                      <Link
                        href={point.href}
                        className="inline-flex flex-wrap items-baseline gap-1.5 rounded-[var(--r-sm)] px-2.5 py-1 text-sm"
                        style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                      >
                        <span lang={point.estonian ? "et" : undefined} className="underline">
                          {point.title}
                        </span>
                        <span className="text-xs" style={{ opacity: 0.75 }}>{point.english}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <Continue onNext={onNext} label={`Start these ${step.words} words`} />
        </Card>
      );

    case "meet":
      return (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--ink-3)" }}>A new word</span>
            {/* The corner of the card, which is where somebody looks for this
                the moment a word turns out to be worth keeping. */}
            <div className="ml-auto flex flex-wrap items-center gap-1">
              <StarWord
                lexemeId={step.lexemeId}
                starred={starred.includes(step.lexemeId)}
                label={step.lemma}
              />
              {/* And its opposite number, on the step where a word is met: the
                  lesson's own two claims about a word that are not answers are
                  "this one is mine" and "this one is beyond me". */}
              <TooComplicated
                key={step.lexemeId}
                lexemeId={step.lexemeId}
                label={step.lemma}
                context="/learn/lesson"
                onDone={onAside}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Et className="text-3xl">{step.lemma}</Et>
            {/* Read aloud on arrival, the same rule and the same reason as
                WordIntro's own "meet" card: the first time a word is met is
                the one time hearing it is worth more than reading it. This
                is a second, independent screen for that same moment (the
                guided unit lesson rather than the daily ladder), and it had
                drifted without it. */}
            <Speak text={step.lemma} size={20} autoplay />
          </div>
          <p className="text-lg">{step.gloss}</p>
          {/*
            The meaning in the language the learner thinks in, on the one step
            of a lesson where a word is being learned rather than tested. Under
            the English rather than instead of it, and never on a question's
            options: those are drawn from a pool of English glosses, and one
            option in a second language would be the answer before anybody read
            it. From Ekilex, like everything else on this screen.
          */}
          {step.equivalent && (
            <p lang={step.equivalent.lang} className="text-lg" style={{ color: "var(--ink-2)" }}>
              {step.equivalent.text}
            </p>
          )}
          {step.example && (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              <Et>{step.example}</Et>
            </p>
          )}
          <Continue onNext={onNext} label="Got it" />
        </Card>
      );

    case "choose":
      return (
        <Card className="flex flex-col gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>What does this mean?</span>
          <div className="flex flex-wrap items-center gap-3">
            <Et className="text-3xl">{step.lemma}</Et>
            <Speak text={step.lemma} size={18} />
          </div>
          <Options options={step.options} answer={step.answer} chosen={chosen} lang="en"
            onChoose={(i) => choose(i, step.answer, step.lemma, step.kind)} />
          {chosen !== null && <Verdict ok={chosen === step.answer} />}
          {chosen !== null && <Continue onNext={onNext} />}
        </Card>
      );

    case "produce":
      return (
        <Card className="flex flex-col gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>Which word is this?</span>
          <p className="text-2xl">{step.gloss}</p>
          <Options options={step.options} answer={step.answer} chosen={chosen} lang="et"
            onChoose={(i) => choose(i, step.answer, step.lemma, step.kind)} />
          {chosen !== null && <Verdict ok={chosen === step.answer} />}
          {chosen !== null && <Continue onNext={onNext} />}
        </Card>
      );

    case "listen":
      return (
        <Card className="flex flex-col gap-4">
          <span className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-3)" }}>
            <Ear size={15} aria-hidden /> Listen, then choose what it means
          </span>
          <Speak text={step.lemma} size={30} label="Play the word" className="self-start p-3" />
          <Options options={step.options} answer={step.answer} chosen={chosen} lang="en"
            onChoose={(i) => choose(i, step.answer, step.lemma, step.kind)} />
          {chosen !== null && (
            <>
              <Verdict ok={chosen === step.answer} note={`It was “${step.lemma}”.`} />
              <Continue onNext={onNext} />
            </>
          )}
        </Card>
      );

    case "type":
      return (
        <Card className="flex flex-col gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>Write it in Estonian</span>
          <p className="text-2xl">{step.gloss}</p>
          <EstonianInput
            value={typed} onChange={setTyped} large autoFocus
            ariaLabel="Your answer in Estonian"
            onEnter={() => checkTyped(step.lemma, step.lemma, step.kind)}
          />
          {!checked && (
            <Button variant="primary" onClick={() => checkTyped(step.lemma, step.lemma, step.kind)} className="self-start">
              Check
            </Button>
          )}
          {checked && <Verdict ok={checked.ok} note={checked.note} />}
          {checked && <Continue onNext={onNext} />}
        </Card>
      );

    case "gap":
      return (
        <Card className="flex flex-col gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            Fill the gap. The word is <Et>{step.lemma}</Et> ({step.gloss}), in the form the sentence needs.
          </span>
          <p className="text-xl">
            <Et>{sizedBlank(step.text, step.answer)}</Et>
          </p>
          <EstonianInput
            value={typed} onChange={setTyped} large autoFocus
            ariaLabel="The missing form"
            placeholder={sizedBlank(BLANK, step.answer)}
            onEnter={() => checkTyped(step.answer, step.lemma, step.kind)}
          />
          {!checked && (
            <Button variant="primary" onClick={() => checkTyped(step.answer, step.lemma, step.kind)} className="self-start">
              Check
            </Button>
          )}
          {checked && (
            <>
              <Verdict ok={checked.ok} note={checked.note} />
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                <Et>{step.full}</Et>
              </p>
              <Continue onNext={onNext} />
            </>
          )}
        </Card>
      );

    case "case":
      return (
        <Card className="flex flex-col gap-4">
          {/* WHAT IS BEING ASKED, THEN WHAT IT IS CALLED.

              This read "Put it in the inessive (milles? kus?)", which names the
              form twice in two languages a beginner has met neither of. The
              instruction is the plain clause five other screens already lead
              with, and the Estonian name and the question sit under the answer
              box as the cross-reference for somebody also taking a course. */}
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>
            {plainAskLine(step.caseKey) ?? `Put it in the ${step.caseName}`}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Et className="text-3xl">{step.lemma}</Et>
            <span style={{ color: "var(--ink-2)" }}>{step.gloss}</span>
          </div>
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>
            <span lang="et">{step.caseName}</span>
            {" · "}
            <CaseQuestion question={step.question} inline />
          </span>
          <EstonianInput
            value={typed} onChange={setTyped} large autoFocus
            ariaLabel={`${step.lemma}, ${plainAskLine(step.caseKey) ?? step.caseName}`}
            onEnter={() => checkTyped(step.answer, step.lemma, step.kind)}
          />
          {!checked && (
            <Button variant="primary" onClick={() => checkTyped(step.answer, step.lemma, step.kind)} className="self-start">
              Check
            </Button>
          )}
          {checked && <Verdict ok={checked.ok} note={checked.note} />}
          {checked && <Continue onNext={onNext} />}
        </Card>
      );

    case "govern":
      return (
        <Card className="flex flex-col gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            Which question does this verb answer? That is the case it takes.
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Et className="text-3xl">{step.lemma}</Et>
            <span style={{ color: "var(--ink-2)" }}>{step.gloss}</span>
          </div>
          <Options options={step.options} answer={step.answer} chosen={chosen} lang="et"
            onChoose={(i) => choose(i, step.answer, step.lemma, step.kind)} />
          {chosen !== null && <Verdict ok={chosen === step.answer} />}
          {chosen !== null && <Continue onNext={onNext} />}
        </Card>
      );

    case "build": {
      const done = checked !== null;
      const placed = built.map((i) => step.tiles[i] ?? "");
      const remaining = step.tiles.length - built.length;
      return (
        <Card className="flex flex-col gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            Put the sentence back in order.
          </span>
          <div
            className="min-h-[52px] rounded-[var(--r-sm)] border p-3"
            style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
          >
            <Et>{placed.join(" ") || " "}</Et>
          </div>
          <div className="flex flex-wrap gap-2">
            {/*
              Tiles are tracked by position, not by their text. A sentence can
              repeat a word, so "which tile did you tap" is a question only the
              index answers; the first version encoded both into one string and
              split it apart again, which needed a separator no tile could
              contain and was one careless edit away from being wrong.
            */}
            {step.tiles.map((tile, i) => {
              if (built.includes(i)) return null;
              return (
                <button
                  key={i} type="button" disabled={done}
                  onClick={() => setBuilt((b) => [...b, i])}
                  className="choice-btn min-h-[44px] rounded-[var(--r-sm)] border px-3"
                >
                  <Et>{tile}</Et>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {built.length > 0 && !done && (
              <Button variant="ghost" onClick={() => setBuilt((b) => b.slice(0, -1))}>Undo</Button>
            )}
            {!done && (
              <Button
                variant="primary"
                disabled={remaining > 0}
                onClick={() => {
                  /*
                    Three readings rather than two. Another order Estonian
                    allows is right and is never penalised, and the sentence
                    printed under the verdict is the writer's own order rather
                    than a correction of anything.
                  */
                  const verdict = readOrder(placed, step.sentence, step.alsoRight);
                  const ok = orderIsRight(verdict.reading);
                  setChecked({
                    ok,
                    note:
                      verdict.reading === "exact" ? ORDER_EXACT
                      : verdict.reading === "variant" ? orderVariantNote(verdict.moved)
                      : ORDER_WRONG,
                  });
                  onAnswer(step.lemma, step.kind, ok);
                }}
              >
                Check
              </Button>
            )}
          </div>
          {done && (
            <>
              <Verdict ok={checked.ok} note={checked.note} />
              <p className="text-sm" style={{ color: "var(--ink-2)" }}><Et>{step.sentence}</Et></p>
              <Continue onNext={onNext} />
            </>
          )}
        </Card>
      );
    }

    case "recap": {
      const pct = summary.total === 0 ? 0 : Math.round((summary.correct / summary.total) * 100);
      return (
        <Card className="flex flex-col gap-4">
          {pct >= 80 && <Confetti />}
          <h2 className="text-2xl">Lesson done</h2>
          <p className="text-lg">
            {summary.correct} of {summary.total} right, and {step.learned} words are now in your deck.
          </p>
          <p style={{ color: "var(--ink-2)" }}>
            They will come back in review when the scheduler thinks you are about to forget them.
          </p>
          {summary.saving && <p className="text-sm" style={{ color: "var(--ink-3)" }}>Saving your answers…</p>}
          {summary.saved && !summary.saved.ok && (
            <Verdict ok={false} note={summary.saved.error ?? "We couldn't save your answers."} />
          )}
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/learn">Back to the path</ButtonLink>
            <ButtonLink href="/review" variant="ghost">Review now</ButtonLink>
          </div>
        </Card>
      );
    }
  }
}
