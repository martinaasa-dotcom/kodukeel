"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, Check, Eye, EyeOff, Info, Lightbulb, PenLine, RotateCcw, Sparkles, X } from "lucide-react";
import { markWorkbookDone, recordWorkbookGrades } from "@/app/actions";
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
import { RuleNote } from "@/components/RuleNote";
import { fillNodes } from "@/components/fillNodes";
import { Speak } from "@/components/Speak";
import { GapMeaning } from "@/components/GapMeaning";
import { Chip, KeyCap } from "@/components/ui";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
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
  OUTCOME_RATING, markLine, otherWordIn, outcomeAfter, pageReading, themeCase, verbSlot,
  type ExerciseKind, type LineMark, type LineNote, type Outcome, type SheetItem, type Tense, type Theme,
} from "@/lib/games/workbook";
import { forgetWorkbook, loadWorkbook, saveWorkbook } from "./resume";
import { useSpeech, useSpeechConfig } from "@/components/speech/useSpeech";
import { MicButton } from "@/components/speech/MicButton";
import { micInAnswerBox } from "@/components/speech/answerBoxMic";
import { whichGap } from "@/lib/speech/lightUp";

/** A line as the page hands it down: the line, and the card it grades, if any. */
export interface WorkbookLine extends SheetItem {
  cardId: string | null;
}

