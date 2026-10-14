"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, Check, Eye, EyeOff, Info, Lightbulb, PenLine, Sparkles, X } from "lucide-react";
import { recordWorkbookGrades } from "@/app/actions";
import { useLocale, useT } from "@/components/Locale";
import { AnotherRound } from "@/components/round/AnotherRound";
import { WayOut } from "@/components/round/RoundExit";
import { RoundProgress } from "@/components/round/RoundProgress";
import { useQueueGrades } from "@/components/round/useGrade";
import { useOffline } from "@/components/OfflineProvider";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { Button, ButtonLink } from "@/components/Button";
import { CaseLabel } from "@/components/CaseLabel";
import { Confetti } from "@/components/Confetti";
import { DiacriticBar } from "@/components/DiacriticBar";
import { EstonianSentence } from "@/components/EstonianSentence";
import { Explain } from "@/components/Explain";
import { fillNodes } from "@/components/fillNodes";
import { Speak } from "@/components/Speak";
import { GapMeaning } from "@/components/GapMeaning";
import { Chip, KeyCap } from "@/components/ui";
import { answerNote } from "@/lib/copy/answerNote";
import { caseLabelFor } from "@/lib/copy/caseLabel";
import { gapMeaning } from "@/lib/copy/gapMeaning";
import { fill } from "@/lib/copy/locale";
import { caseByKey } from "@/lib/estonian/cases";
import { plainAsk } from "@/lib/estonian/plainAsk";
import { isKnownSlot } from "@/lib/srs/slots";
import { againHref } from "@/lib/ux/again";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { VERDICT_CLASS, VERDICT_INK, type Verdict } from "@/lib/ux/verdict";
import {
  OUTCOME_RATING, markLine, outcomeAfter, pageReading, themeCase, verbSlot,
  type LineMark, type LineNote, type Outcome, type SheetItem, type Tense, type Theme,
} from "@/lib/games/workbook";

/** A line as the page hands it down: the line, and the card it grades, if any. */
export interface WorkbookLine extends SheetItem {
  cardId: string | null;
}

export interface WorkbookExercise {
  theme: Theme;
  /** The grammar reference's two lines for the page's rule, or null where no one rule is behind it. */
  rule: { summary: string; watchOut: string } | null;
  example: SheetItem | null;
  lines: WorkbookLine[];
}

/** Where an exercise is: being filled in, open again for a second go, or settled. */
type Pass = 1 | 2 | "settled";

/** What English calls a tense, for a heading and a note. */
const TENSE_NAME: Record<Tense, string> = {
  present: "present tense",
  past: "simple past",
  conditional: "would form",
  imperative: "command form",
};

/** What a theme is called on a chip. A case is called by the name a class uses. */
function useThemeName() {
  const t = useT();
  return useCallback((theme: Theme): string => {
    const key = themeCase(theme);
    if (key) return caseByKey(key)?.et ?? key;
    switch (theme) {
      case "pronouns": return t("Personal pronouns");
      case "present": return t("Present tense");
      case "past": return t("Simple past");
      case "conditional": return t("The would form");
      case "imperative": return t("Commands");
      default: return t("Mixed forms");
    }
  }, [t]);
}

/** The instruction a theme's exercise opens with, the way a course book words it. */
function instructionFor(theme: Theme): string {
  if (themeCase(theme)) return "Put the word in brackets into this form.";
  switch (theme) {
    case "pronouns": return "Put the pronoun in brackets into the form the sentence needs.";
    case "present": return "Put the verb in brackets into the present tense, for whoever is doing it.";
    case "past": return "Put the verb in brackets into the simple past, for whoever did it.";
    case "conditional": return "Put the verb in brackets into the would form.";
    case "imperative": return "Turn the verb in brackets into a command.";
    default: return "Put the word in brackets into the form the sentence needs.";
  }
}

/** The headword in the brackets, with a capital where it opens the sentence, as a course book prints it. */
function bracketed(line: SheetItem): string {
  const cue = line.before.trim() === "" ? line.cue.charAt(0).toLocaleUpperCase("et") + line.cue.slice(1) : line.cue;
  return `(${cue})`;
}

