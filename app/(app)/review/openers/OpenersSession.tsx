"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Shuffle } from "lucide-react";
import { openerCard, undoOpenerCards } from "@/app/actions";
import { useGrade } from "@/components/round/useGrade";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, KeyCap, Stat } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { DiacriticBar } from "@/components/DiacriticBar";
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { familyTitle, markPick, MIXED_STAGE, markTyped, type OpenerMark, type OpenerQuestion } from "@/lib/estonian/openers";
import { OPTION_CLASS, optionState, VERDICT_CLASS, verdictOfRating } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";

export type OpenerCard = OpenerQuestion & { starred: boolean };

interface StageLine {
  n: number;
  title: string;
  share: number | null;
  settled: boolean;
  open: boolean;
}

/**
 * The openers round.
 *
 * One word all round, a different opener each time, and the form of the word
 * is what changes. A2 picks between the two forms; from B1 the learner types
 * it. Both mark mechanically against forms the dictionary stores, and both
 * grade the word's own production card through `gradeCard` carrying the slot
 * of the opener that was asked (ADR-016), so a miss here is evidence the
 * scheduler and the weak-spot panels can see.
 *
 * It does not grade a hint, because it has none: the opener is the cue, and a
 * wrong answer says which opener the form belongs to.
 */
export function OpenersSession({ questions: initialQuestions, mode, stage: initialStage, reading: initialReading }: {
  questions: OpenerCard[];
  mode: "pick" | "type";
  stage: { n: number; title: string; line: string };
  reading: StageLine[];
}) {
  const grade = useGrade();
  // Frozen on mount: grading revalidates the route and hands down a new round.
  const [questions] = useState(initialQuestions);
  // The stage and the reading are frozen with the questions: grading revalidates
  // the route, and a chip that moved from stage 1 to stage 2 mid-round would say
  // the learner had changed rounds when they had not.
  const [stage] = useState(initialStage);
  const [reading] = useState(initialReading);
  const [index, setIndex] = useState(0);
  const [mark, setMark] = useState<OpenerMark | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [correct, setCorrect] = useState(0);
  const [joined, setJoined] = useState<{ id: string; lemma: string }[]>([]);
  const [undone, setUndone] = useState(false);
  const startedAt = useRef(Date.now());
  const answeredAt = useRef(Date.now());
  const cards = useRef(new Map<string, string | null>());
  const look = useLookBack();

  const question = questions[index];
  const finished = !question;
  const revealed = mark !== null;

  useEffect(() => { answeredAt.current = Date.now(); }, [index]);

  /* The card the answer is graded on, made on the first answer about a word. */
  const record = useCallback(async (q: OpenerCard, result: OpenerMark, ms: number) => {
    let cardId = cards.current.get(q.lexemeId);
    if (cardId === undefined) {
      const found = await openerCard(q.lexemeId).catch(() => null);
      cardId = found?.ok ? found.cardId : null;
      if (found?.ok && found.made) setJoined((j) => [...j, { id: q.lexemeId, lemma: q.lemma }]);
      cards.current.set(q.lexemeId, cardId);
    }
    if (cardId) await grade(cardId, result.rating, ms, q.slot);
  }, [grade]);

  const settle = useCallback((q: OpenerCard, result: OpenerMark) => {
    setMark(result);
    if (result.right) setCorrect((c) => c + 1);
    void record(q, result, Date.now() - answeredAt.current);
  }, [record]);

  const choose = useCallback((form: string) => {
    if (!question || mark) return;
    setPicked(form);
    settle(question, markPick(question, form));
  }, [question, mark, settle]);

  const check = useCallback(() => {
    // An empty box is not an answer: Enter on it would grade the word Again.
    if (!question || mark || !typed.trim()) return;
    settle(question, markTyped(question, typed));
  }, [question, mark, typed, settle]);

  const next = useCallback(() => {
    if (question) {
      look.record({
        of: `${question.lexemeId}:${question.id}`,
        label: "Lause algus",
        question: `${question.text} ${question.lemma}`,
        answer: `${question.text} ${question.answer}`,
        note: question.en,
        questionLang: "et",
        answerLang: "et",
        speak: `${question.text} ${question.answer}`,
      });
    }
    setMark(null);
    setPicked(null);
    setTyped("");
    setIndex((i) => i + 1);
  }, [question, look]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || !question) return;
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e)) { e.preventDefault(); look.forward(); }
        return;
      }
      const inField = e.target instanceof HTMLElement && e.target.tagName === "INPUT";
      if (!inField && e.key.toLowerCase() === "b" && look.seen.length > 0) { e.preventDefault(); look.open(); return; }
      if (revealed && isAdvanceKey(e)) { e.preventDefault(); next(); return; }
      if (revealed || mode !== "pick") return;
      const option = question.options[Number(e.key) - 1];
      if (option) { e.preventDefault(); choose(option); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, question, revealed, mode, choose, next, look]);

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    const accuracy = Math.round((correct / questions.length) * 100);
    // Offered only once this stage is settled, or the message would nudge somebody on from one they are still learning.
    const afterThis = reading.find((s) => s.n === stage.n)?.settled
      ? reading.find((s) => s.n === stage.n + 1 && s.open)
      : undefined;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          That&rsquo;s the round done
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
          {stage.n >= MIXED_STAGE
            ? `${questions.length} sentences, each on a different word.`
            : `One word, ${questions.length} ways to start a sentence.`}{" "}
          The next round uses different words, so you learn the openers and not the words.
        </p>
        <div
          className="mt-8 grid grid-cols-3 gap-6 rounded-lg border p-6"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
        >
          <Stat value={questions.length} label="Sentences" />
          <Stat value={`${accuracy}%`} label="Right" />
          <Stat value={`${minutes}m`} label="Time" />
        </div>
        {joined.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-base" style={{ color: "var(--ink-2)" }}>
            <p>
              {undone
                ? "Taken out of your deck again."
                : `Added to your deck: ${joined.map((j) => j.lemma).join(", ")}.`}
            </p>
            {!undone && (
              <Button
                variant="secondary"
                onClick={() => {
                  void undoOpenerCards(joined.map((j) => j.id))
                    .then(() => setUndone(true))
                    .catch(() => {});
                }}
              >
                Undo
              </Button>
            )}
          </div>
        )}
        {afterThis && (
          <p className="mt-6 text-base" style={{ color: "var(--ink-2)" }}>
            Stage {afterThis.n} is open: {afterThis.title}.
          </p>
        )}
        <WayOut className="mt-8 flex flex-wrap gap-3">
          {afterThis && <ButtonLink href={`/review/openers?stage=${afterThis.n}`}>Try stage {afterThis.n}</ButtonLink>}
          <ButtonLink href="/review/openers" variant="primary">Another round</ButtonLink>
        </WayOut>
      </div>
    );
  }

  const verdict = mark ? verdictOfRating(mark.rating) : null;
  const shown = mark ? question.answer : "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Lause algus</h1>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession size={19} />
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(index / questions.length) * 100}%`, background: "var(--accent)" }}
            role="progressbar"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-label="Round progress"
          />
        </div>
        <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
          {questions.length - index} left
        </span>
      </div>

      {look.panel ? <LookBackCard {...look.panel} /> : (
      <div
        className="rounded-xl border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent"><Shuffle size={12} aria-hidden /> Stage {stage.n}</Chip>
          <Chip>{familyTitle(question.family)}</Chip>
          <div className="ml-auto">
            <StarWord lexemeId={question.lexemeId} starred={question.starred} label={question.lemma} />
          </div>
        </div>

        <div className="round-pad px-6">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {mode === "pick" ? "Which ending goes at the end?" : "Type the word with the ending this start needs."}
          </p>

          {/* The start of the sentence is the whole cue, so it leads and it is big. */}
          <p lang="et" className="mt-4 flex flex-wrap items-baseline gap-x-3 text-2xl font-bold" style={{ color: "var(--ink)" }}>
            <span>{question.text}</span>
            <span
              className="inline-block min-w-[3.2em] border-b-4 text-center"
              style={{ borderColor: revealed ? "var(--accent)" : "var(--ink-3)", color: "var(--accent-deep)" }}
            >
              {shown || " "}
            </span>
          </p>
          <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>{question.en}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            The word is <span lang="et">{question.lemma}</span>.
          </p>
        </div>

        <div className="px-4 pb-4">
          {mode === "pick" ? (
            <div className="choice-grid">
              {question.options.map((form, i) => {
                const isAnswer = form === question.answer;
                const state = revealed ? OPTION_CLASS[optionState(isAnswer, form === picked)] : "";
                return (
                  <button
                    key={form}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(form)}
                    className={`choice-btn ${state} flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left disabled:cursor-default`}
                    style={revealed ? undefined : { "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
                  >
                    <KeyCap>{i + 1}</KeyCap>
                    <span lang="et" className="min-w-0 text-lg font-semibold">{form}</span>
                    {revealed && isAnswer && <Check size={16} className="ml-auto shrink-0" aria-label="Right" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label htmlFor="answer" className="label-xs block" style={{ color: "var(--ink-3)" }}>Your answer</label>
              <input
                id="answer"
                value={typed}
                lang="et"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={revealed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (isAdvanceKey(e) && !revealed) { e.preventDefault(); e.stopPropagation(); check(); } }}
                className="field-lg mt-2 w-full text-lg disabled:opacity-70"
                style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
              />
              {!revealed && <div className="under-field"><DiacriticBar /></div>}
              {!revealed && (
                <div className="mt-4">
                  <Button variant="primary" onClick={check} disabled={!typed.trim()}>
                    Check <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {revealed && mark && verdict && (
          <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
            <div className={`${VERDICT_CLASS[verdict]} verdict-panel flex items-start gap-2.5`}>
              {mark.right
                ? <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
                : <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />}
              <p className="text-base">
                {mark.right ? "Yes." : mark.note}
                <span className="mt-1 block text-sm">{question.why}</span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p lang="et" className="text-lg font-semibold" style={{ color: "var(--accent-deep)" }}>
                {question.text} {question.answer}
              </p>
              <Speak text={`${question.text} ${question.answer}`} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" onClick={next} autoFocus>
                Next <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      <p className="sr-only" role="status">
        {revealed && mark && (mark.right ? "Right." : `Not quite. ${mark.note}`)}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xs" style={{ color: "var(--ink-3)" }}>
        <span>
          {index + (revealed ? 1 : 0) > 0
            ? <>{correct}/{index + (revealed ? 1 : 0)} right{mode === "pick" ? ", press 1 or 2 to answer" : ""}</>
            : mode === "pick" ? <>Press 1 or 2 to answer</> : <>Type, then press Enter</>}
        </span>
        <LookBackButton {...look.button} disabled={look.looking} />
      </div>
    </div>
  );
}