export interface WorkbookExercise {
  kind: ExerciseKind;
  /** The words in the box, on a `box` exercise. */
  box: string[] | null;
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

/** The instruction an exercise opens with, the way a course book words it. */
function instructionFor(theme: Theme, kind: ExerciseKind = "write"): string {
  if (kind === "choose") return "Pick the form each sentence needs.";
  if (kind === "box") return "Each sentence needs one word from the box. Put it in the form the sentence needs.";
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
function bracketed(line: SheetItem, kind: ExerciseKind = "write"): string {
  if (kind === "box") return line.who ? `(${capitalFirst(line, line.who)})` : "";
  return `(${cueText(line)})`;
}

function capitalFirst(line: SheetItem, text: string): string {
  return line.before.trim() === "" ? text.charAt(0).toLocaleUpperCase("et") + text.slice(1) : text;
}

/**
 * What the bracket holds: the word, and before it the person where the
 * sentence does not say who (`whoFor`), the way a course book writes
 * `(mina, alustama)`. Capitalised where it opens the sentence.
 */
function cueText(line: SheetItem): string {
  const text = line.who ? `${line.who}, ${line.cue}` : line.cue;
  return line.before.trim() === "" ? text.charAt(0).toLocaleUpperCase("et") + text.slice(1) : text;
}

/**
 * What a line open for a second go is given, as words around the letters.
 * The ladder's own covered spelling (`_____ks`) is read for the letters it
 * shows rather than drawn, since a row of underscores counts out the answer.
 */
function secondGoHint(line: SheetItem, kind: ExerciseKind, t: (s: string) => string):
  { lead: string; letters: string; tail: string; marker: Record<string, string> } | null {
  if (kind === "choose") return null;
  if (kind === "box") return { lead: t("The word is"), letters: line.cue, tail: ".", marker: { "data-workbook-word-hint": "" } };
  if (!line.hint) return null;
  const letters = line.hint.shown.replace(/_+/g, "").trim();
  if (!letters) return null;
  return line.hint.kind === "ending"
    ? { lead: t("It ends in"), letters: `\u2026${letters}`, tail: ".", marker: {} }
    : { lead: t("It starts with"), letters: `${letters}\u2026`, tail: ".", marker: {} };
}

/*
  HOW WIDE A GAP IS DRAWN, AND WHY IT IS NEVER THE ANSWER'S WIDTH.

  It was the answer's length plus two, which hands over how long the ending is:
  `tuppa` and `toasse` drew two different boxes, and so did `annab` beside
  `andsin`. A course book draws one line for every gap. So the line starts as
  wide as the word in brackets, which is on the page already, and the word
  written on it sits in the middle, the way a hand writes on a ruled line.
  Past that the line grows with the word itself: `.wb-gap-sizer` lays a hidden
  copy of what is typed in the same grid cell as the box, so the box is as wide
  as the letters really are rather than a guess at them in `ch`.
*/
function gapWidth(line: SheetItem, widest?: number): string {
  // On a box page the line's own word is the answer to find, so every gap is as wide as the widest word.
  const room = widest !== undefined ? Math.min(10, Math.max(7, widest)) : Math.min(14, Math.max(7, line.cue.length + 2));
  return `${room}ch`;
}

const verdictOf = (outcome: Outcome | undefined, mark: LineMark | undefined): Verdict | null => {
  if (outcome === "right") return "right";
  if (outcome === "slip" || outcome === "second") return "nearly";
  if (outcome === "missed") return mark?.close ? "nearly" : "wrong";
  if (mark && !mark.right) return mark.close ? "nearly" : "wrong";
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
export function WorkbookSession({ exercises: initial, missed, themes, canTranslate, doneKey = null, practice = false, onBack }: {
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
  /**
   * The choice on Practice this page was opened from (`set` or a theme), told
   * to the server once the page is finished so that button can say so. Null
   * inside a module, where the evening records its own steps.
   */
  doneKey?: string | null;
  /**
   * The lines missed, set again once the page is corrected. Nothing is graded
   * (every line arrives with no card) and nothing is kept on the device, since
   * the page that counted has already been sent and taken off it.
   */
  practice?: boolean;
  /** Back to the corrected page this practice came from. */
  onBack?: () => void;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  const queueGrades = useQueueGrades();
  const { drainFirst } = useOffline();
  const themeName = useThemeName();
  // Snapshotted once: grading revalidates the route, and a refresh must not deal a new page under a pen.
  const [exercises, setExercises] = useState(initial);
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
  /* The missed lines, set again, and a counter so a second go at them mounts afresh. */
  const [redo, setRedo] = useState<{ exercises: WorkbookExercise[]; round: number } | null>(null);
  /* Each line's box, or on a pick-the-form page the row of options, so the caret can be sent to a line. */
  const inputs = useRef(new Map<string, HTMLElement>());
  const lastFocused = useRef<HTMLInputElement | null>(null);
  const sent = useRef(new Set<number>());
  /* Picked up from the device after a reload, and said so once at the top of the page. */
  const [resumed, setResumed] = useState(false);
  const [looked, setLooked] = useState(false);
  const pathname = usePathname() ?? "/review/workbook";
  const search = useSearchParams()?.toString() ?? "";
  const address = `${pathname}?${search}`;

  /*
    THE PAGE UNDER THE PEN SURVIVES A RELOAD. The server deals a page at random,
    so without this a reload, or a detour to a word's dictionary entry and back,
    dealt a fresh page and threw away every box filled in. Read before the first
    paint, so the page somebody was writing on is the one drawn, and never
    during render, since the server has no device to read.
  */
  useLayoutEffect(() => {
    if (practice) { setLooked(true); return; }
    const saved = loadWorkbook<WorkbookExercise, Pass, LineMark, Outcome>(address);
    if (saved) {
      setExercises(saved.exercises);
      setAt(saved.at);
      setPass(saved.pass);
      setTyped(saved.typed ?? {});
      setMarks(saved.marks ?? {});
      setFirstMarks(saved.firstMarks ?? {});
      setCheckedAs(saved.checkedAs ?? {});
      setOutcomes(saved.outcomes ?? {});
      setEnglish(saved.english !== false);
      sent.current = new Set(saved.sent ?? []);
      setResumed(true);
    }
    setLooked(true);
    // Once, on arrival: a page is restored the moment it opens and never after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!looked || practice) return;
    if (finished) { forgetWorkbook(address); return; }
    // Nothing written yet is nothing to lose, and a page nobody touched is dealt fresh next time.
    if (Object.keys(typed).length === 0 && Object.keys(outcomes).length === 0) return;
    saveWorkbook(address, {
      exercises, at, pass, typed, marks, firstMarks, checkedAs, outcomes, english, sent: [...sent.current],
    });
  }, [looked, practice, finished, address, exercises, at, pass, typed, marks, firstMarks, checkedAs, outcomes, english]);

  /* Finishing the page is what marks its button on Practice. A failure here
     costs a tick on a list and is not worth saying anything about. */
  useEffect(() => {
    if (!finished || practice || !doneKey) return;
    void markWorkbookDone(doneKey).catch(() => null);
  }, [finished, practice, doneKey]);

  const exercise = exercises[at];
  const kind: ExerciseKind = exercise?.kind ?? "write";
  const lines = useMemo(() => exercise?.lines ?? [], [exercise]);
  const total = exercises.reduce((n, e) => n + e.lines.length, 0);
  const settledCount = Object.keys(outcomes).length;
  const open = useMemo(() => lines.filter((l) => !outcomes[l.id]), [lines, outcomes]);
  const filled = open.filter((l) => (typed[l.id] ?? "").trim() !== "").length;

  /*
    READ ALOUD, THE GAP FILLED (docs/41-fifth-batch.md, VB-8). Once the model
    is downloaded (D6), a line can be read aloud whole with the word said in
    its gap: `whichGap` finds the line by its own words and takes what was
    heard between the words either side of the gap, and that goes into the
    box as though it were typed. Check marks it exactly as typed, so nothing
    about the marking or the grading moves, and a box that already holds an
    answer is never written over. Reading the whole sentence, rather than
    typing one word, is what turns a page into fluency practice.
  */
  const speechConfig = useSpeechConfig();
  const [heardNote, setHeardNote] = useState<{ at: number; text: string } | null>(null);
  const speech = useSpeech({ endpoint: true, onHeard: (hearing) => heardLine(hearing.understood) });
  const readAloud = micInAnswerBox(speech, speechConfig) && pass !== "settled" && (kind === "write" || kind === "box");
  function heardLine(heard: string) {
    const waiting = open.filter((l) => (typed[l.id] ?? "").trim() === "" || (pass === 2 && !changedSince(l.id)));
    const focusedId = [...inputs.current.entries()].find(([, el]) => el === lastFocused.current)?.[0] ?? null;
    const got = heard.trim() ? whichGap(waiting, heard, focusedId) : null;
    if (!got) {
      setHeardNote({ at, text: t("That didn't line up with a gap. Read the whole line, the word in the gap included, or type it.") });
      return;
    }
    setTyped((all) => ({ ...all, [got.id]: got.word }));
    const number = lines.findIndex((l) => l.id === got.id) + (exercise?.example ? 2 : 1);
    setHeardNote({ at, text: fill(t("That went into line {n}. Check marks it the same as typing."), { n: number }) });
    const after = waiting.map((l) => l.id).filter((id) => id !== got.id);
    if (after.length > 0) focusLine(after[0]);
  }

  /* The first box takes the caret where there is a keyboard to type with, and
     never on a phone, where focusing it would open the keyboard over the page
     somebody is about to read. */
  useEffect(() => {
    if (!exercise || pass !== 1 || kind !== "write" && kind !== "box") return;
    if (typeof window === "undefined" || !window.matchMedia?.("(pointer: fine)").matches) return;
    inputs.current.get(lines[0]?.id ?? "")?.focus({ preventScroll: true });
  }, [exercise, kind, lines, pass]);

  const focusLine = (id: string | undefined) => {
    if (!id) return;
    const el = inputs.current.get(id);
    // A row of options takes the caret on its first option still on offer.
    const target = el && !(el instanceof HTMLInputElement)
      ? el.querySelector<HTMLElement>('[role="radio"]:not([disabled])')
      : el;
    target?.focus();
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

  /*
    A SECOND GO HAS TO BE A SECOND GO. The first check opens the missed lines
    again with every box still holding what was written, so a double press of
    Enter, or a thumb landing twice on the button, checked the same answers a
    second time and marked every line missed, writing Again into the log over
    a reflex. The second pass checks only once something on it has changed;
    until then the page waits, and "Show answers" is there for a learner who
    has nothing more to try.
  */
  const changedSince = (id: string) => (typed[id] ?? "") !== (checkedAs[id] ?? "");
  const anyChanged = pass !== 2 || open.some((l) => changedSince(l.id));

  const check = useCallback(() => {
    if (!exercise || pass === "settled") return;
    if (pass === 2 && !open.some((l) => (typed[l.id] ?? "") !== (checkedAs[l.id] ?? ""))) {
      setSaid(t("Change an answer first, or show the answers."));
      return;
    }
    const nextMarks = { ...marks };
    const nextOutcomes = { ...outcomes };
    const nextFirst = { ...firstMarks };
    for (const line of open) {
      let mark = markLine(line, typed[line.id] ?? "");
      /*
        On a box page a form of another word in the box is its own mistake:
        the sentence was read for the wrong meaning, and saying "that's the
        seestütlev" about a word the line never wanted would be beside the point.
      */
      if (kind === "box" && !mark.right && mark.note.kind !== "blank") {
        const other = otherWordIn(typed[line.id] ?? "", line, exercise.example ? [...lines, exercise.example] : lines);
        if (other) mark = { right: false, slip: false, reached: null, note: { kind: "otherWord", word: other } };
      }
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
  }, [exercise, kind, pass, marks, outcomes, firstMarks, open, typed, checkedAs, lines, sound, t, send, at]);

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
      setResumed(false);
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
    /*
      Down the page and never round it: Enter goes to the next box further
      down still waiting (empty on the first pass, not tried again on the
      second), and from the last of them checks the page. Wrapping back to the
      top bounced between the boxes a learner meant to leave, and Enter then
      never checked anything.
    */
    const order = open.map((l) => l.id);
    const after = order.slice(order.indexOf(line.id) + 1);
    const waiting = after.find((id) => pass === 2 ? !changedSince(id) : (typed[id] ?? "").trim() === "");
    if (waiting) { focusLine(waiting); return; }
    if (anyChanged) check();
    else setSaid(t("Change an answer first, or show the answers."));
  };

  if (finished && redo) {
    return (
      <WorkbookSession
        key={redo.round}
        exercises={redo.exercises}
        missed={null}
        themes={themes}
        canTranslate={canTranslate}
        practice
        onBack={() => { setRedo(null); window.scrollTo({ top: 0 }); }}
      />
    );
  }
  if (finished) {
    const again = missedAgain(exercises, outcomes);
    return (
      <Finished
        exercises={exercises}
        outcomes={outcomes}
        typed={typed}
        firstMarks={firstMarks}
        marks={marks}
        themes={themes}
        canTranslate={canTranslate}
        practice={practice}
        onBack={onBack}
        redoCount={again ? again.lines.length : 0}
        onRedo={again ? () => {
          setRedo((r) => ({ exercises: [again], round: (r?.round ?? 0) + 1 }));
          window.scrollTo({ top: 0 });
        } : undefined}
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
          {practice && at === 0 && (
            <p className="mb-3 flex items-start gap-2.5 text-base leading-snug" style={{ color: "var(--ink-2)" }} data-workbook-practice="">
              <RotateCcw size={18} className="mt-0.5 shrink-0" aria-hidden />
              <span>{t("The lines you got wrong, once more. Nothing here is graded: the first go is the one that counted.")}</span>
            </p>
          )}
          {resumed && (
            <p className="mb-3 flex items-start gap-2.5 text-base leading-snug" style={{ color: "var(--ink-2)" }} data-workbook-resumed="">
              <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
              <span>{t("Your page, as you left it.")}</span>
            </p>
          )}
          {missed && at === 0 && !resumed && (
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
            <span>{t(instructionFor(exercise.theme, kind))}</span>
          </p>
          {label && (
            <p className="mt-2 pl-7 text-base">
              <CaseLabel label={label} />
            </p>
          )}
          {kind === "box" && exercise.box && (
            <WordBox
              words={exercise.box}
              used={new Set([
                ...(exercise.example ? [exercise.example.cue] : []),
                ...lines.filter((l) => outcomes[l.id] && outcomes[l.id] !== "missed").map((l) => l.cue),
              ])}
            />
          )}
          {exercise.rule && (
            <div className="mt-3 sm:pl-7" data-workbook-rule="">
              <Explain label={t("How this works")} plain>
                <RuleNote summary={exercise.rule.summary} watchOut={exercise.rule.watchOut} />
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
                  {bracketed(exercise.example, kind) && <><span className="wb-cue">{bracketed(exercise.example, kind)}</span>{" "}</>}
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
              kind={kind}
              widest={exercise.box ? Math.max(...exercise.box.map((w) => w.length)) : undefined}
              number={i + (exercise.example ? 2 : 1)}
              index={i}
              value={typed[line.id] ?? ""}
              retyped={(typed[line.id] ?? "") !== (checkedAs[line.id] ?? "")}
              checked={checkedAs[line.id] ?? ""}
              last={line.id === open.at(-1)?.id}
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
          {pass !== "settled" && kind !== "choose" && (
            <div className="mb-4">
              <DiacriticBar fallbackRef={lastFocused} />
            </div>
          )}
          {readAloud && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <MicButton speech={speech} label={t("Read a line aloud, the gap filled")} shortcut showPartial={false} />
              <p className="min-w-0 flex-1 text-sm" style={{ color: "var(--ink-2)" }} role="status">
                {(heardNote?.at === at ? heardNote.text : null) ?? t("Or read a line aloud with the word in the gap, and the word goes into its box.")}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="tnum text-sm whitespace-nowrap" style={{ color: "var(--ink-3)" }}>
              {pass === "settled"
                ? fill(t("{right} of {total} right"), {
                  right: lines.filter((l) => outcomes[l.id] !== "missed").length, total: lines.length,
                })
                : pass === 2
                  ? fill(t("{n} of {total} tried again"), { n: open.filter((l) => changedSince(l.id)).length, total: open.length })
                  : fill(t(kind === "choose" ? "{n} of {total} picked" : "{n} of {total} filled in"), { n: filled, total: open.length })}
            </p>
            <div className="ml-auto flex flex-nowrap items-center gap-2">
              {pass === 2 && (
                <Button variant="ghost" onClick={showAnswers} data-workbook-show="">{t("Show answers")}</Button>
              )}
              {pass !== "settled" ? (
                <Button variant="primary" onClick={check} disabled={!anyChanged} data-workbook-check="">
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
  line, kind, widest, number, index, value, retyped, checked, last, mark, firstMark, outcome, pass, english,
  onChange, onKeyDown, register, onFocus,
}: {
  line: WorkbookLine;
  kind: ExerciseKind;
  /** On a box page, the longest word in the box, which sizes every gap alike. */
  widest: number | undefined;
  /** What the line held when the page was last checked: on a pick-the-form page, the option checked wrong. */
  checked: string;
  number: number;
  index: number;
  value: string;
  /** Changed since the page was checked: a fresh try, so it is no longer drawn as the wrong one. */
  retyped: boolean;
  /** The last box still open, whose Enter checks the page rather than moving on. */
  last: boolean;
  mark: LineMark | undefined;
  firstMark: LineMark | undefined;
  outcome: Outcome | undefined;
  pass: Pass;
  english: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  register: (el: HTMLElement | null) => void;
  onFocus: (el: HTMLInputElement) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const settled = outcome !== undefined;
  const reopened = !settled && pass === 2;
  /*
    A miss most of the way there is drawn in butter rather than blush: the
    right word in another form, or most of the letters (`nearMiss`). Never on
    a pick between forms, where every option is a form of the word.
  */
  const close = kind !== "choose" && mark?.close === true;
  const meaning = gapMeaning({ en: line.sentenceEn, answer: line.answer, cue: line.translation });
  const note = noteText(mark, firstMark, outcome, line, t, locale, kind);
  const hint = secondGoHint(line, kind, t);
  const label = kind === "box"
    ? (line.who
      ? fill(t("Line {n}: a word from the box, for “{who}”, in the form the sentence needs"), { n: number, who: line.who })
      : fill(t("Line {n}: a word from the box, in the form the sentence needs"), { n: number }))
    : fill(t("Line {n}: {word}, in the form the sentence needs"), { n: number, word: cueText(line) });
  const tight = /^[,.!?;:)…]/.test(line.after);
  /* The punctuation straight after a gap stays on the gap's line: a full stop alone on the next line reads as a line of its own. */
  const stuck = line.after.match(/^[,.!?;:)…"»]+/u)?.[0] ?? "";
  const rest = line.after.slice(stuck.length);

  return (
    <li className="wb-line" data-workbook-line={line.id} data-outcome={outcome ?? (reopened ? "open" : "")}>
      <span className="wb-num tnum">{number}.</span>
      <div className="min-w-0 flex-1">
        <p lang="et" className="wb-sentence">
          {line.before.trimEnd()}{line.before.trim() ? " " : ""}
          {bracketed(line, kind) && <><span className="wb-cue">{bracketed(line, kind)}</span>{" "}</>}
          <span className="whitespace-nowrap">
          {settled ? (
            <span
              className={`wb-filled ${outcome === "missed" ? `wb-filled-missed ${close ? "wb-filled-close" : ""}` : "wb-filled-right"} wb-stamp ${tight ? "wb-tight" : ""}`}
              style={{ animationDelay: `${Math.min(index, 10) * 45}ms`, minWidth: gapWidth(line, widest) }}
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
          ) : kind === "choose" ? (
            <span
              aria-hidden
              className={`wb-gap wb-gap-choice ${value ? "wb-gap-picked" : ""} ${reopened && !retyped ? "wb-gap-again shake" : ""} ${tight ? "wb-tight" : ""}`}
              style={{ minWidth: gapWidth(line) }}
              data-workbook-gap=""
            >
              {value || "\u00a0"}
            </span>
          ) : (
            <span
              className={`wb-gap-sizer ${tight ? "wb-tight" : ""}`}
              data-value={value}
              style={{ minWidth: gapWidth(line, widest) }}
            >
            <input
              ref={register}
              type="text"
              // One character of its own, so the hidden copy beside it decides how wide the line is.
              size={1}
              lang="et"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={(e) => {
                // The old answer is still in a reopened box, so it is selected
                // and the next letter typed replaces it rather than joining it.
                if (reopened && !retyped) e.currentTarget.select();
                onFocus(e.currentTarget);
              }}
              aria-label={label}
              aria-invalid={reopened ? true : undefined}
              autoComplete="off"
              // A phone's own Enter key says what Enter does here: on to the next box, or check.
              enterKeyHint={last ? "done" : "next"}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={`wb-gap ${reopened && !retyped ? `wb-gap-again ${close ? "wb-gap-close" : ""} shake` : ""}`}
              data-workbook-gap=""
            />
            </span>
          )}
          {stuck}
          </span>
          {rest}
        </p>

        {/* While the line is being answered the English marks the word it wants;
            once it is filled the marking has done its job and the line reads plain. */}
        {/* On a box page the marked word in the English would say which word from the box goes
            here, which is the half of the line the box is asking, so the English is the plain sentence. */}
        {english && !settled && kind !== "box" && meaning && <GapMeaning meaning={meaning} className="mt-1 text-base leading-snug" />}
        {english && (settled || kind === "box") && line.sentenceEn && (
          <p lang="en" className="mt-1 text-base leading-snug" style={{ color: "var(--ink-2)" }}>{line.sentenceEn}</p>
        )}

        {kind === "choose" && !settled && (
          <div ref={register} className="mt-2" data-workbook-options="">
            <ChoiceGroup ariaLabel={label} className="flex flex-wrap gap-2">
              {(line.choices ?? []).map((option) => {
                // The option checked wrong on the first pass is crossed out and cannot be picked again.
                const struck = reopened && option === checked;
                return (
                  <ChoiceChip key={option} selected={value === option && !struck} disabled={struck} onSelect={() => onChange(option)}>
                    {struck ? <s lang="et">{option}</s> : <span lang="et">{option}</span>}
                  </ChoiceChip>
                );
              })}
            </ChoiceGroup>
          </div>
        )}

        {/*
          WHAT WENT WRONG AND HOW TO GET IT, AS ONE SENTENCE. The note in blush,
          then the hint in the body ink with the letters it gives in bold: a box
          line's second go names its word, which leaves the form to find as a
          bracket does; a written line's names how the answer ends or starts.
          A pick-the-form line needs neither, since the wrong option is crossed
          out above it.
        */}
        {(note || (reopened && hint)) && (
          <p className="mt-1.5 text-base leading-snug" data-workbook-note="">
            {note && (
              <span
                className="font-semibold"
                style={{ color: reopened && retyped ? "var(--ink-2)" : settled && outcome !== "missed" ? "var(--ink-2)" : VERDICT_INK[close ? "nearly" : "wrong"] }}
              >
                {note}
              </span>
            )}
            {reopened && hint && (
              <span style={{ color: "var(--ink-2)" }} {...hint.marker}>
                {note ? " " : ""}
                {hint.lead}{" "}
                <span lang="et" className="wb-hint">{hint.letters}</span>
                {hint.tail}
              </span>
            )}
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
  line: SheetItem, t: (s: string) => string, locale: ReturnType<typeof useLocale>, kind: ExerciseKind = "write",
): string | null {
  if (outcome === "right") return null;
  if (outcome === "missed") {
    /*
      The answer is already on the line, struck through beside what was
      typed, so the note says what the form is for rather than saying the
      answer a second time a hand's width under it.
    */
    const why = firstMark ? reasonText(firstMark.note, t, kind) : null;
    if (why && firstMark?.note.kind !== "blank") return why;
    const clause = plainAsk(line.slot, locale);
    return clause ? fill(t("That's the form you use {clause}."), { clause }) : why;
  }
  if (outcome === "second") return t("Right on the second go.");
  if (outcome === "slip") return mark?.note.kind === "checker" ? answerNote(mark.note.text, locale) : t("Right, nearly to the letter.");
  if (!mark) return null;
  return reasonText(mark.note, t, kind) ?? t("Not quite.");
}

/** Why a line was not right, where the marker could say. */
function reasonText(note: LineNote, t: (s: string) => string, kind: ExerciseKind = "write"): string | null {
  switch (note.kind) {
    case "blank": return kind === "choose" ? t("Nothing picked yet.") : t("Nothing typed yet.");
    case "unchanged":
      return kind === "box"
        ? t("That's the word as it stands in the box. The sentence needs it changed.")
        : t("That's the word as it stands in brackets. The sentence needs it changed.");
    case "otherWord":
      return fill(t("That's a form of “{word}”, which belongs on another line."), { word: note.word });
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

/**
 * THE BOX OVER A COURSE BOOK'S PAGE: the words the lines are made of, in no
 * order, the worked example's crossed out as a book prints it, and every other
 * one crossed out as its line is settled, so what is left is what is left.
 */
function WordBox({ words, used }: { words: string[]; used: ReadonlySet<string> }) {
  const t = useT();
  return (
    <div className="wb-box mt-4 sm:ml-7" data-workbook-box="">
      <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Word box")}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label={t("Word box")}>
        {words.map((word) => (
          <li key={word} lang="et" className="text-md font-semibold" style={{ color: used.has(word) ? "var(--ink-3)" : "var(--ink)" }}>
            {used.has(word) ? <s aria-label={fill(t("{word}, used"), { word })}>{word}</s> : word}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The page handed back, corrected, and where to go from it. */
function Finished({
  exercises, outcomes, typed, firstMarks, marks, themes, canTranslate, practice, onBack, redoCount, onRedo,
}: {
  exercises: WorkbookExercise[];
  outcomes: Record<string, Outcome>;
  typed: Record<string, string>;
  firstMarks: Record<string, LineMark>;
  /** The last mark each line got, which says whether a missed line was close. */
  marks: Record<string, LineMark>;
  themes: Theme[];
  canTranslate: boolean;
  practice: boolean;
  onBack: (() => void) | undefined;
  redoCount: number;
  onRedo: (() => void) | undefined;
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
              // A pick between forms is never "close": every option is a form of the word.
              const verdict = verdictOf(outcome, exercise.kind === "choose" ? undefined : marks[line.id]) ?? "right";
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
                          {exercise.kind === "choose" ? t("You picked") : t("You wrote")} <s lang="et">{wrote}</s>
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

      {onRedo && (
        <section
          className="flex flex-col items-start gap-3 rounded-xl border px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
          data-workbook-redo=""
        >
          <p className="text-base sm:min-w-0 sm:flex-1" style={{ color: "var(--ink-2)" }}>
            {t("Writing them once more, straight after the answer, is what makes them stick. It's not graded.")}
          </p>
          <Button variant="secondary" onClick={onRedo} data-workbook-redo-start="">
            <RotateCcw size={16} aria-hidden />
            {redoCount === 1 ? t("Redo the one you got wrong") : fill(t("Redo the {n} you got wrong"), { n: redoCount })}
          </Button>
        </section>
      )}

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
          {practice && onBack ? (
            <Button variant="ghost" onClick={onBack} data-workbook-back="">{t("Back to the corrected page")}</Button>
          ) : (
            <ButtonLink href="/practice" variant="ghost">{t("Back to practice")}</ButtonLink>
          )}
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

/**
 * The lines not right first time, set again as one page with no card behind
 * any of them, so nothing about the second look reaches the review log. Null
 * where every line was right first time and there is nothing to do again.
 */
function missedAgain(exercises: WorkbookExercise[], outcomes: Record<string, Outcome>): WorkbookExercise | null {
  const lines = exercises.flatMap((e) => e.lines)
    .filter((l) => outcomes[l.id] === "missed" || outcomes[l.id] === "second")
    .map((l) => ({ ...l, cardId: null }));
  if (lines.length === 0) return null;
  const themes = new Set(exercises.filter((e) => e.lines.some((l) => lines.some((m) => m.id === l.id))).map((e) => e.theme));
  const only = themes.size === 1 ? exercises.find((e) => themes.has(e.theme)) ?? null : null;
  return {
    // Written, whatever the page was: going back over a line means writing it this time.
    kind: "write",
    box: null,
    theme: only?.theme ?? "mixed",
    rule: only?.rule ?? null,
    example: null,
    lines: lines.map((l) => ({ ...l, choices: null })),
  };
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