/*
  HOW WIDE A GAP IS DRAWN, AND WHY IT IS NEVER THE ANSWER'S WIDTH.

  It was the answer's length plus two, which hands over how long the ending is:
  `tuppa` and `toasse` drew two different boxes, and so did `annab` beside
  `andsin`. A course book draws one line for every gap. So the box is sized off
  the word in brackets, which is on the page already, and then grows with what
  is typed, so a long answer never scrolls inside a short box.
*/
function gapWidth(line: SheetItem, value: string): string {
  const room = Math.min(14, Math.max(7, line.cue.length + 2));
  return `${Math.min(24, Math.max(room, value.length + 2))}ch`;
}

const verdictOf = (outcome: Outcome | undefined, mark: LineMark | undefined): Verdict | null => {
  if (outcome === "right") return "right";
  if (outcome === "slip" || outcome === "second") return "nearly";
  if (outcome === "missed") return "wrong";
  if (mark && !mark.right) return "wrong";
  return null;
};

/**
 * TÖÖVIHIK, PLAYED: A PAGE OF SENTENCES, FILLED IN, CHECKED, PUT RIGHT.
 *
 * `lib/games/workbook.ts` sets the page and marks it; this is the page. It is
 * drawn as one: a heading and an instruction, the worked example filled in,
 * and numbered lines, each a recorded sentence with the word in brackets and
 * a box where the form goes. The learner fills in as many as they like in
 * whatever order and checks the page, which is how a course book is done and
 * the whole difference from every other round: the sentences around a gap
 * are read, all of them, before anything is marked.
 *
 * TWO PASSES. Checking marks every line at once. A line that is right stays;
 * a line that is not opens again with what went wrong said in a sentence
 * ("That's the seestütlev. This one wants the seesütlev.") and the end of
 * its answer uncovered, and the page is checked a second time. After that
 * the answers are shown. What a line is worth is the page's own table
 * (`OUTCOME_RATING`): right first time is a recall, needing the second go is
 * a Hard, which is the hint paid for in the currency it is paid for in
 * everywhere else, and a line missed twice is an Again.
 *
 * GRADED WHEN AN EXERCISE SETTLES, in one call (`recordWorkbookGrades`), and
 * only the lines whose word the learner holds a card for (ADR-016). An
 * exercise abandoned before it settles writes nothing. A batch that does not
 * reach the server goes to the outbox with the same ids (ADR-015).
 *
 * THE LAST SCREEN IS THE PAGE AGAIN, CORRECTED, which is what a teacher hands
 * back: every sentence whole with its form marked, what it means, and the
 * learner's own answer beside the right one where they differed. Over it, the
 * one thing worth saying about the page, which is the slot they kept reaching
 * for instead of the one wanted, where that happened twice.
 */
export function WorkbookSession({ exercises: initial, missed, themes, canTranslate }: {
  exercises: WorkbookExercise[];
  /**
   * A theme somebody asked for by name that their words cannot fill a page of
   * yet. Said rather than swallowed: a page on something else, with no word
   * about why, reads as the link being broken.
   */
  missed: Theme | null;
  /** The themes this learner's words can fill a page of, for the finish screen. */
  themes: Theme[];
  canTranslate: boolean;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  const queueGrades = useQueueGrades();
  const { drainFirst } = useOffline();
  const themeName = useThemeName();
  // Snapshotted once: grading revalidates the route, and a refresh must not deal a new page under a pen.
  const [exercises] = useState(initial);
  const [at, setAt] = useState(0);
  const [pass, setPass] = useState<Pass>(1);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<Record<string, LineMark>>({});
  const [firstMarks, setFirstMarks] = useState<Record<string, LineMark>>({});
  /* What each box held when the page was last checked, so a line retyped since stops looking wrong. */
  const [checkedAs, setCheckedAs] = useState<Record<string, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [english, setEnglish] = useState(true);
  const [finished, setFinished] = useState(false);
  const [said, setSaid] = useState("");
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const lastFocused = useRef<HTMLInputElement | null>(null);
  const sent = useRef(new Set<number>());

  const exercise = exercises[at];
  const lines = useMemo(() => exercise?.lines ?? [], [exercise]);
  const total = exercises.reduce((n, e) => n + e.lines.length, 0);
  const settledCount = Object.keys(outcomes).length;
  const open = useMemo(() => lines.filter((l) => !outcomes[l.id]), [lines, outcomes]);
  const filled = open.filter((l) => (typed[l.id] ?? "").trim() !== "").length;

  /* The first box takes the caret where there is a keyboard to type with, and
     never on a phone, where focusing it would open the keyboard over the page
     somebody is about to read. */
  useEffect(() => {
    if (!exercise || pass !== 1) return;
    if (typeof window === "undefined" || !window.matchMedia?.("(pointer: fine)").matches) return;
    inputs.current.get(lines[0]?.id ?? "")?.focus({ preventScroll: true });
  }, [exercise, lines, pass]);

  const focusLine = (id: string | undefined) => {
    if (!id) return;
    const el = inputs.current.get(id);
    el?.focus();
  };

  /** Sends an exercise's grades once, the moment it settles. */
  const send = useCallback(async (index: number, final: Record<string, Outcome>, first: Record<string, LineMark>) => {
    if (sent.current.has(index)) return;
    sent.current.add(index);
    const graded = (exercises[index]?.lines ?? []).flatMap((line) => {
      const outcome = final[line.id];
      if (!line.cardId || !outcome) return [];
      /*
        The slot the line asked, where the review log has a name for it. A
        person of a verb the cards do not drill (`IndPrPl3`) is filed as a
        question about the verb's forms, which is what it was, rather than
        under whatever the card it grades happens to be about.
      */
      const slot = isKnownSlot(line.slot) ? line.slot : line.kind === "verb" ? "CONJUGATION" : undefined;
      const reached = first[line.id]?.reached;
      return [{
        id: crypto.randomUUID(),
        cardId: line.cardId,
        outcome,
        ...(slot ? { slot } : {}),
        ...(reached && isKnownSlot(reached) ? { reached } : {}),
      }];
    });
    if (graded.length === 0) return;
    let landed = false;
    try {
      await drainFirst();
      landed = (await recordWorkbookGrades(graded)).ok;
    } catch {
      // Queued below.
    }
    if (!landed) {
      const answeredAt = Date.now();
      await queueGrades(graded.map((g) => ({
        id: g.id,
        cardId: g.cardId,
        rating: OUTCOME_RATING[g.outcome],
        durationMs: 0,
        reviewedAt: answeredAt,
        ...(g.slot ? { slot: g.slot } : {}),
        ...(g.reached ? { reachedSlot: g.reached } : {}),
      })));
    }
  }, [exercises, drainFirst, queueGrades]);

  const check = useCallback(() => {
    if (!exercise || pass === "settled") return;
    const nextMarks = { ...marks };
    const nextOutcomes = { ...outcomes };
    const nextFirst = { ...firstMarks };
    for (const line of open) {
      const mark = markLine(line, typed[line.id] ?? "");
      nextMarks[line.id] = mark;
      if (pass === 1) nextFirst[line.id] = mark;
      const outcome = outcomeAfter(pass, mark);
      if (outcome) nextOutcomes[line.id] = outcome;
    }
    setMarks(nextMarks);
    setFirstMarks(nextFirst);
    setCheckedAs({ ...typed });
    setOutcomes(nextOutcomes);

    const stillOpen = lines.filter((l) => !nextOutcomes[l.id]);
    const right = lines.filter((l) => {
      const o = nextOutcomes[l.id];
      return o === "right" || o === "slip" || o === "second";
    }).length;
    sound(stillOpen.length === 0 && right === lines.length ? "right" : stillOpen.length === lines.length ? "wrong" : "right");

    if (stillOpen.length === 0) {
      setPass("settled");
      setSaid(fill(t("{right} of {total} right."), { right, total: lines.length }));
      void send(at, nextOutcomes, nextFirst);
      return;
    }
    setPass(2);
    setSaid(fill(t("{right} of {total} right. {open} open for another go, with a hint."), {
      right, total: lines.length, open: stillOpen.length,
    }));
    requestAnimationFrame(() => focusLine(stillOpen[0]?.id));
  }, [exercise, pass, marks, outcomes, firstMarks, open, typed, lines, sound, t, send, at]);

  /** The second pass given up on: every open line is shown its answer. */
  const showAnswers = useCallback(() => {
    if (pass !== 2) return;
    const nextOutcomes = { ...outcomes };
    for (const line of open) nextOutcomes[line.id] = "missed";
    setOutcomes(nextOutcomes);
    setPass("settled");
    setSaid(t("Here are the answers."));
    void send(at, nextOutcomes, firstMarks);
  }, [pass, outcomes, open, t, send, at, firstMarks]);

  const next = useCallback(() => {
    if (pass !== "settled") return;
    if (at + 1 < exercises.length) {
      setAt(at + 1);
      setPass(1);
      setSaid("");
      window.scrollTo({ top: 0 });
    } else {
      setFinished(true);
      window.scrollTo({ top: 0 });
    }
  }, [pass, at, exercises.length]);

  /* Enter or Space moves the page on once it is settled, from anywhere a box is not. */
  useEffect(() => {
    if (pass !== "settled" || finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (!isAdvanceKey(e) || inEditable(e.target)) return;
      if (e.target instanceof Element && e.target.closest("button, a")) return;
      e.preventDefault();
      next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pass, finished, next]);

  /** Enter in a box goes to the next empty box, and from the last one checks the page. */
  const onBoxKey = (line: WorkbookLine) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey) { check(); return; }
    const order = open.map((l) => l.id);
    const from = order.indexOf(line.id);
    const after = [...order.slice(from + 1), ...order.slice(0, from)];
    const empty = after.find((id) => (typed[id] ?? "").trim() === "");
    if (empty) { focusLine(empty); return; }
    check();
  };

  if (finished) {
    return (
      <Finished
        exercises={exercises}
        outcomes={outcomes}
        typed={typed}
        firstMarks={firstMarks}
        themes={themes}
        canTranslate={canTranslate}
      />
    );
  }
  if (!exercise) return null;

  const caseKey = themeCase(exercise.theme);
  const label = caseKey ? caseLabelFor(caseKey) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-6 sm:px-5 md:px-10 md:py-10">
      <h1 className="sr-only">Töövihik</h1>
      <RoundProgress
        done={settledCount}
        total={total}
        left={total - settledCount}
        label={t("Session progress")}
      />
      <span className="sr-only" role="status" aria-live="polite">{said}</span>

      <section
        className="wb-page pop-in rounded-xl border"
        data-workbook-exercise={at + 1}
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <header className="flex flex-wrap items-center gap-2 border-b px-5 py-3 sm:px-6" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent">
            {exercises.length > 1
              ? fill(t("Exercise {n} of {total}"), { n: at + 1, total: exercises.length })
              : t("Exercise")}
          </Chip>
          <span lang={caseKey ? "et" : undefined} className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
            {themeName(exercise.theme)}
          </span>
          <button
            type="button"
            onClick={() => setEnglish((on) => !on)}
            aria-pressed={english}
            className="tap-tint ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm"
            style={{ color: "var(--ink-2)" }}
          >
            {english ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
            {english ? t("Hide the English") : t("Show the English")}
          </button>
        </header>

        <div className="px-5 pt-5 sm:px-6">
          {missed && at === 0 && (
            <p className="mb-3 flex items-start gap-2.5 text-base leading-snug" style={{ color: "var(--ink-2)" }} data-workbook-missed="">
              <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                {fillNodes(t("Not enough of your words for a page on “{theme}” yet, so here's “{other}” instead."), {
                  theme: <span lang={themeCase(missed) ? "et" : undefined}>{themeName(missed)}</span>,
                  other: <span lang={themeCase(exercise.theme) ? "et" : undefined}>{themeName(exercise.theme)}</span>,
                })}
              </span>
            </p>
          )}
          <p className="flex items-start gap-2.5 text-md font-semibold leading-snug" style={{ color: "var(--ink)" }}>
            <PenLine size={18} className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} aria-hidden />
            <span>{t(instructionFor(exercise.theme))}</span>
          </p>
          {label && (
            <p className="mt-2 pl-7 text-base">
              <CaseLabel label={label} />
            </p>
          )}
          {exercise.rule && (
            <div className="mt-3 pl-7" data-workbook-rule="">
              <Explain label={t("How this works")}>
                <p>{t(exercise.rule.summary)}</p>
                <p>{fill(t("Watch out: {note}"), { note: t(exercise.rule.watchOut) })}</p>
              </Explain>
            </div>
          )}
        </div>

        <ol className="wb-lines mt-4 flex flex-col" start={1}>
          {exercise.example && (
            <li className="wb-line wb-example">
              <span className="wb-num tnum">1.</span>
              <div className="min-w-0 flex-1">
                <p lang="et" className="wb-sentence">
                  {exercise.example.before.trimEnd()}{exercise.example.before.trim() ? " " : ""}
                  <span className="wb-cue">{bracketed(exercise.example)}</span>{" "}
                  <span className="wb-example-answer">{exercise.example.answer}</span>
                  {exercise.example.after}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
                  <Sparkles size={14} aria-hidden /> {t("Worked example")}
                </p>
              </div>
            </li>
          )}
          {lines.map((line, i) => (
            <SheetLine
              key={line.id}
              line={line}
              number={i + (exercise.example ? 2 : 1)}
              index={i}
              value={typed[line.id] ?? ""}
              retyped={(typed[line.id] ?? "") !== (checkedAs[line.id] ?? "")}
              mark={marks[line.id]}
              firstMark={firstMarks[line.id]}
              outcome={outcomes[line.id]}
              pass={pass}
              english={english}
              onChange={(value) => setTyped((all) => ({ ...all, [line.id]: value }))}
              onKeyDown={onBoxKey(line)}
              register={(el) => {
                if (el) inputs.current.set(line.id, el);
                else inputs.current.delete(line.id);
              }}
              onFocus={(el) => { lastFocused.current = el; }}
            />
          ))}
        </ol>

        <footer className="border-t px-5 py-4 sm:px-6" style={{ borderColor: "var(--rule-soft)" }}>
          {pass !== "settled" && (
            <div className="mb-4">
              <DiacriticBar fallbackRef={lastFocused} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="tnum text-sm whitespace-nowrap" style={{ color: "var(--ink-3)" }}>
              {pass === "settled"
                ? fill(t("{right} of {total} right"), {
                  right: lines.filter((l) => outcomes[l.id] !== "missed").length, total: lines.length,
                })
                : fill(t("{n} of {total} filled in"), { n: filled, total: open.length })}
            </p>
            <div className="ml-auto flex flex-nowrap items-center gap-2">
              {pass === 2 && (
                <Button variant="ghost" onClick={showAnswers}>{t("Show answers")}</Button>
              )}
              {pass !== "settled" ? (
                <Button variant="primary" onClick={check} data-workbook-check="">
                  {pass === 1 ? t("Check the page") : t("Check again")}
                  <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
                </Button>
              ) : (
                <Button variant="primary" onClick={next} autoFocus data-workbook-next="">
                  {at + 1 < exercises.length ? t("Next exercise") : t("See the corrected page")}
                  <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
                </Button>
              )}
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}

/** One numbered line: the sentence, the word in brackets, the box, and what was said about it. */
function SheetLine({
  line, number, index, value, retyped, mark, firstMark, outcome, pass, english, onChange, onKeyDown, register, onFocus,
}: {
  line: WorkbookLine;
  number: number;
  index: number;
  value: string;
  /** Changed since the page was checked: a fresh try, so it is no longer drawn as the wrong one. */
  retyped: boolean;
  mark: LineMark | undefined;
  firstMark: LineMark | undefined;
  outcome: Outcome | undefined;
  pass: Pass;
  english: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  register: (el: HTMLInputElement | null) => void;
  onFocus: (el: HTMLInputElement) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const verdict = verdictOf(outcome, mark);
  const settled = outcome !== undefined;
  const reopened = !settled && pass === 2;
  const meaning = gapMeaning({ en: line.sentenceEn, answer: line.answer, cue: line.translation });
  const note = noteText(mark, firstMark, outcome, line, t, locale);
  const tight = /^[,.!?;:)…]/.test(line.after);

  return (
    <li className="wb-line" data-workbook-line={line.id} data-outcome={outcome ?? (reopened ? "open" : "")}>
      <span className="wb-num tnum">{number}.</span>
      <div className="min-w-0 flex-1">
        <p lang="et" className="wb-sentence">
          {line.before.trimEnd()}{line.before.trim() ? " " : ""}
          <span className="wb-cue">{bracketed(line)}</span>{" "}
          {settled ? (
            <span
              className={`wb-filled ${VERDICT_CLASS[verdict ?? "right"]} wb-stamp ${tight ? "wb-tight" : ""}`}
              style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
              data-answer={line.answer}
            >
              {outcome === "missed" ? (
                <>
                  {value.trim() && <s className="wb-struck">{value.trim()}</s>}
                  <strong>{line.answer}</strong>
                  <X size={14} aria-hidden />
                </>
              ) : (
                <>
                  {value.trim() || line.answer}
                  <Check size={14} aria-hidden />
                </>
              )}
            </span>
          ) : (
            <input
              ref={register}
              type="text"
              lang="et"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={(e) => onFocus(e.currentTarget)}
              aria-label={fill(t("Line {n}: {word}, in the form the sentence needs"), { n: number, word: line.cue })}
              aria-invalid={reopened ? true : undefined}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={`wb-gap ${reopened && !retyped ? "wb-gap-again shake" : ""} ${tight ? "wb-tight" : ""}`}
              style={{ width: gapWidth(line, value) }}
              data-workbook-gap=""
            />
          )}
          {line.after}
        </p>

        {/* While the line is being answered the English marks the word it wants;
            once it is filled the marking has done its job and the line reads plain. */}
        {english && !settled && meaning && <GapMeaning meaning={meaning} className="mt-1 text-base leading-snug" />}
        {english && settled && line.sentenceEn && (
          <p lang="en" className="mt-1 text-base leading-snug" style={{ color: "var(--ink-2)" }}>{line.sentenceEn}</p>
        )}

        {reopened && line.hint && (
          <p className="pop-in mt-2 inline-flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
            <Lightbulb size={14} style={{ color: "var(--hard-ink)" }} aria-hidden />
            <span>{line.hint.kind === "ending" ? t("It ends like this:") : t("It starts like this:")}</span>
            <code lang="et" className="wb-hint tnum">{line.hint.shown}</code>
          </p>
        )}

        {note && (
          <p
            className="mt-1.5 text-base font-semibold leading-snug"
            style={{ color: reopened && retyped ? "var(--ink-2)" : VERDICT_INK[verdict ?? "nearly"] }}
          >
            {note}
          </p>
        )}
      </div>
      {/* Once the line is settled the whole sentence can be heard, put right, which is the
          one thing a printed workbook cannot do. Never before: the answer is in it. */}
      {settled && (
        <Speak
          text={line.sentence}
          label={t("Hear the sentence")}
          className="press mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full transition-colors hover:bg-[var(--raised)]"
        />
      )}
    </li>
  );
}

/** What to say under a line, in the reader's language, or nothing. */
function noteText(
  mark: LineMark | undefined, firstMark: LineMark | undefined, outcome: Outcome | undefined,
  line: SheetItem, t: (s: string) => string, locale: ReturnType<typeof useLocale>,
): string | null {
  if (outcome === "right") return null;
  if (outcome === "missed") {
    /*
      The answer is already on the line, struck through beside what was
      typed, so the note says what the form is for rather than saying the
      answer a second time a hand's width under it.
    */
    const why = firstMark ? reasonText(firstMark.note, t) : null;
    if (why && firstMark?.note.kind !== "blank") return why;
    const clause = plainAsk(line.slot, locale);
    return clause ? fill(t("That's the form you use {clause}."), { clause }) : why;
  }
  if (outcome === "second") return t("Right on the second go.");
  if (outcome === "slip") return mark?.note.kind === "checker" ? answerNote(mark.note.text, locale) : t("Right, nearly to the letter.");
  if (!mark) return null;
  return reasonText(mark.note, t) ?? t("Not quite. Have another go.");
}

/** Why a line was not right, where the marker could say. */
function reasonText(note: LineNote, t: (s: string) => string): string | null {
  switch (note.kind) {
    case "blank": return t("Nothing typed yet.");
    case "otherCase":
      return fill(t("That's the {got}. This one wants the {wanted}."), {
        got: caseByKey(note.got)?.et ?? note.got, wanted: caseByKey(note.wanted)?.et ?? note.wanted,
      });
    case "otherPerson":
      return fill(t("That's the form for “{got}”. This one wants “{wanted}”."), { got: t(note.got), wanted: t(note.wanted) });
    case "otherTense":
      return fill(t("That's the {got}. This sentence wants the {wanted}."), {
        got: t(TENSE_NAME[note.got]), wanted: t(TENSE_NAME[note.wanted]),
      });
    default: return null;
  }
}

/** The page handed back, corrected, and where to go from it. */
function Finished({ exercises, outcomes, typed, firstMarks, themes, canTranslate }: {
  exercises: WorkbookExercise[];
  outcomes: Record<string, Outcome>;
  typed: Record<string, string>;
  firstMarks: Record<string, LineMark>;
  themes: Theme[];
  canTranslate: boolean;
}) {
  const t = useT();
  const themeName = useThemeName();
  const path = usePathname() ?? "/review/workbook";
  const params = useSearchParams();
  const all = exercises.flatMap((e) => e.lines);
  const reading = pageReading(all.map((line) => ({
    slot: line.slot,
    outcome: outcomes[line.id] ?? "missed",
    reached: firstMarks[line.id]?.reached ?? null,
  })));
  const clean = reading.firstTime === reading.total;
  const share = reading.total > 0 ? reading.firstTime / reading.total : 0;
  const lead = clean
    ? t("A clean page. Every line right first time.")
    : share >= 0.7 ? t("A good page.")
      : share >= 0.4 ? t("Getting there.")
        : t("A page worth doing again.");

  /* The page on a theme, as the next round: same address, a new round, and the theme named. */
  const themeHref = (theme: Theme) => {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.set("theme", theme);
    return againHref(path, next.toString());
  };
  const confusionTheme = reading.confusion ? confusionThemeOf(reading.confusion.wanted) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-5 md:px-10 md:py-10">
      {clean && <Confetti />}
      <h1 className="sr-only">Töövihik</h1>

      <section
        className="pop-in flex flex-col items-center gap-5 rounded-xl border px-5 py-7 text-center sm:flex-row sm:text-left"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div className="wb-mark" aria-hidden>
          {/* One inline run, so the two figures share a baseline and sit in the middle of the ring. */}
          <span className="whitespace-nowrap">
            <span className="tnum">{reading.firstTime}</span>
            <span className="wb-mark-of tnum">/{reading.total}</span>
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold" style={{ color: "var(--ink)" }}>{lead}</p>
          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
            {fill(t("{first} of {total} right first time, {settled} by the end."), {
              first: reading.firstTime, total: reading.total, settled: reading.settled,
            })}
          </p>
        </div>
      </section>

      {reading.confusion && (
        <section className={`verdict-panel ${VERDICT_CLASS.nearly} rounded-xl`} data-workbook-confusion="">
          <p className="flex items-start gap-2 text-md font-semibold">
            <Lightbulb size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {fill(t("You reached for the {got} where the {wanted} was wanted, {times} times."), {
                got: slotName(reading.confusion.got, t), wanted: slotName(reading.confusion.wanted, t),
                times: reading.confusion.times,
              })}{" "}
              {t("That's worth a page of its own.")}
            </span>
          </p>
          {confusionTheme && themes.includes(confusionTheme) && (
            <div className="mt-3">
              <ButtonLink href={themeHref(confusionTheme)} variant="secondary" size="sm">
                {fill(t("A page on the {name}"), { name: themeName(confusionTheme) })}
              </ButtonLink>
            </div>
          )}
        </section>
      )}

      {exercises.map((exercise, n) => (
        <section
          key={n}
          className="rounded-xl border"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
        >
          <header className="flex flex-wrap items-center gap-2 border-b px-5 py-3 sm:px-6" style={{ borderColor: "var(--rule-soft)" }}>
            <BookOpen size={16} style={{ color: "var(--accent-deep)" }} aria-hidden />
            <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              {exercises.length > 1 ? fill(t("Exercise {n}, corrected"), { n: n + 1 }) : t("Your page, corrected")}
            </h2>
            <span lang={themeCase(exercise.theme) ? "et" : undefined} className="text-sm" style={{ color: "var(--ink-3)" }}>
              {themeName(exercise.theme)}
            </span>
          </header>
          <ol className="flex flex-col">
            {exercise.lines.map((line, i) => {
              const outcome = outcomes[line.id] ?? "missed";
              const verdict = verdictOf(outcome, undefined) ?? "right";
              const wrote = (typed[line.id] ?? "").trim();
              return (
                <li key={line.id} className="wb-line" data-outcome={outcome}>
                  <span className="wb-num tnum">{i + (exercise.example ? 2 : 1)}.</span>
                  <div className="min-w-0 flex-1">
                    <EstonianSentence
                      et={line.sentence}
                      en={line.sentenceEn}
                      lexemeId={line.lexemeId}
                      canTranslate={canTranslate}
                      ask="never"
                      form={line.answer}
                      className="text-md leading-snug"
                    />
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${VERDICT_CLASS[verdict]}`}>
                        {outcome === "missed" ? <X size={12} aria-hidden /> : <Check size={12} aria-hidden />}
                        {t(OUTCOME_LABEL[outcome])}
                      </span>
                      <LineForm line={line} />
                      {outcome !== "right" && wrote && wrote.toLocaleLowerCase("et") !== line.answer.toLocaleLowerCase("et") && (
                        <span style={{ color: "var(--ink-3)" }}>
                          {t("You wrote")} <s lang="et">{wrote}</s>
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <WayOut className="flex flex-col gap-4">
        {themes.length > 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{t("Another page on")}</p>
            <div className="flex flex-wrap gap-2">
              {themes.map((theme) => (
                <ButtonLink key={theme} href={themeHref(theme)} variant="secondary" size="sm">
                  <span lang={themeCase(theme) ? "et" : undefined}>{themeName(theme)}</span>
                </ButtonLink>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <ButtonLink href="/practice" variant="ghost">{t("Back to practice")}</ButtonLink>
          <AnotherRound variant="primary">{t("Another page")}</AnotherRound>
        </div>
      </WayOut>
      <p className="sr-only" role="status">
        {fill(t("{first} of {total} right first time, {settled} by the end."), {
          first: reading.firstTime, total: reading.total, settled: reading.settled,
        })}
      </p>
    </div>
  );
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  right: "Right first time",
  slip: "Right, with a slip",
  second: "Right on the second go",
  missed: "Not this time",
};

/** The form a line asked for, named the way the rest of the app names it. */
function LineForm({ line }: { line: SheetItem }) {
  const t = useT();
  if (line.caseKey) {
    const label = caseLabelFor(line.caseKey);
    return label ? <CaseLabel label={label} reading={false} className="text-sm" /> : null;
  }
  const verb = verbSlot(line.slot);
  if (!verb) return null;
  return (
    <span style={{ color: "var(--ink-2)" }}>
      {fill(t("{tense}, for “{person}”"), { tense: t(TENSE_NAME[verb.tense]), person: t(verb.person) })}
    </span>
  );
}

/** A slot as a phrase for the finish screen's one sentence. */
function slotName(slot: string, t: (s: string) => string): string {
  const spec = caseByKey(slot);
  if (spec) return spec.et;
  const verb = verbSlot(slot);
  return verb ? fill(t("{tense}, for “{person}”"), { tense: t(TENSE_NAME[verb.tense]), person: t(verb.person) }) : slot;
}

/** The theme that drills the slot a learner kept missing. */
function confusionThemeOf(slot: string): Theme | null {
  if (caseByKey(slot)) return `case:${slot}` as Theme;
  return verbSlot(slot)?.tense ?? null;
}
